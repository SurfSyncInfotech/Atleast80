<USER_REQUEST>
are you serios tum kya kar rahe hai mobile view me kuch bhi sahi nahi hai 
tum theek se frontend ka layout samaz lo or uske hisab se muze react native me code karke do na
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-06-23T13:22:33+05:30.
</ADDITIONAL_METADATA>
<USER_REQUEST>
# Atleast80 â€” React (Web) â†’ React Native Conversion Spec

> **Purpose of this document**: This is a complete technical specification of the existing **Atleast80** React web app (a homemade-food + grocery marketplace, similar to Swiggy/Zomato but for verified home kitchens). It documents every screen, component, design token, API call, and image/media pattern in the current codebase **so that an AI coding agent can rebuild the exact same UI and behavior as a React Native (Expo) mobile app.**
>
> The goal is **pixel-equivalent parity on mobile** â€” same screens, same flows, same colors/fonts, same images, same API integration logic â€” just rebuilt with React Native components and React Native-appropriate libraries instead of web/DOM/Tailwind.
>
> Read this whole document before writing code. Section 14 has a step-by-step build checklist.

---

## 1. Project Overview

**App name:** Atleast80 â€” "Follow the Kitchen Tradition"
**Domain:** Food delivery + grocery delivery marketplace connecting customers to verified **home kitchens** (not restaurants). Kitchens upload daily hygiene-verification photos/videos and get a hygiene score. Customers order food + groceries together in one cart from a single kitchen.

**User roles (3):**
1. **Customer** â€” browses kitchens, views menus, adds to cart, checks out, tracks orders, views/edits profile.
2. **Kitchen (seller)** â€” registers, gets admin-approved, manages menu items, uploads hygiene proof, uploads "home card" cover image, posts 24-hr stories, views dashboard.
3. **Admin** â€” approves/rejects kitchen registrations, views platform stats, manages featured kitchens, reviews hygiene submissions.

**Current web stack:**
- React 19 + Vite 8
- React Router DOM v7 (`BrowserRouter`)
- Tailwind CSS v4 (via `@tailwindcss/vite`, using `@theme` CSS custom properties â€” no `tailwind.config.js`)
- Framer Motion (page transitions, micro-animations)
- `lucide-react` (icon set)
- Context API for global state (no Redux/Zustand)
- Plain `fetch` wrapper for API calls (no axios/react-query)
- `localStorage` for auth token + cart persistence

**Backend:** REST API. JWT bearer-token auth. All endpoints are prefixed `/api/...`. Full endpoint list is in **Section 7.4**. The web app's production deployment points at `https://backend.atleast80.com`, but **for this React Native build, use the local backend** (`http://localhost:5000` from the dev machine's point of view) â€” see Section 7.1 for the exact host to use per platform (Android emulator / iOS simulator / physical device all need a different value, since "localhost" means something different on each).

---

## 2. Recommended React Native Tech Stack

Use **Expo (SDK, managed workflow)** unless the team has a strong reason for bare RN. Recommended libraries, chosen to be the closest behavioral match to what the web app already uses:

