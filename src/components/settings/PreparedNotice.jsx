import { BRANDING } from "../../lib/branding";

export default function PreparedNotice({ message = "El guardado persistente de esta sección no está disponible en este momento." }) {
  return (
    <div style={styles.notice}>
      {message}
    </div>
  );
}

const styles = {
  notice: {
    background: "#F7F0E3",
    border: `1px solid ${BRANDING.colors.border}`,
    color: BRANDING.colors.textMuted,
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.6,
  },
};
