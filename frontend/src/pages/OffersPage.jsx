import { useEffect, useMemo, useState } from "react";
import { Gift, Search } from "lucide-react";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";
import { useActiveOffers, useAnalyseClient, useUpdateOfferStatus } from "../hooks/useOffers";
import DataTable from "../ui/DataTable.jsx";
import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";
import EmptyState from "../ui/EmptyState.jsx";

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-sm px-5 py-2 rounded-full font-medium transition-all duration-300 active:scale-95",
        active
          ? "bg-brand text-white shadow-soft"
          : "text-app-text-secondary hover:bg-white/70 hover:text-app-text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function typeBadge(type) {
  const map = {
    buy_get_free: "bg-emerald-50 text-brand",
    slab_discount: "bg-purple-50 text-purple-700",
    early_payment: "bg-green-50 text-green-700",
    loyalty_credit: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        map[type] ?? "bg-gray-100 text-gray-700",
      ].join(" ")}
    >
      {type}
    </span>
  );
}


function renderTitle(offer) {
  const d = offer.offer_details || {};
  if (typeof offer.headline === "string" && offer.headline.trim()) return offer.headline.trim();
  if (typeof d.headline === "string" && d.headline.trim()) return d.headline.trim();
  if (typeof d.title === "string" && d.title.trim()) return d.title.trim();
  if (offer.offer_type === "buy_get_free") return `Buy ${d.buy_qty} units, get ${d.free_qty} units free`;
  if (offer.offer_type === "slab_discount") return `Order above ₹${d.min_order_value}, get ${d.discount_percent}% off`;
  if (offer.offer_type === "early_payment") return `Pay within ${d.pay_within_days} days, get ${d.discount_percent}% off`;
  if (offer.offer_type === "loyalty_credit") return `Spend ₹${d.target_spend} this month, earn ₹${d.credit_amount} credit`;
  return "—";
}

function renderClientPitch(offer) {
  const d = offer.offer_details || {};
  if (typeof offer.client_pitch === "string" && offer.client_pitch.trim()) return offer.client_pitch.trim();
  if (typeof d.client_pitch === "string" && d.client_pitch.trim()) return d.client_pitch.trim();
  if (typeof d.description === "string" && d.description.trim()) return d.description.trim();
  return "";
}

function renderSupplierBenefit(offer) {
  const d = offer.offer_details || {};
  if (typeof offer.supplier_benefit === "string" && offer.supplier_benefit.trim()) return offer.supplier_benefit.trim();
  if (typeof d.supplier_benefit === "string" && d.supplier_benefit.trim()) return d.supplier_benefit.trim();
  return "";
}

