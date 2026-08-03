import { useEffect, useMemo, useState } from "react";
import { addMinutes, getDefaultDurationMinutes } from "../../services/appointments";
import TimeSelect from "./TimeSelect";
import { BRANDING } from "../../lib/branding";

const INITIAL_FORM = {
  client_id: "",
  specialist_id: "",
  service_id: "",
  cabin_id: "",
  appointment_date: "",
  start_time: "",
  end_time: "",
  status: "pendiente",
  notes: "",
};

function normalizeInitialValues(initialValues) {
  const nextValues = {
    ...INITIAL_FORM,
    ...(initialValues || {}),
  };

  return {
    ...nextValues,
    client_id: nextValues.client_id || "",
    specialist_id: nextValues.specialist_id || "",
    service_id: nextValues.service_id || "",
    cabin_id: nextValues.cabin_id || "",
    appointment_date: nextValues.appointment_date || "",
    start_time: nextValues.start_time || "",
    end_time: nextValues.end_time || "",
    status: nextValues.status || "pendiente",
    notes: nextValues.notes || "",
  };
}

export default function AppointmentForm({
  initialValues,
  lookups,
  services = [],
  cabins = [],
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  specialistLocked = false,
}) {
  const [formData, setFormData] = useState(() => normalizeInitialValues(initialValues));
  const [errors, setErrors] = useState({});

  const selectedSpecialist = useMemo(() => {
    return lookups.specialists.find((specialist) => String(specialist.id) === String(formData.specialist_id)) || null;
  }, [formData.specialist_id, lookups.specialists]);

  const selectedService = useMemo(() => {
    return services.find((service) => String(service.id) === String(formData.service_id)) || null;
  }, [formData.service_id, services]);

  useEffect(() => {
    if (formData.start_time) {
      const duration = Number(selectedService?.duration_minutes || getDefaultDurationMinutes());
      setFormData((current) => ({
        ...current,
        end_time: addMinutes(current.start_time, duration),
      }));
    }
  }, [formData.start_time, selectedService]);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleServiceChange(event) {
    const value = event.target.value;
    const nextService = services.find((service) => String(service.id) === String(value)) || null;

    setFormData((current) => {
      const duration = Number(nextService?.duration_minutes || getDefaultDurationMinutes());
      return {
        ...current,
        service_id: value,
        end_time: current.start_time ? addMinutes(current.start_time, duration) : current.end_time,
      };
    });
  }

  function handleCabinChange(event) {
    const value = event.target.value;
    setFormData((current) => ({
      ...current,
      cabin_id: value,
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!formData.client_id) nextErrors.client_id = "Selecciona un paciente.";
    if (!formData.specialist_id) nextErrors.specialist_id = "Selecciona una especialista.";
    if (!formData.service_id) nextErrors.service_id = "Selecciona un servicio.";
    if (!formData.cabin_id) nextErrors.cabin_id = "Selecciona una cabina.";
    if (!formData.appointment_date) nextErrors.appointment_date = "Selecciona una fecha.";
    if (!formData.start_time) nextErrors.start_time = "Selecciona una hora de inicio.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      client_id: formData.client_id,
      specialist_id: formData.specialist_id,
      service_id: formData.service_id,
      cabin_id: formData.cabin_id,
      appointment_date: formData.appointment_date,
      start_time: formData.start_time,
      end_time: formData.end_time || addMinutes(formData.start_time, getDefaultDurationMinutes()),
      status: formData.status || "pendiente",
      notes: formData.notes.trim() || null,
      specialist: selectedSpecialist,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.gridTwo}>
        <SelectField
          label="Paciente *"
          value={formData.client_id || ""}
          onChange={(value) => updateField("client_id", value)}
          options={lookups.clients.map((client) => ({ value: client.id, label: client.full_name }))}
          error={errors.client_id}
        />
        <SelectField
          label="Especialista *"
          value={formData.specialist_id || ""}
          onChange={(value) => updateField("specialist_id", value)}
          options={lookups.specialists.map((specialist) => ({ value: specialist.id, label: specialist.full_name }))}
          error={errors.specialist_id}
          disabled={specialistLocked}
        />
      </div>

      <div style={styles.gridTwo}>
        <div>
          <label style={styles.fieldLabel}>Servicio *</label>
          <select
            value={formData.service_id || ""}
            onChange={handleServiceChange}
            disabled={services.length === 0}
            style={{
              ...styles.fieldInput,
              ...(errors.service_id ? styles.fieldInputError : {}),
              ...(services.length === 0 ? styles.fieldInputDisabled : {}),
            }}
          >
            <option value="">Seleccionar</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {formatServiceLabel(service)}
              </option>
            ))}
          </select>
          {errors.service_id ? <div style={styles.errorText}>{errors.service_id}</div> : null}
          {!errors.service_id && services.length === 0 ? (
            <div style={styles.emptyText}>No hay servicios activos configurados.</div>
          ) : null}
        </div>

        <div>
          <label style={styles.fieldLabel}>Cabina *</label>
          <select
            value={formData.cabin_id || ""}
            onChange={handleCabinChange}
            disabled={cabins.length === 0}
            style={{
              ...styles.fieldInput,
              ...(errors.cabin_id ? styles.fieldInputError : {}),
              ...(cabins.length === 0 ? styles.fieldInputDisabled : {}),
            }}
          >
            <option value="">Seleccionar</option>
            {cabins.map((cabin) => (
              <option key={cabin.id} value={cabin.id}>
                {cabin.name}
              </option>
            ))}
          </select>
          {errors.cabin_id ? <div style={styles.errorText}>{errors.cabin_id}</div> : null}
          {!errors.cabin_id && cabins.length === 0 ? (
            <div style={styles.emptyText}>No hay cabinas activas configuradas.</div>
          ) : null}
        </div>
      </div>

      <div style={styles.gridThree}>
        <DateField
          label="Fecha *"
          value={formData.appointment_date}
          onChange={(value) => updateField("appointment_date", value)}
          error={errors.appointment_date}
        />
        <TimeField
          label="Hora de inicio *"
          value={formData.start_time}
          onChange={(value) => updateField("start_time", value)}
          error={errors.start_time}
        />
        <ReadOnlyField label="Hora de fin" value={formData.end_time || "Se calcula automáticamente"} />
      </div>

      <div style={styles.gridTwo}>
        <SelectField
          label="Estado"
          value={formData.status || ""}
          onChange={(value) => updateField("status", value)}
          options={[
            { value: "pendiente", label: "Pendiente" },
            { value: "confirmada", label: "Confirmada" },
            { value: "completada", label: "Completada" },
            { value: "cancelada", label: "Cancelada" },
            { value: "no_asistio", label: "No asistió" },
          ]}
        />
      </div>

      {selectedService ? (
        <div style={styles.serviceInfoCard}>
          <div style={styles.serviceInfoHeader}>
            <span style={{
              ...styles.serviceTypeBadge,
              ...(selectedService.service_type === "paquete" ? styles.packageBadge : styles.standardBadge),
            }}
            >
              {selectedService.service_type === "paquete" ? "Paquete" : "Servicio"}
            </span>
            <span style={styles.servicePrice}>
              RD$ {Number(selectedService.price || 0).toFixed(2)}
            </span>
          </div>
          <div style={styles.serviceInfoText}>
            {selectedService.service_type === "paquete" && selectedService.sessions_count
              ? `${selectedService.sessions_count} sesiones incluidas. `
              : ""}
            {selectedService.payment_flexibility || "Pago único"}
          </div>
          {selectedService.active_offer ? (
            <div style={styles.offerInfo}>
              Oferta activa: RD$ {Number(selectedService.active_offer.offer_price || 0).toFixed(2)}
              {" · "}
              vigente hasta {selectedService.active_offer.end_date || "fecha abierta"}
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <label style={styles.fieldLabel}>Notas</label>
        <textarea
          value={formData.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Observaciones de la cita"
          style={{ ...styles.fieldInput, minHeight: 110, resize: "vertical" }}
        />
      </div>

      <div style={styles.infoBox}>
        Duración estándar: {getDefaultDurationMinutes()} minutos. Horario general del centro: 7:00 AM a 7:00 PM.
      </div>

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>
          {loading ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function formatServiceLabel(service) {
  const priceLabel = service.price != null ? `RD$ ${Number(service.price).toFixed(2)}` : "Sin precio";
  const sessionsLabel = service.service_type === "paquete" && service.sessions_count
    ? ` — ${service.sessions_count} sesiones`
    : "";

  return `${service.name} — ${priceLabel}${sessionsLabel}`;
}

function SelectField({ label, value, onChange, options, error, disabled = false, emptyMessage = "" }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || options.length === 0}
        style={{
          ...styles.fieldInput,
          ...(error ? styles.fieldInputError : {}),
          ...((disabled || options.length === 0) ? styles.fieldInputDisabled : {}),
        }}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <div style={styles.errorText}>{error}</div> : null}
      {!error && !options.length && emptyMessage ? <div style={styles.emptyText}>{emptyMessage}</div> : null}
    </div>
  );
}

function DateField({ label, value, onChange, error }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} style={{ ...styles.fieldInput, ...(error ? styles.fieldInputError : {}) }} />
      {error ? <div style={styles.errorText}>{error}</div> : null}
    </div>
  );
}

function TimeField({ label, value, onChange, error }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <TimeSelect value={value} onChange={onChange} />
      {error ? <div style={styles.errorText}>{error}</div> : null}
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <div style={{ ...styles.fieldInput, display: "flex", alignItems: "center", minHeight: 49, color: "#6C615B" }}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  gridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  },
  fieldLabel: {
    color: "#7E726B",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
  },
  fieldInput: {
    width: "100%",
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 14,
    padding: "14px 15px",
    color: "#2A2522",
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  },
  fieldInputError: {
    borderColor: "#D58C9A",
    background: "#FFF8F9",
  },
  fieldInputDisabled: {
    background: "#F1EFEA",
    color: "#7A716A",
  },
  errorText: {
    color: "#B14F60",
    fontSize: 12,
    marginTop: 6,
  },
  emptyText: {
    color: "#8B7E74",
    fontSize: 12,
    marginTop: 6,
  },
  infoBox: {
    background: "#FCF4EA",
    border: "1px solid #F0DFC8",
    color: "#7A5A3B",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.5,
  },
  serviceInfoCard: {
    background: "#FFFCF8",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  serviceInfoHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  serviceTypeBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
  },
  packageBadge: {
    background: "#EEF4F1",
    color: BRANDING.colors.primaryStrong,
    borderColor: "#D2E3DB",
  },
  standardBadge: {
    background: "#F8F1E8",
    color: "#8A6844",
    borderColor: "#E9DCC8",
  },
  servicePrice: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 14,
    fontWeight: 700,
  },
  serviceInfoText: {
    color: "#6C615B",
    fontSize: 13,
    lineHeight: 1.5,
  },
  offerInfo: {
    color: BRANDING.colors.secondary,
    fontSize: 12,
    fontWeight: 700,
    background: "#EEF6F2",
    border: "1px solid #D4E4DD",
    borderRadius: 12,
    padding: "10px 12px",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 4,
    flexWrap: "wrap",
  },
  primaryButton: {
    background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`,
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#fff",
    color: "#6E564A",
    border: "1px solid #E6D8CC",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};

