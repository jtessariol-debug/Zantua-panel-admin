import { BRANDING } from "../../lib/branding";

export default function EmptyState({ title, description, action }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.iconWrap}>✦</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {action}
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: 180,
    border: `1px dashed ${BRANDING.colors.border}`,
    borderRadius: 20,
    background: "#FCFAF4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    flexDirection: "column",
    padding: 28,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: BRANDING.colors.primarySoft,
    color: BRANDING.colors.primaryStrong,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  description: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 420,
    margin: 0,
  },
};
