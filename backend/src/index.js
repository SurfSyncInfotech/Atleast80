import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { connectDB } from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import kitchenRoutes from "./routes/kitchenRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import menuRoutes from "./routes/menuRoutes.js"
import storyRoutes from "./routes/storyRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import hygieneRoutes from "./routes/hygieneRoutes.js"
import alertRoutes from "./routes/alertRoutes.js"
import locationRoutes from "./routes/locationRoutes.js"
import bulkEnquiryRoutes from "./routes/bulkEnquiryRoutes.js"
import riderRoutes from "./routes/riderRoutes.js"
import pool from "./config/db.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Required behind nginx so req.protocol is https (not http)
app.set("trust proxy", 1)

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)
app.use(express.json({ limit: "1gb" }))
app.use("/uploads/menu", express.static(path.join(__dirname, "../uploads/menu")))
app.use("/uploads/kitchen", express.static(path.join(__dirname, "../uploads/kitchen")))
app.use("/uploads/stories", express.static(path.join(__dirname, "../uploads/stories")))
app.use("/uploads/hygiene", express.static(path.join(__dirname, "../uploads/hygiene")))
app.use("/uploads/quotations", express.static(path.join(__dirname, "../uploads/quotations")))
app.use("/uploads/agreements", express.static(path.join(__dirname, "../uploads/agreements")))

app.get("/", (_req, res) => {
  res.json({ message: "Atleast80 API is running" })
})

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok")
    res.json({
      status: "ok",
      database: "connected",
      result: rows[0],
    })
  } catch (error) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    })
  }
})

app.use("/api/auth", authRoutes)
app.use("/api/kitchens", kitchenRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/menu", menuRoutes)
app.use("/api/stories", storyRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/hygiene", hygieneRoutes)
app.use("/api/alerts", alertRoutes)
app.use("/api/locations", locationRoutes)
app.use("/api/bulk-enquiries", bulkEnquiryRoutes)
app.use("/api/rider", riderRoutes)

async function startServer() {
  try {
    await connectDB()

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
  } catch {
    process.exit(1)
  }
}

startServer()
