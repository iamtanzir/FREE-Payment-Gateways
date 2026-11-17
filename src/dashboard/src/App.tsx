import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import PaymentLinks from "./pages/PaymentLinks";
import Gateways from "./pages/Gateways";
import GatewaySettings from "./pages/GatewaySettings";
import Customers from "./pages/Customers";
import Webhooks from "./pages/Webhooks";
import ApiKeys from "./pages/ApiKeys";
import SettingsPage from "./pages/SettingsPage";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import BrandSettings from "./pages/BrandSettings";
import SmsData from "./pages/SmsData";
import Devices from "./pages/Devices";
import Brands from "./pages/Brands";
import Activities from "./pages/Activities";
import Profile from "./pages/Profile";
import Roles from "./pages/Roles";
import Refunds from "./pages/Refunds";
import Currencies from "./pages/Currencies";
import NotificationChannels from "./pages/NotificationChannels";
import Faqs from "./pages/Faqs";
import Orderboxes from "./pages/Orderboxes";
import Domains from "./pages/Domains";
import MfsTransactions from "./pages/MfsTransactions";
import BalanceVerification from "./pages/BalanceVerification";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OrgSetup from "./pages/OrgSetup";
import License from "./pages/License";
import LicenseAdmin from "./pages/LicenseAdmin";
import LicenseSettings from "./pages/LicenseSettings";
import Addons from "./pages/Addons";
import Checkout from "./pages/Checkout";
import CheckoutStatus from "./pages/CheckoutStatus";
import PaymentRouter from "./pages/PaymentRouter";
import PaymentLinkCheckout from "./pages/PaymentLinkCheckout";
import SupportSettings from "./pages/SupportSettings";
import BrandGeneralSettings from "./pages/BrandGeneralSettings";
import ThemeSettings from "./pages/ThemeSettings";
import GeneralSettings from "./pages/GeneralSettings";
import CronSettings from "./pages/CronSettings";
import DeviceSetup from "./pages/DeviceSetup";
import ApiDocs from "./pages/ApiDocs";
import DefaultPaymentLink from "./pages/DefaultPaymentLink";
import EmbedCheckout from "./pages/EmbedCheckout";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import SelfHosting from "./pages/SelfHosting";
import MfaVerify from "./pages/MfaVerify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Users from "./pages/Users";
import MaintenancePage from "./pages/MaintenancePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL || "/"}>
        <AuthProvider>
          <OrgProvider>
            <BrandProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/org-setup" element={<OrgSetup />} />
                <Route path="/mfa-verify" element={<MfaVerify />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/checkout/:ref" element={<Checkout />} />
                <Route path="/checkout/:ref/status" element={<CheckoutStatus />} />
                <Route path="/payment/:ref" element={<PaymentRouter />} />
                <Route path="/pay/:slug" element={<PaymentLinkCheckout />} />
                <Route path="/payment-link/default/:orgId" element={<DefaultPaymentLink />} />
                <Route path="/embed/pay" element={<EmbedCheckout />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/docs/self-hosting" element={<SelfHosting />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/payment-links" element={<ProtectedRoute><PaymentLinks /></ProtectedRoute>} />
                <Route path="/gateways" element={<ProtectedRoute><Gateways /></ProtectedRoute>} />
                <Route path="/gateways/:id" element={<ProtectedRoute><GatewaySettings /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/brand-settings" element={<ProtectedRoute><BrandSettings /></ProtectedRoute>} />
                <Route path="/sms-data" element={<ProtectedRoute><SmsData /></ProtectedRoute>} />
                <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
                <Route path="/devices/new/setup" element={<ProtectedRoute><DeviceSetup /></ProtectedRoute>} />
                <Route path="/devices/:id/setup" element={<ProtectedRoute><DeviceSetup /></ProtectedRoute>} />
                <Route path="/brands" element={<ProtectedRoute><Brands /></ProtectedRoute>} />
                <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
                <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
                <Route path="/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
                <Route path="/refunds" element={<ProtectedRoute><Refunds /></ProtectedRoute>} />
                <Route path="/currencies" element={<ProtectedRoute><Currencies /></ProtectedRoute>} />
                <Route path="/notification-channels" element={<ProtectedRoute><NotificationChannels /></ProtectedRoute>} />
                <Route path="/faqs" element={<ProtectedRoute><Faqs /></ProtectedRoute>} />
                <Route path="/orderboxes" element={<ProtectedRoute><Orderboxes /></ProtectedRoute>} />
                <Route path="/domains" element={<ProtectedRoute><Domains /></ProtectedRoute>} />
                <Route path="/mfs-transactions" element={<ProtectedRoute><MfsTransactions /></ProtectedRoute>} />
                <Route path="/balance-verification" element={<ProtectedRoute><BalanceVerification /></ProtectedRoute>} />
                <Route path="/license" element={<ProtectedRoute><License /></ProtectedRoute>} />
                <Route path="/admin/licenses" element={<ProtectedRoute><LicenseAdmin /></ProtectedRoute>} />
                <Route path="/admin/license-settings" element={<ProtectedRoute><LicenseSettings /></ProtectedRoute>} />
                <Route path="/addons" element={<ProtectedRoute><Addons /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/brand-settings/support" element={<ProtectedRoute><SupportSettings /></ProtectedRoute>} />
                <Route path="/brand-settings/general" element={<ProtectedRoute><BrandGeneralSettings /></ProtectedRoute>} />
                <Route path="/brand-settings/themes" element={<ProtectedRoute><ThemeSettings /></ProtectedRoute>} />
                <Route path="/settings/general" element={<ProtectedRoute><GeneralSettings /></ProtectedRoute>} />
                <Route path="/settings/cron" element={<ProtectedRoute><CronSettings /></ProtectedRoute>} />
                <Route path="/api-docs" element={<ApiDocs />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrandProvider>
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
