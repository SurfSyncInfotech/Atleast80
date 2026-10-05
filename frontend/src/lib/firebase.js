import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let app = null
let messaging = null

try {
  app = initializeApp(firebaseConfig)
} catch (e) {
  console.warn("Firebase initialization warning:", e.message)
}

/**
 * Request Web Notification Permission & register FCM Token with Backend API
 * @param {string} authToken JWT token of logged in user
 */
export async function requestWebNotificationPermission(authToken) {
  try {
    const supported = await isSupported()
    if (!supported) {
      console.log("FCM Messaging is not supported in this browser.")
      return null
    }

    if (!messaging && app) {
      messaging = getMessaging(app)
    }

    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notifications.")
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("Notification permission denied by user.")
      return null
    }

    let registration = null
    if ("serviceWorker" in navigator) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration || undefined,
    })

    if (token && authToken) {
      const baseUrl = import.meta.env.VITE_API_URL || ""
      await fetch(`${baseUrl}/api/auth/fcm-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: token, fcmToken: token }),
      }).catch((e) => console.warn("Failed to sync FCM token to backend:", e.message))
    }

    return token
  } catch (err) {
    console.warn("Error requesting Web Notification permission:", err)
    return null
  }
}

/**
 * Foreground message listener for real-time notifications
 */
export async function onForegroundMessage(callback) {
  try {
    const supported = await isSupported()
    if (!supported) return () => {}

    if (!messaging && app) {
      messaging = getMessaging(app)
    }

    if (messaging) {
      return onMessage(messaging, (payload) => {
        if (callback) callback(payload)
      })
    }
  } catch (err) {
    console.warn("Error subscribing to foreground messaging:", err)
  }
  return () => {}
}

/**
 * Loud Web Audio Chime / Ringtone for Kitchen New Order & Customer Alerts
 */
export function playKitchenOrderRingtone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const now = ctx.currentTime
    const times = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
    const freqs = [880, 1174.66, 880, 1174.66, 880, 1318.51]

    times.forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freqs[i], now + t)
      gain.gain.setValueAtTime(0.4, now + t)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.18)
    })
  } catch (e) {
    console.warn("Audio Context chime warning:", e)
  }
}
