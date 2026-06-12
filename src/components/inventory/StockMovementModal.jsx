import PatientModal from "../patients/PatientModal";

export default function StockMovementModal({ itemName, onClose, onSubmit, loading, movementType }) {
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
        <div>
          <label style={styles.label}>Cantidad *</label>
          <input name="quantity" type="number" min="1" step="1" required style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Razón</label>
          <textarea name="reason" style={{ ...styles.input, minHeight: 110, resize: "vertical" }} />
        </div>
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancelar</button>
          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? "Guardando..." : "Registrar movimiento"}
          </button>
        </div>
      </form>
    </PatientModal>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#FCFAF7", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
