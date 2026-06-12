import { LASER_SUBZONES, LASER_ZONES } from "../../services/laser";

export default function LaserParameterRow({ index, value, onChange, onRemove, canRemove }) {
  const availableSubzones = LASER_SUBZONES[value.zone] || [];

  function updateField(field, nextValue) {
    onChange({
      ...value,
      [field]: nextValue,
    });
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>Zona tratada #{index + 1}</div>
        {canRemove ? (
          <button type="button" onClick={onRemove} style={styles.removeButton}>Quitar</button>
        ) : null}
      </div>

      <div style={styles.grid}>
        <FieldSelect
          label="Zona *"
          value={value.zone}
          onChange={(nextValue) => updateField("zone", nextValue)}
          options={LASER_ZONES}
        />
        <FieldSelect
          label="Subzona"
          value={value.subzone}
          onChange={(nextValue) => updateField("subzone", nextValue)}
          options={availableSubzones}
          disabled={availableSubzones.length === 0}
        />
      </div>

      <div style={styles.gridFour}>
        <FieldInput label="Frecuencia Hz" value={value.frequency_hz} onChange={(nextValue) => updateField("frequency_hz", nextValue)} placeholder="Ej. 2.0" />
        <FieldInput label="Intensidad J" value={value.intensity_j} onChange={(nextValue) => updateField("intensity_j", nextValue)} placeholder="Ej. 18" />
        <FieldInput label="Ancho de pulso" value={value.pulse_width} onChange={(nextValue) => updateField("pulse_width", nextValue)} placeholder="Ej. 25 ms" />
        <FieldInput label="Número de pulsos" value={value.pulse_count} onChange={(nextValue) => updateField("pulse_count", nextValue)} placeholder="Ej. 120" />
      </div>

      <div>
        <label style={styles.fieldLabel}>Notas por zona</label>
        <textarea
          value={value.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Observaciones específicas de esta zona"
          style={{ ...styles.fieldInput, minHeight: 90, resize: "vertical" }}
        />
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.fieldInput}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label style={styles.fieldLabel}>{label}</label>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={styles.fieldInput}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #EFE2D7",
    borderRadius: 20,
    background: "#FCFAF7",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    color: "#2A2522",
    fontWeight: 700,
    fontSize: 15,
  },
  removeButton: {
    background: "#FFF4F5",
    border: "1px solid #F3D6DB",
    color: "#A24F5D",
    borderRadius: 12,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  gridFour: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
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
    background: "#FFFFFF",
    border: "1px solid #E7DACE",
    borderRadius: 14,
    padding: "14px 15px",
    color: "#2A2522",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  },
};
