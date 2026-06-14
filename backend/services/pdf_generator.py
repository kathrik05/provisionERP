import base64
from typing import Any, Dict, List

def render_invoice_pdf_bytes(*, html: str) -> bytes:
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except ImportError:
        raise Exception("PDF Generation is not supported on Vercel because of missing system dependencies (weasyprint).")



def _img_tag(logo_base64: str | None) -> str:
    if not logo_base64:
        return ""
    return f'<img src="data:image/*;base64,{logo_base64}" style="max-height:64px;max-width:180px;object-fit:contain;" />'


def build_invoice_html(payload: Dict[str, Any]) -> str:
    company = payload["company"]
    invoice = payload["invoice"]
    client = payload["client"]
    order = payload["order"]
    items: List[Dict[str, Any]] = payload["items"]

    logo = _img_tag(company.get("logo_base64"))

    def esc(s: Any) -> str:
        return "" if s is None else str(s)

    rows = ""
    for idx, li in enumerate(items, start=1):
        rows += f"""
          <tr>
            <td class="cell">{idx}</td>
            <td class="cell">{esc(li.get("item_name"))}</td>
            <td class="cell">{esc(li.get("unit"))}</td>
            <td class="cell right">{esc(li.get("quantity"))}</td>
            <td class="cell right">{esc(li.get("unit_price"))}</td>
            <td class="cell right">{esc(li.get("tax_rate"))}</td>
            <td class="cell right">{esc(li.get("tax_amount"))}</td>
            <td class="cell right">{esc(li.get("line_total"))}</td>
          </tr>
        """

    extra_label = order.get("extra_charge_label") or "Extra Charge"
    extra_charge = order.get("extra_charge") or 0
    show_extra = float(extra_charge) != 0

    extra_row = (
        f"""
        <div class="sum-row">
          <div class="muted">{esc(extra_label)}</div>
          <div class="right">{esc(extra_charge)}</div>
        </div>
        """
        if show_extra
        else ""
    )

    html = f"""
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {{ font-family: Arial, sans-serif; font-size: 12px; color: #111827; }}
          .row {{ display: flex; justify-content: space-between; gap: 12px; }}
          .muted {{ color: #6b7280; }}
          .right {{ text-align: right; }}
          .box {{ border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; }}
          .h1 {{ font-size: 18px; font-weight: 700; margin: 0; }}
          table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
          th {{ background: #f3f4f6; text-align: left; padding: 8px; font-weight: 600; }}
          .cell {{ padding: 8px; border-bottom: 1px solid #f3f4f6; }}
          .badge {{ display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f3f4f6; }}
          .sum {{ width: 280px; margin-left: auto; margin-top: 10px; }}
          .sum-row {{ display: flex; justify-content: space-between; padding: 4px 0; }}
          .footer {{ margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 10px; }}
        </style>
      </head>
      <body>
        <div class="row">
          <div>{logo}</div>
          <div class="right">
            <div class="h1">{esc(company.get("company_name"))}</div>
            <div class="muted">{esc(company.get("address"))}</div>
            <div class="muted">{esc(company.get("phone"))}</div>
            <div class="muted">{esc(company.get("email"))}</div>
          </div>
        </div>

        <div class="box" style="margin-top: 12px;">
          <div class="row">
            <div><b>Invoice #</b> {esc(invoice.get("invoice_number"))}</div>
            <div><b>Invoice Date</b> {esc(invoice.get("invoice_date"))}</div>
            <div><b>Due Date</b> {esc(invoice.get("due_date"))}</div>
            <div><span class="badge">{esc(invoice.get("status"))}</span></div>
          </div>
        </div>

        <div class="box" style="margin-top: 12px;">
          <div><b>Bill To</b></div>
          <div>{esc(client.get("name"))}</div>
          <div class="muted">{esc(client.get("contact_person"))}</div>
          <div class="muted">{esc(client.get("address"))}</div>
          <div class="muted">{esc(client.get("phone"))}</div>
          <div class="muted">{esc(client.get("email"))}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Tax %</th>
              <th class="right">Tax Amount</th>
              <th class="right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>

        <div class="sum">
          <div class="sum-row">
            <div class="muted">Subtotal</div>
            <div class="right">{esc(order.get("subtotal"))}</div>
          </div>
          <div class="sum-row">
            <div class="muted">Tax</div>
            <div class="right">{esc(order.get("tax_amount"))}</div>
          </div>
          {extra_row}
          <div class="sum-row" style="font-weight: 700;">
            <div>Grand Total</div>
            <div class="right">{esc(order.get("total"))}</div>
          </div>
        </div>

        <div class="footer">
          <div><b>Notes</b></div>
          <div class="muted">{esc(invoice.get("notes"))}</div>
          <div style="margin-top: 10px;">Thank you for your business</div>
        </div>
      </body>
    </html>
    """
    return html

