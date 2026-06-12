import { useState } from "react";
import PatientModal from "../patients/PatientModal";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";
import PreparedNotice from "./PreparedNotice";

const PAYMENT_TYPES = ["salario", "comision", "bonificacion", "nomina", "otro"];

export default function PayrollSettings({
  rows,
  employees,
  specialists,
  persistenceAvailable,
  onCreate,
  saving,
}) {
  const [open, setOpen] = useState(false);

  return (
    <SectionCard
      title="Nómina"
      subtitle="Deja preparados salarios, comisiones, bonificaciones y pagos periódicos del equipo."
      action={(
        <button type="button" onClick={() => setOpen(true)} style={styles.primaryButton}>
          + Registrar pago
        </button>
      )}
    >
      {!persistenceAvailable ? <PreparedNotice /> : null}

      {!rows.length ? (
        <EmptyState
          title="No hay pagos de nómina registrados."
          description="La estructura ya está lista para su uso cuando habilites la persistencia."
          action={(
            <button type="button" onClick={() => setOpen(true)} style={styles.primaryButton}>
              Registrar primer pago
            </button>
          )}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Fecha</th>
                <th style={styles.head}>Tipo</th>
                <th style={styles.head}>Empleado</th>
                <th style={styles.head}>Especialista</th>
                <th style={styles.head}>Monto</th>
                <th style={styles.head}>Periodo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} style={styles.row}>
                  <td style={styles.cell}>{item.payment_date || "—"}</td>
                  <td style={styles.cell}>{item.payment_type || "—"}</td>
                  <td style={styles.cell}>{employees.find((employee) => employee.id === item.employee_id)?.full_name || "—"}</td>
                  <td style={styles.cell}>{specialists.find((specialist) => specialist.id === item.specialist_id)?.full_name || "—"}</td>
                  <td style={styles.cell}>RD$ {Number(item.amount || 0).toFixed(2)}</td>
                  <td style={styles.cell}>{item.period_start || "—"} {item.period_end ? `al ${item.period_end}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <PatientModal
          title="Registrar pago de nómina"
          subtitle="Registra salarios, comisiones o bonificaciones del equipo."
          onClose={() => setOpen(false)}
        >
          <PayrollForm
            employees={employees}
            specialists={specialists}
            loading={saving}
            onCancel={() => setOpen(false)}
            onSubmit={async (payload) => {
              await onCreate(payload);
              setOpen(false);
            }}
          />
        </PatientModal>
      ) : null}
    </SectionCard>
  );
}

function PayrollForm({ employees, specialists, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    employee_id: "",
    specialist_id: "",
    payment_type: "salario",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    period_start: "",
    period_end: "",
    notes: "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      employee_id: form.employee_id || null,
      specialist_id: form.specialist_id || null,
      amount: Number(form.amount || 0),
      notes: form.notes || null,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <Field label="Empleado">
        <select value={form.employee_id} onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))} style={styles.input}>
          <option value="">Sin empleado</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
        </select>
      </Field>
      <Field label="Especialista">
        <select value={form.specialist_id} onChange={(event) => setForm((current) => ({ ...current, specialist_id: event.target.value }))} style={styles.input}>
          <option value="">Sin especialista</option>
          {specialists.map((specialist) => <option key={specialist.id} value={specialist.id}>{specialist.full_name}</option>)}
        </select>
      </Field>
      <Field label="Tipo">
        <select value={form.payment_type} onChange={(event) => setForm((current) => ({ ...current, payment_type: event.target.value }))} style={styles.input}>
          {PAYMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </Field>
      <Field label="Monto">
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Fecha de pago">
        <input type="date" value={form.payment_date} onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Inicio del periodo">
        <input type="date" value={form.period_start} onChange={(event) => setForm((current) => ({ ...current, period_start: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Fin del periodo">
        <input type="date" value={form.period_end} onChange={(event) => setForm((current) => ({ ...current, period_end: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Notas" full>
        <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />
      </Field>
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>{loading ? "Guardando..." : "Guardar pago"}</button>
      </div>
    </form>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "middle" },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", gridColumn: "1 / -1" },
  primaryButton: { background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`, color: BRANDING.colors.white, border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: BRANDING.colors.primaryStrong, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
