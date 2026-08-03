import { BRANDING } from "../../lib/branding";

export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <section style={styles.wrap}>
      <div style={styles.copy}>
        {eyebrow ? <div style={styles.eyebrow}>{eyebrow}</div> : null}
        <h1 style={styles.title}>{title}</h1>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={styles.actions}>{actions}</div> : null}
    </section>
  );
}

const styles = {
  wrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  eyebrow: {
    color: BRANDING.colors.secondary,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: "clamp(2rem, 2.5vw, 2.6rem)",
    lineHeight: 1.04,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 720,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
};
