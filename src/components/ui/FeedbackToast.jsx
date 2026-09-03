import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

const tones = {
  success: { Icon: CheckCircle2, color: "#18794E", background: "#E8F6EE", border: "#BFE4CF" },
  error: { Icon: AlertCircle, color: "#B4233C", background: "#FDECEE", border: "#F0C8CF" },
  warning: { Icon: TriangleAlert, color: "#8A6200", background: "#FFF6DE", border: "#F0D08A" },
  info: { Icon: Info, color: "#2563A6", background: "#EAF2FB", border: "#C8DCF2" },
};

export default function FeedbackToast({ type = "info", message, onClose }) {
  if (!message) return null;
  const { Icon, ...tone } = tones[type] || tones.info;
  return <div role={type === "error" ? "alert" : "status"} aria-live="polite" style={{ ...styles.toast, ...tone }}><Icon size={18} /><span>{message}</span>{onClose ? <button type="button" onClick={onClose} aria-label="Cerrar mensaje" style={styles.close}><X size={15} /></button> : null}</div>;
}

const styles = {
  toast: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, border: "1px solid", borderRadius: 9, padding: "11px 12px", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(22,34,45,.08)" },
  close: { border: 0, background: "transparent", color: "inherit", display: "grid", placeItems: "center", cursor: "pointer" },
};
