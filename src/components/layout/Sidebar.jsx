import { LogOut, Menu, X } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BRANDING } from "../../lib/branding";
import { getNavigationSections } from "../../lib/navigation";
import BrandMark from "../ui/BrandMark";

function getInitials(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "ZU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export default function Sidebar({ userName, roleLabel, role, onLogout, open, onToggle, isMobile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = useMemo(() => {
    if (location.pathname.startsWith("/client/")) return "/patients";
    return location.pathname === "/" ? "/dashboard" : location.pathname;
  }, [location.pathname]);

  const navigationSections = useMemo(() => getNavigationSections(role), [role]);
  const initials = useMemo(() => getInitials(userName), [userName]);

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
        <div style={styles.brandBlock}>
          <div style={styles.brandTop}>
            <BrandMark size={40} corner={10} />
            <div style={styles.brandCopy}>
              <div style={styles.brandName}>Zantua</div>
              <div style={styles.brandSub}>Aesthetic Wellness</div>
              <div style={styles.brandMeta}>Panel operativo clínico</div>
            </div>
          </div>
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
                      <span style={{ ...styles.activeRail, ...(active ? styles.activeRailVisible : {}) }} />
                      <span style={{ ...styles.iconWrap, ...(active ? styles.iconWrapActive : {}) }}>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span style={styles.navLabel}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <div style={styles.userRow}>
            <div style={styles.avatar}>{initials}</div>
            <div style={styles.userCopy}>
              <div style={styles.userName}>{userName}</div>
              <div style={styles.userRole}>{roleLabel}</div>
            </div>
          </div>

          <button type="button" onClick={onLogout} style={styles.logoutButton} aria-label="Cerrar sesión">
            <LogOut size={15} />
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
    borderRadius: 10,
    border: "1px solid #DDE3DE",
    background: "#FFFFFF",
    color: BRANDING.colors.primaryStrong,
    display: "none",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(16, 24, 21, 0.22)",
    zIndex: 39,
  },
  sidebar: {
    width: 232,
    background: "#FFFFFF",
    borderRight: "1px solid #E5EAE5",
    padding: "20px 14px 14px",
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
    boxShadow: "0 18px 42px rgba(18, 56, 47, 0.16)",
  },
  brandBlock: {
    paddingBottom: 18,
    borderBottom: "1px solid #E9ECE8",
  },
  brandTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandCopy: {
    minWidth: 0,
  },
  brandName: {
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    fontSize: 18,
    lineHeight: 1.05,
  },
  brandSub: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  brandMeta: {
    marginTop: 6,
    color: "#7C8781",
    fontSize: 11,
    lineHeight: 1.35,
  },
  navWrap: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 0",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    color: "#85908A",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    padding: "0 10px",
    textTransform: "uppercase",
  },
  sectionItems: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    position: "relative",
    background: "transparent",
    border: "none",
    borderRadius: 10,
    padding: "10px 10px 10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#51605A",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    minHeight: 42,
  },
  navItemActive: {
    background: "#F3F6F3",
    color: BRANDING.colors.primaryStrong,
  },
  activeRail: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 999,
    background: "transparent",
  },
  activeRailVisible: {
    background: BRANDING.colors.primaryStrong,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#60706A",
  },
  iconWrapActive: {
    background: "#E8F0EC",
    color: BRANDING.colors.primaryStrong,
  },
  navLabel: {
    minWidth: 0,
  },
  footer: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    alignItems: "center",
    paddingTop: 14,
    borderTop: "1px solid #E9ECE8",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: BRANDING.colors.primaryStrong,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userCopy: {
    minWidth: 0,
  },
  userName: {
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.3,
  },
  userRole: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    width: 38,
    height: 38,
    background: "#FFFFFF",
    color: BRANDING.colors.textMuted,
    border: "1px solid #E0E6E1",
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};
