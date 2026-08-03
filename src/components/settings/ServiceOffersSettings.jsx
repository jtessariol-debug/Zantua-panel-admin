import { useMemo, useState } from "react";
import PatientModal from "../patients/PatientModal";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";

const INITIAL_FORM = {
  service_id: "",
  title: "",
  regular_price: "",
  offer_price: "",
  start_date: "",
  end_date: "",
  description: "",
  active: true,
};

function formatCurrency(value) {
  return `RD$ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getOfferStatus(offer) {
  const today = new Date();
  const start = offer.start_date ? new Date(`${offer.start_date}T00:00:00`) : null;
  const end = offer.end_date ? new Date(`${offer.end_date}T23:59:59`) : null;

  if (offer.active === false) return "cancelada";
  if (start && today < start) return "pendiente";
  if (end && today > end) return "cancelada";
  return "confirmada";
}

export default function ServiceOffersSettings({
  offers,
  services,
  onCreate,
  onSave,
  saving,
  isAdmin = false,
}) {
  const [modal, setModal] = useState(null);
  const [localError, setLocalError] = useState("");

  const serviceMap = useMemo(
    () => new Map((services || []).map((service) => [service.id, service])),
    [services]
  );

  const sortedOffers = useMemo(() => {
    return [...(offers || [])].sort((a, b) => {
      const aDate = new Date(a.start_date || a.created_at || 0).getTime();
      const bDate = new Date(b.start_date || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [offers]);

  function ensureAdmin() {
    if (isAdmin) return true;
    setLocalError("No tienes permisos para modificar ofertas.");
    return false;
  }

  function handleOpenCreate() {
    if (!ensureAdmin()) return;
    setLocalError("");
    setModal({ mode: "create" });
  }

  function handleOpenEdit(offer) {
    if (!ensureAdmin()) return;
    setLocalError("");
    setModal({ mode: "edit", offer });
  }

  return (
    <SectionCard
      title="Ofertas"
      subtitle="Controla promociones vigentes sin alterar el precio base del servicio."
      action={isAdmin ? (
        <ActionButton type="button" onClick={handleOpenCreate}>
          + Nueva oferta
        </ActionButton>
      ) : null}
    >
      {localError ? <div style={styles.errorBanner}>{localError}</div> : null}

      {!sortedOffers.length ? (
        <EmptyState
          title="No hay ofertas registradas."
          description="Puedes crear promociones activas para usarlas como precio sugerido en facturación."
          action={isAdmin ? (
            <ActionButton type="button" onClick={handleOpenCreate}>
              Crear primera oferta
            </ActionButton>
          ) : null}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Oferta</th>
                <th style={styles.head}>Servicio</th>
                <th style={styles.head}>Precio regular</th>
                <th style={styles.head}>Precio oferta</th>
                <th style={styles.head}>Vigencia</th>
                <th style={styles.head}>Estado</th>
                {isAdmin ? <th style={styles.head}>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedOffers.map((offer) => {
                const service = serviceMap.get(offer.service_id);

                return (
                  <tr key={offer.id} style={styles.row}>
                    <td style={styles.cell}>
                      <div style={styles.primaryText}>{offer.title || "Oferta sin título"}</div>
                      <div style={styles.secondaryText}>{offer.description || "Sin descripción adicional."}</div>
                    </td>
                    <td style={styles.cell}>
                      <div style={styles.primaryText}>{service?.name || "Servicio no disponible"}</div>
                      <div style={styles.secondaryText}>
                        {service?.service_type === "paquete" ? "Paquete" : "Servicio"}
                      </div>
                    </td>
                    <td style={styles.cell}><span style={styles.amount}>{formatCurrency(offer.regular_price)}</span></td>
                    <td style={styles.cell}><span style={styles.amountStrong}>{formatCurrency(offer.offer_price)}</span></td>
                    <td style={styles.cell}>
                      <div>{formatDate(offer.start_date)}</div>
                      <div style={styles.secondaryText}>hasta {formatDate(offer.end_date)}</div>
                    </td>
                    <td style={styles.cell}>
                      <StatusBadge status={getOfferStatus(offer)} />
                    </td>
                    {isAdmin ? (
                      <td style={styles.cell}>
                        <ActionButton type="button" variant="secondary" onClick={() => handleOpenEdit(offer)} style={styles.actionButton}>
                          Editar
                        </ActionButton>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <PatientModal
          title={modal.mode === "edit" ? "Editar oferta" : "Nueva oferta"}
          subtitle="Define servicio, vigencia y precio promocional sin tocar el precio base."
          onClose={() => setModal(null)}
        >
          <ServiceOfferForm
            services={services}
            initialValues={modal.offer}
            loading={saving}
            onCancel={() => setModal(null)}
            onSubmit={async (payload) => {
              if (modal.mode === "edit") {
                await onSave(modal.offer.id, payload);
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

function ServiceOfferForm({ services, initialValues, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    ...initialValues,
    regular_price: initialValues?.regular_price ?? "",
    offer_price: initialValues?.offer_price ?? "",
    active: initialValues?.active !== false,
  });
  const [error, setError] = useState("");

  const activeServices = useMemo(
    () => (services || []).filter((service) => service.active !== false),
    [services]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleServiceChange(serviceId) {
    const selected = activeServices.find((service) => service.id === serviceId);
    setForm((current) => ({
      ...current,
      service_id: serviceId,
      regular_price: current.regular_price || selected?.price || "",
      title: current.title || (selected ? `Oferta ${selected.name}` : ""),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.service_id) {
      setError("Selecciona un servicio o paquete.");
      return;
    }

    if (!form.title.trim()) {
      setError("El título de la oferta es obligatorio.");
      return;
    }

    if (!form.start_date || !form.end_date) {
      setError("Debes indicar la vigencia de la oferta.");
      return;
    }

    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError("La fecha final no puede ser anterior a la inicial.");
      return;
    }

    if (Number(form.offer_price || 0) <= 0) {
      setError("El precio de oferta debe ser mayor a cero.");
      return;
    }

    setError("");
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      regular_price: Number(form.regular_price || 0),
      offer_price: Number(form.offer_price || 0),
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Configuración de oferta</div>
        <Field label="Servicio o paquete *">
          <select value={form.service_id} onChange={(event) => handleServiceChange(event.target.value)} style={styles.input}>
            <option value="">Seleccionar</option>
            {activeServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.service_type === "paquete" ? "Paquete" : "Servicio"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título *">
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} style={styles.input} />
        </Field>
        <Field label="Precio regular">
          <input type="number" min="0" step="0.01" value={form.regular_price} onChange={(event) => updateField("regular_price", event.target.value)} style={styles.input} />
        </Field>
        <Field label="Precio oferta *">
          <input type="number" min="0" step="0.01" value={form.offer_price} onChange={(event) => updateField("offer_price", event.target.value)} style={styles.input} />
        </Field>
        <Field label="Vigencia desde *">
          <input type="date" value={form.start_date} onChange={(event) => updateField("start_date", event.target.value)} style={styles.input} />
        </Field>
        <Field label="Vigencia hasta *">
          <input type="date" value={form.end_date} onChange={(event) => updateField("end_date", event.target.value)} style={styles.input} />
        </Field>
        <Field label="Descripción" full>
          <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} style={{ ...styles.input, minHeight: 110, resize: "vertical" }} />
        </Field>
        <label style={styles.toggleRow}>
          <input type="checkbox" checked={form.active} onChange={(event) => updateField("active", event.target.checked)} />
          Oferta activa
        </label>
      </div>

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>Cancelar</ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar oferta"}
        </ActionButton>
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
  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 12px 16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "top" },
  primaryText: { fontWeight: 700, color: BRANDING.colors.primaryStrong },
  secondaryText: { color: BRANDING.colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 1.5 },
  amount: { fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  amountStrong: { fontWeight: 800, color: BRANDING.colors.primaryStrong, fontVariantNumeric: "tabular-nums" },
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
