import { useMemo, useState } from "react";
import InvoiceItemsEditor from "./InvoiceItemsEditor";

export default function InvoiceForm({ lookups, initialValues, onSubmit, onCancel, loading, submitLabel, specialistLocked = false }) {
  const [form, setForm] = useState({
    client_id: initialValues?.client_id || "",
    specialist_id: initialValues?.specialist_id || "",
    appointment_id: initialValues?.appointment_id || "",
    invoice_date: initialValues?.invoice_date || new Date().toISOString().split("T")[0],
    payment_method: initialValues?.payment_method || "",
    payment_status: initialValues?.payment_status || "pendiente",
    discount: initialValues?.discount ?? 0,
    notes: initialValues?.notes || "",
  });
  const [items, setItems] = useState(initialValues?.items?.length ? initialValues.items : []);
  const [error, setError] = useState("");

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0), [items]);
  const total = Math.max(0, subtotal - Number(form.discount || 0));

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.client_id) {
      setError("Selecciona un cliente.");
      return;
    }

    if (items.length === 0) {
      setError("Debes agregar al menos un item a la factura.");
      return;
    }

    onSubmit({
      ...form,
      discount: Number(form.discount || 0),
      notes: form.notes.trim() || null,
      items,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.gridThree}>
        <SelectField label="Cliente *" value={form.client_id} onChange={(value) => setForm((current) => ({ ...current, client_id: value }))} options={lookups.clients.map((client) => ({ value: client.id, label: client.full_name }))} />
        <SelectField label="Especialista" value={form.specialist_id} onChange={(value) => setForm((current) => ({ ...current, specialist_id: value }))} options={lookups.specialists.map((specialist) => ({ value: specialist.id, label: specialist.full_name }))} disabled={specialistLocked} />
        <SelectField label="Cita relacionada" value={form.appointment_id} onChange={(value) => setForm((current) => ({ ...current, appointment_id: value }))} options={lookups.appointments.map((appointment) => ({ value: appointment.id, label: appointment.label }))} />
      </div>

      <div style={styles.gridThree}>
        <Field label="Fecha" type="date" value={form.invoice_date} onChange={(value) => setForm((current) => ({ ...current, invoice_date: value }))} />
        <SelectField label="Método de pago" value={form.payment_method} onChange={(value) => setForm((current) => ({ ...current, payment_method: value }))} options={[
          { value: "efectivo", label: "Efectivo" },
          { value: "tarjeta", label: "Tarjeta" },
          { value: "transferencia", label: "Transferencia" },
          { value: "mixto", label: "Mixto" },
          { value: "otro", label: "Otro" },
        ]} />
        <SelectField label="Estado de pago" value={form.payment_status} onChange={(value) => setForm((current) => ({ ...current, payment_status: value }))} options={[
          { value: "pendiente", label: "Pendiente" },
          { value: "pagada", label: "Pagada" },
          { value: "cancelada", label: "Cancelada" },
        ]} />
      </div>

      <InvoiceItemsEditor items={items} onChange={setItems} lookups={lookups} />

      <div style={styles.gridTwo}>
        <Field label="Descuento" type="number" value={form.discount} onChange={(value) => setForm((current) => ({ ...current, discount: value }))} />
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
          <div style={styles.summaryRow}><span>Descuento</span><strong>${Number(form.discount || 0).toFixed(2)}</strong></div>
          <div style={styles.summaryTotal}><span>Total</span><strong>${total.toFixed(2)}</strong></div>
        </div>
      </div>

      <div>
        <label style={styles.label}>Notas</label>
        <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...styles.input, minHeight: 100, resize: "vertical" }} />
      </div>

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
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={styles.input} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} style={{ ...styles.input, ...(disabled ? styles.inputDisabled : {}) }}>
        <option value="">Seleccionar</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  gridThree: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  gridTwo: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#FCFAF7", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  inputDisabled: { background: "#F1EFEA", color: "#7A716A" },
  summaryCard: { background: "#FCFAF7", border: "1px solid #EFE2D7", borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 10, alignSelf: "end" },
  summaryRow: { display: "flex", justifyContent: "space-between", color: "#6E625B", fontSize: 14 },
  summaryTotal: { display: "flex", justifyContent: "space-between", color: "#2A2522", fontSize: 16, fontWeight: 700, paddingTop: 10, borderTop: "1px solid #EDE1D6" },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 14, padding: "12px 14px", fontSize: 13 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
