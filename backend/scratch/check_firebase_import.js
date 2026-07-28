import admin from "firebase-admin"
import * as adminStar from "firebase-admin"

console.log("admin default:", typeof admin, admin ? Object.keys(admin).slice(0, 10) : "null")
console.log("adminStar:", typeof adminStar, adminStar ? Object.keys(adminStar).slice(0, 10) : "null")
process.exit(0)
