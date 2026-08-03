import { useMemo, useState } from "react";
import PatientModal from "../patients/PatientModal";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";

const INITIAL_FORM = {
  name: "",
  type: "laser",
  active: true,
};

export default function CabinsSettings({
  cabins,
  onCreate,
  onSave,
  saving,
  isAdmin = false,
}) {
  const [editingCabin, setEditingCabin] = useState(null);
  const [creatingCabin, setCreatingCabin] = useState(false);
  const [localError, setLocalError] = useState("");

  const sortedCabins = useMemo(() => {
    return [...cabins].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [cabins]);

  function handleOpenCreate() {
    if (!isAdmin) {
      setLocalError("No tienes permisos para gestionar cabinas.");
      return;
    }

    setLocalError("");
    setCreatingCabin(true);
  }

  function handleOpenEdit(cabin) {
    if (!isAdmin) {
      setLocalError("No tienes permisos para gestionar cabinas.");
      return;
    }

    setLocalError("");
    setEditingCabin(cabin);
  }

  return (
    <SectionCard
      title="Cabinas"
      subtitle="Administra las cabinas reales del centro sin borrar registros históricos."
      action={isAdmin ? (
        <ActionButton type="button" onClick={handleOpenCreate}>
          + Nueva cabina
        </ActionButton>
      ) : null}
    >
      {localError ? <div style={styles.errorBanner}>{localError}</div> : null}

      {!sortedCabins.length ? (
        <EmptyState
          title="No hay cabinas registradas."
          description="Cuando existan cabinas en Supabase, aparecerán aquí para administración operativa."
          action={isAdmin ? (
            <ActionButton type="button" onClick={handleOpenCreate}>
              Crear primera cabina
            </ActionButton>
          ) : null}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Cabina</th>
                <th style={styles.head}>Tipo</th>
                <th style={styles.head}>Estado</th>
                {isAdmin ? <th style={styles.head}>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedCabins.map((cabin) => (
                <tr key={cabin.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.primaryCell}>{cabin.name || "Sin nombre"}</div>
                  </td>
                  <td style={styles.cell}>{getCabinTypeLabel(cabin.type)}</td>
                  <td style={styles.cell}>
                    <StatusBadge status={cabin.active === false ? "cancelada" : "confirmada"} />
                  </td>
                  {isAdmin ? (
                    <td style={styles.cell}>
                      <ActionButton type="button" variant="secondary" onClick={() => handleOpenEdit(cabin)} style={styles.actionButton}>
                        Editar
                      </ActionButton>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creatingCabin ? (
        <PatientModal
          title="Nueva cabina"
          subtitle="Crea una cabina operativa para agenda y asignación de citas."
          onClose={() => setCreatingCabin(false)}
        >
          <CabinForm
            initialValues={INITIAL_FORM}
            loading={saving}
            onCancel={() => setCreatingCabin(false)}
            onSubmit={async (payload) => {
              await onCreate(payload);
              setCreatingCabin(false);
            }}
          />
        </PatientModal>
      ) : null}

      {editingCabin ? (
        <PatientModal
          title="Editar cabina"
          subtitle="Actualiza nombre, tipo y disponibilidad operativa."
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
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("El nombre de la cabina es obligatorio.");
      return;
    }

    setError("");

    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        active: form.active,
      });
    } catch (submitError) {
      setError(submitError.message || "No fue posible guardar la cabina.");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Datos de cabina</div>

        <Field label="Nombre *">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            style={styles.input}
          />
        </Field>

        <Field label="Tipo">
          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            style={styles.input}
          >
            <option value="laser">Láser</option>
            <option value="cosmetologia">Cosmetología</option>
            <option value="multiproposito">Multipropósito</option>
          </select>
        </Field>

        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          Cabina activa
        </label>
      </div>

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>Cancelar</ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar cabina"}
        </ActionButton>
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

function getCabinTypeLabel(type) {
  if (type === "laser") return "Láser";
  if (type === "cosmetologia") return "Cosmetología";
  if (type === "multiproposito") return "Multipropósito";
  return type || "Sin tipo";
}

const styles = {
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "middle" },
  primaryCell: { fontWeight: 700, color: BRANDING.colors.primaryStrong },
  actionButton: { padding: "10px 12px", borderRadius: 14 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formSection: { display: "flex", flexDirection: "column", gap: 16, background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 24, padding: 18 },
  formSectionTitle: { color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 17 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  toggleRow: { display: "inline-flex", alignItems: "center", gap: 8, color: BRANDING.colors.textMuted, fontSize: 13, fontWeight: 600 },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 600 },
};