| Web concern | Web library | React Native equivalent |
|---|---|---|
| Routing | `react-router-dom` (BrowserRouter, Routes, Route, useNavigate, useParams, useLocation) | `@react-navigation/native` + `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` + `@react-navigation/drawer` |
| Styling | Tailwind CSS v4 utility classes | **NativeWind v4** (lets you keep writing `className="bg-primary rounded-xl"` â€” closest 1:1 port of existing class strings) **or** a `StyleSheet`-based theme module if NativeWind is not desired. This doc assumes NativeWind for fastest, most faithful porting. |
| Icons | `lucide-react` | `lucide-react-native` (same icon names, same props: `size`, `color`/`className`, `strokeWidth`) |
| Animation | `framer-motion` | `react-native-reanimated` + `moti` (Moti's API is intentionally very close to Framer Motion: `initial`, `animate`, `exit`, `transition` props) |
| Local persistent storage | `localStorage` | `@react-native-async-storage/async-storage` |
| HTTP requests | `fetch` | `fetch` (RN has a built-in `fetch`, no library needed â€” keep the same `api.js` wrapper logic) |
| File / image picking | `<input type="file">` | `expo-image-picker` (gallery) + `expo-camera` or `ImagePicker.launchCameraAsync` (camera) |
| Video playback | `<video>` tag | `expo-video` (preferred, modern API) or `expo-av`â€™s `Video` component |
| Image carousel / gallery | custom div+state | Keep custom logic (FlatList horizontal pagination or simple state-driven `Image` swap â€” same logic as web, see Section 9.6) |
| Gradients | Tailwind `bg-gradient-to-br` | `expo-linear-gradient` |
| Blur backgrounds | `backdrop-blur-md` | `expo-blur`â€™s `BlurView` |
| SVG / custom icons | inline SVG | `react-native-svg` (lucide-react-native depends on this) |
| Safe areas / notches | N/A (web) | `react-native-safe-area-context` |
| Bottom sheet modals (Menu item detail) | custom div w/ Framer Motion slide-up | `@gorhom/bottom-sheet` or replicate with `Modal` + `Animated`/Moti slide-up (recommended: replicate with Modal + Moti to match existing spring transition exactly) |
| Pull to refresh | N/A | `RefreshControl` in `ScrollView`/`FlatList` |
| Confirm/alert dialogs (`window.confirm`, `alert`) | native browser dialogs | `Alert.alert()` from `react-native` |

Also install: `expo-router` is **optional** â€” this spec writes navigation examples using `@react-navigation` directly since it maps 1:1 to the existing route table, but `expo-router`'s file-based routing is equally acceptable if the agent prefers it. Pick **one** and be consistent.

---

## 3. Design System â€” Theme Tokens

The web app defines all design tokens in `src/index.css` using Tailwind v4's `@theme` block. **Port these exactly** â€” do not invent new colors or spacing.

### 3.1 Colors

```js
// theme/colors.js
export const colors = {
  primary: "#0B6B3A",
  primaryLight: "#4CAF50",
  primaryDark: "#064d29",
  secondary: "#F4C400",
  secondaryLight: "#FFD740",
  accent: "#FF6B00",
  cream: "#F8F8F5",
  creamDark: "#F0EFE8",
  dark: "#1F1F1F",
  darkLight: "#4A4A4A",
  gray: "#7A7A7A",
  grayLight: "#E8E8E8",
  white: "#FFFFFF",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
}
```

If using **NativeWind**, recreate this as a Tailwind config so `className="bg-primary text-secondary"` works exactly like on web:

```js
// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0B6B3A", light: "#4CAF50", dark: "#064d29" },
        secondary: { DEFAULT: "#F4C400", light: "#FFD740" },
        accent: "#FF6B00",
        cream: { DEFAULT: "#F8F8F5", dark: "#F0EFE8" },
        dark: { DEFAULT: "#1F1F1F", light: "#4A4A4A" },
        gray: { DEFAULT: "#7A7A7A", light: "#E8E8E8" },
        success: "#4CAF50",
        warning: "#FF9800",
        error: "#F44336",
      },
      borderRadius: { sm: "8px", md: "12px", lg: "18px", xl: "24px" },
      fontFamily: {
        poppins: ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
        "poppins-extrabold": ["Poppins_800ExtraBold"],
        nunito: ["Nunito_400Regular"],
        "nunito-semibold": ["Nunito_600SemiBold"],
        "nunito-bold": ["Nunito_700Bold"],
      },
    },
  },
  plugins: [],
}
```

> Note on radius naming collision: Tailwind's default `rounded-xl` etc. already exist; the web app's custom radius scale (`--radius-sm: 8px` â€¦ `--radius-full: 9999px`) is mostly used implicitly via Tailwind defaults (`rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`) throughout components â€” so in practice you can just use Tailwind/NativeWind's **default** radius scale (`rounded-lg/xl/2xl/3xl/full`) and it will visually match, since the components in this codebase use Tailwind's stock radius classes (`rounded-xl`, `rounded-2xl`, `rounded-[2rem]`, etc.) rather than the custom CSS vars directly.

### 3.2 Fonts

Two font families, loaded from Google Fonts on web (`Poppins` for headings/emphasis, `Nunito` for body text):

```js
// In RN, use @expo-google-fonts/poppins and @expo-google-fonts/nunito
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins"
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito"
```

**Rule of thumb used throughout the web app**: `font-poppins` + `font-bold/font-semibold` for **headings, prices, names, buttons, labels with emphasis**. `font-nunito` for **body copy, descriptions, secondary/meta text**.

### 3.3 Background & base colors
- App background: `cream` (`#F8F8F5`) everywhere â€” this is the default screen background color (equivalent to `body { background-color: var(--color-cream) }`).
- Cards: `white` background, `rounded-2xl`, `shadow-sm` (use RN `shadow-*` props or `elevation` on Android â€” see Section 3.4).
- Text default color: `dark` (`#1F1F1F`).

### 3.4 Shadows (web `shadow-sm`/`shadow-md`/`shadow-lg` â†’ RN)

```js
// theme/shadows.js
export const shadows = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
}
```

---

## 4. Important Mobile-First Note (read before building)

The current web app is **responsive** â€” most components/sections have an explicit **mobile variant** (Tailwind `md:hidden`, shown by default) and a **desktop variant** (`hidden md:block` / `hidden md:flex`, hidden by default). Examples: `Navbar` mobile location-pill vs desktop search bar; `HomePage`'s `DesktopHero` (full-bleed video hero) vs `MobileHeroBanner` (compact rounded video card); `Footer` is `hidden md:block` (**desktop-only, never shown on mobile**); `BottomNav` is `md:hidden` (**mobile-only**).

**Because React Native targets phones/tablets (no desktop browser), you should:**
1. **Always port the mobile (`md:hidden` / default) variant** of every section/component as the primary and only implementation.
2. **Skip / do not port** anything wrapped in `hidden md:block`, `hidden md:flex`, `hidden lg:flex` that is purely a *desktop-only marketing/decorative section* â€” e.g. `Footer` component, `HowItWorks`, `WhySection`, `PartnerSection`, `DesktopHero` on the Home page, the desktop sidebar nav text labels, etc. These desktop-only sections are listed explicitly per-screen in Section 11 so nothing is missed or wrongly included.
3. Where a feature exists in **both** variants with different layouts (e.g. Kitchen page tabs, Search filters, Cart bill summary), implement it once using the **mobile layout structure**, since that's the only one needed.
4. If the project later wants tablet support, use `useWindowDimensions()` from `react-native` to conditionally adjust grid column counts (this doc treats phone-width as the only target for v1).

---

## 5. Navigation Structure (Route Map)

Source: `src/App.jsx`. Below is the full route table with the React Native navigator type to use for each, and which navigator it lives inside.

### 5.1 Root navigator structure

```
RootStack (Native Stack, headerShown: false)
â”œâ”€â”€ Splash                         (auto-navigates to Onboarding after ~2.8s)
â”œâ”€â”€ Onboarding                     (4-slide swiper, navigates to MainTabs)
â”œâ”€â”€ Auth Stack (Login, Signup, ForgotPassword)
â”œâ”€â”€ MainTabs (Bottom Tab Navigator) â€” shown after onboarding/login, this is the app "shell"
â”‚   â”œâ”€â”€ Home
â”‚   â”œâ”€â”€ Search (tab label: "Discover")
â”‚   â”œâ”€â”€ Stories  (tab label: "Stories" â€” center, highlighted/raised icon)
â”‚   â”œâ”€â”€ Orders   (tab label: "Orders" â€” requires customer auth, else redirect to Login)
â”‚   â””â”€â”€ Profile  (requires customer auth, else redirect to Login)
â”œâ”€â”€ About                          (pushed on top of tabs, not a tab itself)
â”œâ”€â”€ KitchenDetail/:id              (pushed on top of tabs)
â”œâ”€â”€ Cart                           (requires customer auth)
â”œâ”€â”€ Checkout                       (requires customer auth)
â”œâ”€â”€ OrderTracking/:id              (requires customer auth)
â”œâ”€â”€ Kitchen Auth Stack (KitchenLogin, KitchenSignup)
â”œâ”€â”€ Kitchen Panel (Drawer Navigator, requires kitchen-role auth)
â”‚   â”œâ”€â”€ KitchenDashboard
â”‚   â”œâ”€â”€ KitchenMenu       (locked/disabled until kitchen.status === 'approved')
â”‚   â””â”€â”€ KitchenProfile
â”œâ”€â”€ Admin Login
â””â”€â”€ Admin Panel (Drawer Navigator, requires admin-role auth)
    â”œâ”€â”€ AdminDashboard (also handles /admin/kitchens â€” same screen)
    â””â”€â”€ AdminFeaturedKitchens
```

### 5.2 Full route â†’ screen table

| Web path | Screen component | Auth requirement | Notes |
|---|---|---|---|
| `/` | SplashScreen | none | Logo splash, auto-redirect after 2.8s |
| `/onboarding` | OnboardingPage | none | 4 swipeable slides |
| `/login` | LoginPage | none | Customer login |
| `/signup` | SignupPage | none | Customer signup |
| `/forgot-password` | ForgotPasswordPage | none | OTP-based reset |
| `/home` | HomePage | none (browsable as guest) | Main tab |
| `/search` | SearchPage | none | "Discover" tab |
| `/about` | AboutPage | none | Pushed screen, not a tab |
| `/stories` | (renders HomePage in web â€” **in RN, make this its own dedicated "Stories" tab/screen** showing the stories rail full-screen or simply opening the StoryViewer; recommended: make the Stories tab open the StoryViewer directly over the currently-loaded story groups, or show a dedicated grid of all kitchen story circles) | none | See Section 11.4 |
| `/kitchen/login` | KitchenLoginPage | none | Seller login |
| `/kitchen/signup` | KitchenSignupPage | none | Seller registration (multi-field form + FSSAI license file upload) |
| `/kitchen/dashboard` | KitchenDashboardPage | role: kitchen | |
| `/kitchen/menu` | KitchenMenuPage | role: kitchen | Locked until approved |
| `/kitchen/profile` | KitchenProfilePage | role: kitchen | |
| `/kitchen/:id` | KitchenPage | none | Public kitchen storefront w/ tabs: Food / Ration / Offers |
| `/cart` | CartPage | role: customer | |
| `/checkout` | CheckoutPage | role: customer | |
| `/orders/:id` | OrderTrackingPage | role: customer | |
| `/orders` | OrdersPage | role: customer | "Orders" tab |
| `/profile` | ProfilePage | role: customer | "Profile" tab |
| `/admin/login` | AdminLoginPage | none | |
| `/admin`, `/admin/kitchens` | AdminDashboardPage | role: admin | Same screen for both paths |
| `/admin/featured` | AdminFeaturedKitchensPage | role: admin | |

### 5.3 Auth-gating logic (`ProtectedRoute` â†’ RN equivalent)

Web `ProtectedRoute.jsx` logic to replicate exactly:
```js
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) {
    const dest = role === "admin" ? "AdminLogin" : role === "kitchen" ? "KitchenLogin" : "Login"
    return <Navigate to={dest} />  // in RN: navigation.replace(dest)
  }
  if (role && user.role !== role) {
    return <Navigate to="Home" />
  }
  return children
}
```
In React Navigation, implement this as a wrapper component used inside each protected screen, or better: a custom hook `useRequireAuth(role)` called at the top of each protected screen that calls `navigation.replace(...)` in a `useEffect` when the condition fails, while rendering a loading spinner during `loading`.

### 5.4 Bottom tab bar (`BottomNav.jsx` â†’ Bottom Tab Navigator)

5 tabs, exact order and behavior:

| Icon (lucide) | Label | Target | Special behavior |
|---|---|---|---|
| `Home` | Home | Home tab | Active state: icon filled tint `primary/20`, text+icon colored `primary` |
| `Search` | Discover | Search tab | |
| `PlayCircle` | Stories | Stories tab | **Raised/highlighted circular button** â€” `40x40` circle, gradient background `secondary â†’ accent`, white icon, floats `-mt-4` above the bar (gives an Instagram-Reels-style raised center button look) â€” only when **not** the active tab. When active, render like a normal tab item. |
| `ShoppingBag` | Orders | Orders tab | Shows cart-item-count badge (red/accent dot, top-right of icon, shows `9+` if >9) coming from `useCart().itemCount`. Requires customer auth â€” if not logged in as customer, tapping navigates to Login instead of Orders. |
| `User` | Profile | Profile tab | If logged in as customer: replace icon with a small circular avatar showing the user's initials on a primary-colored background. Requires customer auth â€” if not logged in, tapping navigates to Login. |

Tab bar styling: white background, top border `gray-light/50`, subtle top shadow, **hidden on desktop** (irrelevant for RN â€” always shown).

---

## 6. Global State / Context (Auth, Cart, Kitchen Panel)

Port all three React Contexts as-is â€” same shape, same method names, same logic â€” just swap `localStorage` for `AsyncStorage` (which is async, so a couple of methods need `await`/loading-state adjustments).

### 6.1 Auth storage (`lib/authStorage.js`)

```js
// storage/authStorage.js  (React Native version)
import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "atleast80_auth"

export async function readStoredAuth() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const auth = raw ? JSON.parse(raw) : null
    if (!auth?.token) return null
    return { token: auth.token, user: auth.user ?? null, kitchen: auth.kitchen ?? null }
  } catch {
    await clearStoredAuth()
    return null
  }
}

export async function writeStoredAuth(auth) {
  if (auth?.token && auth?.user) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      token: auth.token, user: auth.user, kitchen: auth.kitchen ?? null,
    }))
    return
  }
  await clearStoredAuth()
}

export async function patchStoredAuth(patch) {
  const stored = await readStoredAuth()
  if (!stored?.token) return null
  const next = {
    token: stored.token,
    user: patch.user !== undefined ? patch.user : stored.user,
    kitchen: patch.kitchen !== undefined ? patch.kitchen : stored.kitchen,
  }
  if (!next.user) return stored
  await writeStoredAuth(next)
  return next
}

export async function clearStoredAuth() {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export async function getStoredToken() {
  return (await readStoredAuth())?.token ?? null
}
```

> âš ï¸ Web's legacy migration logic (`atleast80_token` key migration) is **not needed** in RN since there's no legacy mobile app to migrate from â€” omit it.

### 6.2 AuthContext (`context/AuthContext.jsx`)

Port 1:1. Exposes: `user`, `kitchen`, `loading`, `isAdmin`, `isKitchen`, `isCustomer`, and these async methods (all unchanged in signature/behavior, just calling the RN `api()` wrapper):
- `loginKitchen(email, password)` â†’ `POST /api/auth/kitchen/login`
- `registerKitchen(form, fssaiLicenseFile)` â†’ multipart `POST /api/auth/kitchen/register`
- `loginAdmin(email, password)` â†’ `POST /api/auth/admin/login`
- `registerCustomer({name, email, phone, password})` / `signupCustomer(...)` â†’ `POST /api/auth/customer/register`
- `loginCustomer(email, password)` â†’ `POST /api/auth/customer/login`
- `sendForgotPasswordOtp(email)` â†’ `POST /api/auth/customer/forgot-password/send-otp`
- `resetPassword({email, otp, password})` â†’ `POST /api/auth/customer/forgot-password/reset`
- `updateProfile(profile)` â†’ `PATCH /api/auth/customer/profile`
- `logout()` â†’ clears storage + state
- `refreshKitchen()` â†’ `GET /api/kitchens/me`, updates `kitchen` state

On mount, it bootstraps the session: reads stored auth â†’ if a token exists, immediately sets `user`/`kitchen` from cache (so UI isn't blank), then calls `GET /api/auth/me` in the background to revalidate; on `401` it clears the session. Replicate this exact "optimistic cache + background revalidate" flow in RN using `useEffect` (it avoids a flash of "logged out" UI on app start).

### 6.3 CartContext (`context/CartContext.jsx`)

Port 1:1 â€” `useReducer` with actions `ADD_ITEM`, `REMOVE_ITEM`, `DELETE_ITEM`, `CLEAR`. Cart persists to `AsyncStorage` key `"atleast80_cart"` on every change (use a `useEffect` watching `cart`, same as web).

Key business rule to preserve exactly: **a cart can only contain items from one kitchen at a time.** When `addItem(item)` is called and the cart already has items from a *different* `kitchenId`, show a confirm dialog: *"Your cart has items from another kitchen. Clear cart and add this item?"* â€” in RN, use `Alert.alert(title, message, [{text:"Cancel"}, {text:"OK", onPress: ...}])` instead of `window.confirm`. If confirmed, clear the cart first, then add the new item.

`requireCustomer()` helper: if the logged-in user isn't role `customer`, navigate to Login (passing the current route name so Login can return there after success) and return `false`; otherwise return `true`. Every "Add to cart" action must call this guard first (exact same as web's `FoodCard`, `GroceryCard`, `MenuListItem`, `MenuItemDetailModal`, `Navbar`'s cart icon, `OfferItemCard`).

Exposed value: `{ cart, addItem, removeItem, deleteItem, clearCart, itemCount, total, getItemQty, requireCustomer }`.

### 6.4 KitchenPanelContext

Tiny context used only inside the Kitchen seller panel to let child screens trigger the "Add Story" modal from the shared layout/header: `{ openStoryModal: () => {}, storiesRevision: 0 }`. Port as-is.

---

## 7. API Integration Layer

This is the most important section â€” **replicate this exact pattern**, this is how "API integrate kaise ki hai" works throughout the whole app.

### 7.1 Core API client (`lib/api.js`)

```js
// lib/api.js  (React Native version)
import { getStoredToken } from "../storage/authStorage"

// In RN, there's no Vite env vars â€” use a constants file or `expo-constants` / `app.config.js extra` field.
//
// âš ï¸ USE THE LOCAL BACKEND FOR NOW (per current project decision) â€” NOT the production URL.
// The web app's `.env` currently points at: VITE_API_URL=http://localhost:5000
//
// IMPORTANT â€” "localhost" behaves DIFFERENTLY on a phone/emulator than in a browser:
// a React Native app running on a device/emulator is a separate machine from your computer,
// so "localhost" inside the RN app means "this phone", NOT "the laptop running the backend".
// Use the correct host per platform, all pointing at the same backend dev server (port 5000):
//
//   â€¢ iOS Simulator           â†’ http://localhost:5000          (simulator shares the Mac's network stack, this works)
//   â€¢ Android Emulator (AVD)  â†’ http://10.0.2.2:5000           (10.0.2.2 is the emulator's special alias for the host machine)
//   â€¢ Physical phone (iOS/Android), same Wi-Fi as your laptop â†’ http://<YOUR_LAPTOP_LAN_IP>:5000
//       (find this IP via `ipconfig` on Windows or `ifconfig`/`ipconfig getifaddr en0` on Mac,
//        e.g. http://192.168.1.42:5000 â€” and make sure the backend is started with a host of
//        0.0.0.0, not just 127.0.0.1, so it actually accepts connections from other devices on the network)
//
// Recommended setup: don't hardcode one value â€” read it from app.config.js's `extra` field
// (set per-platform/per-machine) so every teammate can run their own local backend without
// editing source code. Example:
//
//   // app.config.js
//   export default {
//     expo: {
//       extra: {
//         apiUrl: process.env.API_URL || "http://10.0.2.2:5000", // override via API_URL env var when running `expo start`
//       },
//     },
//   }
//
//   // lib/api.js
//   import Constants from "expo-constants"
//   const API_URL = Constants.expoConfig.extra.apiUrl

const API_URL = "http://10.0.2.2:5000" // â† LOCAL backend (Android emulator default). Swap per the platform notes above for iOS simulator / physical device / teammate's machine.

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, options = {}) {
  const token = await getStoredToken()
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(data.message || "Something went wrong", res.status)
  }
  return data
}
```

**Usage pattern used everywhere in the app** (replicate this exact try/catch/finally shape on every screen that loads data):
```js
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(false)

useEffect(() => {
  let cancelled = false
  async function load() {
    setLoading(true)
    try {
      const res = await api("/api/some/endpoint")
      if (!cancelled) setData(res)
    } catch {
      if (!cancelled) setError(true)
      // many screens additionally fall back to local mock data here â€” see Section 7.5
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  load()
  return () => { cancelled = true }
}, [])
```
Always show a **skeleton/shimmer loading state** while `loading`, an **inline error state with a "Try again" button** that re-runs the load function, and the real content otherwise. This 3-state pattern (loading / error / data) is used on almost every data-driven screen (Home's featured/explore kitchens, Search, Kitchen detail, Orders, Admin dashboard, etc.) â€” keep it consistent.

### 7.2 File / multipart uploads (`uploadFormData`, `uploadFiles`, etc.)

Web uses `FormData` + `fetch` without the `Content-Type: application/json` header (so the browser sets the correct multipart boundary automatically). **In React Native, building FormData for files works differently** â€” you must pass an object shaped like `{ uri, name, type }` for each file, not a raw `File`/`Blob` object from an `<input>`.

```js
// lib/api.js continued â€” RN-specific multipart upload helper
async function uploadFormData(path, formData) {
  const token = await getStoredToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: formData })
  } catch {
    throw new ApiError("Upload failed â€” check your connection", 0)
  }

  const data = await res.json().catch(() => ({}))
  if (res.status === 413) {
    throw new ApiError("Upload rejected: file too large", 413)
  }
  if (!res.ok) {
    throw new ApiError(data.message || "Upload failed", res.status)
  }
  return data
}

// Helper to convert an Expo ImagePicker asset into a FormData-appendable file object
function toRNFile(asset, fallbackName = "upload") {
  const uri = asset.uri
  const name = asset.fileName || uri.split("/").pop() || `${fallbackName}.jpg`
  const ext = name.split(".").pop()?.toLowerCase()
  const type = asset.mimeType || (asset.type === "video" ? `video/${ext === "mov" ? "quicktime" : ext}` : `image/${ext === "jpg" ? "jpeg" : ext}`)
  return { uri, name, type }
}

export async function uploadMenuFiles(assets) {
  if (!assets?.length) return { images: [], videos: [] }
  const formData = new FormData()
  assets.forEach((asset) => formData.append("files", toRNFile(asset)))
  return uploadFormData("/api/menu/upload", formData)
}

export async function uploadStoryFiles(assets) {
  if (!assets?.length) return { stories: [] }
  const formData = new FormData()
  assets.forEach((asset) => formData.append("files", toRNFile(asset)))
  return uploadFormData("/api/stories", formData)
}

export async function uploadKitchenLogo(asset) {
  const formData = new FormData()
  formData.append("logo", toRNFile(asset, "logo"))
  return uploadFormData("/api/kitchens/me/logo", formData)
}

export async function uploadKitchenCover(asset) {
  const formData = new FormData()
  formData.append("cover", toRNFile(asset, "cover"))
  return uploadFormData("/api/kitchens/me/cover", formData)
}

export async function registerKitchen(form, fssaiLicenseAsset) {
  const formData = new FormData()
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value))
  })
  formData.append("fssaiLicense", toRNFile(fssaiLicenseAsset, "fssai"))
  return uploadFormData("/api/auth/kitchen/register", formData)
}

export async function uploadFiles(path, assets) {
  if (!assets?.length) return { images: [], videos: [] }
  const formData = new FormData()
  assets.forEach((asset) => formData.append("files", toRNFile(asset)))
  return uploadFormData(path, formData)
}
```

**Where file uploads happen in the app (so the agent knows where to wire up `expo-image-picker`):**
1. **Kitchen logo upload** (`KitchenAvatar` editable mode, used in Kitchen Profile) â€” single image, tap avatar â†’ pick from gallery â†’ upload.
2. **Kitchen cover/"home card" image** (`KitchenHomeImageSection`, also in `KitchenLayout` header icon button) â€” single image, required for kitchen approval, shown on the public Home page's kitchen cards.
3. **Hygiene verification uploads** (`HygieneUploadSection`) â€” multi-select images **and videos**, staged locally with previews before an explicit "Submit for review" action (two-phase: pick & preview, then submit).
4. **Menu item images/videos** (`KitchenMenuPage` menu item form) â€” multi-select images & videos per menu item, uploaded first via `/api/menu/upload`, then the returned URLs are attached to the menu item JSON payload (two-step: upload files â†’ get URLs â†’ POST/PUT item with those URLs).
5. **Kitchen story uploads** (`KitchenStoryModal`) â€” image/video posted as a 24-hr story.
6. **FSSAI license document** (`KitchenSignupPage` registration form) â€” one file (image or PDF), submitted together with the rest of the signup form as multipart.

For all of these, use `expo-image-picker`'s `launchImageLibraryAsync` (gallery, `mediaTypes: ImagePicker.MediaTypeOptions.All` when both photo+video are allowed) and offer a camera option via `launchCameraAsync` where the web equivalent used `accept="image/*"` on an `<input>` that mobile browsers render with a camera option (i.e., **avatar/logo/cover uploads and hygiene uploads should let the user choose "Take Photo" or "Choose from Library"** â€” replicate the native picker choice with an action sheet, e.g. `Alert.alert` with two options or a small custom action-sheet component).

### 7.3 Two-step "upload-then-save" pattern (Menu items)

This is the most complex API flow in the app â€” replicate exactly. When a kitchen owner creates/edits a menu item with new photos:

```js
// Step 1: upload any newly-picked files first
let uploadedImages = [], uploadedVideos = []
const filesToUpload = [...pendingImages.map(p => p.asset), ...pendingVideos.map(p => p.asset)]
if (filesToUpload.length > 0) {
  const uploaded = await uploadMenuFiles(filesToUpload)
  uploadedImages = uploaded.images || []
  uploadedVideos = uploaded.videos || []
}

// Step 2: merge with any pre-existing (already-uploaded, when editing) media URLs
const images = [...existingImages, ...uploadedImages]
const videos = [...existingVideos, ...uploadedVideos]

// Step 3: submit the item as JSON, with image[0] as the "cover" thumbnail
const payload = { ...form, images, videos, image: images[0] || null }

if (editingId) {
  await api(`/api/menu/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
} else {
  await api("/api/menu", { method: "POST", body: JSON.stringify(payload) })
}
```

### 7.4 Complete API Endpoint Reference

> All paths are relative to `API_URL`. Auth: send `Authorization: Bearer <token>` header when a token exists (the `api()` wrapper does this automatically). `[multipart]` = use `uploadFormData`/file helpers, not plain JSON `api()`.

**Auth**
| Method | Endpoint | Body | Used by |
|---|---|---|---|
| POST | `/api/auth/customer/register` | `{name, email, phone, password}` | Signup |
| POST | `/api/auth/customer/login` | `{email, password}` | Login |
| POST | `/api/auth/customer/forgot-password/send-otp` | `{email}` | ForgotPassword step 1 |
| POST | `/api/auth/customer/forgot-password/reset` | `{email, otp, password}` | ForgotPassword step 2 |
| PATCH | `/api/auth/customer/profile` | profile fields (name/phone/address/city/pincode etc.) | Profile edit |
| POST | `/api/auth/kitchen/login` | `{email, password}` | Kitchen login |
| POST `[multipart]` | `/api/auth/kitchen/register` | form fields + `fssaiLicense` file | Kitchen signup |
| POST | `/api/auth/admin/login` | `{email, password}` | Admin login |
| GET | `/api/auth/me` | â€” | Session bootstrap/revalidate |

**Kitchens (public + self)**
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/kitchens` | All approved kitchens (Home "Explore More", Search page) |
| GET | `/api/kitchens/featured` | Admin-curated featured kitchens (Home page) |
| GET | `/api/kitchens/:id` | Single kitchen public profile (Kitchen detail page) |
| GET | `/api/kitchens/me` | Logged-in kitchen's own profile |
| PATCH/PUT | `/api/kitchens/me` | Update own kitchen profile (KitchenProfilePage) |
| POST `[multipart]` | `/api/kitchens/me/logo` | field name: `logo` |
| POST `[multipart]` | `/api/kitchens/me/cover` | field name: `cover` |
| PUT/PATCH | `/api/kitchens/me/offer` | Update kitchen-wide offer text (KitchenMenuPage) |

**Menu**
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/menu/kitchen/:id` | Public menu for a kitchen (Kitchen detail page) |
| GET | `/api/menu/me` | Own menu items (Kitchen dashboard/menu page) |
| POST `[multipart]` | `/api/menu/upload` | field name: `files` (multi) â€” returns `{images:[...], videos:[...]}` |
| POST | `/api/menu` | Create item â€” JSON `{name, description, price, category, item_type, images, videos, image, offer, isAvailable, ...}` |
| PUT | `/api/menu/:id` | Update item (full payload or partial e.g. `{isAvailable}` for toggle) |
| DELETE | `/api/menu/:id` | Remove item |

**Stories**
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/stories` | Public home-feed story groups (grouped by kitchen) |
| GET | `/api/stories/me` | Own kitchen's active stories |
| POST `[multipart]` | `/api/stories` | field name: `files` â€” post new story |
| DELETE | `/api/stories/:id` | Remove own story |
| GET | `/api/stories/verification/me` | Own hygiene-verification submissions |
| POST `[multipart]` | `/api/stories/verification` | field name: `files` (multi, images+videos) |
| DELETE | `/api/stories/verification/:id` | Remove a pending/submitted hygiene file |

**Orders**
| Method | Endpoint | Body / Notes |
|---|---|---|
| POST | `/api/orders` | `{kitchenId, items:[{id, menuItemId, name, price, qty, image}], paymentMethod, packingType, deliveryMethod, packingFee, deliveryFee, deliveryAddress}` â€” returns `{order:{id, ...}}` |
| GET | `/api/orders` | Customer's past orders (OrdersPage, ProfilePage) |
| GET | `/api/orders/current` | Customer's active/in-progress orders |
| GET | `/api/orders/:id` | Single order detail + status (OrderTrackingPage) â€” `order.status` is one of `pending`, `confirmed`, `preparing`, `out_for_delivery`, `delivered` |

**Admin**
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard stats cards |
| GET | `/api/admin/kitchens?...` | Filterable/paginated kitchen list (query params built from filters/city/status) |
| GET | `/api/admin/kitchens/cities` | Distinct city list for filter dropdown |
| POST | `/api/admin/kitchens/:id/approve` | Approve a pending kitchen |
| POST | `/api/admin/kitchens/:id/reject` | `{reason}` reject a pending kitchen |
| DELETE | `/api/admin/kitchens/:id` | Remove a kitchen |
| GET | `/api/admin/kitchens/:id/stories` | View a kitchen's hygiene submissions for review |
| GET | `/api/admin/kitchens/featured` | Currently-featured list (AdminFeaturedKitchensPage) |
| POST/PATCH | `/api/admin/kitchens/:id/feature` | `{featured: true/false}` toggle |

### 7.5 Mock-data fallback pattern

Several screens (Home, Search, Kitchen detail) **fall back to local mock data** (`src/data/mockData.js`) when the API call fails, rather than showing a hard error â€” this keeps the UI demo-able / resilient. Port `data/mockData.js` verbatim (categories, kitchens, stories, menu items, grocery items) and replicate the same `.catch(() => setX(mockX))` fallback **only on the specific screens that already do it on web** (see each screen's spec in Section 11 â€” most admin/kitchen-panel screens do NOT fall back to mock data, only public discovery screens do).

### 7.6 Media URL resolution (`lib/media.js`) â€” **critical, port exactly**

Backend returns media URLs that may be relative paths (e.g. `/uploads/abc.jpg`) or absolute URLs. This helper normalizes them and must be used **everywhere an image/video URL comes from the API**:

```js
// lib/media.js (RN version â€” logic identical to web, just no DOM URL needed if not available;
// React Native's global `URL` is available via the `react-native-url-polyfill` or by using a simple string check instead)
const API_URL = "http://10.0.2.2:5000" // âš ï¸ must be the SAME local backend value used in lib/api.js â€” see Section 7.1 for per-platform localhost notes (Android emulator/iOS simulator/physical device all need a different host)

export function resolveMediaUrl(url) {
  if (!url) return null
  if (url.startsWith("/")) return `${API_URL}${url}`
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `${API_URL}/${url}`
  }
  // normalize http->https when pointing at our own API host
  if (url.startsWith("http://") && url.includes(new URL(API_URL).host)) {
    return url.replace("http://", "https://")
  }
  return url
}

export function resolveMenuItemMedia(item) {
  if (!item) return item
  const rawImages = Array.isArray(item.images) ? item.images : item.image ? [item.image] : []
  const images = rawImages.map(resolveMediaUrl).filter(Boolean)
  const videos = (item.videos || []).map(resolveMediaUrl).filter(Boolean)
  const image = resolveMediaUrl(item.image) || images[0] || null
  return { ...item, image, images, videos }
}

export function resolveStoryGroups(groups) {
  return (groups || []).map((group) => ({
    ...group,
    kitchenImage: resolveMediaUrl(group.kitchenImage),
    stories: (group.stories || []).map((story) => ({
      ...story,
      mediaUrl: resolveMediaUrl(story.mediaUrl),
    })),
  }))
}
```

**Rule**: any `<Image source={{uri: ...}}>` or `<Video source={{uri: ...}}>` whose URL comes from API data **must** pass through `resolveMediaUrl` (or `resolveMenuItemMedia`/`resolveStoryGroups` for compound objects) first. Local bundled assets (logo, hero video, banners â€” see Section 12) do **not** go through this function; they're `require()`'d directly.

---

## 8. Image & Media Display Patterns

This section documents **every distinct way images/media are shown in the UI**, so the same visual patterns are replicated in RN.

### 8.1 Simple cover image (cards)
Pattern: `<Image>` filling a fixed-aspect container, `resizeMode="cover"`, rounded corners. Used in: `FoodCard` (h-36 image atop card), `GroceryCard` (64x64 square thumbnail beside text), `MenuListItem` (100x100 / 110x110 square thumbnail beside text), `KitchenCard` (h-28/h-32 banner with bottom gradient overlay for legibility).
- Always provide a **placeholder fallback URL** when `item.image` is missing (each component defines its own Unsplash placeholder constant â€” port these as local bundled placeholder images instead of hot-linking Unsplash in production, or keep Unsplash URLs if acceptable for this app).
- `KitchenCard`'s banner has a `linear-gradient` (`from-black/50 via-black/10 to-transparent`, top-to-bottom) overlaid on top of the image for badge legibility â€” replicate using `expo-linear-gradient`'s `LinearGradient` as an absolutely-positioned overlay `View`.

### 8.2 Avatar / Logo pattern (`KitchenAvatar`)
A square-ish (`rounded-2xl` by default, or `rounded-full` when `rounded="full"`) avatar that shows:
- The kitchen's logo image if present, OR
- A gradient-background (`primary â†’ primary-dark`) circle/square with the **first letter of the kitchen name**, in white bold Poppins text, as a fallback initial-avatar.
- Sizes: `sm` (40px), `md` (56px, default), `lg` (80px), `xl` (96px).
- **Editable mode** (used in Kitchen Profile / Layout header): wrapping the avatar in a pressable; on press, open the image-picker action sheet. While uploading, dim the avatar (black 45% overlay) and show a spinner icon; otherwise on long-press/hover-equivalent show a small camera icon overlay hinting it's tappable (on mobile, just always show a subtle camera badge in the corner since there's no hover state â€” small camera icon chip bottom-right of the avatar is the recommended mobile adaptation).

### 8.3 Story circle (`StoryCircle`) â€” Instagram-style
- Circular avatar (44â€“72px depending on `size` prop) wrapped in a **3px gradient ring** (`secondary â†’ accent â†’ primary`, diagonal), with a 2px white border between the ring and the image â€” replicate with a `LinearGradient` circular border (an outer `View` with the gradient as background, padding 3px, inner `View` white border + `overflow: hidden`, innermost `Image`).
- Below the circle (optional, `showLabel` prop): kitchen name, truncated, centered, small gray text.
- Fallback (no image): gradient circle (`primary â†’ primary-dark`) with the kitchen's first initial.
- Used in: horizontal scrollable "Today's Kitchen Stories" rail on Home, and as a small tappable ring in the Kitchen-panel header to open/add stories.

### 8.4 Full-screen Story Viewer (`StoryViewer`) â€” Instagram/Snapchat-style
This is one of the most complex UI patterns â€” replicate carefully:
- **Full-screen black modal.**
- **Top progress bars**: one thin horizontal bar per story in the current group, segmented, filling left-to-right. Completed stories = 100% filled; current story = animates fill based on elapsed time; future stories = 0% filled.
- **Auto-advance timer**: each *image* story shows for a fixed **5000ms**, then auto-advances to the next story (or next kitchen's group, or closes the viewer if it's the very last story). *Video* stories advance on the video's natural `onEnded` event instead of a fixed timer, and the progress bar tracks `currentTime / duration`.
- **Header overlay**: kitchen avatar (small) + kitchen name + relative timestamp (formatted as local time, e.g. "3:45 PM"), plus a mute/unmute toggle (only shown for video stories) and a close (X) button, top-right.
- **Tap zones**: left third of the screen = go to previous story; right third = go to next story (invisible full-height pressable overlays).
- **Media**: centered, `resizeMode="contain"` (not cover â€” full media should be visible, letterboxed if needed), max width/height = screen.
- Navigating past the first story of the first group does nothing (stays); navigating past the last story of the last group closes the viewer.
- In RN: implement the timer with `setInterval`(50ms tick, same as web) inside a `useEffect` keyed on `[story, groupIndex, storyIndex]`, clearing on unmount/story-change. Use `expo-video`'s player `onPlaybackStatusUpdate` (or `expo-av`'s `onPlaybackStatusUpdate`) for video progress instead of the web `<video onTimeUpdate>` event.

### 8.5 Image carousel with thumbnail strip (`MenuItemDetailModal`)
Bottom-sheet-style modal (slides up from the bottom, spring transition) showing a menu item's full detail:
- **Main image area**: `aspect-[4/3]` (mobile), shows the currently-active image, with **left/right chevron arrow buttons** (only if >1 image) overlaid on the image's vertical-center-left/right, and a row of **dot indicators** at the bottom-center of the image (active dot wider/white, others smaller/dimmed).
- **Thumbnail strip** directly below the main image (only if >1 image): horizontal scroll of small (56x56) square thumbnails; the active one has a colored ring (`primary`), others are dimmed (`opacity-70`) until tapped.
- Below that: veg/non-veg indicator (small square dot â€” green-bordered+green-dot for veg, red-bordered+red-dot for non-veg â€” this exact indicator appears in 3 places: this modal, `MenuListItem`, and `OfferItemCard`; **always replicate this exact small square-with-rounded-corners outline + inner dot veg indicator, it's a recognizable Indian food-app convention**), category tag, item name (large bold), description, and **a "Videos" section** if the item has any videos (each rendered as a native video player, `max-height: 240px`, black background letterboxing, with standard playback controls).
- **Sticky footer**: price (large, bold) on the left, and an Add-to-cart button on the right that morphs into a quantity stepper (-, qty, +) once the item is in the cart â€” this stepper UI is reused identically in `FoodCard`, `GroceryCard`, `MenuListItem`, `OfferItemCard`, and this modal; **extract it as one shared `QuantityStepper` component**.
- Closing: tap the backdrop, tap the X button (top-right, dark semi-transparent circle), or (recommended addition for mobile) swipe-down-to-dismiss since the whole sheet already animates from `translateY: 100% â†’ 0`.

### 8.6 Hero video background (Home page)
- Mobile variant (`MobileHeroBanner`): a rounded-2xl card, ~208â€“224px tall, autoplaying/looping/muted background `<video>` (slowed to `0.5x` playback rate via `onLoadedMetadata`), with a bottom-anchored dark gradient overlay (`black/70 â†’ black/45 â†’ black/30`, bottom to top) so white text reads clearly, headline + subtext + a small "Explore kitchens" pill button, all positioned at the bottom of the card via flex `justify-end`.
- In RN: use `expo-video`'s `VideoView` with `useVideoPlayer` hook, set `player.loop = true`, `player.muted = true`, `player.play()` on mount, and `player.playbackRate = 0.5`. Overlay the gradient with `expo-linear-gradient`. The desktop full-viewport hero (`DesktopHero`) is **not needed** in RN per Section 4.
- Video asset: bundle `atleast80.mp4` (currently in `/public/atleast80.mp4` on web, ~2.9MB) as a local asset and reference via `require("../assets/atleast80.mp4")`, or host it remotely and stream via URI if bundle size is a concern. Poster/fallback image: `logo.jpeg`.

### 8.7 Camera/gallery picker buttons (uploads)
Wherever the web shows a hidden `<input type="file">` triggered by a styled button (`HygieneUploadSection`, `KitchenHomeImageSection`, `KitchenAvatar` editable mode, `KitchenSignupPage`'s FSSAI upload), replicate the **button + picker** pattern, but give the user an explicit choice between **"Take Photo"** and **"Choose from Library"** since native mobile doesn't have the browser's unified file-picker-with-camera-button â€” use a simple two-option `Alert.alert` or a small custom bottom-sheet/action-sheet for this choice.

### 8.8 Staged-then-submitted upload UI (`HygieneUploadSection`)
Two visually distinct grids:
1. **"Ready to submit (N)"** â€” locally picked, not-yet-uploaded files. Each shown in a dashed-border, tinted (`primary/5` bg) square tile with a small media-type icon chip (image/video icon) top-left, a centered "Not submitted" label strip at the bottom, and a delete (trash) button top-right.
2. **"Submitted (N)"** â€” already-uploaded-and-confirmed files from the server, shown in plain (solid border, gray-50 bg) square tiles, same media-type icon chip, with a delete button to remove them from the server.

Both grids are `2 / 3 / 4`-column depending on width (use `3` columns fixed for phone-width RN). Use a local `Image.getSize` style local URI preview (`expo-image-picker` already returns a local `uri` you can preview directly before upload â€” equivalent to web's `URL.createObjectURL`).

---

## 9. Reusable UI Components â€” Full Spec

Build each of these once as a shared component (mirrors the web `src/components/` structure). Suggested RN folder: `src/components/common/`, `src/components/ui/`, `src/components/layout/`, `src/components/kitchen/`.

### 9.1 `Badge`
Small pill-shaped label with optional leading icon. Variants (`type` prop):
- `verified`: solid dark-green background, white/secondary text, `CheckCircle` icon â€” used on `KitchenCard` top-right when `hygieneVerified`.
- `homemade`: white bg, dark text, gray border, `Home` icon tinted primary.
- `healthy`: white bg, dark text, gray border, `Leaf` icon tinted primary-light.
- `offer`: accent-tinted background (10% opacity accent bg, accent text/border), no icon.
Props: `type`, `children` (label text), `className`/`style`.

### 9.2 `Chip`
Pill-shaped filter/category button. Props: `children`, `icon` (optional leading icon element), `active` (bool), `onClick`/`onPress`. Active state = solid `primary` bg, white text, shadow. Inactive = white bg, dark text, gray border; on press (RN has no `:hover`, so just rely on `active`/pressed visual state via `Pressable`'s `style={({pressed}) =>
<truncated 31626 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.
