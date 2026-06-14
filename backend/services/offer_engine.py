from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import time
import threading
from typing import Any, Dict, List, Optional
from uuid import UUID

import requests
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from models.invoices import Invoice, Payment
from models.items import Item
from models.sales import OrderItem, SalesOrder

_gemini_semaphore = threading.Semaphore(1)


def _d(v) -> Decimal:
    return Decimal("0") if v is None else Decimal(str(v))


def extract_client_patterns(db: Session, client_id: UUID) -> Dict[str, Any]:
    # avg_monthly_spend: average of monthly totals from sales_orders
    orders = (
        db.query(SalesOrder)
        .filter(SalesOrder.client_id == client_id)
        .order_by(SalesOrder.order_date.asc())
        .all()
    )

    # month buckets
    month_totals: Dict[str, Decimal] = {}
    for o in orders:
        if not o.order_date:
            continue
        key = o.order_date.strftime("%Y-%m")
        month_totals[key] = month_totals.get(key, Decimal("0")) + _d(o.total)

    avg_monthly_spend = (
        float(sum(month_totals.values(), Decimal("0")) / max(len(month_totals), 1))
        if month_totals
        else 0.0
    )

    # order_frequency_days: avg days between consecutive order dates
    dates = [o.order_date for o in orders if o.order_date]
    gaps: List[int] = []
    for i in range(1, len(dates)):
        gaps.append((dates[i] - dates[i - 1]).days)
    order_frequency_days = float(sum(gaps) / len(gaps)) if gaps else 0.0

    # avg_payment_delay_days: avg from invoice_date to payment_date
    invs = db.query(Invoice).filter(Invoice.client_id == client_id).all()
    delays: List[int] = []
    for inv in invs:
        if not inv.invoice_date:
            continue
        first_payment = (
            db.query(func.min(Payment.payment_date))
            .filter(Payment.invoice_id == inv.id)
            .scalar()
        )
        if first_payment:
            delays.append((first_payment - inv.invoice_date).days)
    avg_payment_delay_days = float(sum(delays) / len(delays)) if delays else 0.0

    recent_invoices = []
    recent_invoice_rows = (
        db.query(Invoice)
        .filter(Invoice.client_id == client_id)
        .order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())
        .limit(5)
        .all()
    )
    for inv in recent_invoice_rows:
        recent_invoices.append(
            {
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "amount_due": float(inv.amount_due or 0),
                "amount_paid": float(inv.amount_paid or 0),
                "status": inv.status,
            }
        )

    # top_items: top 5 items by total order value with avg qty/value
    line_rows = (
        db.query(OrderItem.item_id, func.sum(OrderItem.line_total), func.avg(OrderItem.quantity))
        .join(SalesOrder, SalesOrder.id == OrderItem.order_id)
        .filter(SalesOrder.client_id == client_id)
        .group_by(OrderItem.item_id)
        .order_by(func.sum(OrderItem.line_total).desc())
        .limit(5)
        .all()
    )
    item_ids = [r[0] for r in line_rows]
    items = (
        db.query(Item).filter(Item.id.in_(item_ids)).all() if item_ids else []
    )
    item_name_map = {i.id: i.name for i in items}
    top_items = []
    for item_id, total_value, avg_qty in line_rows:
        top_items.append(
            {
                "name": item_name_map.get(item_id, str(item_id)),
                "avg_qty": float(avg_qty or 0),
                "avg_value": float((total_value or 0) / max(len(orders), 1)),
            }
        )

    # monthly_trend: last 3 months vs previous 3 months
    months_sorted = sorted(month_totals.keys())
    last3 = months_sorted[-3:]
    prev3 = months_sorted[-6:-3]
    last_sum = sum((month_totals[m] for m in last3), Decimal("0"))
    prev_sum = sum((month_totals[m] for m in prev3), Decimal("0"))
    if not prev3 or prev_sum == 0:
        monthly_trend = "stable"
    else:
        ratio = (last_sum - prev_sum) / prev_sum
        if ratio > Decimal("0.08"):
            monthly_trend = "growing"
        elif ratio < Decimal("-0.08"):
            monthly_trend = "declining"
        else:
            monthly_trend = "stable"

    return {
        "avg_monthly_spend": avg_monthly_spend,
        "order_frequency_days": order_frequency_days,
        "avg_payment_delay_days": avg_payment_delay_days,
        "recent_invoices": recent_invoices,
        "top_items": top_items,
        "monthly_trend": monthly_trend,
    }


