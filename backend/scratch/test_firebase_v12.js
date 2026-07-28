import { initializeApp } from "firebase-admin/app"
import { cert } from "firebase-admin/app"

console.log("initializeApp:", typeof initializeApp)
console.log("cert:", typeof cert)
process.exit(0)
