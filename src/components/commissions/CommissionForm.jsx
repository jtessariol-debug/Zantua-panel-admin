import { useMemo, useState } from "react";
import ActionButton from "../ui/ActionButton";
import { BRANDING } from "../../lib/branding";

export default function CommissionForm({
  specialists,
  products,
  initialValues,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
  specialistLocked = false,
}) {
  const [form, setForm] = useState({
    specialist_id: initialValues?.specialist_id || "",
    type: initialValues?.type || "producto",
    product_id: initialValues?.product_id || "",
    sale_amount: initialValues?.sale_amount ?? "",
    commission_percentage: initialValues?.commission_percentage ?? 10,
    commission_amount: initialValues?.commission_amount ?? "",
    commission_date: initialValues?.commission_date || new Date().toISOString().split("T")[0],
    status: initialValues?.status || "pendiente",
    notes: initialValues?.notes || "",
  });
  const [error, setError] = useState("");

  const calculatedAmount = useMemo(() => {
    const saleAmount = Number(form.sale_amount || 0);
    const percentage = Number(form.commission_percentage || 0);
    if (!saleAmount || !percentage) return 0;
    return Number(((saleAmount * percentage) / 100).toFixed(2));
  }, [form.sale_amount, form.commission_percentage]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.specialist_id) {
      setError("Selecciona una especialista.");
      return;
    }

    const saleAmount = Number(form.sale_amount || 0);
    if (saleAmount < 0) {
      setError("El monto de venta no puede ser negativo.");
      return;
    }

    onSubmit({
      ...form,
      sale_amount: saleAmount,
      commission_percentage: Number(form.commission_percentage || 0),
      commission_amount: form.commission_amount === "" ? calculatedAmount : Number(form.commission_amount || 0),
      product_id: form.product_id || null,
      notes: form.notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Contexto de la comisión</div>
        <div style={styles.gridThree}>
          <SelectField
            label="Especialista *"
            value={form.specialist_id}
            onChange={(value) => setForm((current) => ({ ...current, specialist_id: value }))}
            options={specialists.map((specialist) => ({ value: specialist.id, label: specialist.full_name }))}
            disabled={specialistLocked}
          />
          <SelectField
            label="Tipo"
            value={form.type}
            onChange={(value) => setForm((current) => ({ ...current, type: value }))}
            options={[
              { value: "producto", label: "Producto" },
              { value: "servicio", label: "Servicio" },
              { value: "bono", label: "Bono" },
              { value: "otro", label: "Otro" },
            ]}
          />
          <SelectField
            label="Producto"
            value={form.product_id}
            onChange={(value) => setForm((current) => ({ ...current, product_id: value }))}
            options={products.map((product) => ({ value: product.id, label: product.name }))}
          />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Montos y estado</div>
        <div style={styles.gridFour}>
          <Field label="Monto de venta" type="number" value={form.sale_amount} onChange={(value) => setForm((current) => ({ ...current, sale_amount: value }))} />
          <Field label="% comisión" type="number" value={form.commission_percentage} onChange={(value) => setForm((current) => ({ ...current, commission_percentage: value }))} />
          <Field label="Monto comisión" type="number" value={form.commission_amount} onChange={(value) => setForm((current) => ({ ...current, commission_amount: value }))} />
          <Field label="Fecha" type="date" value={form.commission_date} onChange={(value) => setForm((current) => ({ ...current, commission_date: value }))} />
        </div>

        <div style={styles.gridTwo}>
          <SelectField
            label="Estado"
            value={form.status}
            onChange={(value) => setForm((current) => ({ ...current, status: value }))}
            options={[
              { value: "pendiente", label: "Pendiente" },
              { value: "pagada", label: "Pagada" },
              { value: "cancelada", label: "Cancelada" },
            ]}
          />
          <div style={styles.previewCard}>
            <div style={styles.previewLabel}>Cálculo sugerido</div>
            <div style={styles.previewValue}>RD$ {calculatedAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Notas internas</div>
        <textarea
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          style={{ ...styles.input, minHeight: 110, resize: "vertical" }}
        />
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Guardando..." : submitLabel}
        </ActionButton>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={styles.input} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{ ...styles.input, ...(disabled ? styles.inputDisabled : {}) }}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 18 },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "#FCFAF6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    padding: 18,
  },
  sectionTitle: { color: BRANDING.colors.primaryStrong, fontSize: 17, fontWeight: 700 },
  gridFour: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 },
  gridThree: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  gridTwo: { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 220px", gap: 16 },
  label: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: BRANDING.colors.card, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 15, boxSizing: "border-box", outline: "none" },
  inputDisabled: { background: "#F1EFEA", color: "#7A716A" },
  previewCard: { background: BRANDING.colors.card, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" },
  previewLabel: { color: "#8B7E74", fontSize: 12, textTransform: "uppercase", fontWeight: 700 },
  previewValue: { color: "#2A2522", fontSize: 28, fontWeight: 700, marginTop: 8 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "12px 14px", fontSize: 13 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" },
};