def _build_offer_prompt(client_summary: Dict[str, Any]) -> str:
    """
    Prompt asks for marketing-friendly offer cards with concrete invoice references.
    """
    return (
        "You are a business advisor for a provisions supplier in India.\n"
        "Currency is Indian Rupees (₹).\n\n"
        "Write like a strong sales and retention marketer, never like a system log.\n\n"
        f"Client data:\n{json.dumps(client_summary, ensure_ascii=False)}\n\n"
        "Supplier margin is approximately 14-18% on most items.\n\n"
        "Suggest 2 offers from these types only:\n"
        "- buy_get_free: Buy X qty, get Y qty free (free qty must be < 5% of buy qty)\n"
        "- slab_discount: Order above ₹X, get Y% off (discount must be < 4%)\n"
        "- early_payment: Pay within X days, get Y% off (discount must be < 2.5%)\n"
        "- loyalty_credit: Spend ₹X this month, get ₹Y credit (reward < 1.5% of target)\n\n"
        "Rules:\n"
        "- Use simple round numbers.\n"
        "- Keep offers realistic for an Indian restaurant/raw-materials supplier.\n"
        "- Headline: benefit-first, punchy, maximum 8 words.\n"
        "- client_pitch: 1-2 friendly sentences written directly TO the client in friendly marketing language.\n"
        "- client_pitch must always reference specific invoice numbers, invoice amounts, and invoice dates from the provided client data when invoices are available.\n"
        "- Never use vague wording like 'that invoice' or 'your recent invoice' when invoice data exists.\n"
        "- Make the reward feel tangible, specific, and worth acting on.\n"
        "- supplier_benefit: 1 sentence explaining why the supplier benefits too, such as faster payment, larger basket size, or stronger retention.\n"
        "- reasoning: 1 crisp line grounded in the data.\n"
        "- offer_details: only the relevant numeric or item parameters for the selected offer type.\n\n"
        "Return ONLY a valid JSON array, no text outside JSON.\n"
        "Each object MUST include:\n"
        "- offer_type\n"
        "- headline\n"
        "- client_pitch\n"
        "- supplier_benefit\n"
        "- reasoning\n"
        "- offer_details (only keys relevant to that offer type; include numbers)\n\n"
        "offer_details keys by type:\n"
        "- buy_get_free: {\"item_name\": string, \"buy_qty\": number, \"free_qty\": number}\n"
        "- slab_discount: {\"min_order_value\": number, \"discount_percent\": number}\n"
        "- early_payment: {\"pay_within_days\": number, \"discount_percent\": number}\n"
        "- loyalty_credit: {\"target_spend\": number, \"credit_amount\": number}\n\n"
        "JSON shape:\n"
        "[\n"
        "  {\n"
        "    \"offer_type\": \"buy_get_free|slab_discount|early_payment|loyalty_credit\",\n"
        "    \"headline\": \"short punchy line, max 8 words, benefit-first\",\n"
        "    \"client_pitch\": \"1-2 friendly sentences to the client. Mention invoice numbers, amounts, and dates.\",\n"
        "    \"supplier_benefit\": \"1 sentence on what the supplier gains.\",\n"
        "    \"reasoning\": \"1 line of data that justifies this offer\",\n"
        "    \"offer_details\": {}\n"
        "  }\n"
        "]"
    )


