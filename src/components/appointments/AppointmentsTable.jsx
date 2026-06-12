import StatusBadge from "../ui/StatusBadge";

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_asistio", label: "No asistió" },
];

export default function AppointmentsTable({ appointments, emptyState, onView, onEdit, onStatusChange }) {
  if (!appointments.length) {
    return emptyState;
  }

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.head}>Hora</th>
            <th style={styles.head}>Paciente</th>
            <th style={styles.head}>Especialista</th>
            <th style={styles.head}>Servicio</th>
            <th style={styles.head}>Cabina</th>
            <th style={styles.head}>Estado</th>
            <th style={styles.head}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id} style={styles.row}>
              <td style={styles.cell}>{appointment.displayTime}</td>
              <td style={styles.cell}>{appointment.patientLabel}</td>
              <td style={styles.cell}>{appointment.specialistLabel}</td>
              <td style={styles.cell}>{appointment.serviceLabel}</td>
              <td style={styles.cell}>{appointment.cabinLabel}</td>
              <td style={styles.cell}><StatusBadge status={appointment.statusLabel} /></td>
              <td style={styles.cell}>
                <div style={styles.actions}>
                  <button type="button" onClick={() => onView(appointment)} style={styles.actionButton}>Ver</button>
                  <button type="button" onClick={() => onEdit(appointment)} style={styles.actionButtonPrimary}>Editar</button>
                  <select
                    value={appointment.statusLabel}
                    onChange={(event) => onStatusChange(appointment, event.target.value)}
                    style={styles.statusSelect}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  head: {
    textAlign: "left",
    color: "#8A7B72",
    fontSize: 12,
    textTransform: "uppercase",
    padding: "0 0 14px",
    borderBottom: "1px solid #F0E8E1",
    fontWeight: 700,
  },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: "#2A2522", fontSize: 14, verticalAlign: "middle" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  actionButton: {
    background: "#fff",
    color: "#6E564A",
    border: "1px solid #E6D8CC",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionButtonPrimary: {
    background: "#F7ECE6",
    color: "#A15A58",
    border: "1px solid #EBCFC6",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  statusSelect: {
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 12,
    padding: "8px 10px",
    color: "#2A2522",
    fontSize: 12,
  },
};
