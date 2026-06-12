export default function LaserSessionsTable({ sessions, emptyState, onView, onEdit }) {
  if (!sessions.length) {
    return emptyState;
  }

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.head}>Fecha</th>
            <th style={styles.head}>Paciente</th>
            <th style={styles.head}>Especialista</th>
            <th style={styles.head}>Zonas tratadas</th>
            <th style={styles.head}>Observaciones</th>
            <th style={styles.head}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} style={styles.row}>
              <td style={styles.cell}>{formatDate(session.session_date)}</td>
              <td style={styles.cell}>{session.clientLabel}</td>
              <td style={styles.cell}>{session.specialistLabel}</td>
              <td style={styles.cell}>{session.zonesSummary || "Sin zonas registradas"}</td>
              <td style={styles.cell}>{session.general_notes || "Sin observaciones"}</td>
              <td style={styles.cell}>
                <div style={styles.actions}>
                  <button type="button" onClick={() => onView(session)} style={styles.actionButton}>Ver detalle</button>
                  <button type="button" onClick={() => onEdit(session)} style={styles.actionButtonPrimary}>Editar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
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
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
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
};