def _parse_offers_json(content: str) -> List[Dict[str, Any]]:
    stripped = (content or "").strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        stripped = stripped.replace("json", "", 1).strip()
    offers = json.loads(stripped)
    if not isinstance(offers, list):
        raise ValueError("LLM returned non-list JSON for offers")
    cleaned: List[Dict[str, Any]] = []
    for o in offers:
        if not isinstance(o, dict):
            continue
        if o.get("offer_type") not in {
            "buy_get_free",
            "slab_discount",
            "early_payment",
            "loyalty_credit",
        }:
            continue
        if not isinstance(o.get("offer_details"), dict):
            continue
        if not isinstance(o.get("reasoning"), str):
            continue
        headline = o.get("headline", o.get("title"))
        client_pitch = o.get("client_pitch", o.get("description"))
        supplier_benefit = o.get("supplier_benefit")
        if not isinstance(headline, str):
            continue
        if not isinstance(client_pitch, str):
            continue
        if not isinstance(supplier_benefit, str):
            continue

        offer_type = o["offer_type"]
        details = o["offer_details"]
        # Normalize common alias keys from LLMs so the rest of the app stays stable.
        if offer_type == "loyalty_credit":
            if "target_spend" not in details and "monthly_spend_target" in details:
                details["target_spend"] = details.get("monthly_spend_target")
            if "credit_amount" not in details and "credit_reward" in details:
                details["credit_amount"] = details.get("credit_reward")
        if offer_type == "early_payment":
            if "pay_within_days" not in details and "days" in details:
                details["pay_within_days"] = details.get("days")
        if offer_type == "slab_discount":
            if "min_order_value" not in details and "minimum_order_value" in details:
                details["min_order_value"] = details.get("minimum_order_value")
        cleaned.append(
            {
                "offer_type": offer_type,
                "offer_details": details,
                "headline": headline,
                "client_pitch": client_pitch,
                "supplier_benefit": supplier_benefit,
                "reasoning": o["reasoning"],
            }
        )
    return cleaned[:2]


def call_gemini_offers(
    *, client_summary: Dict[str, Any]
) -> List[Dict[str, Any]]:
    api_key = getattr(settings, "GEMINI_API_KEY", None) or None
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    prompt = _build_offer_prompt(client_summary)
    model = (getattr(settings, "GEMINI_MODEL", None) or "gemini-2.0-flash").strip()
    max_retries = int(getattr(settings, "GEMINI_MAX_RETRIES", 2) or 2)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    last_status: int | None = None
    last_detail: Any = None

    # Avoid bursty parallel calls causing 429.
    with _gemini_semaphore:
        for attempt in range(0, max_retries + 1):
            try:
                resp = requests.post(
                    url,
                    params={"key": api_key},
                    headers={"Content-Type": "application/json"},
                    timeout=60,
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3},
                    },
                )

                if resp.status_code in {429, 502, 503, 504} and attempt < max_retries:
                    retry_after = resp.headers.get("Retry-After")
                    sleep_s: float | None = None
                    if retry_after and retry_after.isdigit():
                        sleep_s = float(retry_after)
                    else:
                        try:
                            body = resp.json()
                            details = (body.get("error") or {}).get("details") or []
                            for d in details:
                                if (d.get("@type") or "").endswith("google.rpc.RetryInfo"):
                                    delay = d.get("retryDelay") or ""
                                    if isinstance(delay, str) and delay.endswith("s"):
                                        sleep_s = float(delay[:-1])
                                        break
                        except Exception:
                            pass
                    if sleep_s is None:
                        sleep_s = 2 ** attempt
                    time.sleep(min(max(sleep_s, 1.0), 20.0))
                    continue

                if resp.status_code >= 400:
                    last_status = resp.status_code
                    try:
                        last_detail = resp.json()
                    except Exception:
                        last_detail = resp.text
                    break

                data = resp.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                return _parse_offers_json(text)
            except Exception as e:
                last_detail = str(e)
                last_status = last_status or 0
                if attempt < max_retries:
                    time.sleep(min(2 ** attempt, 10))
                    continue
                break

    if last_status in {429, 502, 503, 504}:
        raise ValueError(
            f"Gemini is rate-limiting or temporarily unavailable (HTTP {last_status}). Please wait 30-60 seconds and try again."
        )
    raise ValueError(f"Gemini request failed (HTTP {last_status}): {last_detail}")


