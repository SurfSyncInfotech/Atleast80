import jwt from "jsonwebtoken"

async function run() {
  // Try fallback secret
  const fallbackSecret = "atleast80_dev_secret_change_in_production"
  const token = jwt.sign({ id: 18, role: "customer" }, fallbackSecret, { expiresIn: "30d" })
  console.log("Generated Token with fallback:", token)

  const res = await fetch("http://localhost:8080/api/bulk-enquiries/kitchen/10", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })

  console.log("Status:", res.status)
  const data = await res.json()
  console.log("Response:", JSON.stringify(data, null, 2))
}

run().catch(console.error)
