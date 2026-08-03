import { X } from "lucide-react";
import { BRANDING } from "../../lib/branding";

export default function PatientModal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: wide ? 960 : 620 }}>
        <div style={styles.topAccent} />
        <div style={styles.header}>
          <div style={styles.copy}>
            <h2 style={styles.title}>{title}</h2>
            {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(24, 35, 31, 0.34)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 80,
  },
  modal: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    background: BRANDING.colors.card,
    borderRadius: 30,
    padding: 30,
    border: `1px solid ${BRANDING.colors.border}`,
    boxShadow: "0 36px 70px rgba(18, 56, 47, 0.14)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  topAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    height: 2,
    background: "linear-gradient(90deg, rgba(198,164,106,0), rgba(198,164,106,0.9), rgba(198,164,106,0))",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 24,
  },
  copy: {
    minWidth: 0,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    margin: "8px 0 0",
    lineHeight: 1.7,
    maxWidth: 660,
  },
  closeButton: {
    width: 38,
    height: 38,
    background: "#F6F0E7",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 14,
    color: BRANDING.colors.textMuted,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
};
