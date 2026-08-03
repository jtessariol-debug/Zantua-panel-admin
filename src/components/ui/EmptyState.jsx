import { BRANDING } from "../../lib/branding";

export default function EmptyState({ title, description, action }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.iconWrap}>
        <span style={styles.iconMark}>+</span>
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {action ? <div style={styles.actionWrap}>{action}</div> : null}
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: 190,
    border: `1px dashed ${BRANDING.colors.border}`,
    borderRadius: 24,
    background: "#FCFAF5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    flexDirection: "column",
    padding: 30,
    gap: 12,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    background: "#F1EADF",
    color: BRANDING.colors.primaryStrong,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },
  iconMark: {
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
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
    lineHeight: 1.7,
    maxWidth: 430,
    margin: 0,
  },
  actionWrap: {
    marginTop: 6,
  },
};