export default function OffersPage() {
  const [tab, setTab] = useState("analyse");
  const [client, setClient] = useState(null);
  const [clientSearch, setClientSearch] = useState("");

  const clientsQuery = useClients(clientSearch);
  const analyseMut = useAnalyseClient();
  const statusMut = useUpdateOfferStatus();
  const activeOffersQuery = useActiveOffers();

  const [offers, setOffers] = useState([]);
  const offersFromAnalyse = useMemo(() => analyseMut.data ?? [], [analyseMut.data]);
  useEffect(() => {
    setOffers(offersFromAnalyse);
  }, [offersFromAnalyse]);

  async function analyse() {
    if (!client?.id) return;
    await analyseMut.mutateAsync(client.id);
  }

  async function setOfferStatus(offerId, status) {
    await statusMut.mutateAsync({ offerId, status });
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Offer Recommendations</h1>
      </header>

      <div className="px-6 pt-4">
        <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-full w-max border border-app-border/50">
          <TabButton active={tab === "analyse"} onClick={() => setTab("analyse")}>
            Analyse Client
          </TabButton>
          <TabButton active={tab === "active"} onClick={() => setTab("active")}>
            Active Offers
          </TabButton>
        </div>
      </div>

      <div className="p-6">
        {tab === "analyse" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <div className="text-xs text-gray-600 mb-1">Client</div>
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

              <button
                type="button"
                onClick={analyse}
                disabled={!client?.id || analyseMut.isPending}
                className="ui-btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
              >
                Analyse
              </button>
            </div>

            {analyseMut.isPending ? (
              <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-200"></div> Analysing client data…
              </div>
            ) : analyseMut.isError ? (
              <div className="ui-card p-6 text-sm text-red-600">
                {analyseMut.error?.response?.data?.error || analyseMut.error?.message || "Analysis failed. Try again."}
              </div>
            ) : !client?.id ? (
              <div className="py-12">
                <EmptyState
                  icon={Search}
                  title="Select a client"
                  description="Select a client above to begin analysis."
                />
              </div>
            ) : offers.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Gift}
                  title="No offers yet"
                  description="Click Analyse to generate personalized offers for this client."
                  actionLabel="Analyse Client"
                  onAction={analyse}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offers.map((o) => (
                  <div key={o.id} className="ui-card p-6 space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-bloom">
                    <div className="flex items-center justify-between">
                      {typeBadge(o.offer_type)}
                      <StatusPill status={o.status} />
                    </div>

                    <div>
                      <div className="text-base font-semibold text-[#111]">{renderTitle(o)}</div>
                      {renderClientPitch(o) ? (
                        <div className="mt-1.5 text-sm text-gray-600 whitespace-pre-line leading-relaxed">{renderClientPitch(o)}</div>
                      ) : null}
                    </div>

                    {renderSupplierBenefit(o) ? (
                      <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">Your benefit as supplier</div>
                        <div className="mt-1 text-sm text-amber-900 leading-relaxed">{renderSupplierBenefit(o)}</div>
                      </div>
                    ) : null}

                    <div className="text-xs text-app-text-secondary italic bg-gray-50 p-3 rounded-xl border border-gray-100">{o.reasoning}</div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        className="text-sm px-5 py-2 rounded-full font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                        disabled={o.status !== "pending" || statusMut.isPending}
                        onClick={() => setOfferStatus(o.id, "active")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="text-sm px-5 py-2 rounded-full font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                        disabled={o.status !== "pending" || statusMut.isPending}
                        onClick={() => setOfferStatus(o.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <DataTable
            gridCols="sm:grid-cols-[1.5fr_1.5fr_2fr_1fr_120px]"
            columns={[
              { key: "client", header: "Client" },
              { key: "type", header: "Offer Type" },
              { key: "details", header: "Offer Details" },
              { key: "approved_on", header: "Approved On" },
              { key: "actions", header: "Actions", align: "right" },
            ]}
            rows={activeOffersQuery.isLoading || activeOffersQuery.isError ? [] : (activeOffersQuery.data ?? [])}
            empty={
              activeOffersQuery.isLoading ? (
                "Loading…"
              ) : activeOffersQuery.isError ? (
                "Failed to load active offers"
              ) : (
                <EmptyState
                  icon={Gift}
                  title="No active offers yet"
                  description="Go to the Analyse Client tab to generate new offers."
                  actionLabel="Analyse Client"
                  onAction={() => setTab("analyse")}
                />
              )
            }
            renderRow={(o) => (
              <TableRowCard key={o.id}>
                <div className="font-semibold text-[#111] truncate">{o.client_name ?? "-"}</div>
                <div>{typeBadge(o.offer_type)}</div>
                <div className="truncate">
                  <div className="font-medium text-[#111] truncate">{renderTitle(o)}</div>
                  {renderClientPitch(o) ? <div className="mt-1 text-sm text-gray-500 truncate">{renderClientPitch(o)}</div> : null}
                  {renderSupplierBenefit(o) ? <div className="mt-1 text-xs text-amber-800 truncate">Your benefit as supplier: {renderSupplierBenefit(o)}</div> : null}
                </div>
                <div className="text-sm text-gray-500 whitespace-nowrap">{o.created_at?.slice(0, 10)}</div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm px-3 py-2 rounded-full border border-gray-200 hover:bg-[#FEE2E2] hover:text-red-600 hover:border-red-200 text-gray-600 transition-colors disabled:opacity-50 font-medium"
                    disabled={statusMut.isPending}
                    onClick={() => statusMut.mutate({ offerId: o.id, status: "rejected" })}
                  >
                    Revoke
                  </button>
                </div>
              </TableRowCard>
            )}
          />
        )}
      </div>
    </div>
  );
}
