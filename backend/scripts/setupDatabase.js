import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const DB_NAME = process.env.MYSQL_DATABASE || "atleast80"
const DB_USER = process.env.MYSQL_USER || "atleast80_user"
const DB_PASSWORD = process.env.MYSQL_PASSWORD || "Atleast80@2026"

const ROOT_HOST = process.env.MYSQL_ROOT_HOST || "localhost"
const ROOT_PORT = Number(process.env.MYSQL_ROOT_PORT) || 3306
const ROOT_USER = process.env.MYSQL_ROOT_USER || "root"
const ROOT_PASSWORD = process.env.MYSQL_ROOT_PASSWORD

async function setupDatabase() {
  if (!ROOT_PASSWORD) {
    console.error("❌ MYSQL_ROOT_PASSWORD is required in .env to run setup:db")
    process.exit(1)
  }

  let connection

  try {
    connection = await mysql.createConnection({
      host: ROOT_HOST,
      port: ROOT_PORT,
      user: ROOT_USER,
      password: ROOT_PASSWORD,
      multipleStatements: true,
    })

    console.log("Connected to MySQL as root")

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`Database "${DB_NAME}" ready`)

    // '%' allows connections from any host
    await connection.query(`CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}'`)
    await connection.query(`GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%'`)
    await connection.query(`FLUSH PRIVILEGES`)

    console.log(`User "${DB_USER}"@'%' created with ALL PRIVILEGES on "${DB_NAME}"`)

    // Also allow localhost for local dev convenience
    await connection.query(`CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}'`)
    await connection.query(`GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'`)
    await connection.query(`FLUSH PRIVILEGES`)

    console.log(`User "${DB_USER}"@'localhost' granted ALL PRIVILEGES on "${DB_NAME}"`)
    console.log("✅ Database setup completed successfully")
  } catch (error) {
    console.error("❌ Database setup failed:", error.message)
    process.exit(1)
  } finally {
    if (connection) await connection.end()
  }
}

setupDatabase()
