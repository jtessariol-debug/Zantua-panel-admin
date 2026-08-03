import { BRANDING } from "../../lib/branding";

export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <section style={styles.card}>
      <div style={styles.topAccent} />
      <div style={styles.header}>
        <div style={styles.copy}>
          <h2 style={styles.title}>{title}</h2>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div style={styles.actionWrap}>{action}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

const styles = {
  card: {
    position: "relative",
    overflow: "hidden",
    background: BRANDING.colors.card,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 28,
    boxShadow: "0 20px 40px rgba(18, 56, 47, 0.055)",
    padding: 24,
  },
  topAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    height: 1,
    background: "linear-gradient(90deg, rgba(198,164,106,0), rgba(198,164,106,0.8), rgba(198,164,106,0))",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  copy: {
    minWidth: 0,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 24,
    lineHeight: 1.1,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    lineHeight: 1.7,
    margin: "8px 0 0",
    maxWidth: 520,
  },
  actionWrap: {
    flexShrink: 0,
  },
};
