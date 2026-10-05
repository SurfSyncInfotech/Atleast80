import { useCallback, useEffect, useState, useMemo } from "react"
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { ChevronRight, Play, RefreshCw, Search, X } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { api } from "../../../lib/api"
import { resolveStoryGroups } from "../../../lib/media"
import { getCachedStoryGroups, setCachedStoryGroups } from "../../../lib/storyCache"
import FloatingCart from "../../../components/common/FloatingCart"

function firstStoryPreview(group) {
  const firstStory = group.stories?.[0]
  const mediaUrl = firstStory?.mediaUrl
  const isVideo =
    firstStory?.mediaType === "video" ||
    mediaUrl?.toLowerCase().endsWith(".mp4") ||
    mediaUrl?.toLowerCase().endsWith(".mov")

  return {
    image: isVideo ? group.kitchenImage : mediaUrl || group.kitchenImage,
    isVideo,
    count: group.stories?.length || 0,
  }
}

export default function StoriesListScreen() {
  const router = useRouter()
  const [groups, setGroups] = useState(() => getCachedStoryGroups())
  const [loading, setLoading] = useState(groups.length === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const loadStories = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(groups.length === 0)
    setError(false)

    try {
      const data = await api("/api/stories")
      const resolved = resolveStoryGroups(data.groups || data)
      setCachedStoryGroups(resolved)
      setGroups(resolved)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [groups.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStories()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadStories])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const q = searchQuery.toLowerCase().trim()
    return groups.filter(group => group.kitchenName?.toLowerCase().includes(q))
  }, [groups, searchQuery])

  const openStory = (kitchenId) => {
    const originalIndex = groups.findIndex(g => g.kitchenId === kitchenId)
    if (originalIndex !== -1) {
      router.push({
        pathname: "/(customer)/storyViewer",
        params: { groupIndex: originalIndex },
      })
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="px-4 py-4 bg-white border-b border-gray-light/30">
        <Text className="font-poppins font-bold text-xl text-dark">{"Today's Stories"}</Text>
        <Text className="font-nunito text-xs text-gray mt-1">
          Kitchens with fresh updates today
        </Text>
        
        {/* Premium search bar */}
        {groups.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <LinearGradient
              colors={["#0C4240", "#C5A85A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 1.5 }}
            >
              <View style={{
                backgroundColor: "#FAF9F6",
                borderRadius: 22,
                flexDirection: "row",
                alignItems: "center",
                height: 44,
                paddingHorizontal: 12,
              }}>
                <Search size={16} color="#7A7A7A" style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search stories by kitchen..."
                  placeholderTextColor="#9A9A9A"
                  style={{
                    flex: 1,
                    height: "100%",
                    fontSize: 13,
                    fontFamily: "Nunito",
                    color: "#1F1F1F",
                    paddingVertical: 0,
                  }}
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                    <X size={14} color="#7A7A7A" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </LinearGradient>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0B6B3A" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadStories(true)}
              tintColor="#0B6B3A"
              colors={["#0B6B3A"]}
            />
          }
        >
          {error && groups.length === 0 ? (
            <View className="bg-white rounded-xl border border-gray-light/40 p-5 items-center">
              <Text className="font-nunito text-sm text-gray mb-3">Stories load nahi ho payi.</Text>
              <TouchableOpacity
                onPress={() => loadStories()}
                className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-primary"
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text className="font-poppins font-semibold text-xs text-white">Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : groups.length === 0 ? (
            <View className="bg-white rounded-xl border border-gray-light/40 p-5 items-center">
              <Text className="font-poppins font-semibold text-sm text-dark">No stories yet</Text>
              <Text className="font-nunito text-xs text-gray mt-1 text-center">
                Jab kitchens story dalengi, yaha list dikhegi.
              </Text>
            </View>
          ) : filteredGroups.length === 0 ? (
            <View className="bg-white rounded-xl border border-gray-light/40 p-5 items-center">
              <Text className="font-poppins font-semibold text-sm text-dark">No matching kitchens found</Text>
              <Text className="font-nunito text-xs text-gray mt-1 text-center">
                Try searching with a different name.
              </Text>
            </View>
          ) : (
            <View>
              {filteredGroups.map((group) => {
                const preview = firstStoryPreview(group)
                const initial = group.kitchenName?.[0]?.toUpperCase() || "K"

                return (
                  <TouchableOpacity
                    key={group.kitchenId}
                    onPress={() => openStory(group.kitchenId)}
                    activeOpacity={0.85}
                    className="flex-row items-center bg-white rounded-xl border border-gray-light/30 p-3 mb-3"
                  >
                    <LinearGradient
                      colors={["#F4C400", "#FF6B00", "#0B6B3A"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 66, height: 66, borderRadius: 33, padding: 3 }}
                    >
                      <View className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-primary/10 items-center justify-center">
                        {preview.image ? (
                          <Image
                            source={{ uri: preview.image }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text className="font-poppins font-bold text-primary text-xl">{initial}</Text>
                        )}
                        {preview.isVideo ? (
                          <View className="absolute inset-0 bg-black/20 items-center justify-center">
                            <View className="w-7 h-7 rounded-full bg-white/90 items-center justify-center">
                              <Play size={14} color="#0B6B3A" fill="#0B6B3A" />
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </LinearGradient>

                    <View className="flex-1 ml-3">
                      <Text className="font-poppins font-semibold text-[15px] text-dark" numberOfLines={1}>
                        {group.kitchenName}
                      </Text>
                      <Text className="font-nunito text-xs text-gray mt-0.5">
                        {preview.count} {preview.count === 1 ? "story" : "stories"} available
                      </Text>
                    </View>

                    <ChevronRight size={18} color="#7A7A7A" />
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
