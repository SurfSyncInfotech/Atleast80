import pool from "../src/config/db.js"

async function test() {
  const [rev] = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE 
        WHEN payment_method IN ('online', 'upi', 'razorpay') AND status != 'cancelled' THEN grand_total
        WHEN payment_method = 'cod' AND status = 'delivered' AND doorstep_payment_method = 'admin_qr_online' THEN grand_total
        WHEN payment_method = 'cod' AND status != 'cancelled' THEN COALESCE(NULLIF(advance_amount, 0), 30.00)
        ELSE 0 
      END), 0) AS onlineTotal,
      
      COALESCE(SUM(CASE 
        WHEN payment_method = 'cod' AND status = 'delivered' AND (doorstep_payment_method IS NULL OR doorstep_payment_method = 'cash') THEN COALESCE(NULLIF(remaining_amount, 0), GREATEST(0, grand_total - 30.00))
        ELSE 0 
      END), 0) AS codTotal
    FROM orders
  `)
  console.log("Result:", rev[0])
  console.log("Total Revenue:", Number(rev[0].onlineTotal) + Number(rev[0].codTotal))
  process.exit(0)
}

test()
