import { useState } from "react";
import PatientModal from "../patients/PatientModal";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";
import PreparedNotice from "./PreparedNotice";

const STATUS_OPTIONS = ["activo", "inactivo", "suspendido"];

export default function EmployeesSettings({
  employees,
  specialists,
  persistenceAvailable,
  onCreate,
  onSave,
  onDeactivate,
  saving,
}) {
  const [modal, setModal] = useState(null);

  return (
    <SectionCard
      title="Empleados"
      subtitle="Gestión interna de altas, bajas, cargos y vinculación con especialistas."
      action={(
        <button type="button" onClick={() => setModal({ mode: "create" })} style={styles.primaryButton}>
          + Añadir empleado
        </button>
      )}
    >
      {!persistenceAvailable ? <PreparedNotice /> : null}

      {!employees.length ? (
        <EmptyState
          title="No hay empleados registrados."
          description="Esta sección ya está preparada para altas y bajas internas del equipo."
          action={(
            <button type="button" onClick={() => setModal({ mode: "create" })} style={styles.primaryButton}>
              Crear primer empleado
            </button>
          )}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Nombre</th>
                <th style={styles.head}>Cargo</th>
                <th style={styles.head}>Rol interno</th>
                <th style={styles.head}>Especialista</th>
                <th style={styles.head}>Estado</th>
                <th style={styles.head}>Ingreso</th>
                <th style={styles.head}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.primaryCell}>{employee.full_name}</div>
                    <div style={styles.secondaryCell}>{employee.email || employee.phone || "Sin contacto"}</div>
                  </td>
                  <td style={styles.cell}>{employee.position || "—"}</td>
                  <td style={styles.cell}>{employee.role || "—"}</td>
                  <td style={styles.cell}>{specialists.find((item) => item.id === employee.specialist_id)?.full_name || "No vinculada"}</td>
                  <td style={styles.cell}>{employee.status || "activo"}</td>
                  <td style={styles.cell}>{employee.hire_date || "—"}</td>
                  <td style={styles.cell}>
                    <div style={styles.actionGroup}>
                      <button type="button" onClick={() => setModal({ mode: "edit", employee })} style={styles.actionButton}>
                        Editar
                      </button>
                      {employee.status !== "inactivo" ? (
                        <button type="button" onClick={() => onDeactivate(employee.id)} style={styles.cancelButton}>
                          Dar de baja
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <PatientModal
          title={modal.mode === "edit" ? "Editar empleado" : "Nuevo empleado"}
          subtitle="Registro interno del equipo sin crear usuarios de acceso automáticamente."
          onClose={() => setModal(null)}
          wide
        >
          <EmployeeForm
            initialValues={modal.employee}
            specialists={specialists}
            loading={saving}
            onCancel={() => setModal(null)}
            onSubmit={async (payload) => {
              if (modal.mode === "edit") {
                await onSave(modal.employee.id, payload);
              } else {
                await onCreate(payload);
              }
              setModal(null);
            }}
          />
        </PatientModal>
      ) : null}
    </SectionCard>
  );
}

function EmployeeForm({ initialValues, specialists, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || "",
    phone: initialValues?.phone || "",
    email: initialValues?.email || "",
    position: initialValues?.position || "",
    role: initialValues?.role || "",
    specialist_id: initialValues?.specialist_id || "",
    hire_date: initialValues?.hire_date || "",
    termination_date: initialValues?.termination_date || "",
    status: initialValues?.status || "activo",
    notes: initialValues?.notes || "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      specialist_id: form.specialist_id || null,
      termination_date: form.termination_date || null,
      notes: form.notes || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <Field label="Nombre completo"><input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} style={styles.input} /></Field>
      <Field label="Teléfono"><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} style={styles.input} /></Field>
      <Field label="Correo"><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} style={styles.input} /></Field>
      <Field label="Cargo"><input value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} style={styles.input} /></Field>
      <Field label="Rol interno"><input value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} style={styles.input} /></Field>
      <Field label="Especialista vinculada">
        <select value={form.specialist_id} onChange={(event) => setForm((current) => ({ ...current, specialist_id: event.target.value }))} style={styles.input}>
          <option value="">Sin vincular</option>
          {specialists.map((specialist) => (
            <option key={specialist.id} value={specialist.id}>{specialist.full_name}</option>
          ))}
        </select>
      </Field>
      <Field label="Fecha de ingreso"><input type="date" value={form.hire_date} onChange={(event) => setForm((current) => ({ ...current, hire_date: event.target.value }))} style={styles.input} /></Field>
      <Field label="Fecha de salida"><input type="date" value={form.termination_date} onChange={(event) => setForm((current) => ({ ...current, termination_date: event.target.value }))} style={styles.input} /></Field>
      <Field label="Estado">
        <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} style={styles.input}>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </Field>
      <Field label="Notas internas" full>
        <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />
      </Field>
      <div style={styles.infoBox}>
        La creación automática de usuarios requiere configuración segura del backend.
      </div>
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>{loading ? "Guardando..." : "Guardar empleado"}</button>
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
  table: { width: "100%", borderCollapse: "collapse", minWidth: 920 },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "middle" },
  primaryCell: { fontWeight: 700, color: BRANDING.colors.primaryStrong },
  secondaryCell: { fontSize: 12, color: BRANDING.colors.textMuted, marginTop: 4 },
  actionGroup: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionButton: { background: "#F1F6F3", color: BRANDING.colors.primaryStrong, border: "1px solid #D4E4DD", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  cancelButton: { background: "#FFF4F5", color: "#A44E60", border: "1px solid #F1D3DA", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  infoBox: { gridColumn: "1 / -1", background: "#F7F0E3", border: `1px solid ${BRANDING.colors.border}`, color: BRANDING.colors.textMuted, borderRadius: 16, padding: "12px 14px", fontSize: 13, lineHeight: 1.6 },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", gridColumn: "1 / -1" },
  primaryButton: { background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`, color: BRANDING.colors.white, border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: BRANDING.colors.primaryStrong, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
