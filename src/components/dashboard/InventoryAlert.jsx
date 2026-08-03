import { AlertCircle, ArrowRight } from "lucide-react";
import { BRANDING } from "../../lib/branding";

export default function InventoryAlert({ value, onClick }) {
  const hasAlert = Number(value || 0) > 0;

  return (
    <article
      style={{
        ...styles.card,
        ...(hasAlert ? styles.cardActive : styles.cardQuiet),
      }}
    >
      <div style={styles.iconWrap}>
        <AlertCircle size={18} strokeWidth={2.1} />
      </div>

      <div style={styles.copy}>
        <div style={styles.label}>Inventario bajo</div>
        <div style={styles.description}>
          {hasAlert
            ? `${value} referencias están por debajo del mínimo definido.`
            : "No hay alertas críticas en este momento."}
        </div>
      </div>

      <button type="button" onClick={onClick} style={styles.linkButton}>
        <span>{value}</span>
        <ArrowRight size={14} />
      </button>
    </article>
  );
}

const styles = {
  card: {
    borderRadius: 26,
    padding: "18px 22px",
    border: `1px solid ${BRANDING.colors.border}`,
    display: "grid",
    gridTemplateColumns: "44px 1fr auto",
    gap: 14,
    alignItems: "center",
    minHeight: 98,
    boxShadow: "0 18px 34px rgba(18, 56, 47, 0.045)",
  },
  cardActive: {
    background: "#FCF1F3",
    borderColor: "#E7C8CF",
  },
  cardQuiet: {
    background: "#FFFDF8",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "#F5DDE2",
    color: "#8D4D5A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  label: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  description: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.55,
  },
  linkButton: {
    minWidth: 70,
    background: "transparent",
    border: "none",
    color: BRANDING.colors.primaryStrong,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
};
