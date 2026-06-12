// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { USER_ROLES } from "./lib/roles";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientProfile from "./pages/ClientProfile";
import AgendaPage from "./pages/AgendaPage";
import PatientsPage from "./pages/PatientsPage";
import LaserPage from "./pages/LaserPage";
import BillingPage from "./pages/BillingPage";
import CommissionsPage from "./pages/CommissionsPage";
import InventoryPage from "./pages/InventoryPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";

function PrivateRoute({ children }) {
  const { user, profile, loading, authError } = useAuth();
  if (loading) return (
    <div style={{ background: "#0f0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#c9a96e", fontSize: 22 }}>Cargando...</div>
    </div>
  );
  if (!user || !profile) {
    return <Navigate to="/login" state={authError ? { authError } : undefined} replace />;
  }
  return children;
}

function RoleRoute({ children, allowedRoles }) {
  const { profile } = useAuth();
  if (!allowedRoles?.length) return children;
  if (!allowedRoles.includes(profile?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/agenda" element={<PrivateRoute><AgendaPage /></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute><PatientsPage /></PrivateRoute>} />
          <Route path="/laser" element={<PrivateRoute><LaserPage /></PrivateRoute>} />
          <Route path="/billing" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER, USER_ROLES.RECEPTION, USER_ROLES.SPECIALIST]}><BillingPage /></RoleRoute></PrivateRoute>} />
          <Route path="/commissions" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER, USER_ROLES.SPECIALIST]}><CommissionsPage /></RoleRoute></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><InventoryPage /></RoleRoute></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><UsersPage /></RoleRoute></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><SettingsPage /></RoleRoute></PrivateRoute>} />
          <Route path="/client/:id" element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
