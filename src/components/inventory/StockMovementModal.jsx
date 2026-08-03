import PatientModal from "../patients/PatientModal";
import ActionButton from "../ui/ActionButton";
import { BRANDING } from "../../lib/branding";

export default function StockMovementModal({
  itemName,
  onClose,
  onSubmit,
  loading,
  movementType,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
    });
  }

  return (
    <PatientModal
      title={`${movementType === "entrada" ? "Registrar entrada" : "Registrar salida"} de stock`}
      subtitle={itemName}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.infoCard}>
          Documenta la cantidad y la razón del movimiento para mantener trazabilidad operativa.
        </div>
        <div>
          <label style={styles.label}>Cantidad *</label>
          <input name="quantity" type="number" min="1" step="1" required style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Razón</label>
          <textarea
            name="reason"
            style={{ ...styles.input, minHeight: 110, resize: "vertical" }}
          />
        </div>
        <div style={styles.actions}>
          <ActionButton type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Registrar movimiento"}
          </ActionButton>
        </div>
      </form>
    </PatientModal>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  infoCard: {
    background: "#EEF5F1",
    border: "1px solid #D8E7DF",
    color: "#12382F",
    borderRadius: 18,
    padding: "14px 16px",
    fontSize: 14,
    lineHeight: 1.6,
  },
  label: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    background: BRANDING.colors.card,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "14px 15px",
    color: BRANDING.colors.text,
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" },
};
