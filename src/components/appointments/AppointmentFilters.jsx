export default function AppointmentFilters({
  selectedDate,
  onDateChange,
  selectedSpecialist,
  onSpecialistChange,
  selectedStatus,
  onStatusChange,
  specialists,
  specialistLocked = false,
}) {
  return (
    <div style={styles.filters}>
      <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} style={styles.input} />

      <select value={selectedSpecialist} onChange={(event) => onSpecialistChange(event.target.value)} disabled={specialistLocked} style={{ ...styles.input, ...(specialistLocked ? styles.inputDisabled : {}) }}>
        <option value="">Todas las especialistas</option>
        {specialists.map((specialist) => (
          <option key={specialist.id || specialist.full_name} value={specialist.id}>
            {specialist.full_name}
          </option>
        ))}
      </select>

      <select value={selectedStatus} onChange={(event) => onStatusChange(event.target.value)} style={styles.input}>
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="confirmada">Confirmada</option>
        <option value="completada">Completada</option>
        <option value="cancelada">Cancelada</option>
        <option value="no_asistio">No asistió</option>
      </select>
    </div>
  );
}

const styles = {
  filters: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  input: {
    minWidth: 220,
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 14,
    padding: "14px 15px",
    color: "#2A2522",
    fontSize: 14,
  },
  inputDisabled: {
    background: "#F1EFEA",
    color: "#7A716A",
  },
};
