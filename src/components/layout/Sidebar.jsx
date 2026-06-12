import { LogOut, Menu, X } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNavigationSections } from "../../lib/navigation";
import { BRANDING } from "../../lib/branding";
import BrandMark from "../ui/BrandMark";

export default function Sidebar({ userName, roleLabel, role, onLogout, open, onToggle, isMobile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = useMemo(() => {
    if (location.pathname.startsWith("/client/")) return "/patients";
    return location.pathname === "/" ? "/dashboard" : location.pathname;
  }, [location.pathname]);
  const navigationSections = useMemo(() => getNavigationSections(role), [role]);

  return (
    <>
      <button type="button" onClick={onToggle} style={{ ...styles.mobileTrigger, display: isMobile ? "flex" : "none" }}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open ? <div style={styles.overlay} onClick={onToggle} /> : null}

      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile ? styles.sidebarMobile : {}),
          ...(open ? styles.sidebarOpen : {}),
        }}
      >
        <div style={styles.brand}>
          <BrandMark size={48} corner={18} showWordmark compact />
        </div>

        <div style={styles.navWrap}>
          {navigationSections.map((section) => (
            <div key={section.title} style={styles.section}>
              <div style={styles.sectionTitle}>{section.title}</div>
              <div style={styles.sectionItems}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activePath === item.path;

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        if (open) onToggle();
                      }}
                      style={{
                        ...styles.navItem,
                        ...(active ? styles.navItemActive : {}),
                      }}
                    >
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <div style={styles.userCard}>
            <div style={styles.userName}>{userName}</div>
            <div style={styles.userRole}>{roleLabel}</div>
          </div>

          <button type="button" onClick={onLogout} style={styles.logoutButton}>
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

const styles = {
  mobileTrigger: {
    position: "fixed",
    top: 16,
    left: 16,
    zIndex: 60,
    width: 42,
    height: 42,
    borderRadius: 14,
    border: "1px solid #EADDD2",
    background: BRANDING.colors.card,
    color: BRANDING.colors.primaryStrong,
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 28px rgba(75, 50, 32, 0.08)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 51, 43, 0.24)",
    zIndex: 39,
  },
  sidebar: {
    width: 292,
    background: BRANDING.colors.card,
    borderRight: `1px solid ${BRANDING.colors.border}`,
    padding: "28px 20px 20px",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
    flexShrink: 0,
    zIndex: 40,
  },
  sidebarOpen: {
    transform: "translateX(0)",
  },
  sidebarMobile: {
    position: "fixed",
    left: 0,
    transform: "translateX(-110%)",
    boxShadow: "0 24px 48px rgba(18, 56, 47, 0.16)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "4px 8px 18px",
    borderBottom: `1px solid ${BRANDING.colors.border}`,
  },
  navWrap: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 4px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  sectionTitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    padding: "0 12px",
  },
  sectionItems: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  navItem: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 16,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: {
    background: BRANDING.colors.primarySoft,
    borderColor: "#D3E7DE",
    color: BRANDING.colors.primaryStrong,
    boxShadow: "0 10px 22px rgba(22, 84, 67, 0.08)",
  },
  footer: {
    borderTop: `1px solid ${BRANDING.colors.border}`,
    paddingTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  userCard: {
    background: "#FAF7F0",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 18,
    padding: "14px 16px",
  },
  userName: {
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    fontSize: 14,
  },
  userRole: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    background: BRANDING.colors.white,
    color: BRANDING.colors.primaryStrong,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontWeight: 700,
    cursor: "pointer",
  },
};
