import { Toaster } from "@/revamp/components/ui/toaster";
import { Toaster as Sonner } from "@/revamp/components/ui/sonner";
import { TooltipProvider } from "@/revamp/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import CustomerHome from "./pages/CustomerHome";
import Services from "./pages/Services";
import CustomerQuote from "./pages/CustomerQuote";
import BookingFlow from "./pages/BookingFlow";
import BookingSuccess from "./pages/BookingSuccess";
import Bookings from "./pages/Bookings";
import CustomerBookingDetail from "./pages/CustomerBookingDetail";
import MyBikes from "./pages/MyBikes";
import CustomerNotifications from "./pages/CustomerNotifications";
import CustomerInvoices from "./pages/CustomerInvoices";
import CustomerSupport from "./pages/CustomerSupport";
import CustomerProfile from "./pages/CustomerProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import AdminCatalog from "./pages/AdminCatalog";
import AdminBookingDetail from "./pages/AdminBookingDetail";
import AdminCalendarPage from "./pages/AdminCalendarPage";
import {
  AdminScheduling, AdminInventory, AdminPricing,
  AdminAvailability, AdminMechanics, AdminUsers, AdminNotifications,
  AdminAudit, AdminSettings, AdminSupport,
} from "./pages/AdminPages";
import MechanicDashboard from "./pages/MechanicDashboard";
import MechanicJobDetail from "./pages/MechanicJobDetail";
import MechanicSchedule from "./pages/MechanicSchedule";
import MechanicNewBooking from "./pages/MechanicNewBooking";
import MechanicProfile from "./pages/MechanicProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="mockup-theme">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          {/* Public */}
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/start" element={<Navigate to="/login" replace />} />

          {/* Customer (authenticated) */}
          <Route path="/app" element={<CustomerHome />} />
          <Route path="/app/bikes" element={<MyBikes />} />
          <Route path="/app/bookings" element={<Bookings />} />
          <Route path="/app/bookings/:bookingId" element={<CustomerBookingDetail />} />
          <Route path="/app/notifications" element={<CustomerNotifications />} />
          <Route path="/app/invoices" element={<CustomerInvoices />} />
          <Route path="/app/support" element={<CustomerSupport />} />
          <Route path="/app/profile" element={<CustomerProfile />} />
          <Route path="/book" element={<Services />} />
          <Route path="/book/quote" element={<CustomerQuote />} />
          <Route path="/book/new" element={<BookingFlow />} />
          <Route path="/success" element={<BookingSuccess />} />

          {/* Mechanic */}
          <Route path="/mech" element={<MechanicDashboard />} />
          <Route path="/mech/today" element={<MechanicDashboard />} />
          <Route path="/mech/schedule" element={<MechanicSchedule />} />
          <Route path="/mech/job/:jobCardId" element={<MechanicJobDetail />} />
          <Route path="/mech/bookings/new" element={<MechanicNewBooking />} />
          <Route path="/mech/profile" element={<MechanicProfile />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/bookings/:bookingId" element={<AdminBookingDetail />} />
          <Route path="/admin/calendar" element={<AdminCalendarPage />} />
          <Route path="/admin/scheduling" element={<AdminScheduling />} />
          <Route path="/admin/catalog" element={<AdminCatalog />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
          <Route path="/admin/availability" element={<AdminAvailability />} />
          <Route path="/admin/mechanics" element={<AdminMechanics />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/support" element={<AdminSupport />} />

          {/* Fallbacks for legacy deep links under rewritten sections */}
          <Route path="/app/*" element={<CustomerHome />} />
          <Route path="/book/*" element={<Services />} />
          <Route path="/mech/*" element={<MechanicDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
