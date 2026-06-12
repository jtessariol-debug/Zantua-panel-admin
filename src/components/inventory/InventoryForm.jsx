import { useState } from "react";

export default function InventoryForm({ itemType, initialValues, onSubmit, onCancel, loading, submitLabel }) {
  const [form, setForm] = useState({
    name: initialValues?.name || "",
    description: initialValues?.description || "",
    category: initialValues?.category || "",
    price: initialValues?.price ?? "",
    current_stock: initialValues?.current_stock ?? "",
    min_stock: initialValues?.min_stock ?? "",
    active: initialValues?.active ?? true,
  });
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError(`El nombre del ${itemType === "product" ? "producto" : "insumo"} es obligatorio.`);
      return;
    }

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      price: itemType === "product" ? Number(form.price || 0) : null,
      current_stock: Number(form.current_stock || 0),
      min_stock: Number(form.min_stock || 0),
      active: Boolean(form.active),
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.gridTwo}>
        <Field label="Nombre *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <Field label="Categoría" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
      </div>

      <div>
        <label style={styles.label}>Descripción</label>
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
        />
      </div>

      <div style={styles.gridThree}>
        {itemType === "product" ? (
          <Field label="Precio" value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} type="number" />
        ) : null}
        <Field label="Stock actual" value={form.current_stock} onChange={(value) => setForm((current) => ({ ...current, current_stock: value }))} type="number" />
        <Field label="Stock mínimo" value={form.min_stock} onChange={(value) => setForm((current) => ({ ...current, min_stock: value }))} type="number" />
      </div>

      {itemType === "product" ? (
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          Producto activo
        </label>
      ) : null}

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

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
    </div>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  gridTwo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  gridThree: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#FCFAF7", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  checkboxRow: { display: "flex", gap: 10, alignItems: "center", color: "#5F5752", fontSize: 14 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 14, padding: "12px 14px", fontSize: 13 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
