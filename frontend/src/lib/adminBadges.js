import { api } from "./api"

const USERS_SEEN_KEY = "atleast80-admin-users-seen-at"

export function readUsersSeenAt() {
  return localStorage.getItem(USERS_SEEN_KEY) || ""
}

export function writeUsersSeenAt(value) {
  if (value) localStorage.setItem(USERS_SEEN_KEY, value)
}

function pendingMenuCount(kitchens) {
  return (kitchens || []).reduce((sum, kitchen) => {
    if (typeof kitchen.pendingCount === "number") return sum + kitchen.pendingCount
    return sum + (kitchen.items || []).filter((item) => {
      const status = item.approvalStatus || item.approval_status || "pending"
      return status === "pending"
    }).length
  }, 0)
}

export async function fetchAdminBadgeCounts(usersSeenAt) {
  const [kitchenData, orderData, menuData, userData] = await Promise.all([
    api("/api/admin/kitchens?status=pending&limit=5&page=1", {}, "admin"),
    api("/api/admin/orders", {}, "admin"),
    api("/api/admin/menu?status=pending", {}, "admin"),
    api("/api/admin/users?role=customer&limit=100&page=1", {}, "admin"),
  ])

  const seenAt = usersSeenAt ? new Date(usersSeenAt).getTime() : 0
  const users = userData.users || []
  const newUsers = seenAt
    ? users.filter((user) => new Date(user.created_at).getTime() > seenAt).length
    : 0

  return {
    kitchens: Number(kitchenData.pagination?.total) || 0,
    orders: Number(orderData.summary?.pending) || 0,
    menu: pendingMenuCount(menuData.kitchens),
    users: newUsers,
  }
}
