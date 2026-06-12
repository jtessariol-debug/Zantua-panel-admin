import { useState } from "react";
import PatientModal from "../patients/PatientModal";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";

export default function CabinsSettings({ cabins, onSave, saving }) {
  const [editingCabin, setEditingCabin] = useState(null);

  return (
    <SectionCard title="Cabinas" subtitle="Actualiza nombre, tipo y estado operativo de las cabinas.">
      {!cabins.length ? (
        <EmptyState
          title="No hay cabinas registradas."
          description="Cuando existan cabinas en Supabase, podrás gestionarlas desde esta sección."
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Cabina</th>
                <th style={styles.head}>Tipo</th>
                <th style={styles.head}>Estado</th>
                <th style={styles.head}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cabins.map((cabin) => (
                <tr key={cabin.id} style={styles.row}>
                  <td style={styles.cell}>{cabin.name || "Sin nombre"}</td>
                  <td style={styles.cell}>{cabin.type || "Sin tipo"}</td>
                  <td style={styles.cell}>{cabin.active === false ? "Inactiva" : "Activa"}</td>
                  <td style={styles.cell}>
                    <button type="button" onClick={() => setEditingCabin(cabin)} style={styles.actionButton}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingCabin ? (
        <PatientModal
          title="Editar cabina"
          subtitle="Actualiza identificación y disponibilidad operativa."
          onClose={() => setEditingCabin(null)}
        >
          <CabinForm
            initialValues={editingCabin}
            loading={saving}
            onCancel={() => setEditingCabin(null)}
            onSubmit={async (payload) => {
              await onSave(editingCabin.id, payload);
              setEditingCabin(null);
            }}
          />
        </PatientModal>
      ) : null}
    </SectionCard>
  );
}

function CabinForm({ initialValues, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initialValues?.name || "",
    type: initialValues?.type || "laser",
    active: initialValues?.active !== false,
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <Field label="Nombre">
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />
      </Field>
      <Field label="Tipo">
        <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} style={styles.input}>
          <option value="laser">Láser</option>
          <option value="cosmetologia">Cosmetología</option>
        </select>
      </Field>
      <label style={styles.toggleRow}>
        <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
        Cabina activa
      </label>
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>{loading ? "Guardando..." : "Guardar cabina"}</button>
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
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  toggleRow: { display: "inline-flex", alignItems: "center", gap: 8, color: BRANDING.colors.textMuted, fontSize: 13, fontWeight: 600 },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" },
  primaryButton: { background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`, color: BRANDING.colors.white, border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: BRANDING.colors.primaryStrong, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
