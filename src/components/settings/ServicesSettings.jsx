import { useState } from "react";
import PatientModal from "../patients/PatientModal";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";

export default function ServicesSettings({ services, onCreate, onSave, saving }) {
  const [modal, setModal] = useState(null);

  return (
    <SectionCard
      title="Servicios y precios"
      subtitle="Administra categorías, precio, duración y disponibilidad de los servicios."
      action={(
        <button type="button" onClick={() => setModal({ mode: "create" })} style={styles.primaryButton}>
          + Nuevo servicio
        </button>
      )}
    >
      {!services.length ? (
        <EmptyState
          title="No hay servicios registrados."
          description="Crea el primer servicio para conectar agenda y facturación."
          action={(
            <button type="button" onClick={() => setModal({ mode: "create" })} style={styles.primaryButton}>
              Crear primer servicio
            </button>
          )}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Servicio</th>
                <th style={styles.head}>Categoría</th>
                <th style={styles.head}>Precio</th>
                <th style={styles.head}>Duración</th>
                <th style={styles.head}>Estado</th>
                <th style={styles.head}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} style={styles.row}>
                  <td style={styles.cell}>{service.name || "Sin nombre"}</td>
                  <td style={styles.cell}>{service.category || "Sin categoría"}</td>
                  <td style={styles.cell}>{service.price != null ? `RD$ ${Number(service.price).toFixed(2)}` : "—"}</td>
                  <td style={styles.cell}>{service.duration_minutes ? `${service.duration_minutes} min` : "40 min"}</td>
                  <td style={styles.cell}>{service.active === false ? "Inactivo" : "Activo"}</td>
                  <td style={styles.cell}>
                    <button type="button" onClick={() => setModal({ mode: "edit", service })} style={styles.actionButton}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <PatientModal
          title={modal.mode === "edit" ? "Editar servicio" : "Nuevo servicio"}
          subtitle="Configura nombre, categoría, precio y duración de uso operativo."
          onClose={() => setModal(null)}
        >
          <ServiceForm
            initialValues={modal.service}
            loading={saving}
            onCancel={() => setModal(null)}
            onSubmit={async (payload) => {
              if (modal.mode === "edit") {
                await onSave(modal.service.id, payload);
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

function ServiceForm({ initialValues, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initialValues?.name || "",
    category: initialValues?.category || "",
    price: initialValues?.price ?? "",
    duration_minutes: initialValues?.duration_minutes ?? 40,
    active: initialValues?.active !== false,
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      price: Number(form.price || 0),
      duration_minutes: Number(form.duration_minutes || 40),
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <Field label="Nombre">
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Categoría">
        <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Precio">
        <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Duración (minutos)">
        <input type="number" min="10" step="5" value={form.duration_minutes} onChange={(event) => setForm((current) => ({ ...current, duration_minutes: event.target.value }))} style={styles.input} />
      </Field>
      <label style={styles.toggleRow}>
        <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
        Servicio activo
      </label>
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>{loading ? "Guardando..." : "Guardar servicio"}</button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
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
  actionButton: { background: "#F1F6F3", color: BRANDING.colors.primaryStrong, border: "1px solid #D4E4DD", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  toggleRow: { display: "inline-flex", alignItems: "center", gap: 8, color: BRANDING.colors.textMuted, fontSize: 13, fontWeight: 600, gridColumn: "1 / -1" },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", gridColumn: "1 / -1" },
  primaryButton: { background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`, color: BRANDING.colors.white, border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: BRANDING.colors.primaryStrong, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
