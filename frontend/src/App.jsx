import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { CartProvider } from "./context/CartContext"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import BottomNav from "./components/layout/BottomNav"
import SplashScreen from "./pages/SplashScreen"
import OnboardingPage from "./pages/OnboardingPage"
import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import AboutPage from "./pages/AboutPage"
import KitchenPage from "./pages/KitchenPage"
import CartPage from "./pages/CartPage"
import CheckoutPage from "./pages/CheckoutPage"
import OrderTrackingPage from "./pages/OrderTrackingPage"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ProfilePage from "./pages/ProfilePage"
import OrdersPage from "./pages/OrdersPage"
import KitchenLoginPage from "./pages/kitchen/KitchenLoginPage"
import KitchenSignupPage from "./pages/kitchen/KitchenSignupPage"
import KitchenDashboardPage from "./pages/kitchen/KitchenDashboardPage"
import KitchenMenuPage from "./pages/kitchen/KitchenMenuPage"
import KitchenProfilePage from "./pages/kitchen/KitchenProfilePage"
import KitchenBulkEnquiriesPage from "./pages/kitchen/KitchenBulkEnquiriesPage"
import AdminLoginPage from "./pages/admin/AdminLoginPage"
import AdminDashboardPage from "./pages/admin/AdminDashboardPage"
import AdminFeaturedKitchensPage from "./pages/admin/AdminFeaturedKitchensPage"
import AdminCustomersPage from "./pages/admin/AdminCustomersPage"
import AdminAlertsPage from "./pages/admin/AdminAlertsPage"
import AdminMenuPage from "./pages/admin/AdminMenuPage"

const pagesWithBottomNav = ["/home", "/search", "/stories", "/orders", "/profile"]

function AppContent() {
  const location = useLocation()
  const showBottomNav = pagesWithBottomNav.some((p) => location.pathname.startsWith(p))

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/stories" element={<HomePage />} />
          <Route path="/kitchen/login" element={<KitchenLoginPage />} />
          <Route path="/kitchen/signup" element={<KitchenSignupPage />} />
          <Route
            path="/kitchen/dashboard"
            element={
              <ProtectedRoute role="kitchen">
                <KitchenDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen/menu"
            element={
              <ProtectedRoute role="kitchen">
                <KitchenMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen/profile"
            element={
              <ProtectedRoute role="kitchen">
                <KitchenProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen/enquiries"
            element={
              <ProtectedRoute role="kitchen">
                <KitchenBulkEnquiriesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/kitchen/:id" element={<KitchenPage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute role="customer">
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute role="customer">
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute role="customer">
                <OrderTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute role="customer">
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute role="customer">
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kitchens"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alerts"
            element={
              <ProtectedRoute role="admin">
                <AdminAlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute role="admin">
                <AdminMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/featured"
            element={
              <ProtectedRoute role="admin">
                <AdminFeaturedKitchensPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute role="admin">
                <AdminCustomersPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
      {showBottomNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
