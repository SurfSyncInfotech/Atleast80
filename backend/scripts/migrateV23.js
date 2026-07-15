import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

async function migrateV23() {
  const [accountVerifiedCols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'account_verified'`
  )

  if (accountVerifiedCols.length === 0) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN account_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER phone_verified`
    )
    console.log("✅ Added users.account_verified")

    const [result] = await pool.query(
      `UPDATE users SET account_verified = 1 WHERE role = 'kitchen' AND phone_verified = 1`
    )
    console.log(`ℹ️  Marked ${result.affectedRows} already-verified kitchen accounts as account_verified`)
  } else {
    console.log("ℹ️  users.account_verified already exists")
  }

  const [kitchenPhoneCols] = await pool.query(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens' AND COLUMN_NAME = 'phone'`
  )

  if (kitchenPhoneCols.length > 0 && kitchenPhoneCols[0].IS_NULLABLE === "NO") {
    await pool.query(`ALTER TABLE kitchens MODIFY phone VARCHAR(15) NULL`)
    console.log("✅ Made kitchens.phone nullable")
  } else {
    console.log("ℹ️  kitchens.phone is already nullable")
  }

  const agreementColumnsToAdd = [
    { name: "agreement_accepted_version", definition: "ADD COLUMN agreement_accepted_version INT NULL" },
    { name: "agreement_accepted_at", definition: "ADD COLUMN agreement_accepted_at TIMESTAMP NULL" },
  ]

  for (const col of agreementColumnsToAdd) {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kitchens' AND COLUMN_NAME = ?`,
      [col.name]
    )

    if (cols.length === 0) {
      await pool.query(`ALTER TABLE kitchens ${col.definition}`)
      console.log(`✅ Added kitchens.${col.name}`)
    } else {
      console.log(`ℹ️  kitchens.${col.name} already exists`)
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT PRIMARY KEY DEFAULT 1,
      partner_agreement_url VARCHAR(500),
      partner_agreement_version INT NOT NULL DEFAULT 0,
      partner_agreement_updated_at TIMESTAMP NULL
    )
  `)
  console.log("✅ Ensured site_settings table exists")

  await pool.query(`
    INSERT IGNORE INTO site_settings (id, partner_agreement_version) VALUES (1, 0)
  `)
  console.log("✅ Ensured site_settings singleton row exists")

  console.log("✅ Migration V23 completed")
  process.exit(0)
}

migrateV23().catch((e) => {
  console.error("❌ Migration V23 failed:", e.message)
  process.exit(1)
})
