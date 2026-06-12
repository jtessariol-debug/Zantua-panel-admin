import { useState } from "react";

export default function ClinicalHistoryForm({ initialValues, onSubmit, onCancel, loading, submitLabel }) {
  const [form, setForm] = useState({
    medical_history: initialValues?.medical_history || "",
    allergies: initialValues?.allergies || "",
    medications: initialValues?.medications || "",
    skin_conditions: initialValues?.skin_conditions || "",
    contraindications: initialValues?.contraindications || "",
    observations: initialValues?.observations || "",
  });
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const hasContent = Object.values(form).some((value) => String(value || "").trim().length > 0);
    if (!hasContent) {
      setError("Debes registrar al menos una información clínica antes de guardar.");
      return;
    }

    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <TextAreaField label="Antecedentes médicos" value={form.medical_history} onChange={(value) => setForm((current) => ({ ...current, medical_history: value }))} />
      <div style={styles.gridTwo}>
        <TextAreaField label="Alergias" value={form.allergies} onChange={(value) => setForm((current) => ({ ...current, allergies: value }))} />
        <TextAreaField label="Medicamentos actuales" value={form.medications} onChange={(value) => setForm((current) => ({ ...current, medications: value }))} />
      </div>
      <div style={styles.gridTwo}>
        <TextAreaField label="Condiciones de piel" value={form.skin_conditions} onChange={(value) => setForm((current) => ({ ...current, skin_conditions: value }))} />
        <TextAreaField label="Contraindicaciones" value={form.contraindications} onChange={(value) => setForm((current) => ({ ...current, contraindications: value }))} />
      </div>
      <TextAreaField label="Observaciones clínicas" value={form.observations} onChange={(value) => setForm((current) => ({ ...current, observations: value }))} />

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>
          {loading ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} style={styles.textarea} />
    </div>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  gridTwo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  textarea: { width: "100%", background: "#FCFAF7", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none", minHeight: 100, resize: "vertical" },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 14, padding: "12px 14px", fontSize: 13 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