def fallback_offers(client_summary: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Deterministic, non-LLM fallback when Gemini is rate-limited.
    Returns the same shape as the LLM output so the rest of the pipeline can save/render it.
    """
    avg_monthly = float(client_summary.get("avg_monthly_spend") or 0)
    pay_delay = float(client_summary.get("avg_payment_delay_days") or 0)
    trend = str(client_summary.get("monthly_trend") or "stable")
    top_items = client_summary.get("top_items") or []
    recent_invoices = client_summary.get("recent_invoices") or []

    def _round_rupees(v: float, step: int = 1000) -> int:
        if v <= 0:
            return step
        return int(round(v / step) * step)

    def _invoice_reference() -> str:
        if not recent_invoices:
            return "your latest invoices"
        inv = recent_invoices[0]
        invoice_number = inv.get("invoice_number") or "latest invoice"
        invoice_date = inv.get("invoice_date") or "latest billing date"
        amount_due = float(inv.get("amount_due") or 0)
        return f"invoice {invoice_number} for Rs {amount_due:,.0f} dated {invoice_date}"

    offers: List[Dict[str, Any]] = []

    # Offer 1: early payment if payment delay is meaningful
    if pay_delay >= 4:
        days = 2
        disc = 2.0 if pay_delay >= 6 else 1.5
        offers.append(
            {
                "offer_type": "early_payment",
                "offer_details": {"pay_within_days": days, "discount_percent": disc},
                "headline": f"Save {disc:g}% by paying early",
                "client_pitch": f"Settle {_invoice_reference()} within {days} days and unlock a {disc:g}% discount. It is a simple way to cut the cost on a bill you already need to clear.",
                "supplier_benefit": "This improves cash collection speed and reduces follow-up effort for the supplier.",
                "reasoning": f"Client average payment delay is ~{pay_delay:.0f} days.",
            }
        )

    # Offer 2: choose between slab discount / loyalty credit / buy-get-free
    if trend == "declining":
        min_value = _round_rupees(avg_monthly * 1.05 if avg_monthly else 25000)
        disc = 3.0
        offers.append(
            {
                "offer_type": "slab_discount",
                "offer_details": {"min_order_value": min_value, "discount_percent": disc},
                "headline": f"Unlock {disc:g}% off your next order",
                "client_pitch": f"Since {_invoice_reference()} shows your current buying level, place your next order above Rs {min_value:,} to save {disc:g}%. It is a practical way to stock up and get a visible discount on the bill.",
                "supplier_benefit": "This lifts basket size and helps recover order volume without over-discounting.",
                "title": f"{disc:g}% off above ₹{min_value}",
                "description": f"Get {disc:g}% off when an order total is above ₹{min_value}.\nHelps recover declining purchase trend with a small discount (<4%).",
                "reasoning": "Recent 3-month spend trend is declining.",
            }
        )
    elif avg_monthly > 0:
        target = _round_rupees(avg_monthly * 1.05)
        credit = int(target * 0.0125)  # 1.25% (<= 1.5%)
        offers.append(
            {
                "offer_type": "loyalty_credit",
                "offer_details": {"target_spend": target, "credit_amount": credit},
                "headline": f"Earn Rs {credit:,} back this month",
                "client_pitch": f"Build on {_invoice_reference()} and reach Rs {target:,} in purchases this month to earn Rs {credit:,} credit on your next bill. That gives you a real, easy-to-use reward for staying consistent.",
                "supplier_benefit": "This encourages repeat purchasing and improves month-long client retention.",
                "title": f"Earn ₹{credit} credit at ₹{target}",
                "description": f"Spend ₹{target} this month and earn ₹{credit} credit on the next invoice.\nReward is ~{(credit/target)*100:.2f}% (<= 1.5%).",
                "reasoning": "Based on the client’s average monthly spend and stable trend.",
            }
        )
    elif top_items:
        item_name = str(top_items[0].get("name") or "Top item")
        buy_qty = max(int(round(float(top_items[0].get("avg_qty") or 0))), 100)
        free_qty = max(1, int(buy_qty * 0.03))  # 3% free (<5%)
        offers.append(
            {
                "offer_type": "buy_get_free",
                "offer_details": {"item_name": item_name, "buy_qty": buy_qty, "free_qty": free_qty},
                "headline": f"Get extra {item_name} free",
                "client_pitch": f"Because {_invoice_reference()} shows steady demand, buy {buy_qty} units of {item_name} and get {free_qty} free. You stretch the same purchase into extra usable stock without changing your usual item mix too much.",
                "supplier_benefit": "This moves a proven item faster while keeping the free quantity within a controlled margin.",
                "title": f"Buy {buy_qty}, get {free_qty} free",
                "description": f"On {item_name}: Buy {buy_qty} units and get {free_qty} units free.\nFree qty is {free_qty/buy_qty*100:.2f}% (< 5%).",
                "reasoning": "Based on the client’s top item by purchase value.",
            }
        )

    # Ensure exactly 2 offers for consistency.
    return offers[:2]


def simulate_offer(
    *,
    offer_type: str,
    parameters: Dict[str, Any],
    expected_order_value: float,
    cost_price_percent: float,
) -> Dict[str, Any]:
    eov = Decimal(str(expected_order_value))
    cpp = Decimal(str(cost_price_percent))
    cost_base = (eov * cpp) / Decimal("100")

    revenue_without_offer = eov
    profit_without = eov - cost_base

    if offer_type == "buy_get_free":
        buy_qty = Decimal(str(parameters.get("buy_qty", 0) or 0))
        free_qty = Decimal(str(parameters.get("free_qty", 0) or 0))
        unit_price = parameters.get("unit_price")
        unit_price_d = (
            Decimal(str(unit_price))
            if unit_price is not None
            else (eov / buy_qty if buy_qty > 0 else Decimal("0"))
        )
        if buy_qty <= 0 or free_qty <= 0:
            raise ValueError("buy_qty and free_qty required")
        cost_of_offer = (free_qty / buy_qty) * (cpp / Decimal("100")) * eov
        revenue_with_offer = eov
        profit_with = revenue_with_offer - cost_base - cost_of_offer
        break_even = buy_qty * (unit_price_d / (Decimal("1") - (cpp / Decimal("100"))))
    elif offer_type == "slab_discount":
        discount_percent = Decimal(str(parameters.get("discount_percent", 0) or 0))
        cost_of_offer = (discount_percent / Decimal("100")) * eov
        revenue_with_offer = eov - cost_of_offer
        profit_with = revenue_with_offer - cost_base
        denom = Decimal("1") - (cpp / Decimal("100")) - (discount_percent / Decimal("100"))
        break_even = (cost_of_offer / denom) if denom > 0 else Decimal("0")
    elif offer_type == "early_payment":
        discount_percent = Decimal(str(parameters.get("discount_percent", 0) or 0))
        cost_of_offer = (discount_percent / Decimal("100")) * eov
        revenue_with_offer = eov - cost_of_offer
        profit_with = revenue_with_offer - cost_base
        denom = Decimal("1") - (cpp / Decimal("100")) - (discount_percent / Decimal("100"))
        break_even = (cost_of_offer / denom) if denom > 0 else Decimal("0")
    elif offer_type == "loyalty_credit":
        target_spend = Decimal(str(parameters.get("target_spend", 0) or 0))
        credit_amount = Decimal(str(parameters.get("credit_amount", 0) or 0))
        cost_of_offer = credit_amount
        revenue_with_offer = target_spend
        profit_with = revenue_with_offer - ((revenue_with_offer * cpp) / Decimal("100")) - cost_of_offer
        denom = Decimal("1") - (cpp / Decimal("100"))
        break_even = (credit_amount / denom) if denom > 0 else Decimal("0")
        revenue_without_offer = target_spend
        profit_without = target_spend - ((target_spend * cpp) / Decimal("100"))
    else:
        raise ValueError("Invalid offer_type")

    net_profit_impact_amount = profit_with - profit_without
    net_profit_impact_percent = (
        (net_profit_impact_amount / profit_without) * Decimal("100")
        if profit_without != 0
        else Decimal("0")
    )

    return {
        "revenue_without_offer": float(revenue_without_offer),
        "revenue_with_offer": float(revenue_with_offer),
        "cost_of_offer": float(cost_of_offer),
        "net_profit_impact_amount": float(net_profit_impact_amount),
        "net_profit_impact_percent": float(net_profit_impact_percent),
        "break_even_order_size": float(break_even),
    }
