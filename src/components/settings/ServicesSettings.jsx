import { useMemo, useState } from "react";
import PatientModal from "../patients/PatientModal";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";

const SERVICE_TYPE_LABELS = {
  servicio: "Servicio",
  paquete: "Paquete",
  producto_cosmetologia: "Cosmetología",
};

const INITIAL_FORM = {
  name: "",
  category: "",
  service_type: "servicio",
  price: "",
  sessions_count: "",
  payment_flexibility: "",
  duration_minutes: 40,
  description: "",
  active: true,
};

export default function ServicesSettings({ services, onCreate, onSave, saving, isAdmin = false }) {
  const [modal, setModal] = useState(null);
  const [localError, setLocalError] = useState("");

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [services]);

  function handleOpenCreate() {
    if (!isAdmin) {
      setLocalError("No tienes permisos para modificar precios o servicios.");
      return;
    }
    setLocalError("");
    setModal({ mode: "create" });
  }

  function handleOpenEdit(service) {
    if (!isAdmin) {
      setLocalError("No tienes permisos para modificar precios o servicios.");
      return;
    }
    setLocalError("");
    setModal({ mode: "edit", service });
  }

  return (
    <SectionCard
      title="Servicios y precios"
      subtitle="Administra servicios y paquetes activos para agenda y facturación."
      action={isAdmin ? (
        <ActionButton type="button" onClick={handleOpenCreate}>
          + Nuevo servicio
        </ActionButton>
      ) : null}
    >
      {localError ? <div style={styles.errorBanner}>{localError}</div> : null}

      {!sortedServices.length ? (
        <EmptyState
          title="No hay servicios registrados."
          description="Crea el primer servicio o paquete para conectar agenda y facturación."
          action={isAdmin ? (
            <ActionButton type="button" onClick={handleOpenCreate}>
              Crear primer servicio
            </ActionButton>
          ) : null}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Servicio</th>
                <th style={styles.head}>Tipo</th>
                <th style={styles.head}>Categoría</th>
                <th style={styles.head}>Sesiones</th>
                <th style={styles.head}>Precio</th>
                <th style={styles.head}>Flexibilidad</th>
                <th style={styles.head}>Descripción</th>
                <th style={styles.head}>Estado</th>
                {isAdmin ? <th style={styles.head}>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedServices.map((service) => (
                <tr key={service.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.primaryText}>{service.name || "Sin nombre"}</div>
                    <div style={styles.secondaryText}>
                      {service.duration_minutes ? `${service.duration_minutes} min` : "40 min"}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    <span style={{
                      ...styles.typeBadge,
                      ...(service.service_type === "paquete" ? styles.packageBadge : styles.serviceBadge),
                    }}
                    >
                      {SERVICE_TYPE_LABELS[service.service_type] || "Servicio"}
                    </span>
                  </td>
                  <td style={styles.cell}>{service.category || "Sin categoría"}</td>
                  <td style={styles.cell}>{service.sessions_count || "—"}</td>
                  <td style={styles.cell}><span style={styles.amount}>{service.price != null ? `RD$ ${Number(service.price).toFixed(2)}` : "—"}</span></td>
                  <td style={styles.cell}>{service.payment_flexibility || "Pago único"}</td>
                  <td style={styles.cell}>
                    <div style={styles.descriptionClamp}>
                      {service.description || "Sin descripción operativa."}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    <StatusBadge status={service.active === false ? "cancelada" : "confirmada"} />
                  </td>
                  {isAdmin ? (
                    <td style={styles.cell}>
                      <ActionButton type="button" variant="secondary" onClick={() => handleOpenEdit(service)} style={styles.actionButton}>
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

      {modal ? (
        <PatientModal
          title={modal.mode === "edit" ? "Editar servicio" : "Nuevo servicio"}
          subtitle="Configura tipo, precio, sesiones, flexibilidad de pago y disponibilidad."
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
    ...INITIAL_FORM,
    ...initialValues,
    price: initialValues?.price ?? "",
    sessions_count: initialValues?.sessions_count ?? "",
    duration_minutes: initialValues?.duration_minutes ?? 40,
    payment_flexibility: initialValues?.payment_flexibility ?? "",
    description: initialValues?.description ?? "",
    active: initialValues?.active !== false,
  });
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("El nombre del servicio es obligatorio.");
      return;
    }

    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        payment_flexibility: form.payment_flexibility.trim(),
        description: form.description.trim(),
        price: Number(form.price || 0),
        sessions_count: form.sessions_count === "" ? null : Number(form.sessions_count),
        duration_minutes: Number(form.duration_minutes || 40),
      });
    } catch (submitError) {
      setError(submitError.message || "No fue posible crear el servicio.");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error ? <div style={styles.errorBanner}>{error}</div> : null}
      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Ficha del servicio</div>
        <Field label="Nombre *">
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Tipo">
          <select value={form.service_type} onChange={(event) => setForm((current) => ({ ...current, service_type: event.target.value }))} style={styles.input}>
            <option value="servicio">Servicio</option>
            <option value="paquete">Paquete</option>
            <option value="producto_cosmetologia">Cosmetología</option>
          </select>
        </Field>
        <Field label="Categoría">
          <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} style={styles.input} />
        </Field>
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Precio y duración</div>
        <Field label="Precio">
          <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Sesiones">
          <input type="number" min="0" step="1" value={form.sessions_count} onChange={(event) => setForm((current) => ({ ...current, sessions_count: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Duración (minutos)">
          <input type="number" min="10" step="5" value={form.duration_minutes} onChange={(event) => setForm((current) => ({ ...current, duration_minutes: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Flexibilidad de pago">
          <input value={form.payment_flexibility} onChange={(event) => setForm((current) => ({ ...current, payment_flexibility: event.target.value }))} style={styles.input} placeholder="Ej. 3 pagos / Pago único" />
        </Field>
        <Field label="Descripción" full>
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} style={{ ...styles.input, minHeight: 110, resize: "vertical" }} />
        </Field>
        <label style={styles.toggleRow}>
          <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
          Servicio activo
        </label>
      </div>

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>Cancelar</ActionButton>
        <ActionButton type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar servicio"}</ActionButton>
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
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 12px 16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "top" },
  primaryText: { fontWeight: 700, color: BRANDING.colors.primaryStrong },
  secondaryText: { color: BRANDING.colors.textMuted, fontSize: 12, marginTop: 4 },
  amount: { fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  descriptionClamp: { maxWidth: 280, color: BRANDING.colors.textMuted, lineHeight: 1.5 },
  typeBadge: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, border: "1px solid transparent" },
  packageBadge: { background: "#EEF4F1", color: BRANDING.colors.primaryStrong, borderColor: "#D2E3DB" },
  serviceBadge: { background: "#F8F1E8", color: "#8A6844", borderColor: "#E9DCC8" },
  actionButton: { padding: "10px 12px", borderRadius: 14 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formSection: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 24, padding: 18 },
  formSectionTitle: { gridColumn: "1 / -1", color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 17 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  toggleRow: { display: "inline-flex", alignItems: "center", gap: 8, color: BRANDING.colors.textMuted, fontSize: 13, fontWeight: 600, gridColumn: "1 / -1" },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 600 },
};
