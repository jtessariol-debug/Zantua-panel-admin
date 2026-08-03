import { BRANDING } from "../../lib/branding";

function FilterField({ label, children, grow = false }) {
  return (
    <div style={{ ...styles.fieldWrap, ...(grow ? styles.fieldWrapGrow : {}) }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

export default function AppointmentFilters({
  selectedDate,
  onDateChange,
  selectedSpecialist,
  onSpecialistChange,
  selectedCabin,
  onCabinChange,
  selectedStatus,
  onStatusChange,
  specialists,
  cabins,
  specialistLocked = false,
}) {
  return (
    <div style={styles.filters}>
      <FilterField label="Fecha">
        <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} style={styles.input} />
      </FilterField>

      <FilterField label="Especialista">
        <select
          value={selectedSpecialist}
          onChange={(event) => onSpecialistChange(event.target.value)}
          disabled={specialistLocked}
          style={{ ...styles.input, ...(specialistLocked ? styles.inputDisabled : {}) }}
        >
          <option value="">Todas las especialistas</option>
          {specialists.map((specialist) => (
            <option key={specialist.id || specialist.full_name} value={specialist.id}>
              {specialist.full_name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Cabina">
        <select value={selectedCabin} onChange={(event) => onCabinChange(event.target.value)} style={styles.input}>
          <option value="">Todas las cabinas</option>
          {cabins.map((cabin) => (
            <option key={cabin.id || cabin.name} value={cabin.id}>
              {cabin.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Estado">
        <select value={selectedStatus} onChange={(event) => onStatusChange(event.target.value)} style={styles.input}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
          <option value="no_asistio">No asistió</option>
        </select>
      </FilterField>
    </div>
  );
}

const styles = {
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  fieldWrapGrow: {
    gridColumn: "span 2",
  },
  label: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  input: {
    minWidth: 0,
    width: "100%",
    background: "#FFFDF8",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "13px 14px",
    color: BRANDING.colors.text,
    fontSize: 14,
    boxSizing: "border-box",
    boxShadow: "0 10px 22px rgba(18, 56, 47, 0.03)",
  },
  inputDisabled: {
    background: "#F1EFEA",
    color: "#7A716A",
  },
};
