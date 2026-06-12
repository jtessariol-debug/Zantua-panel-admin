import { useEffect, useMemo, useState } from "react";
import { addMinutes, getDefaultDurationMinutes } from "../../services/appointments";
import TimeSelect from "./TimeSelect";

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
  return {
    ...INITIAL_FORM,
    ...(initialValues || {}),
  };
}

export default function AppointmentForm({ initialValues, lookups, onSubmit, onCancel, submitLabel, loading, specialistLocked = false }) {
  const [form, setForm] = useState(() => normalizeInitialValues(initialValues));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (form.start_time) {
      setForm((current) => ({
        ...current,
        end_time: addMinutes(current.start_time, getDefaultDurationMinutes()),
      }));
    }
  }, [form.start_time]);

  const selectedSpecialist = useMemo(() => {
    return lookups.specialists.find((specialist) => specialist.id === form.specialist_id) || null;
  }, [form.specialist_id, lookups.specialists]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.client_id) nextErrors.client_id = "Selecciona un paciente.";
    if (!form.specialist_id) nextErrors.specialist_id = "Selecciona una especialista.";
    if (!form.service_id) nextErrors.service_id = "Selecciona un servicio.";
    if (!form.cabin_id) nextErrors.cabin_id = "Selecciona una cabina.";
    if (!form.appointment_date) nextErrors.appointment_date = "Selecciona una fecha.";
    if (!form.start_time) nextErrors.start_time = "Selecciona una hora de inicio.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      client_id: form.client_id,
      specialist_id: form.specialist_id,
      service_id: form.service_id,
      cabin_id: form.cabin_id,
      appointment_date: form.appointment_date,
      start_time: form.start_time,
      end_time: form.end_time || addMinutes(form.start_time, getDefaultDurationMinutes()),
      status: form.status || "pendiente",
      notes: form.notes.trim() || null,
      specialist: selectedSpecialist,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.gridTwo}>
        <SelectField
          label="Paciente *"
          value={form.client_id}
          onChange={(value) => updateField("client_id", value)}
          options={lookups.clients.map((client) => ({ value: client.id, label: client.full_name }))}
          error={errors.client_id}
        />
        <SelectField
          label="Especialista *"
          value={form.specialist_id}
          onChange={(value) => updateField("specialist_id", value)}
          options={lookups.specialists.map((specialist) => ({ value: specialist.id, label: specialist.full_name }))}
          error={errors.specialist_id}
          disabled={specialistLocked}
        />
      </div>

      <div style={styles.gridTwo}>
        <SelectField
          label="Servicio *"
          value={form.service_id}
          onChange={(value) => updateField("service_id", value)}
          options={lookups.services.map((service) => ({ value: service.id, label: service.name }))}
          error={errors.service_id}
        />
        <SelectField
          label="Cabina *"
          value={form.cabin_id}
          onChange={(value) => updateField("cabin_id", value)}
          options={lookups.cabins.map((cabin) => ({ value: cabin.id, label: cabin.name }))}
          error={errors.cabin_id}
        />
      </div>

      <div style={styles.gridThree}>
        <DateField
          label="Fecha *"
          value={form.appointment_date}
          onChange={(value) => updateField("appointment_date", value)}
          error={errors.appointment_date}
        />
        <TimeField
          label="Hora de inicio *"
          value={form.start_time}
          onChange={(value) => updateField("start_time", value)}
          error={errors.start_time}
        />
        <ReadOnlyField label="Hora de fin" value={form.end_time || "Se calcula automáticamente"} />
      </div>

      <div style={styles.gridTwo}>
        <SelectField
          label="Estado"
          value={form.status}
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

      <div>
        <label style={styles.fieldLabel}>Notas</label>
        <textarea
          value={form.notes}
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

function SelectField({ label, value, onChange, options, error, disabled = false }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} style={{ ...styles.fieldInput, ...(error ? styles.fieldInputError : {}), ...(disabled ? styles.fieldInputDisabled : {}) }}>
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <div style={styles.errorText}>{error}</div> : null}
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
  infoBox: {
    background: "#FCF4EA",
    border: "1px solid #F0DFC8",
    color: "#7A5A3B",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 4,
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "linear-gradient(135deg, #C38A63, #A85A66)",
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
