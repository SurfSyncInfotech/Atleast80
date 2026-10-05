import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    const [res] = await pool.query(
      "UPDATE menu_items SET gst_rate = 5 WHERE category = 'food' OR gst_rate = 18 OR gst_rate IS NULL"
    );
    console.log("Database updated existing items to 5% GST:", res.affectedRows, "rows affected");
    process.exit(0);
  } catch (e) {
    console.log("DB update error:", e.message);
    process.exit(0);
  }
}

run();
