import { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  Modal,
  Linking
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import {
  ChefHat,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  User,
  Leaf,
  FileText,
  Calendar,
  Store,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  ShieldCheck,
  Trash2,
  ImageIcon,
  LogOut,
  Star,
  Layers
} from "lucide-react-native"
import Button from "../../components/ui/Button"
import { useAuth } from "../../context/AuthContext"
import { api } from "../../lib/api"
import { resolveMediaUrl } from "../../lib/media"
import { cn } from "../../lib/utils"

const kitchenTypeLabel = { veg: "Pure Veg", non_veg: "Non-Veg", both: "Veg & Non-Veg" }

export default function AdminDashboardScreen() {
  const router = useRouter()
  const { logout } = useAuth()
  
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [kitchens, setKitchens] = useState([])
  const [cities, setCities] = useState([])
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selectedKitchen, setSelectedKitchen] = useState(null)
  const [stories, setStories] = useState([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [hygieneScore, setHygieneScore] = useState(85)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const [prevFilter, setPrevFilter] = useState(filter)
  const [prevSearch, setPrevSearch] = useState(search)
  const [prevCityFilter, setPrevCityFilter] = useState(cityFilter)

  // Reset page to 1 during render if any filters have changed
  if (filter !== prevFilter || search !== prevSearch || cityFilter !== prevCityFilter) {
    setPrevFilter(filter)
    setPrevSearch(search)
    setPrevCityFilter(cityFilter)
    setPage(1)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      })
      if (filter) params.set("status", filter)
      if (search) params.set("search", search)
      if (cityFilter) params.set("city", cityFilter)

      const [statsData, kitchensData] = await Promise.all([
        api("/api/admin/stats"),
        api(`/api/admin/kitchens?${params}`),
      ])
      setStats(statsData.stats || { total: 0, pending: 0, approved: 0, rejected: 0 })
      setKitchens(kitchensData.kitchens || [])
      setTotalPages(kitchensData.pagination?.totalPages || 1)
      setTotalCount(kitchensData.pagination?.total || 0)
    } catch (err) {
      console.error("Error loading dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }, [filter, search, cityFilter, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    api("/api/admin/kitchens/cities")
      .then((d) => setCities(d.cities || []))
      .catch(() => {})
  }, [])

  const loadStories = async (kitchenId) => {
    setStoriesLoading(true)
    try {
      const data = await api(`/api/admin/kitchens/${kitchenId}/stories`)
      // Map stories media
      const resolved = (data.stories || []).map((s) => ({
        ...s,
        mediaUrl: resolveMediaUrl(s.mediaUrl)
      }))
      setStories(resolved)
    } catch (err) {
      setStories([])
    } finally {
      setStoriesLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedKitchen) return
    setActionLoading(true)
    try {
      await api(`/api/admin/kitchens/${selectedKitchen.id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ hygieneScore }),
      })
      setShowApproveModal(false)
      setSelectedKitchen(null)
      Alert.alert("Success", "Kitchen approved successfully")
      await loadData()
    } catch (err) {
      Alert.alert("Error", err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedKitchen || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await api(`/api/admin/kitchens/${selectedKitchen.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      setShowRejectModal(false)
      setRejectReason("")
      setSelectedKitchen(null)
      Alert.alert("Success", "Kitchen application rejected")
      await loadData()
    } catch (err) {
      Alert.alert("Error", err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = (kitchenId) => {
    Alert.alert(
      "Confirm Delete",
      "This permanently removes the kitchen, partner account, menu, stories, and related orders. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanent",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/admin/kitchens/${kitchenId}`, { method: "DELETE" })
              setSelectedKitchen(null)
              Alert.alert("Success", "Kitchen deleted")
              await loadData()
            } catch (err) {
              Alert.alert("Error", err.message)
            }
          },
        },
      ]
    )
  }

  const handleSearchSubmit = () => {
    setSearch(searchInput.trim())
  }

  const openKitchenDetails = (k) => {
    setSelectedKitchen(k)
    loadStories(k.id)
  }

  const coverUrl = selectedKitchen ? resolveMediaUrl(selectedKitchen.cover_image) : null
  const hasCover = Boolean(coverUrl)
  const canApprove = hasCover && stories.length > 0

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-light/35">
        <View className="flex-row items-center gap-2">
          <ShieldCheck size={22} color="#0B6B3A" />
          <Text className="font-poppins font-bold text-lg text-dark">
            Admin Console
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => logout().then(() => router.replace("/(admin)/login"))}
          className="bg-cream-dark/60 p-2 rounded-full"
        >
          <LogOut size={16} color="#7A7A7A" />
        </TouchableOpacity>
      </View>

      {/* Navigation tabs */}
      <View className="flex-row bg-white border-b border-gray-light/20">
        <TouchableOpacity
          className="flex-1 py-3 border-b-2 border-primary items-center"
        >
          <Text className="font-poppins font-bold text-sm text-primary">Kitchens</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(admin)/featured")}
          className="flex-1 py-3 border-b-2 border-transparent items-center flex-row justify-center gap-1.5"
        >
          <Star size={14} color="#7A7A7A" />
          <Text className="font-poppins font-bold text-sm text-gray">Featured</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards Scroll */}
      <View className="mt-3">
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10, pb: 4 }}
        >
          {[
            { label: "Total", value: stats.total, color: "border-primary text-primary bg-primary/5", active: filter === "" },
            { label: "Pending", value: stats.pending, color: "border-amber-600 text-amber-600 bg-amber-50", active: filter === "pending" },
            { label: "Approved", value: stats.approved, color: "border-emerald-600 text-emerald-600 bg-emerald-50", active: filter === "approved" },
            { label: "Rejected", value: stats.rejected, color: "border-red-500 text-red-500 bg-red-50", active: filter === "rejected" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setFilter(item.label === "Total" ? "" : item.label.toLowerCase())}
              className={cn(
                "px-5 py-3 rounded-2xl border min-w-[100px]",
                item.active ? item.color : "border-gray-light bg-white"
              )}
            >
              <Text className="font-nunito text-[10px] text-gray uppercase tracking-wider">
                {item.label}
              </Text>
              <Text className="font-poppins font-bold text-xl text-dark mt-1">
                {item.value}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Toolbar / Search & Filters */}
      <View className="bg-white border-b border-gray-light/35 p-3.5 mt-3 gap-3">
        {/* Search */}
        <View className="flex-row items-center w-full px-4 rounded-xl border border-gray-light bg-cream/40 h-[44px]">
          <Search size={16} color="#7A7A7A" className="mr-2" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search kitchen, owner, city..."
            placeholderTextColor="#7A7A7A"
            className="flex-1 h-full text-xs font-nunito text-dark"
          />
          {searchInput ? (
            <TouchableOpacity
              onPress={() => {
                setSearchInput("")
                setSearch("")
              }}
            >
              <X size={16} color="#7A7A7A" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* City Filter */}
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setCityFilter("")}
            className={cn(
              "px-3.5 py-1.5 rounded-full border",
              cityFilter === "" ? "border-primary bg-primary/5" : "border-gray-light bg-white"
            )}
          >
            <Text className={cn("text-[10px] font-poppins font-bold", cityFilter === "" ? "text-primary" : "text-dark")}>
              All Cities
            </Text>
          </TouchableOpacity>
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => setCityFilter(city)}
              className={cn(
                "px-3.5 py-1.5 rounded-full border",
                cityFilter === city ? "border-primary bg-primary/5" : "border-gray-light bg-white"
              )}
            >
              <Text className={cn("text-[10px] font-poppins font-bold", cityFilter === city ? "text-primary" : "text-dark")}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      ) : kitchens.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} className="px-6">
          <ChefHat size={48} color="#D8D8D8" className="mb-4" />
          <Text className="font-poppins font-bold text-dark text-base text-center">
            No kitchens found
          </Text>
          <Text className="font-nunito text-sm text-gray text-center mt-1">
            Try resetting filters or changing the search keyword
          </Text>
        </ScrollView>
      ) : (
        <View className="flex-1">
          <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
            <View className="gap-3 py-2">
              {kitchens.map((k) => (
                <TouchableOpacity
                  key={k.id}
                  onPress={() => openKitchenDetails(k)}
                  className="bg-white rounded-xl border border-gray-light/60 p-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="font-poppins font-bold text-sm text-dark">{k.name}</Text>
                      <Text className="font-nunito text-[11px] text-gray mt-0.5">{k.speciality}</Text>
                    </View>
                    <View
                      className={cn(
                        "px-2.5 py-0.5 rounded-full border",
                        k.status === "approved"
                          ? "bg-emerald-50 border-emerald-200"
                          : k.status === "rejected"
                          ? "bg-red-50 border-red-200"
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-[9px] font-poppins font-bold capitalize",
                          k.status === "approved"
                            ? "text-emerald-700"
                            : k.status === "rejected"
                            ? "text-red-700"
                            : "text-amber-700"
                        )}
                      >
                        {k.status}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 gap-1.5 border-t border-gray-light/20 pt-2.5">
                    <View className="flex-row items-center gap-1.5">
                      <User size={12} color="#7A7A7A" />
                      <Text className="font-nunito text-xs text-dark-light">{k.owner_name}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <MapPin size={12} color="#7A7A7A" />
                      <Text className="font-nunito text-xs text-dark-light">{k.city}, {k.state}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Phone size={12} color="#7A7A7A" />
                      <Text className="font-nunito text-xs text-dark-light">{k.phone}</Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center mt-3 pt-2.5 border-t border-gray-light/10">
                    <Text className="font-nunito text-[10px] text-gray">
                      {new Date(k.submitted_at).toLocaleDateString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => openKitchenDetails(k)}
                      className="flex-row items-center gap-1 bg-cream-dark/50 px-2 py-1 rounded-lg"
                    >
                      <Eye size={12} color="#1F1F1F" />
                      <Text className="font-poppins font-bold text-[9px] text-dark">Details</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View className="flex-row items-center justify-between py-4 mt-2 border-t border-gray-light/35">
                <Text className="font-nunito text-xs text-gray">
                  Page {page} of {totalPages} ({totalCount} total)
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    disabled={page <= 1}
                    onPress={() => setPage(page - 1)}
                    className={cn(
                      "p-2 bg-white rounded-lg border border-gray-light",
                      page <= 1 && "opacity-30"
                    )}
                  >
                    <ChevronLeft size={16} color="#1F1F1F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={page >= totalPages}
                    onPress={() => setPage(page + 1)}
                    className={cn(
                      "p-2 bg-white rounded-lg border border-gray-light",
                      page >= totalPages && "opacity-30"
                    )}
                  >
                    <ChevronRight size={16} color="#1F1F1F" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Details Slide-up Modal */}
      {selectedKitchen && (
        <Modal animationType="slide" transparent={true} visible={Boolean(selectedKitchen)} onRequestClose={() => setSelectedKitchen(null)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[90%] pb-6">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-light/35">
                <View>
                  <Text className="font-poppins font-bold text-base text-dark" numberOfLines={1}>
                    {selectedKitchen.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <Text className="font-nunito text-xs text-gray">Status:</Text>
                    <Text className="font-poppins font-bold text-xs capitalize text-primary">{selectedKitchen.status}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedKitchen(null)} className="p-1.5 rounded-full bg-cream-dark/50">
                  <X size={18} color="#1F1F1F" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-5 py-4 space-y-6" showsVerticalScrollIndicator={false}>
                {/* Details Section */}
                <View className="bg-cream/40 p-4 rounded-xl border border-gray-light/20 gap-3">
                  <Text className="font-poppins font-bold text-xs text-gray uppercase tracking-wider mb-1">
                    Kitchen Info
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">Owner Name</Text>
                    <Text className="font-poppins font-semibold text-xs text-dark">{selectedKitchen.owner_name}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">Speciality</Text>
                    <Text className="font-poppins font-semibold text-xs text-dark">{selectedKitchen.speciality}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">Signature Dish</Text>
                    <Text className="font-poppins font-semibold text-xs text-dark">{selectedKitchen.best_item}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">Kitchen Type</Text>
                    <Text className="font-poppins font-semibold text-xs text-dark capitalize">
                      {kitchenTypeLabel[selectedKitchen.kitchen_type] || selectedKitchen.kitchen_type}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">Hours</Text>
                    <Text className="font-poppins font-semibold text-xs text-dark">{selectedKitchen.opening_time}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">Submitted</Text>
                    <Text className="font-poppins font-semibold text-[10px] text-dark">
                      {new Date(selectedKitchen.submitted_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Cover Image Section */}
                <View>
                  <Text className="font-poppins font-bold text-xs text-dark-light mb-2">Home Card Cover Image</Text>
                  {hasCover ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(coverUrl)}
                      className="rounded-xl overflow-hidden border border-gray-light w-full aspect-video bg-cream-dark"
                    >
                      <Image source={{ uri: coverUrl }} className="w-full h-full object-cover" />
                    </TouchableOpacity>
                  ) : (
                    <View className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                      <Text className="text-amber-700 text-xs font-nunito leading-relaxed">
                        No cover card image uploaded yet. Must upload before admin approval.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Verification Media Section */}
                <View>
                  <Text className="font-poppins font-bold text-xs text-dark-light mb-2">Hygiene Verification Media</Text>
                  {storiesLoading ? (
                    <ActivityIndicator size="small" color="#0B6B3A" />
                  ) : stories.length === 0 ? (
                    <View className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                      <Text className="text-amber-700 text-xs font-nunito leading-relaxed">
                        No verification media uploaded yet. Kitchen must upload verification proof stories before admin approval.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                      {stories.map((story) => (
                        <TouchableOpacity
                          key={story.id}
                          onPress={() => Linking.openURL(story.mediaUrl)}
                          className="w-32 aspect-video bg-dark rounded-xl overflow-hidden border border-gray-light"
                        >
                          <Image source={{ uri: story.mediaUrl }} className="w-full h-full object-cover" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Compliance Section */}
                <View className="bg-cream/40 p-4 rounded-xl border border-gray-light/20 gap-2">
                  <Text className="font-poppins font-bold text-xs text-gray uppercase tracking-wider mb-1">
                    Compliance Documents
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="font-nunito text-xs text-gray">FSSAI License No.</Text>
                    <Text className="font-poppins font-semibold text-xs text-dark">
                      {selectedKitchen.fssai_number || "—"}
                    </Text>
                  </View>
                  {selectedKitchen.fssai_license ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(selectedKitchen.fssai_license)}
                      className="flex-row items-center gap-1.5 self-start mt-2"
                    >
                      <FileText size={14} color="#0B6B3A" />
                      <Text className="font-poppins font-semibold text-xs text-primary underline">
                        View FSSAI license document
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Description */}
                {selectedKitchen.description ? (
                  <View>
                    <Text className="font-poppins font-bold text-xs text-dark-light mb-1.5">Description / About</Text>
                    <Text className="font-nunito text-xs text-dark-light leading-relaxed">
                      {selectedKitchen.description}
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                {selectedKitchen.status === "pending" && (
                  <View className="flex-row gap-3 border-t border-gray-light/20 pt-4 pb-4">
                    <TouchableOpacity
                      disabled={!canApprove}
                      onPress={() => setShowApproveModal(true)}
                      className={cn(
                        "flex-1 py-3 rounded-xl bg-primary items-center justify-center",
                        !canApprove && "opacity-50"
                      )}
                    >
                      <Text className="font-poppins font-bold text-sm text-white">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowRejectModal(true)}
                      className="flex-1 py-3 rounded-xl border border-red-300 bg-white items-center justify-center"
                    >
                      <Text className="font-poppins font-bold text-sm text-red-600">Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => handleDelete(selectedKitchen.id)}
                  className="w-full py-2.5 rounded-xl border border-red-100 bg-red-50 flex-row justify-center items-center gap-1.5"
                >
                  <Trash2 size={14} color="#EF4444" />
                  <Text className="font-poppins font-bold text-xs text-red-600">Delete Kitchen</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <Modal animationType="fade" transparent={true} visible={showApproveModal} onRequestClose={() => setShowApproveModal(false)}>
          <View className="flex-1 bg-black/55 justify-center items-center p-6">
            <View className="bg-white rounded-3xl w-full max-w-md p-6 gap-4">
              <Text className="font-poppins font-bold text-base text-dark">Approve Kitchen</Text>
              <Text className="font-nunito text-xs text-gray leading-relaxed">
                Review this kitchen and assign a hygiene score (80% and above earns the verified badge on their storefront).
              </Text>

              <View className="gap-2">
                <Text className="font-poppins text-xs font-bold text-dark-light">Hygiene Score</Text>
                <View className="flex-row items-center w-full px-4 rounded-xl border border-gray-light bg-cream/40 h-[48px]">
                  <TextInput
                    value={String(hygieneScore)}
                    onChangeText={(val) => setHygieneScore(Number(val) || 85)}
                    keyboardType="numeric"
                    placeholder="85"
                    className="flex-1 h-full text-sm font-nunito text-dark"
                  />
                  <Text className="font-poppins font-bold text-sm text-primary">%</Text>
                </View>
              </View>

              <View className="flex-row gap-3 mt-2">
                <Button variant="outline" className="flex-1" onPress={() => setShowApproveModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" loading={actionLoading} onPress={handleApprove}>
                  Confirm Approval
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal animationType="fade" transparent={true} visible={showRejectModal} onRequestClose={() => setShowRejectModal(false)}>
          <View className="flex-1 bg-black/55 justify-center items-center p-6">
            <View className="bg-white rounded-3xl w-full max-w-md p-6 gap-4">
              <Text className="font-poppins font-bold text-base text-dark">Reject Application</Text>
              <Text className="font-nunito text-xs text-gray">
                Provide a reason for rejection. This will be visible to the kitchen owner.
              </Text>

              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Invalid FSSAI document, hygiene issues, incorrect details..."
                multiline={true}
                numberOfLines={3}
                style={{ textAlignVertical: "top" }}
                className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark min-h-[80px]"
              />

              <View className="flex-row gap-3 mt-2">
                <Button variant="outline" className="flex-1" onPress={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 active:bg-red-700"
                  loading={actionLoading}
                  onPress={handleReject}
                >
                  Confirm Reject
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
