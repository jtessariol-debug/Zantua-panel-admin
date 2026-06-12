import { useState } from "react";
import LaserParameterRow from "./LaserParameterRow";

function emptyParameter() {
  return {
    zone: "",
    subzone: "",
    frequency_hz: "",
    intensity_j: "",
    pulse_width: "",
    pulse_count: "",
    notes: "",
  };
}

function normalizeInitialValues(initialValues) {
  return {
    client_id: initialValues?.client_id || "",
    specialist_id: initialValues?.specialist_id || "",
    appointment_id: initialValues?.appointment_id || "",
    session_date: initialValues?.session_date || "",
    general_notes: initialValues?.general_notes || "",
    parameters: initialValues?.parameters?.length ? initialValues.parameters.map((parameter) => ({
      zone: parameter.zone || "",
      subzone: parameter.subzone || "",
      frequency_hz: parameter.frequency_hz || "",
      intensity_j: parameter.intensity_j || "",
      pulse_width: parameter.pulse_width || "",
      pulse_count: parameter.pulse_count || "",
      notes: parameter.notes || "",
    })) : [emptyParameter()],
  };
}

export default function LaserSessionForm({ lookups, initialValues, onSubmit, onCancel, submitLabel, loading, specialistLocked = false }) {
  const [form, setForm] = useState(() => normalizeInitialValues(initialValues));
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateParameter(index, nextValue) {
    setForm((current) => ({
      ...current,
      parameters: current.parameters.map((parameter, parameterIndex) => (
        parameterIndex === index ? nextValue : parameter
      )),
    }));
  }

  function addParameter() {
    setForm((current) => ({
      ...current,
      parameters: [...current.parameters, emptyParameter()],
    }));
  }

  function removeParameter(index) {
    setForm((current) => ({
      ...current,
      parameters: current.parameters.filter((_, parameterIndex) => parameterIndex !== index),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.client_id) {
      setError("Selecciona un paciente.");
      return;
    }

    if (!form.specialist_id) {
      setError("Selecciona una especialista.");
      return;
    }

    if (!form.session_date) {
      setError("Selecciona una fecha de sesión.");
      return;
    }

    const validParameters = form.parameters.filter((parameter) => parameter.zone);
    if (validParameters.length === 0) {
      setError("Debes registrar al menos una zona tratada.");
      return;
    }

    onSubmit({
      client_id: form.client_id,
      specialist_id: form.specialist_id,
      appointment_id: form.appointment_id || null,
      session_date: form.session_date,
      general_notes: form.general_notes.trim() || null,
      parameters: validParameters.map((parameter) => ({
        zone: parameter.zone,
        subzone: parameter.subzone || null,
        frequency_hz: parameter.frequency_hz || null,
        intensity_j: parameter.intensity_j || null,
        pulse_width: parameter.pulse_width || null,
        pulse_count: parameter.pulse_count || null,
        notes: parameter.notes.trim() || null,
      })),
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
        />
        <SelectField
          label="Especialista *"
          value={form.specialist_id}
          onChange={(value) => updateField("specialist_id", value)}
          options={lookups.specialists.map((specialist) => ({ value: specialist.id, label: specialist.full_name }))}
          disabled={specialistLocked}
        />
      </div>

      <div style={styles.gridTwo}>
        <Field
          label="Fecha de sesión *"
          type="date"
          value={form.session_date}
          onChange={(value) => updateField("session_date", value)}
        />
        <SelectField
          label="Cita relacionada"
          value={form.appointment_id}
          onChange={(value) => updateField("appointment_id", value)}
          options={lookups.appointments.map((appointment) => ({ value: appointment.id, label: appointment.label }))}
        />
      </div>

      <div>
        <label style={styles.fieldLabel}>Observaciones generales</label>
        <textarea
          value={form.general_notes}
          onChange={(event) => updateField("general_notes", event.target.value)}
          placeholder="Observaciones clínicas generales de la sesión"
          style={{ ...styles.fieldInput, minHeight: 110, resize: "vertical" }}
        />
      </div>

      <div style={styles.parametersHeader}>
        <div>
          <div style={styles.sectionTitle}>Parámetros por zona</div>
          <div style={styles.sectionSubtitle}>Agrega una o varias zonas tratadas en esta sesión.</div>
        </div>
        <button type="button" onClick={addParameter} style={styles.addButton}>+ Agregar zona</button>
      </div>

      <div style={styles.parametersList}>
        {form.parameters.map((parameter, index) => (
          <LaserParameterRow
            key={`${parameter.zone}-${index}`}
            index={index}
            value={parameter}
            onChange={(nextValue) => updateParameter(index, nextValue)}
            onRemove={() => removeParameter(index)}
            canRemove={form.parameters.length > 1}
          />
        ))}
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
      <label style={styles.fieldLabel}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        style={styles.fieldInput}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} style={{ ...styles.fieldInput, ...(disabled ? styles.fieldInputDisabled : {}) }}>
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
  fieldInputDisabled: {
    background: "#F1EFEA",
    color: "#7A716A",
  },
  parametersHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 8,
  },
  sectionTitle: {
    color: "#2A2522",
    fontWeight: 700,
    fontSize: 18,
  },
  sectionSubtitle: {
    color: "#8B7E74",
    fontSize: 13,
    marginTop: 4,
  },
  addButton: {
    background: "#F7ECE6",
    color: "#A15A58",
    border: "1px solid #EBCFC6",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  parametersList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  errorBanner: {
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
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
