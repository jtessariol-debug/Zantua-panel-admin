import { CalendarDays, Plus, UserPlus } from "lucide-react";
import { BRANDING } from "../../lib/branding";

function formatLongDate(date = new Date()) {
  return date.toLocaleDateString("es-DO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getInitials(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "ZA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function HeaderButton({ label, icon: Icon, primary = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.button,
        ...(primary ? styles.buttonPrimary : styles.buttonSecondary),
      }}
    >
      <Icon size={16} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

export default function DashboardHeader({ firstName, onNewAppointment, onNewPatient }) {
  const initials = getInitials(firstName || "Zantua");

  return (
    <header style={styles.header}>
      <div style={styles.copy}>
        <div style={styles.greeting}>
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </div>
        <h1 style={styles.title}>Dashboard</h1>
        <div style={styles.metaRow}>
          <span style={styles.subtitle}>Resumen operativo de Zantua</span>
          <span style={styles.dot} />
          <span style={styles.date}>
            <CalendarDays size={14} />
            <span>{formatLongDate()}</span>
          </span>
        </div>
      </div>

      <div style={styles.actions}>
        <HeaderButton label="Nuevo paciente" icon={UserPlus} onClick={onNewPatient} />
        <HeaderButton label="Nueva cita" icon={Plus} primary onClick={onNewAppointment} />
        <div style={styles.avatar} aria-label="Usuario actual">
          {initials}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    flexWrap: "wrap",
    paddingBottom: 8,
  },
  copy: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  greeting: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    lineHeight: 1.4,
  },
  title: {
    margin: 0,
    color: BRANDING.colors.primaryStrong,
    fontSize: "clamp(1.9rem, 2vw, 2.25rem)",
    lineHeight: 1.05,
    fontWeight: 700,
    letterSpacing: 0,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  subtitle: {
    color: BRANDING.colors.text,
    fontSize: 14,
    fontWeight: 500,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    background: "#A9B3AE",
  },
  date: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    textTransform: "capitalize",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  button: {
    height: 42,
    padding: "0 14px",
    borderRadius: 9,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid transparent",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    background: "#FFFFFF",
  },
  buttonPrimary: {
    background: BRANDING.colors.primaryStrong,
    color: "#FFFFFF",
    borderColor: BRANDING.colors.primaryStrong,
  },
  buttonSecondary: {
    background: "#FFFFFF",
    color: BRANDING.colors.text,
    borderColor: BRANDING.colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "#FFFFFF",
    border: `1px solid ${BRANDING.colors.border}`,
    color: BRANDING.colors.primaryStrong,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
};
