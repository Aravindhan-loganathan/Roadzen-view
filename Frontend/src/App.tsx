import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Pages
import { LoginPage } from "@/pages/LoginPage";
import { PublicHome } from "@/pages/public/PublicHome";
import { LiveMap } from "@/pages/public/LiveMap";
import { SignalStatus } from "@/pages/public/SignalStatus";
import { AlertsPage } from "@/pages/public/AlertsPage";
import { ProfilePage } from "@/pages/public/ProfilePage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { LiveDetection } from "@/pages/admin/LiveDetection";
import { LaneAnalytics } from "@/pages/admin/LaneAnalytics";
import { SignalControl } from "@/pages/admin/SignalControl";
import { TrafficViolations } from "@/pages/admin/TrafficViolations";
import { Reports } from "@/pages/admin/Reports";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Root redirect based on auth state
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/public'} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Root */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Authentication */}
              <Route path="/login" element={<LoginPage />} />

              {/* Public User Routes */}
              <Route path="/public" element={<PublicLayout />}>
                <Route index element={<PublicHome />} />
                <Route path="map" element={<LiveMap />} />
                <Route path="signals" element={<SignalStatus />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="detection" element={<LiveDetection />} />
                <Route path="analytics" element={<LaneAnalytics />} />
                <Route path="signals" element={<SignalControl />} />
                <Route path="violations" element={<TrafficViolations />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
