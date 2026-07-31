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
import ContactPage from "./pages/ContactPage"
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage"
import TermsOfServicePage from "./pages/TermsOfServicePage"
import HygieneGuidelinesPage from "./pages/HygieneGuidelinesPage"
import KitchenPage from "./pages/KitchenPage"
import CartPage from "./pages/CartPage"
import CheckoutPage from "./pages/CheckoutPage"
import OrderTrackingPage from "./pages/OrderTrackingPage"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ProfileLayout from "./pages/profile/ProfileLayout"
import ProfileOverviewPage from "./pages/profile/ProfileOverviewPage"
import ProfileAccountPage from "./pages/profile/ProfileAccountPage"
import ProfileOrdersPage from "./pages/profile/ProfileOrdersPage"
import KitchenOrdersPage from "./pages/kitchen/KitchenOrdersPage"
import OrdersPage from "./pages/OrdersPage"
import KitchenLoginPage from "./pages/kitchen/KitchenLoginPage"
import KitchenSignupPage from "./pages/kitchen/KitchenSignupPage"
import KitchenForgotPasswordPage from "./pages/kitchen/KitchenForgotPasswordPage"
import KitchenDashboardPage from "./pages/kitchen/KitchenDashboardPage"
import KitchenMenuPage from "./pages/kitchen/KitchenMenuPage"
import KitchenProfilePage from "./pages/kitchen/KitchenProfilePage"
import KitchenBulkEnquiriesPage from "./pages/kitchen/KitchenBulkEnquiriesPage"
import KitchenPayoutsPage from "./pages/kitchen/KitchenPayoutsPage"
import AdminLoginPage from "./pages/admin/AdminLoginPage"
import AdminDashboardPage from "./pages/admin/AdminDashboardPage"
import AdminFeaturedKitchensPage from "./pages/admin/AdminFeaturedKitchensPage"
import AdminUsersPage from "./pages/admin/AdminUsersPage"
import AdminRidersPage from "./pages/admin/AdminRidersPage"
import AdminAlertsPage from "./pages/admin/AdminAlertsPage"
import AdminSettingsPage from "./pages/admin/AdminSettingsPage"
import AdminMenuPage from "./pages/admin/AdminMenuPage"
import AdminHygienePage from "./pages/admin/AdminHygienePage"
import AdminOrdersPage from "./pages/admin/AdminOrdersPage"
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage"

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
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/hygiene-guidelines" element={<HygieneGuidelinesPage />} />
          <Route path="/stories" element={<HomePage />} />
          <Route path="/kitchen/login" element={<KitchenLoginPage />} />
          <Route path="/kitchen/signup" element={<KitchenSignupPage />} />
          <Route path="/kitchen/forgot-password" element={<KitchenForgotPasswordPage />} />
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
          <Route
            path="/kitchen/orders"
            element={
              <ProtectedRoute role="kitchen">
                <KitchenOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen/payouts"
            element={
              <ProtectedRoute role="kitchen">
                <KitchenPayoutsPage />
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
                <ProfileLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProfileOverviewPage />} />
            <Route path="account" element={<ProfileAccountPage />} />
            <Route path="orders" element={<ProfileOrdersPage />} />
          </Route>

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
            path="/admin/hygiene"
            element={
              <ProtectedRoute role="admin">
                <AdminHygienePage />
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
            path="/admin/orders"
            element={
              <ProtectedRoute role="admin">
                <AdminOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute role="admin">
                <AdminPaymentsPage />
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
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/riders"
            element={
              <ProtectedRoute role="admin">
                <AdminRidersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role="admin">
                <AdminSettingsPage />
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
