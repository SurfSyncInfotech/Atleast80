import { useState, useEffect } from "react"
import { IndianRupee, RefreshCw, CheckCircle2, Building2, Calendar, FileText, ArrowDownLeft, ShieldCheck } from "lucide-react"
import KitchenLayout from "../../components/layout/KitchenLayout"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function KitchenPayoutsPage() {
  const { kitchen, refreshKitchen } = useAuth()
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshKitchen().catch(() => {})
  }, [refreshKitchen])

  const loadPayouts = async () => {
    setLoading(true)
    try {
      const data = await api("/api/kitchens/me/payouts", {}, "kitchen")
      setPayouts(data.payouts || [])
    } catch (err) {
      console.error("Failed to load kitchen payouts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayouts()
  }, [kitchen?.id])

  const totalNetPaid = payouts.reduce((acc, p) => acc + (p.netPayout || 0), 0)
  const totalCommission = payouts.reduce((acc, p) => acc + (p.commissionDeduction || 0), 0)
  const totalGross = payouts.reduce((acc, p) => acc + (p.grossAmount || 0), 0)

  return (
    <KitchenLayout>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-poppins font-bold text-2xl text-dark flex items-center gap-2.5">
              <IndianRupee className="text-primary" size={28} />
              Payouts & Settlement History
            </h1>
            <p className="font-nunito text-gray text-sm mt-0.5">
              View all bank transfers, gross order sales, commission breakdowns, and UTR reference numbers credited by Admin.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPayouts}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 font-poppins font-semibold text-xs text-dark hover:bg-gray-50 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
            Refresh History
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Total Net Received</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <IndianRupee size={20} />
              </div>
            </div>
            <p className="font-poppins font-bold text-2xl text-emerald-700">
              ₹{totalNetPaid.toLocaleString("en-IN")}
            </p>
            <p className="font-nunito text-xs text-gray mt-2">Total amount transferred to bank account</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Gross Order Sales</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FileText size={20} />
              </div>
            </div>
            <p className="font-poppins font-bold text-2xl text-dark">
              ₹{totalGross.toLocaleString("en-IN")}
            </p>
            <p className="font-nunito text-xs text-gray mt-2">Cumulative value of completed orders</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-nunito text-xs font-semibold text-gray uppercase tracking-wider">Platform Commission (10%)</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <ShieldCheck size={20} />
              </div>
            </div>
            <p className="font-poppins font-bold text-2xl text-red-600">
              -₹{totalCommission.toLocaleString("en-IN")}
            </p>
            <p className="font-nunito text-xs text-gray mt-2">Atleast80 platform service fee</p>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5 space-y-4">
          <h2 className="font-poppins font-bold text-lg text-dark">Completed Bank Settlements</h2>

          {loading ? (
            <div className="text-center py-16">
              <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
              <p className="font-nunito text-xs text-gray">Loading settlement history...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50/60 rounded-xl">
              <IndianRupee size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="font-nunito text-dark font-semibold text-sm">No payout settlements recorded yet.</p>
              <p className="font-nunito text-xs text-gray mt-1 max-w-md mx-auto">
                Admin payouts will appear here with Date, Amount, and UTR Bank Reference Number as soon as Admin transfers your settlement!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-poppins font-bold text-gray uppercase tracking-wider">
                    <th className="py-3 px-4">Paid Date</th>
                    <th className="py-3 px-4">Gross Sales</th>
                    <th className="py-3 px-4">Comm. (10%)</th>
                    <th className="py-3 px-4">Net Amount Received</th>
                    <th className="py-3 px-4">UTR Reference</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-nunito text-xs text-dark">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-dark">
                        {p.paidAt ? new Date(p.paidAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-dark">₹{p.grossAmount}</td>
                      <td className="py-3.5 px-4 font-semibold text-red-600">-₹{p.commissionDeduction}</td>
                      <td className="py-3.5 px-4 font-poppins font-bold text-emerald-700 text-base">
                        ₹{p.netPayout}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-dark text-xs">{p.utrNumber || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-100 text-emerald-800 font-poppins font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          Paid ✅
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </KitchenLayout>
  )
}
