import { BRANDING } from "../../lib/branding";

export default function FilterToolbar({ children, align = "space-between" }) {
  return (
    <div style={{ ...styles.wrap, justifyContent: align }}>
      {children}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    padding: 14,
    borderRadius: 22,
    border: `1px solid ${BRANDING.colors.border}`,
    background: "#FCF8F2",
  },
};
