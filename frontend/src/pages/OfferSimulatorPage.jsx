import { useMemo, useState } from "react";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";
import { useOfferSimulator } from "../hooks/useOffers";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const OFFER_TYPES = [
  { value: "buy_get_free", label: "Buy X Get Y Free" },
  { value: "slab_discount", label: "Slab Discount" },
  { value: "early_payment", label: "Early Payment" },
  { value: "loyalty_credit", label: "Loyalty Credit" },
];

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "--";
  return `₹${n.toFixed(2)}`;
}

export default function OfferSimulatorPage() {
  const simMut = useOfferSimulator();

  const [client, setClient] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const clientsQuery = useClients(clientSearch);

  const [offerType, setOfferType] = useState("buy_get_free");
  const [expectedOrderValue, setExpectedOrderValue] = useState("");
  const [costPricePercent, setCostPricePercent] = useState("80");

  const [params, setParams] = useState({
    buy_qty: "",
    free_qty: "",
    unit_price: "",
    min_order_value: "",
    discount_percent: "",
    pay_within_days: "",
    target_spend: "",
    credit_amount: "",
  });

  const [result, setResult] = useState(null);
  const chartData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "Without", value: result.revenue_without_offer, fill: "#6b7280" },
      { name: "With", value: result.revenue_with_offer, fill: "#2563eb" },
      { name: "Cost", value: result.cost_of_offer, fill: "#ef4444" },
    ];
  }, [result]);

  function reset() {
    setParams({
      buy_qty: "",
      free_qty: "",
      unit_price: "",
      min_order_value: "",
      discount_percent: "",
      pay_within_days: "",
      target_spend: "",
      credit_amount: "",
    });
    setExpectedOrderValue("");
    setCostPricePercent("80");
    setResult(null);
  }

  function buildParameters() {
    if (offerType === "buy_get_free") {
      return {
        buy_qty: Number(params.buy_qty),
        free_qty: Number(params.free_qty),
        unit_price: params.unit_price ? Number(params.unit_price) : undefined,
      };
    }
    if (offerType === "slab_discount") {
      return {
        min_order_value: Number(params.min_order_value),
        discount_percent: Number(params.discount_percent),
      };
    }
    if (offerType === "early_payment") {
      return {
        pay_within_days: Number(params.pay_within_days),
        discount_percent: Number(params.discount_percent),
      };
    }
    return {
      target_spend: Number(params.target_spend),
      credit_amount: Number(params.credit_amount),
    };
  }

  async function calculate(save) {
    const payload = {
      client_id: save ? client?.id : null,
      offer_type: offerType,
      parameters: buildParameters(),
      expected_order_value: Number(expectedOrderValue),
      cost_price_percent: Number(costPricePercent),
    };
    const out = await simMut.mutateAsync(payload);
    setResult(out.result);
  }

  const impactPositive = (result?.net_profit_impact_amount ?? 0) >= 0;

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Profit Simulator</h1>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 bg-white rounded border border-gray-200 p-5 space-y-4">
            <div className="text-sm font-semibold">Inputs</div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <div className="text-xs text-gray-600 mb-1">Client (optional)</div>
                <SearchSelect
                  value={client?.id ?? ""}
                  displayValue={client?.name ?? ""}
                  placeholder="Select client…"
                  options={clientsQuery.data ?? []}
                  isLoading={clientsQuery.isLoading}
                  isError={clientsQuery.isError}
                  searchValue={clientSearch}
                  onSearchChange={setClientSearch}
                  getOptionLabel={(c) => c.name}
                  getOptionValue={(c) => c.id}
                  onChange={(c) => setClient({ id: c.id, name: c.name })}
                />
              </div>

              <div className="col-span-2">
                <div className="text-xs text-gray-600 mb-1">Offer Type</div>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {OFFER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.value}
                    </option>
                  ))}
                </select>
              </div>

              {offerType === "buy_get_free" ? (
                <>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Buy Quantity</div>
                    <input
                      value={params.buy_qty}
                      onChange={(e) => setParams({ ...params, buy_qty: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Free Quantity</div>
                    <input
                      value={params.free_qty}
                      onChange={(e) => setParams({ ...params, free_qty: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-600 mb-1">Unit Price (₹)</div>
                    <input
                      value={params.unit_price}
                      onChange={(e) => setParams({ ...params, unit_price: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              ) : null}

              {offerType === "slab_discount" ? (
                <>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Minimum Order Value (₹)</div>
                    <input
                      value={params.min_order_value}
                      onChange={(e) => setParams({ ...params, min_order_value: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Discount %</div>
                    <input
                      value={params.discount_percent}
                      onChange={(e) => setParams({ ...params, discount_percent: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              ) : null}

              {offerType === "early_payment" ? (
                <>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Payment Within (days)</div>
                    <input
                      value={params.pay_within_days}
                      onChange={(e) => setParams({ ...params, pay_within_days: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Discount %</div>
                    <input
                      value={params.discount_percent}
                      onChange={(e) => setParams({ ...params, discount_percent: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              ) : null}

              {offerType === "loyalty_credit" ? (
                <>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Target Spend (₹)</div>
                    <input
                      value={params.target_spend}
                      onChange={(e) => setParams({ ...params, target_spend: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Credit Amount (₹)</div>
                    <input
                      value={params.credit_amount}
                      onChange={(e) => setParams({ ...params, credit_amount: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              ) : null}

              <div>
                <div className="text-xs text-gray-600 mb-1">Expected Order Value (₹)</div>
                <input
                  value={expectedOrderValue}
                  onChange={(e) => setExpectedOrderValue(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Cost Price (% of selling)</div>
                <input
                  value={costPricePercent}
                  onChange={(e) => setCostPricePercent(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => calculate(false)}
                className="ui-btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
                disabled={simMut.isPending}
              >
                Calculate
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
              >
                Reset
              </button>
              {result ? (
                <button
                  type="button"
                  onClick={() => calculate(true)}
                  className="text-sm px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                  disabled={!client?.id || simMut.isPending}
                >
                  Save Simulation
                </button>
              ) : null}
            </div>
          </div>

          <div className="col-span-2 bg-white rounded border border-gray-200 p-5 space-y-3">
            <div className="text-sm font-semibold">Results</div>
            <div className="space-y-2">
              <div className="bg-gray-50 rounded p-3 text-sm flex justify-between">
                <span className="text-gray-600">Revenue Without Offer</span>
                <span>{result ? money(result.revenue_without_offer) : "--"}</span>
              </div>
              <div className="bg-blue-50 rounded p-3 text-sm flex justify-between">
                <span className="text-gray-600">Revenue With Offer</span>
                <span>{result ? money(result.revenue_with_offer) : "--"}</span>
              </div>
              <div className="bg-red-50 rounded p-3 text-sm flex justify-between">
                <span className="text-gray-600">Cost of Offer to You</span>
                <span>{result ? money(result.cost_of_offer) : "--"}</span>
              </div>
              <div
                className={[
                  "rounded p-3 text-sm flex justify-between",
                  impactPositive ? "bg-green-50" : "bg-red-50",
                ].join(" ")}
              >
                <span className="text-gray-600">Net Profit Impact</span>
                <span>
                  {result
                    ? `${money(result.net_profit_impact_amount)} (${Number(result.net_profit_impact_percent).toFixed(2)}%)`
                    : "--"}
                </span>
              </div>
              <div className="bg-amber-50 rounded p-3 text-sm flex justify-between">
                <span className="text-gray-600">Break-even Order Size</span>
                <span>{result ? money(result.break_even_order_size) : "--"}</span>
              </div>
            </div>

            <div className="h-40">
              {result ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-600">
                  Run a calculation to see chart
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
