import { BRANDING } from "../../lib/branding";

export default function MetricMiniCard({ title, value, description, icon: Icon, accent }) {
  return (
    <article style={styles.card}>
      <div style={styles.topRow}>
        <div>
          <div style={styles.label}>{title}</div>
          <div style={styles.value}>{value}</div>
        </div>
        <div style={{ ...styles.iconWrap, background: accent?.background, color: accent?.color }}>
          {Icon ? <Icon size={16} strokeWidth={2} /> : null}
        </div>
      </div>
      <div style={styles.description}>{description}</div>
    </article>
  );
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 12,
    padding: 18,
    minHeight: 118,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 14,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  value: {
    color: BRANDING.colors.primaryStrong,
    fontSize: "clamp(1.8rem, 2vw, 2rem)",
    lineHeight: 1,
    fontWeight: 700,
    marginTop: 10,
    fontVariantNumeric: "tabular-nums",
  },
  description: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.45,
  },
};
