import { useEffect, useState } from "react"
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
  Platform
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
  EyeOff
} from "lucide-react-native"
import * as DocumentPicker from "expo-document-picker"
import Button from "../../../components/ui/Button"
import { useAuth } from "../../../context/AuthContext"
import { api, uploadMenuFiles } from "../../../lib/api"
import { resolveMenuItemMedia, resolveMediaUrl } from "../../../lib/media"
import { cn } from "../../../lib/utils"

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "food",
  itemType: "veg",
  isCombo: false,
  comboItems: [],
}

const MAX_IMAGES = 8
const MAX_VIDEOS = 3

export default function KitchenMenuScreen() {
  const { kitchen, refreshKitchen } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  
  const [existingImages, setExistingImages] = useState([])
  const [existingVideos, setExistingVideos] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [pendingVideos, setPendingVideos] = useState([])
  
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")



  const [activeTab, setActiveTab] = useState("all")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const isApproved = kitchen?.status === "approved"

  const loadMenu = async () => {
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
  }, [])

  useEffect(() => {
    if (isApproved) {
      const timer = setTimeout(() => {
        loadMenu()
      }, 0)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isApproved, kitchen?.status])

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setExistingImages([])
    setExistingVideos([])
    setPendingImages([])
    setPendingVideos([])
    setError("")
  }

  const openAdd = () => {
    setForm(emptyForm)
    setExistingImages([])
    setExistingVideos([])
    setPendingImages([])
    setPendingVideos([])
    setEditingId(null)
    setShowForm(true)
    setError("")
  }



  const openEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category,
      itemType: item.item_type || "veg",
      isCombo: Boolean(item.is_combo),
      comboItems: (item.comboItems || []).map((ci) => ({
        id: ci.id,
        quantity: ci.quantity || 1,
      })),
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

      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        itemType: form.itemType,
        images,
        videos,
        image: images[0] || null,
        isCombo: form.isCombo,
        items: form.isCombo ? form.comboItems : [],
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
                      {Boolean(item.is_combo || item.isCombo) && (
                        <View className="bg-amber-500 px-1.5 py-0.5 rounded-full border border-amber-600/20">
                          <Text className="text-[8px] font-poppins font-bold text-white uppercase">
                            Combo
                          </Text>
                        </View>
                      )}
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
        <Modal animationType="slide" transparent={true} visible={showForm} onRequestClose={closeForm}>
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[85%] pb-6">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-light/35">
                <Text className="font-poppins font-bold text-base text-dark">
                  {editingId ? "Edit Menu Item" : "Add Menu Item"}
                </Text>
                <TouchableOpacity onPress={closeForm} className="p-1.5 rounded-full bg-cream-dark/50">
                  <X size={18} color="#1F1F1F" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-5 py-4 space-y-4" showsVerticalScrollIndicator={false}>
                {/* Form fields */}
                <View className="mb-4">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                    Item Name <Text className="text-accent">*</Text>
                  </Text>
                  <TextInput
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    placeholder="e.g. Dal Makhani Thali"
                    className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                  />
                </View>

                <View className="mb-4">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Description</Text>
                  <TextInput
                    value={form.description}
                    onChangeText={(t) => setForm({ ...form, description: t })}
                    placeholder="Short description for customers"
                    multiline={true}
                    numberOfLines={3}
                    style={{ textAlignVertical: "top" }}
                    className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark min-h-[70px]"
                  />
                </View>

                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Price (₹) <Text className="text-accent">*</Text>
                    </Text>
                    <TextInput
                      value={form.price}
                      onChangeText={(t) => setForm({ ...form, price: t })}
                      placeholder="149"
                      keyboardType="numeric"
                      className="w-full px-4 py-3 bg-cream/40 rounded-xl border border-gray-light font-nunito text-sm text-dark"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">
                      Category <Text className="text-accent">*</Text>
                    </Text>
                    <View className="border border-gray-light bg-cream/40 rounded-xl overflow-hidden h-[48px] justify-center">
                      <TextInput
                        value={form.category}
                        onChangeText={(t) => setForm({ ...form, category: t.toLowerCase() })}
                        placeholder="food / grocery"
                        className="px-4 font-nunito text-sm text-dark h-full"
                      />
                    </View>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="font-poppins text-xs font-bold text-dark-light mb-1.5">Type</Text>
                  <View className="flex-row gap-3">
                    {["veg", "non_veg"].map((t) => {
                      const isSelected = form.itemType === t
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setForm({ ...form, itemType: t })}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-1.5",
                            isSelected
                              ? t === "veg"
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-red-500 bg-red-50"
                              : "border-gray-light bg-white"
                          )}
                        >
                          <Leaf size={14} color={isSelected ? (t === "veg" ? "#047857" : "#B91C1C") : "#7A7A7A"} />
                          <Text
                            className={cn(
                              "font-poppins font-bold text-xs capitalize",
                              isSelected
                               ? t === "veg"
                                 ? "text-emerald-700"
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

                {/* Combo Toggle */}
                <View className="mb-4 flex-row items-center justify-between bg-cream/35 p-3.5 rounded-xl border border-gray-light/50">
                  <View className="flex-1 mr-2">
                    <Text className="font-poppins text-xs font-bold text-dark">Is this a Combo?</Text>
                    <Text className="font-nunito text-[10px] text-gray mt-0.5">Combine multiple items into a single package</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, isCombo: !form.isCombo })}
                    className={cn(
                      "w-12 h-6.5 rounded-full p-0.5 justify-center",
                      form.isCombo ? "bg-primary items-end" : "bg-gray-300 items-start"
                    )}
                  >
                    <View className="w-5.5 h-5.5 rounded-full bg-white shadow-sm" />
                  </TouchableOpacity>
                </View>

                {/* Combo Selector List */}
                {form.isCombo && (
                  <View className="mb-4">
                    <Text className="font-poppins text-xs font-bold text-dark-light mb-2">
                      Select items to include in this combo:
                    </Text>
                    {items.filter(i => i.id !== editingId && !i.is_combo && !i.isCombo).length === 0 ? (
                      <View className="bg-cream/20 p-4 rounded-xl border border-dashed border-gray-light items-center">
                        <Text className="font-nunito text-xs text-gray text-center">
                          No selectable menu items found. Please add individual dishes first!
                        </Text>
                      </View>
                    ) : (
                      <View className="gap-2.5">
                        {items
                          .filter(i => i.id !== editingId && !i.is_combo && !i.isCombo)
                          .map((selectable) => {
                            const inCombo = form.comboItems.find((ci) => ci.id === selectable.id)
                            const qty = inCombo ? inCombo.quantity : 0

                            const handleToggleItem = () => {
                              if (inCombo) {
                                setForm({
                                  ...form,
                                  comboItems: form.comboItems.filter((ci) => ci.id !== selectable.id),
                                })
                              } else {
                                setForm({
                                  ...form,
                                  comboItems: [...form.comboItems, { id: selectable.id, quantity: 1 }],
                                })
                              }
                            }

                            const handleUpdateQty = (amount) => {
                              const newQty = qty + amount
                              if (newQty <= 0) {
                                setForm({
                                  ...form,
                                  comboItems: form.comboItems.filter((ci) => ci.id !== selectable.id),
                                })
                              } else {
                                setForm({
                                  ...form,
                                  comboItems: form.comboItems.map((ci) =>
                                    ci.id === selectable.id ? { ...ci, quantity: newQty } : ci
                                  ),
                                })
                              }
                            }

                            return (
                              <View
                                key={selectable.id}
                                className={cn(
                                  "flex-row items-center justify-between p-3 rounded-xl border",
                                  inCombo ? "border-primary bg-primary/5" : "border-gray-light bg-white"
                                )}
                              >
                                <TouchableOpacity
                                  onPress={handleToggleItem}
                                  className="flex-1 flex-row items-center gap-2"
                                >
                                  <View
                                    className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center",
                                      inCombo ? "border-primary bg-primary" : "border-gray"
                                    )}
                                  >
                                    {inCombo && <View className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                  </View>
                                  <Text className="font-nunito text-xs text-dark font-semibold flex-1" numberOfLines={1}>
                                    {selectable.name}
                                  </Text>
                                  <Text className="font-poppins font-bold text-[10px] text-gray mr-2">
                                    ₹{selectable.price}
                                  </Text>
                                </TouchableOpacity>

                                {inCombo && (
                                  <View className="flex-row items-center gap-2 bg-white border border-primary/20 rounded-lg px-1.5 py-0.5">
                                    <TouchableOpacity onPress={() => handleUpdateQty(-1)} className="p-0.5">
                                      <Minus size={10} color="#0B6B3A" strokeWidth={2.5} />
                                    </TouchableOpacity>
                                    <Text className="font-poppins font-bold text-primary text-xs min-w-[12] text-center mt-0.5">
                                      {qty}
                                    </Text>
                                    <TouchableOpacity onPress={() => handleUpdateQty(1)} className="p-0.5">
                                      <Plus size={10} color="#0B6B3A" strokeWidth={2.5} />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            )
                          })}
                      </View>
                    )}
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
    </SafeAreaView>
  )
}
