import { useEffect, useState } from "react";
import { getRoleLabel } from "../../lib/roles";
import { useAuth } from "../../hooks/useAuth";
import { BRANDING } from "../../lib/branding";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }) {
  const { user, profile, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={styles.page}>
      <Sidebar
        userName={profile?.name || profile?.full_name || user?.email || "Usuario"}
        roleLabel={getRoleLabel(profile?.role)}
        role={profile?.role}
        onLogout={logout}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((current) => !current)}
        isMobile={isMobile}
      />

      <main style={{ ...styles.main, paddingLeft: isMobile ? 20 : 0, paddingTop: isMobile ? 72 : 0 }}>
        <div style={styles.inner}>{children}</div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: BRANDING.colors.background,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  inner: {
    padding: "28px 28px 36px",
    maxWidth: 1500,
    margin: "0 auto",
  },
};
