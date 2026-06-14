import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, History, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { listItems } from "../api/inventory";
import { listSuppliers } from "../api/suppliers";
import { getPriceHistory, getSupplierPriceHistory } from "../api/priceHistory";

export default function PriceHistoryPage() {
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  
  const { data: items = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => listItems(),
  });
  
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliers(),
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["priceHistory", selectedItem, selectedSupplier],
    queryFn: () => selectedSupplier 
      ? getSupplierPriceHistory(selectedItem, selectedSupplier)
      : getPriceHistory(selectedItem),
    enabled: !!selectedItem,
  });

  // Prepare chart data: we need chronological order for charts
  const chartData = [...history].reverse().map(h => ({
    date: h.price_date,
    price: Number(h.price)
  }));

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Price History</h1>
      </div>

      <div className="ui-card mb-6">
        <div className="p-4 border-b border-app-border flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Item <span className="text-red-500">*</span></label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="ui-input w-full"
            >
              <option value="">Select an Item</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Supplier (Optional)</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="ui-input w-full"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedItem ? (
          <div className="p-12 text-center text-app-text-tertiary flex flex-col items-center">
            <History className="w-12 h-12 mb-3 opacity-20" />
            <p>Select an item to view its price history.</p>
          </div>
        ) : (
          <div className="p-0">
            {selectedItem && selectedSupplier && chartData.length > 1 && (
              <div className="p-6 border-b border-app-border bg-app-bg/30">
                <h3 className="text-sm font-semibold mb-4 text-app-text-secondary">Price Trend</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} stroke="#9ca3af" />
                      <YAxis tick={{fontSize: 12}} stroke="#9ca3af" tickFormatter={(value) => `₹${value}`} />
                      <Tooltip 
                        formatter={(value) => [`₹${value}`, "Price"]}
                        labelStyle={{color: '#374151', fontWeight: 'bold'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2} dot={{r: 4, fill: "#059669"}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-app-bg/50 border-b border-app-border">
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Date</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Supplier</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Price</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Change</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-app-text-secondary">
                        Loading history...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-app-text-secondary">
                        No price history found for this selection.
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => {
                      const supplierName = suppliers.find(s => s.id === h.supplier_id)?.name || "Unknown";
                      return (
                        <tr key={h.id} className="hover:bg-app-bg/50 transition">
                          <td className="px-5 py-3">{h.price_date}</td>
                          <td className="px-5 py-3">{supplierName}</td>
                          <td className="px-5 py-3 font-medium">₹{h.price}</td>
                          <td className="px-5 py-3">
                            {h.change_percent === null ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">First Entry</span>
                            ) : h.change_percent > 0 ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">+{Number(h.change_percent).toFixed(2)}%</span>
                            ) : h.change_percent < 0 ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{Number(h.change_percent).toFixed(2)}%</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">No Change</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-app-text-secondary max-w-[300px] truncate" title={h.notes}>
                            {h.notes || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
