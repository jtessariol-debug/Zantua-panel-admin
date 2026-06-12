import StatusBadge from "../ui/StatusBadge";

export default function CommissionsTable({ commissions, emptyState, onView, onEdit, onMarkPaid, onCancel }) {
  if (!commissions.length) return emptyState;

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.head}>Fecha</th>
            <th style={styles.head}>Especialista</th>
            <th style={styles.head}>Tipo</th>
            <th style={styles.head}>Producto</th>
            <th style={styles.head}>Venta</th>
            <th style={styles.head}>Comisión</th>
            <th style={styles.head}>Estado</th>
            <th style={styles.head}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {commissions.map((commission) => (
            <tr key={commission.id} style={styles.row}>
              <td style={styles.cell}>{formatDate(commission.commission_date || commission.created_at)}</td>
              <td style={styles.cell}>{commission.specialistLabel}</td>
              <td style={styles.cell}>{humanizeType(commission.type)}</td>
              <td style={styles.cell}>{commission.productLabel || "—"}</td>
              <td style={styles.cell}>${Number(commission.sale_amount || 0).toFixed(2)}</td>
              <td style={styles.cell}>${Number(commission.commission_amount || 0).toFixed(2)}</td>
              <td style={styles.cell}><StatusBadge status={commission.status || "pendiente"} /></td>
              <td style={styles.cell}>
                <div style={styles.actions}>
                  <button type="button" onClick={() => onView(commission)} style={styles.actionButton}>Ver</button>
                  <button type="button" onClick={() => onEdit(commission)} style={styles.actionButtonPrimary}>Editar</button>
                  <button type="button" onClick={() => onMarkPaid(commission)} style={styles.actionButton}>Marcar pagada</button>
                  <button type="button" onClick={() => onCancel(commission)} style={styles.cancelButton}>Cancelar</button>
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

function humanizeType(value) {
  switch (value) {
    case "producto":
      return "Producto";
    case "servicio":
      return "Servicio";
    case "bono":
      return "Bono";
    case "otro":
      return "Otro";
    default:
      return value || "—";
  }
}

const styles = {
  wrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  head: { textAlign: "left", color: "#8A7B72", fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: "#2A2522", fontSize: 14, verticalAlign: "middle" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  actionButtonPrimary: { background: "#F7ECE6", color: "#A15A58", border: "1px solid #EBCFC6", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  cancelButton: { background: "#FFF4F5", color: "#A24F5D", border: "1px solid #F3D6DB", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
