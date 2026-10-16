import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  BackHandler
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  Plus,
  Minus,
  Trash2,
  Edit2,
  UtensilsCrossed,
  Lock,
  Leaf,
  ImageIcon,
  Upload,
  X,
  Video,
  Play,
  Tag,
  Eye,
  EyeOff,
  Check,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Pencil,
  ArrowRight,
  Bell,
  ChevronDown,
  Globe,
  Search,
} from "lucide-react-native"
import * as DocumentPicker from "expo-document-picker"
import Button from "../../../components/ui/Button"
import { useAuth } from "../../../context/AuthContext"
import { api, uploadMenuFiles } from "../../../lib/api"
import { resolveMenuItemMedia, resolveMediaUrl } from "../../../lib/media"
import { cn } from "../../../lib/utils"
import { PRESET_GROCERY_ITEMS, SUGGESTED_FOOD_ITEMS } from "../../../data/groceryPresetGallery"
import { GROCERY_MASTER_CATALOG, GROCERY_LANGUAGES } from "../../../data/groceryMasterCatalog"

const emptyForm = {
  name: "",
  localName: "",
  description: "",
  price: "",
  category: "food",
  packagingType: "packaged",
  unitValue: "1",
  unit: "kg",
  gstRate: 5,
  itemType: "veg",
}

const MAX_IMAGES = 8
const MAX_VIDEOS = 3

