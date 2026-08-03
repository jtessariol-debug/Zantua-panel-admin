import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { USER_ROLES } from "./lib/roles";
import AgendaPage from "./pages/AgendaPage";
import BillingPage from "./pages/BillingPage";
import ClientProfile from "./pages/ClientProfile";
import CommissionsPage from "./pages/CommissionsPage";
import Dashboard from "./pages/Dashboard";
import InventoryPage from "./pages/InventoryPage";
import LaserPage from "./pages/LaserPage";
import Login from "./pages/Login";
import PatientsPage from "./pages/PatientsPage";
import PayrollPage from "./pages/PayrollPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";

function PrivateRoute({ children }) {
  const { user, profile, loading, authError } = useAuth();

  if (loading) {
    return (
      <div style={{ background: "#0f0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#c9a96e", fontSize: 22 }}>Cargando...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" state={authError ? { authError } : undefined} replace />;
  }

  return children;
}

function RoleRoute({ children, allowedRoles }) {
  const { profile } = useAuth();
  if (!allowedRoles?.length) return children;
  if (!allowedRoles.includes(profile?.role)) {
    return <AccessDeniedPage />;
  }
  return children;
}

function AccessDeniedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F3EA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#FFFDF8",
          border: "1px solid #E7DCCB",
          borderRadius: 24,
          padding: "28px 24px",
          boxShadow: "0 20px 48px rgba(18, 56, 47, 0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#12382F", fontSize: 28, fontWeight: 700, margin: 0 }}>
          Acceso restringido
        </h1>
        <p style={{ color: "#6F6258", fontSize: 15, lineHeight: 1.7, margin: "12px 0 0" }}>
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    </div>
  );
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
          <Route path="/commissions" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><CommissionsPage /></RoleRoute></PrivateRoute>} />
          <Route path="/payroll" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><PayrollPage /></RoleRoute></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><InventoryPage /></RoleRoute></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><UsersPage /></RoleRoute></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.OWNER]}><SettingsPage /></RoleRoute></PrivateRoute>} />
          <Route path="/client/:id" element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

