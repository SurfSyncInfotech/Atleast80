import pool from "../config/db.js"

async function run() {
  try {
    await pool.query(`
      ALTER TABLE hygiene_checks 
      ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'
    `)
    console.log("Added status column")
  } catch (e) {
    console.log("status column already exists or skipped:", e.message)
  }

  try {
    await pool.query(`
      ALTER TABLE hygiene_checks 
      ADD COLUMN rejection_reason VARCHAR(255) DEFAULT NULL
    `)
    console.log("Added rejection_reason column")
  } catch (e) {
    console.log("rejection_reason column already exists or skipped:", e.message)
  }

  try {
    await pool.query(`
      ALTER TABLE hygiene_checks 
      ADD COLUMN reviewed_at TIMESTAMP NULL DEFAULT NULL
    `)
    console.log("Added reviewed_at column")
  } catch (e) {
    console.log("reviewed_at column already exists or skipped:", e.message)
  }

  try {
    await pool.query(`
      ALTER TABLE hygiene_checks 
      ADD COLUMN reviewed_by INT DEFAULT NULL
    `)
    console.log("Added reviewed_by column")
  } catch (e) {
    console.log("reviewed_by column already exists or skipped:", e.message)
  }

  process.exit(0)
}

run()
