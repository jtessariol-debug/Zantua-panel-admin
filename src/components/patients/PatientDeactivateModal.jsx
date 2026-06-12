import { BRANDING } from "../../lib/branding";

export default function PatientDeactivateModal({
  patient,
  mode = "deactivate",
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  loading,
}) {
  const isReactivation = mode === "reactivate";

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{isReactivation ? "Reactivar paciente" : "Dar de baja paciente"}</h2>
            <p style={styles.subtitle}>
              {isReactivation
                ? "El paciente volverá a aparecer en la lista principal."
                : "Esta acción dará de baja al paciente y lo ocultará de la lista principal. Su historial clínico, consentimiento, citas, facturas y sesiones se conservarán para auditoría."}
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.patientCard}>
          <div style={styles.patientName}>{patient?.full_name || "Paciente"}</div>
          <div style={styles.patientMeta}>{patient?.national_id || patient?.email || patient?.phone || "Sin dato adicional"}</div>
        </div>

        {!isReactivation ? (
          <div>
            <label style={styles.label}>Motivo de baja</label>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Motivo opcional para auditoría"
              style={styles.textarea}
            />
          </div>
        ) : null}

        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} style={isReactivation ? styles.primaryButton : styles.dangerButton} disabled={loading}>
            {loading ? "Guardando..." : isReactivation ? "Reactivar paciente" : "Dar de baja paciente"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 51, 43, 0.24)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 90,
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    background: BRANDING.colors.card,
    borderRadius: 24,
    padding: 28,
    border: `1px solid ${BRANDING.colors.border}`,
    boxShadow: "0 28px 54px rgba(18, 56, 47, 0.14)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    margin: "8px 0 0",
    lineHeight: 1.6,
  },
  closeButton: {
    background: "transparent",
    border: "none",
    fontSize: 24,
    color: BRANDING.colors.textMuted,
    cursor: "pointer",
  },
  patientCard: {
    background: "#FCFAF4",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 18,
    padding: 16,
  },
  patientName: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 16,
    fontWeight: 700,
  },
  patientMeta: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  label: {
    color: "#7E726B",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    resize: "vertical",
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 14,
    padding: "14px 15px",
    color: "#2A2522",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  secondaryButton: {
    background: "#fff",
    color: BRANDING.colors.primaryStrong,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`,
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    background: "linear-gradient(135deg, #8A2F3F, #B54B57)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};
