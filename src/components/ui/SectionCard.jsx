import { BRANDING } from "../../lib/branding";

export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{title}</h2>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

const styles = {
  card: {
    background: BRANDING.colors.card,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    boxShadow: "0 18px 36px rgba(18, 56, 47, 0.05)",
    padding: 24,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
    margin: "6px 0 0",
  },
};
