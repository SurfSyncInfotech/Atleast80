import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { IndianRupee, Landmark, QrCode, CheckCircle, AlertCircle } from "lucide-react-native"
import { api } from "../../lib/api"
import { cn } from "../../lib/utils"

export default function PayoutSettingsSection() {
  const [payoutMode, setPayoutMode] = useState("upi")
  const [bankAccountName, setBankAccountName] = useState("")
  const [bankName, setBankName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [bankIfsc, setBankIfsc] = useState("")
  const [upiId, setUpiId] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    api("/api/kitchens/me/payout-settings")
      .then((data) => {
        if (!active) return
        setPayoutMode(data.payoutMode || "upi")
        setBankAccountName(data.bankAccountName || "")
        setBankName(data.bankName || "")
        setBankAccountNumber(data.bankAccountNumber || "")
        setBankIfsc(data.bankIfsc || "")
        setUpiId(data.upiId || "")
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load payout settings")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    setError("")
    setSuccess("")

    if (payoutMode === "bank") {
      if (!bankAccountName.trim()) {
        setError("Account Holder Name is required")
        return
      }
      if (!bankName.trim()) {
        setError("Bank Name is required")
        return
      }
      if (!bankAccountNumber.trim()) {
        setError("Account Number is required")
        return
      }
      if (!bankIfsc.trim() || bankIfsc.trim().length !== 11) {
        setError("Valid 11-character IFSC Code is required (e.g. SBIN0001234)")
        return
      }
    } else {
      if (!upiId.trim() || !upiId.includes("@")) {
        setError("Valid UPI ID / VPA is required (e.g. name@upi)")
        return
      }
    }

    setSaving(true)
    try {
      await api("/api/kitchens/me/payout-settings", {
        method: "PUT",
        body: JSON.stringify({
          payoutMode,
          bankAccountName: bankAccountName.trim(),
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfsc: bankIfsc.trim().toUpperCase(),
          upiId: upiId.trim().toLowerCase(),
        }),
      })

      setSuccess("Payout details saved successfully!")
      setTimeout(() => setSuccess(""), 4000)
    } catch (err) {
      setError(err.message || "Failed to save payout settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="bg-white rounded-2xl border border-gray-light/35 p-5 mb-5 shadow-sm items-center justify-center py-8">
        <ActivityIndicator size="small" color="#0B6B3A" />
        <Text className="font-nunito text-xs text-gray mt-2">Loading payout details...</Text>
      </View>
    )
  }

  const isConfigured = payoutMode === "upi" ? Boolean(upiId) : Boolean(bankAccountNumber && bankIfsc)

  return (
    <View className="bg-white rounded-2xl border border-gray-light/35 p-4 sm:p-5 mb-5 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
            <IndianRupee size={20} color="#0B6B3A" />
          </View>
          <View className="flex-1">
            <Text className="font-poppins font-bold text-dark text-base">Payout & Bank Details</Text>
            <Text className="font-nunito text-xs text-gray">Receive kitchen sales payouts directly</Text>
          </View>
        </View>
        {isConfigured ? (
          <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <CheckCircle size={12} color="#059669" />
            <Text className="font-poppins font-semibold text-[10px] text-emerald-700">Saved</Text>
          </View>
        ) : (
          <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
            <Text className="font-poppins font-semibold text-[10px] text-amber-700">Required</Text>
          </View>
        )}
      </View>

      {/* Alerts */}
      {Boolean(error) && (
        <View className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 flex-row items-center gap-2">
          <AlertCircle size={16} color="#DC2626" />
          <Text className="font-nunito text-xs text-red-700 flex-1">{error}</Text>
        </View>
      )}

      {Boolean(success) && (
        <View className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex-row items-center gap-2">
          <CheckCircle size={16} color="#059669" />
          <Text className="font-nunito text-xs text-emerald-700 flex-1">{success}</Text>
        </View>
      )}

      {/* Mode Selector */}
      <View className="mb-4">
        <Text className="font-poppins font-semibold text-xs text-dark uppercase tracking-wider mb-2">
          Select Payout Method
        </Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setPayoutMode("upi")}
            activeOpacity={0.8}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 p-3 rounded-xl border",
              payoutMode === "upi"
                ? "bg-primary/10 border-primary"
                : "bg-gray-50 border-gray-200"
            )}
          >
            <QrCode size={16} color={payoutMode === "upi" ? "#0B6B3A" : "#6B7280"} />
            <Text
              className={cn(
                "font-poppins font-semibold text-xs",
                payoutMode === "upi" ? "text-primary" : "text-gray-600"
              )}
            >
              UPI ID / VPA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPayoutMode("bank")}
            activeOpacity={0.8}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 p-3 rounded-xl border",
              payoutMode === "bank"
                ? "bg-primary/10 border-primary"
                : "bg-gray-50 border-gray-200"
            )}
          >
            <Landmark size={16} color={payoutMode === "bank" ? "#0B6B3A" : "#6B7280"} />
            <Text
              className={cn(
                "font-poppins font-semibold text-xs",
                payoutMode === "bank" ? "text-primary" : "text-gray-600"
              )}
            >
              Bank Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Fields */}
      {payoutMode === "upi" ? (
        <View className="mb-4">
          <Text className="font-poppins font-semibold text-xs text-dark mb-1">
            UPI ID / VPA Handle <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={upiId}
            onChangeText={setUpiId}
            placeholder="e.g. 9876543210@paytm or name@okicici"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs text-dark bg-white"
          />
          <Text className="font-nunito text-[11px] text-gray mt-1">
            Payouts will be transferred directly to this UPI ID on settlement days.
          </Text>
        </View>
      ) : (
        <View className="gap-3 mb-4">
          <View>
            <Text className="font-poppins font-semibold text-xs text-dark mb-1">
              Account Holder Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={bankAccountName}
              onChangeText={setBankAccountName}
              placeholder="Full name as per bank"
              placeholderTextColor="#9CA3AF"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs text-dark bg-white"
            />
          </View>

          <View>
            <Text className="font-poppins font-semibold text-xs text-dark mb-1">
              Bank Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. State Bank of India"
              placeholderTextColor="#9CA3AF"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs text-dark bg-white"
            />
          </View>

          <View>
            <Text className="font-poppins font-semibold text-xs text-dark mb-1">
              Account Number <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              placeholder="Enter bank account number"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-nunito text-xs text-dark bg-white"
            />
          </View>

          <View>
            <Text className="font-poppins font-semibold text-xs text-dark mb-1">
              IFSC Code <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={bankIfsc}
              onChangeText={(val) => setBankIfsc(val.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor="#9CA3AF"
              maxLength={11}
              autoCapitalize="characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-xs uppercase text-dark bg-white"
            />
          </View>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
        className="w-full py-3 bg-primary rounded-xl flex-row items-center justify-center gap-2"
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <CheckCircle size={16} color="#FFFFFF" />
        )}
        <Text className="font-poppins font-semibold text-xs text-white">
          {saving ? "Saving Details..." : "Save Payout Details"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