export default function KitchenMenuScreen() {
  const { kitchen, refreshKitchen } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  
  const [selectedGroceryLang, setSelectedGroceryLang] = useState("en")
  const [selectedGroceryId, setSelectedGroceryId] = useState("")
  const [isCustomGrocery, setIsCustomGrocery] = useState(false)
  const [groceryPickerModalOpen, setGroceryPickerModalOpen] = useState(false)
  const [grocerySearchQuery, setGrocerySearchQuery] = useState("")
  
  const [existingImages, setExistingImages] = useState([])
  const [existingVideos, setExistingVideos] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [pendingVideos, setPendingVideos] = useState([])
  
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [groceryPresets, setGroceryPresets] = useState(PRESET_GROCERY_ITEMS)

  const [activeTab, setActiveTab] = useState("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const isApproved = kitchen?.status === "approved"

  // Real-time live alert popup state
  const [liveAlert, setLiveAlert] = useState(null)
  const seenAlertIdsRef = useRef(new Set())
  const isFirstAlertFetchRef = useRef(true)

  const loadPresets = async () => {
    try {
      const data = await api("/api/menu/grocery-presets")
      if (data?.presets && data.presets.length > 0) {
        setGroceryPresets(data.presets)
      }
    } catch {
      // Keep initial fallback if offline
    }
  }

  const loadMenu = async () => {
    loadPresets()
    if (!isApproved) return
    setLoading(true)
    try {
      const data = await api("/api/menu/me", {}, "kitchen")
      setItems((data.items || []).map(resolveMenuItemMedia))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshKitchen().catch(() => {})
    loadPresets()
  }, [])

  // Initial load and fast 3s polling for real-time menu status & alerts
  useEffect(() => {
    if (!isApproved) {
      setLoading(false)
      return
    }

    loadMenu()

    const interval = setInterval(async () => {
      // 1. Sync menu items in background if user is not actively editing
      if (!showForm && !editingId) {
        try {
          const data = await api("/api/menu/me", {}, "kitchen")
          if (data?.items) {
            setItems(data.items.map(resolveMenuItemMedia))
          }
        } catch {}
      }

      // 2. Check for new alerts (item rejected, edited by admin, etc.)
      try {
        const d = await api("/api/alerts", {}, "kitchen")
        const list = d.alerts || []
        if (list.length > 0) {
          const unseen = list.find((a) => !seenAlertIdsRef.current.has(a.id))
          if (unseen) {
            if (!isFirstAlertFetchRef.current || unseen.title?.includes("Item") || unseen.title?.includes("Admin")) {
              setLiveAlert(unseen)
            }
            list.forEach((a) => seenAlertIdsRef.current.add(a.id))
          }
        }
        isFirstAlertFetchRef.current = false
      } catch {}
    }, 3000)

    return () => clearInterval(interval)
  }, [isApproved, kitchen?.status, showForm, editingId])

  const dismissLiveAlert = async (id) => {
    try {
      await api(`/api/alerts/${id}/dismiss`, { method: "POST" }, "kitchen")
      setLiveAlert(null)
    } catch {
      setLiveAlert(null)
    }
  }

  const closeForm = () => {
    Keyboard.dismiss()
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setSelectedGroceryLang("en")
    setSelectedGroceryId("")
    setIsCustomGrocery(false)
    setGroceryPickerModalOpen(false)
    setGrocerySearchQuery("")
    setExistingImages([])
    setExistingVideos([])
    setPendingImages([])
    setPendingVideos([])
    setError("")
  }

  useEffect(() => {
    if (!showForm) return

    const backAction = () => {
      if (groceryPickerModalOpen) {
        setGroceryPickerModalOpen(false)
        return true
      }
      closeForm()
      return true
    }

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction)
    return () => backHandler.remove()
  }, [showForm, groceryPickerModalOpen])

  const openAdd = () => {
    setForm(emptyForm)
    setSelectedGroceryLang("en")
    setSelectedGroceryId("")
    setIsCustomGrocery(false)
    setGroceryPickerModalOpen(false)
    setGrocerySearchQuery("")
    setExistingImages([])
    setExistingVideos([])
    setPendingImages([])
    setPendingVideos([])
    setEditingId(null)
    setShowForm(true)
    setError("")
  }

  const openEdit = (item) => {
    const isGrocery = item.category === "grocery"
    let matchedCatalogId = ""
    let isCustom = false
    let extractedUnitValue = item.unit_value || item.unitValue || "1"
    let extractedUnit = item.unit || "kg"
    let cleanName = item.name || ""

    if (isGrocery) {
      const unitMatch = cleanName.match(/\(([^\)]+)\)$/)
      if (unitMatch) {
        const parts = unitMatch[1].trim().split(/\s+/)
        if (parts.length >= 2) {
          extractedUnitValue = parts[0]
          extractedUnit = parts[1].toLowerCase()
        }
        cleanName = cleanName.replace(/\s*\([^\)]+\)$/, "").trim()
      }

      const match = GROCERY_MASTER_CATALOG.find((g) => {
        return Object.values(g.names).some((name) => {
          const cleanItemName = cleanName.toLowerCase()
          const cleanCatName = (name || "").toLowerCase()
          return cleanItemName.includes(cleanCatName) || cleanCatName.includes(cleanItemName)
        })
      })
      if (match) {
        matchedCatalogId = match.id
        isCustom = false
      } else {
        matchedCatalogId = "custom"
        isCustom = true
      }
    }

    setSelectedGroceryLang("en")
    setSelectedGroceryId(matchedCatalogId)
    setIsCustomGrocery(isCustom)
    setGroceryPickerModalOpen(false)
    setGrocerySearchQuery("")

    const defaultGst = isGrocery ? 5 : 5
    const itemGst = item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : (item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : defaultGst)

    setForm({
      name: cleanName,
      localName: item.local_name || item.localName || "",
      description: item.description || "",
      price: String(item.price),
      category: item.category,
      packagingType: item.packaging_type || item.packagingType || "packaged",
      unitValue: String(extractedUnitValue),
      unit: extractedUnit,
      gstRate: itemGst,
      itemType: item.item_type || "veg",
    })
    
    // Media urls are resolved, clean them before saving or keep as is (backend handles it)
    setExistingImages(
      (item.images?.length ? item.images : item.image ? [item.image] : []).map(resolveMediaUrl).filter(Boolean)
    )
    setExistingVideos((item.videos || []).map(resolveMediaUrl).filter(Boolean))
    setPendingImages([])
    setPendingVideos([])
    setEditingId(item.id)
    setShowForm(true)
    setError("")
  }

  const pickMedia = async (type) => {
    try {
      const isImage = type === "image"
      const result = await DocumentPicker.getDocumentAsync({
        type: isImage ? "image/*" : "video/*",
        multiple: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isImage) {
          const room = MAX_IMAGES - existingImages.length - pendingImages.length
          const accepted = result.assets.slice(0, room).map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || "image/jpeg",
          }))
          setPendingImages((prev) => [...prev, ...accepted])
        } else {
          const room = MAX_VIDEOS - existingVideos.length - pendingVideos.length
          const accepted = result.assets.slice(0, room).map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || "video/mp4",
          }))
          setPendingVideos((prev) => [...prev, ...accepted])
        }
      }
    } catch (err) {
      console.log("Error picking media:", err)
    }
  }

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingVideo = (index) => {
    setExistingVideos((prev) => prev.filter((_, i) => i !== index))
  }

  const removePendingImage = (index) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removePendingVideo = (index) => {
    setPendingVideos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      setError("Name and price are required")
      return
    }

    setSaving(true)
    setError("")

    try {
      let uploadedImages = []
      let uploadedVideos = []

      // In RN, we check files to upload
      const filesToUpload = [...pendingImages, ...pendingVideos]

      if (filesToUpload.length > 0) {
        const uploaded = await uploadMenuFiles(filesToUpload)
        uploadedImages = uploaded.images || []
        uploadedVideos = uploaded.videos || []
      }

      // Convert resolved http/https urls back to relative if they are our own api files,
      // or keep since the backend will parse them.
      const cleanUrl = (url) => {
        if (!url) return null
        const match = url.match(/\/uploads\/[^\s]+/)
        return match ? match[0] : url
      }

      const images = [...existingImages.map(cleanUrl), ...uploadedImages]
      const videos = [...existingVideos.map(cleanUrl), ...uploadedVideos]

      let finalName = form.name.trim()
      if (form.category === "grocery" && form.unitValue && form.unit) {
        finalName = `${finalName} (${form.unitValue} ${form.unit})`
      }
      const calculatedGstRate = form.category === "grocery"
        ? (Number(form.gstRate) ?? 5)
        : 5

      const payload = {
        name: finalName,
        localName: form.localName ? form.localName.trim() : null,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        packagingType: form.packagingType || "packaged",
        unitValue: form.unitValue,
        unit: form.unit,
        gstRate: calculatedGstRate,
        itemType: form.itemType,
        images,
        videos,
        image: images[0] || null,
      }

      if (editingId) {
        await api(`/api/menu/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, "kitchen")
      } else {
        await api("/api/menu", {
          method: "POST",
          body: JSON.stringify(payload),
        }, "kitchen")
      }

      closeForm()
      await loadMenu()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const performDelete = async (id) => {
    setDeleteConfirmId(null)
    try {
      await api(`/api/menu/${id}`, { method: "DELETE" }, "kitchen")
      await loadMenu()
    } catch (err) {
      Alert.alert("Error", err.message)
    }
  }

  const handleDelete = (id) => {
    setDeleteConfirmId(id)
  }

  const toggleAvailability = async (item) => {
    try {
      await api(`/api/menu/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ isAvailable: !item.is_available }),
      }, "kitchen")
      await loadMenu()
    } catch (err) {
      Alert.alert("Error", err.message)
    }
  }

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true
    return item.category === activeTab
  })

  if (!isApproved) {
    return (
      <SafeAreaView className="flex-1 bg-cream justify-center items-center px-6">
        <View className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-6">
          <Lock size={36} color="#D97706" />
        </View>
        <Text className="font-poppins font-bold text-xl text-dark text-center">
          Menu Locked
        </Text>
        <Text className="font-nunito text-gray text-sm mt-3 text-center leading-relaxed max-w-sm">
          You can add menu items after admin approves your kitchen.
          {kitchen?.status === "pending" && " Your application is currently under review."}
          {kitchen?.status === "rejected" && " Please contact support if you need to reapply."}
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-light/35">
        <View>
          <Text className="font-poppins font-bold text-lg text-dark">
            Menu Management
          </Text>
          <Text className="font-nunito text-xs text-gray">
            {items.length} item{items.length !== 1 ? "s" : ""} on your menu
          </Text>
        </View>
        <View className="flex-row gap-2">

          <TouchableOpacity
            onPress={openAdd}
            className="flex-row items-center gap-1 bg-primary px-3 py-1.5 rounded-lg"
          >
            <Plus size={13} color="#FFF" />
            <Text className="font-poppins font-bold text-[10px] text-white">Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 px-4 py-3 bg-cream">
        {["all", "food", "grocery"].map((cat) => {
          const isActive = activeTab === cat
          const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveTab(cat)}
              className={cn(
                "px-4 py-1.5 rounded-lg border",
                isActive
                  ? "bg-primary border-primary"
                  : "bg-white border-gray-light"
              )}
            >
              <Text
                className={cn(
                  "font-poppins font-semibold text-xs capitalize",
                  isActive ? "text-white" : "text-gray"
                )}
              >
                {cat === "all" ? `All (${count})` : `${cat} (${count})`}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0B6B3A" />
        </View>
      ) : filteredItems.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} className="px-6">
          <UtensilsCrossed size={48} color="#D8D8D8" className="mb-4" />
          <Text className="font-poppins font-bold text-dark text-base text-center">
            No menu items yet
          </Text>
          <Text className="font-nunito text-sm text-gray text-center mt-1">
            Add your first dish or grocery item
          </Text>
          <Button onPress={openAdd} className="mt-5 px-6" size="sm">
            <Plus size={14} color="#FFF" />
            <Text className="font-poppins font-bold text-white text-xs">Add First Item</Text>
          </Button>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4">
          <View className="py-2 gap-4">
            {filteredItems.map((item) => {
              const cover = item.image
              const imageCount = item.images?.length || (item.image ? 1 : 0)
              const videoCount = item.videos?.length || 0

              return (
                <View
                  key={item.id}
                  className={cn(
                    "bg-white rounded-xl border border-gray-light/60 overflow-hidden shadow-sm flex-row",
                    !item.is_available && "opacity-60"
                  )}
                >
                  {/* Left: Image */}
                  <View className="w-28 h-28 bg-cream relative flex-shrink-0">
                    {cover ? (
                      <Image source={{ uri: cover }} className="w-full h-full object-cover" />
                    ) : (
                      <View className="w-full h-full justify-center items-center">
                        <ImageIcon size={28} color="#D8D8D8" />
                      </View>
                    )}
                    <View className="absolute top-1 left-1 flex-col gap-0.5">
                      <View className="bg-white/90 px-1.5 py-0.5 rounded-full border border-gray-light/20">
                        <Text className="text-[8px] font-poppins font-bold text-dark capitalize">
                          {item.category}
                        </Text>
                      </View>
                      <View
                        className={cn(
                          "px-1.5 py-0.5 rounded-full border border-gray-light/20",
                          item.item_type === "veg" ? "bg-emerald-50" : "bg-red-50"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-[8px] font-poppins font-bold capitalize",
                            item.item_type === "veg" ? "text-emerald-700" : "text-red-700"
                          )}
                        >
                          {item.item_type === "veg" ? "Veg" : "Non-Veg"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Info & Actions */}
                  <View className="flex-1 p-3 justify-between">
                    <View>
                      <View className="flex-row justify-between items-start gap-1">
                        <Text className="font-poppins font-bold text-sm text-dark flex-1" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="font-poppins font-bold text-primary text-sm">
                          ₹{Number(item.price)}
                        </Text>
                      </View>
                      {(item.local_name || item.localName) ? (
                        <Text className="font-nunito text-[11px] text-gray-500" numberOfLines={1}>
                          {item.local_name || item.localName}
                        </Text>
                      ) : null}

                      {item.category === "grocery" && (() => {
                        const pkg = item.packaging_type || item.packagingType || "packaged"
                        const defaultGst = pkg === "loose" ? 0 : 5
                        const itemGst = item.gst_rate !== undefined && item.gst_rate !== null ? Number(item.gst_rate) : (item.gstRate !== undefined && item.gstRate !== null ? Number(item.gstRate) : defaultGst)
                        return (
                          <View className="flex-row items-center gap-1 mt-1 flex-wrap">
                            <View className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              <Text className="text-[9px] font-poppins font-semibold text-slate-700 capitalize">
                                {pkg}
                              </Text>
                            </View>
                            <View className={cn(
                              "px-1.5 py-0.5 rounded border",
                              itemGst === 0 ? "bg-slate-50 border-slate-200" : "bg-emerald-50 border-emerald-200"
                            )}>
                              <Text className={cn("text-[9px] font-poppins font-bold", itemGst === 0 ? "text-slate-700" : "text-emerald-700")}>
                                GST: {itemGst}%
                              </Text>
                            </View>
                          </View>
                        )
                      })()}
                      
                      {item.offer ? (
                        <View className="bg-accent/10 self-start px-2 py-0.5 rounded-full mt-1">
                          <Text className="font-poppins font-semibold text-[9px] text-accent">
                            {item.offer}
                          </Text>
                        </View>
                      ) : null}

                      {item.description ? (
                        <Text className="font-nunito text-xs text-gray mt-1" numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-2 mt-2 pt-2 border-t border-gray-light/20">
                      <TouchableOpacity
                        onPress={() => openEdit(item)}
                        className="flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-light bg-white"
                      >
                        <Edit2 size={12} color="#1F1F1F" />
                        <Text className="font-poppins font-bold text-[10px] text-dark">Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => toggleAvailability(item)}
                        className={`flex-1 flex-row items-center justify-center py-1.5 rounded-lg border ${
                          item.is_available ? "border-primary bg-primary/5" : "border-gray-light bg-gray/5"
                        }`}
                      >
                        {item.is_available ? (
                          <View className="flex-row items-center gap-1">
                            <Eye size={12} color="#0B6B3A" />
                            <Text className="font-poppins font-bold text-[10px] text-primary">Active</Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1">
                            <EyeOff size={12} color="#7A7A7A" />
                            <Text className="font-poppins font-bold text-[10px] text-gray">Inactive</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-red-100 bg-red-50"
                      >
                        <Trash2 size={12} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        </ScrollView>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal animationType="slide" transparent={true} visible={showForm} onRequestClose={closeForm} statusBarTranslucent={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            >
              <Pressable
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                }}
                onPress={closeForm}
              />
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  maxHeight: "88%",
                  width: "100%",
                  overflow: "hidden"
                }}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-light/35">
                  <Text className="font-poppins font-bold text-base text-dark">
                    {editingId ? "Edit Menu Item" : "Add Menu Item"}
                  </Text>
                  <TouchableOpacity onPress={closeForm} className="p-1.5 rounded-full bg-cream-dark/50">
                    <X size={18} color="#1F1F1F" />
                  </TouchableOpacity>
                </View>
                {/* Grocery Catalog Picker View (Inside Active Modal Container) */}
                {groceryPickerModalOpen && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 100,
                      backgroundColor: "#FFFFFF",
                    }}
                    className="p-4 flex-col"
                  >
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
                      <View className="flex-row items-center gap-2">
                        <ShoppingBag size={20} color="#047857" />
                        <Text className="font-poppins font-bold text-base text-dark">Select Grocery Item</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setGroceryPickerModalOpen(false)}
                        className="p-1.5 bg-gray-100 rounded-full"
                      >
                        <X size={18} color="#4A4A4A" />
                      </TouchableOpacity>
                    </View>

                    {/* Language Switcher Bar inside Modal */}
                    <View className="py-2.5">
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                        {GROCERY_LANGUAGES.map((lang) => {
                          const active = selectedGroceryLang === lang.id
                          return (
                            <TouchableOpacity
                              key={lang.id}
                              onPress={() => setSelectedGroceryLang(lang.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border mr-1.5",
                                active ? "bg-emerald-700 border-emerald-700" : "bg-emerald-50 border-emerald-200"
                              )}
                            >
                              <Text
                                className={cn(
                                  "font-poppins text-xs font-bold",
                                  active ? "text-white" : "text-emerald-900"
                                )}
                              >
                                {lang.label}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </ScrollView>
                    </View>

                    {/* Search Input */}
                    <View className="relative mb-3">
                      <View className="absolute left-3.5 top-3.5 z-10">
                        <Search size={16} color="#7A7A7A" />
                      </View>
                      <TextInput
                        value={grocerySearchQuery}
                        onChangeText={setGrocerySearchQuery}
                        placeholder="Search grocery item name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-cream/50 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                      />
                    </View>

                    {/* Catalog List */}
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                      {/* Option: Other / Custom Item */}
                      <TouchableOpacity
                        onPress={() => {
                          setIsCustomGrocery(true)
                          setSelectedGroceryId("custom")
                          setForm((prev) => ({ ...prev, name: "", localName: "", gstRate: 5 }))
                          setGroceryPickerModalOpen(false)
                        }}
                        className="p-3.5 mb-2 bg-amber-50 rounded-xl border border-amber-300 flex-row items-center justify-between"
                      >
                        <View className="flex-1 mr-2">
                          <Text className="font-poppins font-bold text-sm text-amber-950">
                            ➕ Other / Custom Item
                          </Text>
                          <Text className="font-nunito text-[11px] text-amber-800">
                            Add custom grocery item with custom GST rate (Admin approval required)
                          </Text>
                        </View>
                        <View className="bg-amber-600 px-2.5 py-1 rounded-full">
                          <Text className="font-poppins text-[10px] font-bold text-white">Custom</Text>
                        </View>
                      </TouchableOpacity>

                      {/* 77 Items */}
                      {GROCERY_MASTER_CATALOG
                        .filter((item) => {
                          if (!grocerySearchQuery.trim()) return true
                          const q = grocerySearchQuery.toLowerCase().trim()
                          const inCurrent = (item.names[selectedGroceryLang] || "").toLowerCase().includes(q)
                          const inEn = (item.names.en || "").toLowerCase().includes(q)
                          const inHi = (item.names.hi || "").toLowerCase().includes(q)
                          const inTe = (item.names.te || "").toLowerCase().includes(q)
                          const inKn = (item.names.kn || "").toLowerCase().includes(q)
                          const inTa = (item.names.ta || "").toLowerCase().includes(q)
                          return inCurrent || inEn || inHi || inTe || inKn || inTa
                        })
                        .map((item) => {
                          const currentName = item.names[selectedGroceryLang] || item.names.en
                          const isSelected = selectedGroceryId === item.id && !isCustomGrocery
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => {
                                setSelectedGroceryId(item.id)
                                setIsCustomGrocery(false)
                                setForm((prev) => ({
                                  ...prev,
                                  name: currentName,
                                  localName: selectedGroceryLang !== "en" ? item.names.en : (item.names.hi || ""),
                                  gstRate: item.gstRate,
                                }))
                                setGroceryPickerModalOpen(false)
                              }}
                              className={cn(
                                "p-3 mb-1.5 rounded-xl border flex-row items-center justify-between",
                                isSelected
                                  ? "bg-emerald-100/70 border-emerald-600"
                                  : "bg-white border-gray-100 active:bg-gray-50"
                              )}
                            >
                              <View className="flex-1 mr-2">
                                <Text className={cn("font-poppins text-sm font-semibold", isSelected ? "text-emerald-950 font-bold" : "text-dark")}>
                                  {currentName}
                                </Text>
                                {selectedGroceryLang !== "en" && (
                                  <Text className="font-nunito text-[11px] text-gray">
                                    {item.names.en} {item.names.hi && item.names.hi !== currentName ? `• ${item.names.hi}` : ""}
                                  </Text>
                                )}
                              </View>
                              <View className="flex-row items-center gap-2">
                                <View className={cn(
                                  "px-2.5 py-1 rounded-full",
                                  item.gstRate === 0
                                    ? "bg-slate-100"
                                    : item.gstRate === 5
                                    ? "bg-emerald-100"
                                    : "bg-amber-100"
                                )}>
                                  <Text className={cn(
                                    "font-poppins text-[10px] font-bold",
                                    item.gstRate === 0
                                      ? "text-slate-800"
                                      : item.gstRate === 5
                                      ? "text-emerald-800"
                                      : "text-amber-800"
                                  )}>
                                    GST {item.gstRate}%
                                  </Text>
                                </View>
                                {isSelected && <Check size={16} color="#047857" strokeWidth={2.5} />}
                              </View>
                            </TouchableOpacity>
                          )
                        })}
                    </ScrollView>
                  </View>
                )}


                <ScrollView
                  className="px-5 py-4 space-y-4"
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  {/* Form fields */}
                  {/* Category Selector */}
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Category <Text className="text-accent">*</Text>
                    </Text>
                    <View className="flex-row gap-2 bg-cream/60 p-1 rounded-xl border border-gray-light">
                      {[
                        { id: "food", label: "Food" },
                        { id: "grocery", label: "Grocery / Ration" }
                      ].map((cat) => {
                        const active = form.category === cat.id
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            onPress={() => {
                              const nextCat = cat.id
                              if (nextCat === "grocery") {
                                setSelectedGroceryId("")
                                setIsCustomGrocery(false)
                                setForm({ ...form, category: nextCat, name: "", localName: "", gstRate: 5 })
                              } else {
                                setForm({ ...form, category: nextCat, gstRate: 5 })
                              }
                            }}
                            className={cn(
                              "flex-1 py-2.5 rounded-lg items-center justify-center border",
                              active
                                ? "bg-primary border-primary"
                                : "bg-white border-transparent"
                            )}
                          >
                            <Text
                              className={cn(
                                "font-poppins font-bold text-xs",
                                active ? "text-white" : "text-dark"
                              )}
                            >
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                  {/* Grocery Category: Multi-Language & Item Dropdown */}
                  {form.category === "grocery" ? (
                    <>
                      {/* Language Selector */}
                      <View className="mb-4 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-1.5">
                            <Globe size={14} color="#047857" />
                            <Text className="font-poppins text-xs font-bold text-emerald-950">Select Item Language</Text>
                          </View>
                          <Text className="font-nunito text-[10px] text-emerald-700 font-semibold">Choose language</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                          {GROCERY_LANGUAGES.map((lang) => {
                            const active = selectedGroceryLang === lang.id
                            return (
                              <TouchableOpacity
                                key={lang.id}
                                onPress={() => {
                                  setSelectedGroceryLang(lang.id)
                                  if (selectedGroceryId && selectedGroceryId !== "custom") {
                                    const item = GROCERY_MASTER_CATALOG.find((g) => g.id === selectedGroceryId)
                                    if (item) {
                                      const chosenName = item.names[lang.id] || item.names.en
                                      setForm((prev) => ({
                                        ...prev,
                                        name: chosenName,
                                        localName: lang.id !== "en" ? item.names.en : (item.names.hi || ""),
                                        gstRate: item.gstRate,
                                      }))
                                    }
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-full border mr-1.5",
                                  active
                                    ? "bg-emerald-700 border-emerald-700"
                                    : "bg-white border-emerald-200"
                                )}
                              >
                                <Text
                                  className={cn(
                                    "font-poppins text-xs font-bold",
                                    active ? "text-white" : "text-emerald-900"
                                  )}
                                >
                                  {lang.label}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </ScrollView>
                      </View>

                      {/* Grocery Item Picker Trigger Button */}
                      <View className="mb-4">
                        <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                          Select Grocery Item <Text className="text-accent">*</Text>
                        </Text>
                        <TouchableOpacity
                          onPress={() => setGroceryPickerModalOpen(true)}
                          className="w-full px-4 py-3.5 bg-white rounded-xl border border-emerald-300 flex-row items-center justify-between shadow-xs active:bg-emerald-50"
                        >
                          <View className="flex-1 mr-2">
                            {isCustomGrocery ? (
                              <Text className="font-poppins font-bold text-sm text-amber-900">
                                ➕ Other / Custom Item
                              </Text>
                            ) : selectedGroceryId ? (
                              <View className="flex-row items-center gap-2">
                                <Text className="font-poppins font-bold text-sm text-emerald-950 flex-1" numberOfLines={1}>
                                  {form.name}
                                </Text>
                                <View className="bg-emerald-100 px-2 py-0.5 rounded-md">
                                  <Text className="font-poppins text-[10px] font-bold text-emerald-800">
                                    GST {form.gstRate}%
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <Text className="font-nunito text-sm text-gray">
                                -- Tap to Choose from 77 Grocery Items --
                              </Text>
                            )}
                          </View>
                          <ChevronDown size={18} color="#047857" />
                        </TouchableOpacity>
                      </View>

                      {/* Step 3: Custom Item Input if 'Other / Custom' chosen */}
                      {isCustomGrocery ? (
                        <View className="mb-4 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-3">
                          <View>
                            <Text className="font-poppins text-xs font-bold text-amber-950 mb-1">
                              Custom Grocery Item Name <Text className="text-accent">*</Text>
                            </Text>
                            <TextInput
                              value={form.name}
                              onChangeText={(v) => setForm({ ...form, name: v })}
                              placeholder="e.g. Special Homemade Spices / Raw Honey"
                              className="w-full px-4 py-2.5 bg-white rounded-xl border border-amber-300 font-nunito text-sm text-dark"
                            />
                          </View>

                          <View className="mt-2">
                            <Text className="font-poppins text-xs font-bold text-amber-950 mb-1.5">
                              GST Rate (%) <Text className="text-accent">*</Text>
                            </Text>
                            <View className="flex-row gap-2">
                              {[
                                { rate: 0, label: "0% (Exempt)" },
                                { rate: 5, label: "5% (Standard)" },
                                { rate: 12, label: "12% (Pickles)" },
                                { rate: 18, label: "18%" },
                              ].map((gst) => {
                                const active = form.gstRate === gst.rate
                                return (
                                  <TouchableOpacity
                                    key={gst.rate}
                                    onPress={() => setForm({ ...form, gstRate: gst.rate })}
                                    className={cn(
                                      "flex-1 py-2 rounded-xl border items-center justify-center",
                                      active
                                        ? "bg-amber-600 border-amber-600"
                                        : "bg-white border-amber-200"
                                    )}
                                  >
                                    <Text
                                      className={cn(
                                        "font-poppins text-[11px] font-bold",
                                        active ? "text-white" : "text-amber-950"
                                      )}
                                    >
                                      {gst.label}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              })}
                            </View>
                          </View>

                          <Text className="font-nunito text-[11px] text-amber-800 font-semibold mt-1">
                            ℹ️ Custom items will be submitted for Admin approval before going live.
                          </Text>
                        </View>
                      ) : selectedGroceryId ? (
                        /* Auto-filled GST Display Badge */
                        <View className="mb-4 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex-row items-center justify-between">
                          <View className="flex-1 mr-2">
                            <Text className="font-poppins text-xs font-bold text-emerald-950">GST Rate (Auto-filled)</Text>
                            <Text className="font-nunito text-[11px] text-emerald-800">
                              {form.gstRate === 0
                                ? "Zero GST / Tax Exempted item"
                                : `${form.gstRate}% standard GST automatically applied`}
                            </Text>
                          </View>
                          <View className="bg-emerald-600 px-3 py-1 rounded-full">
                            <Text className="font-poppins text-xs font-bold text-white">{form.gstRate}% GST</Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Quantity & Unit Section */}
                      <View className="mb-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/70">
                        <Text className="font-poppins text-xs font-bold text-emerald-950 mb-2">
                          Quantity / Weight & Unit <Text className="text-accent">*</Text>
                        </Text>

                        <View className="flex-row gap-3">
                          {/* Amount / Weight Input */}
                          <View className="flex-1">
                            <Text className="font-nunito text-[10px] text-emerald-800 font-semibold mb-1">Quantity</Text>
                            <TextInput
                              value={form.unitValue}
                              onChangeText={(v) => setForm({ ...form, unitValue: v })}
                              placeholder="e.g. 1 or 500"
                              keyboardType="numeric"
                              className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-300 font-nunito text-sm text-dark"
                            />
                          </View>

                          {/* Unit Selector */}
                          <View className="flex-1">
                            <Text className="font-nunito text-[10px] text-emerald-800 font-semibold mb-1">Unit</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1">
                              {["kg", "gm", "litre", "ml", "pack", "piece", "dozen"].map((u) => {
                                const active = form.unit === u
                                return (
                                  <TouchableOpacity
                                    key={u}
                                    onPress={() => setForm({ ...form, unit: u })}
                                    className={cn(
                                      "px-2.5 py-2 rounded-xl border items-center justify-center mr-1",
                                      active
                                        ? "bg-emerald-700 border-emerald-700"
                                        : "bg-white border-emerald-200"
                                    )}
                                  >
                                    <Text className={cn("font-poppins text-[10px] font-bold", active ? "text-white" : "text-emerald-900")}>
                                      {u}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              })}
                            </ScrollView>
                          </View>
                        </View>
                      </View>

                      {/* Preset Grocery Photo Gallery */}
                      <View className="mb-4 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-1.5">
                            <ShoppingBag size={15} color="#047857" />
                            <Text className="font-poppins font-bold text-xs text-emerald-950 uppercase tracking-wider">
                              Grocery Gallery ({groceryPresets.length})
                            </Text>
                          </View>
                          <Text className="font-nunito text-[10px] text-emerald-700 font-semibold">
                            Tap photo to attach
                          </Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2.5 py-1">
                          {groceryPresets.map((preset) => {
                            const isAdded = existingImages.includes(preset.image)
                            return (
                              <TouchableOpacity
                                key={preset.id}
                                onPress={() => {
                                  if (isAdded) {
                                    setExistingImages((prev) => prev.filter((img) => img !== preset.image))
                                  } else {
                                    if (existingImages.length + pendingImages.length < MAX_IMAGES) {
                                      setExistingImages((prev) => [...prev, preset.image])
                                    }
                                  }
                                }}
                                className={cn(
                                  "w-24 p-1.5 rounded-xl border items-center bg-white relative mr-2",
                                  isAdded ? "border-emerald-600 bg-emerald-50" : "border-gray-200"
                                )}
                              >
                                <View className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 mb-1 relative">
                                  <Image source={{ uri: preset.image }} className="w-full h-full object-cover" />
                                  {isAdded && (
                                    <View className="absolute top-1 right-1 bg-emerald-600 rounded-full p-1 shadow-sm">
                                      <Check size={10} color="#FFF" strokeWidth={3} />
                                    </View>
                                  )}
                                </View>
                                <Text className="font-poppins text-[10px] font-bold text-dark text-center" numberOfLines={1}>
                                  {preset.name.split("/")[0]}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </ScrollView>
                      </View>
                    </>
                  ) : (
                    /* Food Category Fields */
                    <>
                      {/* Item Name */}
                      <View className="mb-4">
                        <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                          Item Name <Text className="text-accent">*</Text>
                        </Text>
                        <TextInput
                          value={form.name}
                          onChangeText={(v) => setForm({ ...form, name: v })}
                          placeholder="e.g. Special Veg Thali / Paneer Butter Masala"
                          className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                        />

                        {/* Quick Suggestion Chips */}
                        <View className="mt-2">
                          <Text className="font-nunito text-[10px] text-gray mb-1">
                            Suggested items (tap to autofill):
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 py-0.5">
                            {SUGGESTED_FOOD_ITEMS.map((name, idx) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => setForm((prev) => ({ ...prev, name }))}
                                className="mr-1.5 bg-white border border-gray-light px-3 py-1.5 rounded-full shadow-xs active:bg-primary/10"
                              >
                                <Text className="font-poppins text-[11px] text-dark font-medium">
                                  {name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>

                      {/* Local / Hindi Title */}
                      <View className="mb-4">
                        <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                          Local / Hindi Name (Optional)
                        </Text>
                        <TextInput
                          value={form.localName}
                          onChangeText={(v) => setForm({ ...form, localName: v })}
                          placeholder="e.g. दाल तड़का / पनीर टिक्का"
                          className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                        />
                      </View>
                    </>
                  )}


                  {/* Description */}
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Description</Text>
                    <TextInput
                      value={form.description}
                      onChangeText={(v) => setForm({ ...form, description: v })}
                      placeholder="Describe ingredients, taste, freshness, specialty..."
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark h-24"
                    />
                  </View>
                  {/* Price */}
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Price (₹) <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.price}
                      onChangeText={(v) => setForm({ ...form, price: v })}
                      placeholder="e.g. 150"
                      keyboardType="numeric"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                  </View>


                  {/* Item Type: Veg / Non-Veg */}
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Food Type</Text>
                    <View className="flex-row gap-3">
                      {["veg", "non_veg"].map((t) => {
                        const active = form.itemType === t
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => setForm({ ...form, itemType: t })}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-2",
                              active
                                ? t === "veg"
                                  ? "bg-green-50 border-green-600"
                                  : "bg-red-50 border-red-600"
                                : "bg-white border-gray-light"
                            )}
                          >
                            <View
                              className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                t === "veg" ? "bg-green-600" : "bg-red-600"
                              )}
                            />
                            <Text
                              className={cn(
                                "font-poppins font-bold text-xs",
                                active
                                  ? t === "veg"
                                    ? "text-green-700"
                                    : "text-red-700"
                                  : "text-gray"
                              )}
                            >
                              {t === "veg" ? "Veg" : "Non-Veg"}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>

                  {/* Preset Grocery Image Gallery (Only shown for Grocery category) */}
                  {form.category === "grocery" && (
                    <View className="mb-4 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                          <ShoppingBag size={15} color="#047857" />
                          <Text className="font-poppins font-bold text-xs text-emerald-950 uppercase tracking-wider">
                            Grocery Gallery ({groceryPresets.length})
                          </Text>
                        </View>
                        <Text className="font-nunito text-[10px] text-emerald-700 font-semibold">
                          Tap photo to attach
                        </Text>
                      </View>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2.5 py-1">
                        {groceryPresets.map((preset) => {
                          const isAdded = existingImages.includes(preset.image)
                          return (
                            <TouchableOpacity
                              key={preset.id}
                              onPress={() => {
                                if (isAdded) {
                                  setExistingImages((prev) => prev.filter((img) => img !== preset.image))
                                } else {
                                  if (existingImages.length + pendingImages.length < MAX_IMAGES) {
                                    setExistingImages((prev) => [...prev, preset.image])
                                  }
                                  setForm((prev) => ({
                                    ...prev,
                                    name: preset.name,
                                    unitValue: preset.defaultQty || prev.unitValue,
                                    unit: preset.defaultUnit || prev.unit,
                                  }))
                                }
                              }}
                              className={cn(
                                "w-24 p-1.5 rounded-xl border items-center bg-white relative mr-2",
                                isAdded ? "border-emerald-600 bg-emerald-50" : "border-gray-200"
                              )}
                            >
                              <View className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 mb-1 relative">
                                <Image source={{ uri: preset.image }} className="w-full h-full object-cover" />
                                {isAdded && (
                                  <View className="absolute top-1 right-1 bg-emerald-600 rounded-full p-1 shadow-sm">
                                    <Check size={10} color="#FFF" strokeWidth={3} />
                                  </View>
                                )}
                              </View>
                              <Text className="font-nunito font-bold text-[10px] text-dark text-center" numberOfLines={2}>
                                {preset.name}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Media Section: Photos */}
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Photos ({existingImages.length + pendingImages.length}/{MAX_IMAGES})
                    </Text>
                    <TouchableOpacity
                      onPress={() => pickMedia("image")}
                      disabled={existingImages.length + pendingImages.length >= MAX_IMAGES}
                      className="w-full py-3 bg-primary/5 rounded-xl border border-dashed border-primary/30 flex-row justify-center items-center gap-2"
                    >
                      <Upload size={16} color="#0B6B3A" />
                      <Text className="font-poppins font-bold text-xs text-primary">Upload Photos</Text>
                    </TouchableOpacity>

                    {/* Previews */}
                    {(existingImages.length > 0 || pendingImages.length > 0) && (
                      <View className="flex-row flex-wrap gap-2 mt-3">
                        {existingImages.map((uri, idx) => (
                          <View key={`ex-img-${idx}`} className="w-[31%] aspect-square bg-cream rounded-lg overflow-hidden relative">
                            <Image source={{ uri }} className="w-full h-full object-cover" />
                            <TouchableOpacity
                              onPress={() => removeExistingImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full"
                            >
                              <X size={10} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {pendingImages.map((p, idx) => (
                          <View key={`new-img-${idx}`} className="w-[31%] aspect-square bg-cream rounded-lg overflow-hidden relative">
                            <Image source={{ uri: p.uri }} className="w-full h-full object-cover" />
                            <TouchableOpacity
                              onPress={() => removePendingImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full"
                            >
                              <X size={10} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Media Section: Videos */}
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Videos ({existingVideos.length + pendingVideos.length}/{MAX_VIDEOS})
                    </Text>
                    <TouchableOpacity
                      onPress={() => pickMedia("video")}
                      disabled={existingVideos.length + pendingVideos.length >= MAX_VIDEOS}
                      className="w-full py-3 bg-gray-light/10 rounded-xl border border-dashed border-gray-light flex-row justify-center items-center gap-2"
                    >
                      <Video size={16} color="#7A7A7A" />
                      <Text className="font-poppins font-bold text-xs text-gray">Upload Videos</Text>
                    </TouchableOpacity>

                    {/* Video Previews */}
                    {(existingVideos.length > 0 || pendingVideos.length > 0) && (
                      <View className="gap-2 mt-3">
                        {existingVideos.map((uri, idx) => (
                          <View key={`ex-vid-${idx}`} className="h-16 bg-dark rounded-xl flex-row items-center px-3 justify-between">
                            <View className="flex-row items-center gap-2 flex-1 mr-2">
                              <Play size={16} color="#FFF" />
                              <Text className="text-white text-xs font-nunito truncate" numberOfLines={1}>
                                {uri.split("/").pop() || "Video"}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => removeExistingVideo(idx)}
                              className="p-1 bg-white/20 rounded-full"
                            >
                              <X size={12} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {pendingVideos.map((p, idx) => (
                          <View key={`new-vid-${idx}`} className="h-16 bg-dark rounded-xl flex-row items-center px-3 justify-between">
                            <View className="flex-row items-center gap-2 flex-1 mr-2">
                              <Play size={16} color="#FFF" />
                              <Text className="text-white text-xs font-nunito truncate" numberOfLines={1}>
                                {p.name || "Video"}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => removePendingVideo(idx)}
                              className="p-1 bg-white/20 rounded-full"
                            >
                              <X size={12} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {error ? (
                    <View className="bg-red-50 border border-red-100 p-3 rounded-xl">
                      <Text className="text-red-700 text-xs font-nunito">{error}</Text>
                    </View>
                  ) : null}

                  <View className="flex-row gap-3 pt-2 pb-6">
                    <Button variant="outline" className="flex-1" onPress={closeForm}>
                      Cancel
                    </Button>
                    <Button className="flex-1" loading={saving} onPress={handleSave}>
                      {editingId ? "Update Item" : "Add Item"}
                    </Button>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      

      {/* Delete Confirm Modal */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <View
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="bg-white rounded-2xl w-full max-w-[340px] p-6 items-center">
            <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-4">
              <Trash2 size={28} color="#EF4444" />
            </View>
            <Text className="font-poppins font-bold text-lg text-dark text-center mb-2">
              Delete Menu Item?
            </Text>
            <Text className="font-nunito text-sm text-gray text-center mb-6 leading-5">
              Are you sure you want to remove this item from your menu? This action cannot be undone.
            </Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 rounded-xl border border-gray-light items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="font-poppins font-bold text-sm text-gray">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => performDelete(deleteConfirmId)}
                className="flex-1 py-3 rounded-xl bg-red-500 items-center justify-center flex-row gap-1.5"
                activeOpacity={0.7}
              >
                <Trash2 size={14} color="#FFFFFF" />
                <Text className="font-poppins font-bold text-sm text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Real-time Admin Action Alert Modal for Mobile Seller */}
      {liveAlert && (
        <Modal
          visible={Boolean(liveAlert)}
          transparent
          animationType="slide"
          onRequestClose={() => dismissLiveAlert(liveAlert.id)}
        >
          <View
            className="flex-1 justify-center items-center px-5"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <View className={cn(
              "bg-white rounded-3xl w-full max-w-[360px] p-6 items-center shadow-2xl border-2",
              liveAlert.title?.toLowerCase().includes("reject")
                ? "border-red-500 bg-red-50/40"
                : liveAlert.title?.toLowerCase().includes("edit")
                ? "border-rose-500 bg-rose-50/40"
                : liveAlert.title?.toLowerCase().includes("approve")
                ? "border-emerald-500 bg-emerald-50/40"
                : "border-primary bg-white"
            )}>
              <View className={cn(
                "w-16 h-16 rounded-2xl items-center justify-center mb-4",
                liveAlert.title?.toLowerCase().includes("reject")
                  ? "bg-red-500"
                  : liveAlert.title?.toLowerCase().includes("edit")
                  ? "bg-rose-600"
                  : liveAlert.title?.toLowerCase().includes("approve")
                  ? "bg-emerald-600"
                  : "bg-primary"
              )}>
                {liveAlert.title?.toLowerCase().includes("reject") ? (
                  <AlertTriangle size={32} color="#FFFFFF" />
                ) : liveAlert.title?.toLowerCase().includes("edit") ? (
                  <Pencil size={30} color="#FFFFFF" />
                ) : liveAlert.title?.toLowerCase().includes("approve") ? (
                  <CheckCircle size={32} color="#FFFFFF" />
                ) : (
                  <Bell size={32} color="#FFFFFF" />
                )}
              </View>

              <Text className="font-poppins font-bold text-base text-dark text-center mb-1">
                {liveAlert.title}
              </Text>

              <ScrollView className="max-h-48 my-3 w-full bg-white/80 p-3.5 rounded-2xl border border-gray-100">
                <Text className="font-nunito text-xs text-dark leading-5 font-medium">
                  {liveAlert.body}
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={() => dismissLiveAlert(liveAlert.id)}
                className={cn(
                  "w-full py-3.5 rounded-xl items-center justify-center shadow-sm",
                  liveAlert.title?.toLowerCase().includes("reject") || liveAlert.title?.toLowerCase().includes("edit")
                    ? "bg-red-600 active:bg-red-700"
                    : "bg-emerald-600 active:bg-emerald-700"
                )}
                activeOpacity={0.8}
              >
                <Text className="font-poppins font-bold text-sm text-white">
                  Acknowledge & Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
