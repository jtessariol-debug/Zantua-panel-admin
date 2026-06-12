import { useMemo, useState } from "react";

const INITIAL_FORM = {
  full_name: "",
  phone: "",
  email: "",
  national_id: "",
  birth_date: "",
  address: "",
  notes: "",
};

function normalizeInitialValues(initialValues) {
  return {
    ...INITIAL_FORM,
    ...(initialValues || {}),
  };
}

function isValidEmail(email) {
  if (!email) return true;
  return /\S+@\S+\.\S+/.test(String(email).trim());
}

export default function PatientForm({ initialValues, onSubmit, onCancel, submitLabel, loading }) {
  const [form, setForm] = useState(() => normalizeInitialValues(initialValues));
  const [errors, setErrors] = useState({});

  const formTitle = useMemo(() => (
    initialValues?.id ? "Editando datos del paciente." : "Completa la información básica del paciente."
  ), [initialValues?.id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = "El nombre completo es obligatorio.";
    }

    if (form.email && !isValidEmail(form.email)) {
      nextErrors.email = "Escribe un correo electrónico válido.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      national_id: form.national_id.trim() || null,
      birth_date: form.birth_date || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <p style={styles.description}>{formTitle}</p>

      <Field
        label="Nombre completo *"
        value={form.full_name}
        onChange={(value) => updateField("full_name", value)}
        placeholder="Ana García"
        error={errors.full_name}
      />

      <div style={styles.gridTwo}>
        <Field
          label="Teléfono"
          value={form.phone}
          onChange={(value) => updateField("phone", value)}
          placeholder="+1 809 000 0000"
        />
        <Field
          label="Correo electrónico"
          value={form.email}
          onChange={(value) => updateField("email", value)}
          placeholder="ana@email.com"
          type="email"
          error={errors.email}
        />
      </div>

      <div style={styles.gridTwo}>
        <Field
          label="Cédula"
          value={form.national_id}
          onChange={(value) => updateField("national_id", value)}
          placeholder="001-0000000-0"
        />
        <Field
          label="Fecha de nacimiento"
          value={form.birth_date}
          onChange={(value) => updateField("birth_date", value)}
          type="date"
        />
      </div>

      <Field
        label="Dirección"
        value={form.address}
        onChange={(value) => updateField("address", value)}
        placeholder="Dirección del paciente"
      />

      <div>
        <label style={styles.fieldLabel}>Notas generales</label>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Observaciones generales del paciente"
          style={{ ...styles.fieldInput, minHeight: 110, resize: "vertical" }}
        />
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

function Field({ label, value, onChange, placeholder, type = "text", error }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          ...styles.fieldInput,
          ...(error ? styles.fieldInputError : {}),
        }}
      />
      {error ? <div style={styles.errorText}>{error}</div> : null}
    </div>
  );
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  description: {
    color: "#8B7E74",
    fontSize: 14,
    lineHeight: 1.5,
    margin: "-8px 0 0",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  errorText: {
    color: "#B14F60",
    fontSize: 12,
    marginTop: 6,
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
