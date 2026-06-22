import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function connectDB() {
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
    console.log("✅ Database connected successfully")
    return pool
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    throw error
  }
}

export default pool
