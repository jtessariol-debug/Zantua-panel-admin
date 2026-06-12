import { BRANDING } from "../../lib/branding";

export default function DashboardCard({ title, value, description, icon: Icon, accent }) {
  return (
    <article style={styles.card}>
      <div style={{ ...styles.iconWrap, background: accent.background, color: accent.color }}>
        {Icon ? <Icon size={20} strokeWidth={2.1} /> : null}
      </div>
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value}</div>
      <div style={styles.description}>{description}</div>
    </article>
  );
}

const styles = {
  card: {
    background: BRANDING.colors.card,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 22,
    boxShadow: "0 14px 32px rgba(18, 56, 47, 0.05)",
    padding: 20,
    minHeight: 170,
    display: "flex",
    flexDirection: "column",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  value: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 36,
    fontWeight: 700,
    marginTop: 8,
    lineHeight: 1.1,
  },
  description: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: "auto",
    paddingTop: 16,
  },
};
