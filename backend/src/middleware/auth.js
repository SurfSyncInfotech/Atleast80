import jwt from "jsonwebtoken"

const getJwtSecret = () => process.env.JWT_SECRET || "atleast80_dev_secret_change_in_production"

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" })
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" })
  }

  try {
    req.user = jwt.verify(header.slice(7), getJwtSecret())
    next()
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), getJwtSecret())
    } catch {
      req.user = null
    }
  } else {
    req.user = null
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  }
}
