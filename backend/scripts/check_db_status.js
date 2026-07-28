import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function checkDbStatus() {
  console.log("🔍 Checking Database Schema Status against migrations...\n")

  try {
    const [tables] = await pool.query("SHOW TABLES")
    const tableNames = tables.map(t => Object.values(t)[0])

    const checks = {
      V23: {
        description: "Site Settings table (Partner Agreement)",
        check: async () => {
          return tableNames.includes("site_settings")
        },
        script: "node scripts/migrateV23.js"
      },
      V24: {
        description: "Training Video columns in site_settings table",
        check: async () => {
          if (!tableNames.includes("site_settings")) return false
          const [cols] = await pool.query("DESCRIBE site_settings")
          return cols.some(c => c.Field === "training_video_url")
        },
        script: "node scripts/migrateV24.js"
      },
      V25: {
        description: "Doorstep Cancel Fee column in orders table",
        check: async () => {
          if (!tableNames.includes("orders")) return false
          const [cols] = await pool.query("DESCRIBE orders")
          return cols.some(c => c.Field === "cancel_fee_paid")
        },
        script: "node scripts/migrateV25.js"
      },
      V26: {
        description: "Rider Cash Handovers (EOD) table",
        check: async () => {
          return tableNames.includes("rider_cash_handovers")
        },
        script: "node scripts/migrateV26.js"
      },
      V27: {
        description: "FCM Push Token column in users table",
        check: async () => {
          if (!tableNames.includes("users")) return false
          const [cols] = await pool.query("DESCRIBE users")
          return cols.some(c => c.Field === "fcm_token")
        },
        script: "node scripts/migrateV27.js"
      },
      V28: {
        description: "Suspension/Block Status column in users table",
        check: async () => {
          if (!tableNames.includes("users")) return false
          const [cols] = await pool.query("DESCRIBE users")
          return cols.some(c => c.Field === "status")
        },
        script: "node scripts/migrateV28.js"
      }
    }

    let missingCount = 0
    for (const [version, info] of Object.entries(checks)) {
      const applied = await info.check()
      if (applied) {
        console.log(`✅ ${version}: Applied - ${info.description}`)
      } else {
        console.log(`❌ ${version}: MISSING - ${info.description}`)
        console.log(`   👉 Run: ${info.script}`)
        missingCount++
      }
    }

    if (missingCount === 0) {
      console.log("\n🎉 All recent migrations are already applied! Your database is up to date.")
    } else {
      console.log(`\n⚠️  ${missingCount} migrations are missing. Please run the commands listed above.`)
    }

  } catch (error) {
    console.error("❌ Error connecting to database or checking status:", error.message)
  }
  process.exit(0)
}

checkDbStatus()
