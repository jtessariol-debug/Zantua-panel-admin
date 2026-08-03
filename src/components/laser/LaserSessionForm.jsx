import { useEffect, useMemo, useState } from "react";
import LaserParameterRow from "./LaserParameterRow";
import ActionButton from "../ui/ActionButton";
import { BRANDING } from "../../lib/branding";
import { fetchClientPackagesByClient } from "../../services/clientPackages";

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
    client_package_id: initialValues?.client_package_id || "",
    session_date: initialValues?.session_date || "",
    general_notes: initialValues?.general_notes || "",
    parameters: initialValues?.parameters?.length
      ? initialValues.parameters.map((parameter) => ({
        zone: parameter.zone || "",
        subzone: parameter.subzone || "",
        frequency_hz: parameter.frequency_hz || "",
        intensity_j: parameter.intensity_j || "",
        pulse_width: parameter.pulse_width || "",
        pulse_count: parameter.pulse_count || "",
        notes: parameter.notes || "",
      }))
      : [emptyParameter()],
  };
}

export default function LaserSessionForm({
  lookups,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  specialistLocked = false,
}) {
  const [form, setForm] = useState(() => normalizeInitialValues(initialValues));
  const [error, setError] = useState("");
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPackages() {
      if (!form.client_id) {
        setPackages([]);
        return;
      }

      setPackagesLoading(true);
      try {
        const rows = await fetchClientPackagesByClient(form.client_id);
        if (!active) return;
        setPackages(rows);
      } catch (loadError) {
        console.error("Error loading packages for laser form", loadError);
        if (!active) return;
        setPackages([]);
      } finally {
        if (active) {
          setPackagesLoading(false);
        }
      }
    }

    loadPackages();

    return () => {
      active = false;
    };
  }, [form.client_id]);

  const availablePackages = useMemo(() => {
    return packages.filter((item) => item.status === "activo" || item.id === form.client_package_id);
  }, [packages, form.client_package_id]);

  const selectedPackage = useMemo(() => {
    return packages.find((item) => item.id === form.client_package_id) || null;
  }, [packages, form.client_package_id]);

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
      client_package_id: form.client_package_id || null,
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
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Contexto clínico</div>
        <div style={styles.sectionSubtitle}>
          Selecciona paciente, especialista, cita relacionada y paquete activo antes de registrar parámetros.
        </div>
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

        <div style={styles.gridTwo}>
          <SelectField
            label="Usar paquete activo"
            value={form.client_package_id}
            onChange={(value) => updateField("client_package_id", value)}
            options={availablePackages.map((pkg) => ({
              value: pkg.id,
              label: `${pkg.serviceLabel} · ${pkg.remaining_sessions} restantes`,
            }))}
            disabled={!form.client_id || packagesLoading}
            placeholder={packagesLoading ? "Cargando paquetes..." : "Sesión suelta"}
          />
          <ReadOnlyField
            label="Sesiones restantes"
            value={selectedPackage ? String(selectedPackage.remaining_sessions) : "Sesión sin paquete"}
          />
        </div>
      </div>

      {selectedPackage ? (
        <div style={styles.infoBanner}>
          {selectedPackage.progressLabel}. {selectedPackage.remainingLabel}.
        </div>
      ) : null}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Observaciones generales</div>
        <div style={styles.sectionSubtitle}>
          Registra contexto clínico general, respuestas del paciente o recomendaciones posteriores.
        </div>
        <textarea
          value={form.general_notes}
          onChange={(event) => updateField("general_notes", event.target.value)}
          placeholder="Observaciones clínicas generales de la sesión"
          style={{ ...styles.fieldInput, minHeight: 120, resize: "vertical" }}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.parametersHeader}>
          <div>
            <div style={styles.sectionTitle}>Parámetros por zona</div>
            <div style={styles.sectionSubtitle}>
              Agrupa frecuencia, intensidad, ancho de pulso, número de pulsos y notas por cada zona tratada.
            </div>
          </div>
          <ActionButton type="button" variant="secondary" onClick={addParameter}>
            + Agregar zona
          </ActionButton>
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
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Guardando..." : submitLabel}
        </ActionButton>
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

function SelectField({ label, value, onChange, options, disabled = false, placeholder = "Seleccionar" }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{ ...styles.fieldInput, ...(disabled ? styles.fieldInputDisabled : {}) }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <div style={styles.readOnlyField}>{value}</div>
    </div>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "#FCFAF6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    padding: 18,
  },
  sectionTitle: {
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    fontSize: 18,
  },
  sectionSubtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 4,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  fieldLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
  },
  fieldInput: {
    width: "100%",
    background: BRANDING.colors.card,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "14px 15px",
    color: BRANDING.colors.text,
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  },
  readOnlyField: {
    width: "100%",
    background: "#F3EEE7",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "14px 15px",
    color: BRANDING.colors.textMuted,
    fontSize: 15,
    boxSizing: "border-box",
    minHeight: 52,
    display: "flex",
    alignItems: "center",
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
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
  },
  infoBanner: {
    background: "#EEF5F1",
    border: "1px solid #D8E7DF",
    color: BRANDING.colors.primaryStrong,
    borderRadius: 18,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 4,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
};
