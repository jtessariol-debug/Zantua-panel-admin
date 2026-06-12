import StatusBadge from "../ui/StatusBadge";

export default function ConsentHistoryTable({ consents, onView, onCreate }) {
  if (!consents.length) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.title}>Historial de consentimientos</div>
        <button type="button" onClick={onCreate} style={styles.primaryButton}>Crear nuevo consentimiento</button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.head}>Fecha</th>
              <th style={styles.head}>Paciente</th>
              <th style={styles.head}>Cédula</th>
              <th style={styles.head}>Estado</th>
              <th style={styles.head}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consents.map((consent) => (
              <tr key={consent.id} style={styles.row}>
                <td style={styles.cell}>{formatDate(consent.signed_at)}</td>
                <td style={styles.cell}>{consent.patient_name}</td>
                <td style={styles.cell}>{consent.national_id}</td>
                <td style={styles.cell}><StatusBadge status="pagada" /></td>
                <td style={styles.cell}>
                  <button type="button" onClick={() => onView(consent)} style={styles.actionButton}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "No registrada";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "No registrada";
  }
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  title: { color: "#241F1D", fontSize: 18, fontWeight: 700 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  head: { textAlign: "left", color: "#8A7B72", fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: "#2A2522", fontSize: 14, verticalAlign: "middle" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  actionButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
