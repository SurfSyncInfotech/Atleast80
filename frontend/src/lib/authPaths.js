export function getDashboardPath(role) {
  switch (role) {
    case "admin":
      return "/admin"
    case "kitchen":
      return "/kitchen/dashboard"
    case "customer":
      return "/profile"
    default:
      return "/home"
  }
}

export function getLoginPath(role) {
  switch (role) {
    case "admin":
      return "/admin/login"
    case "kitchen":
      return "/kitchen/login"
    default:
      return "/login"
  }
}
