import ActionButton from "../ui/ActionButton";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";

export default function InvoicesTable({ invoices, emptyState, onView, onEdit, onMarkPaid, onCancel }) {
  if (!invoices.length) return emptyState;

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.head}>Número</th>
            <th style={styles.head}>Fecha</th>
            <th style={styles.head}>Cliente</th>
            <th style={styles.head}>Especialista</th>
            <th style={styles.head}>Total</th>
            <th style={styles.head}>Método</th>
            <th style={styles.head}>Estado</th>
            <th style={styles.head}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} style={styles.row}>
              <td style={styles.cellStrong}>{invoice.invoice_number || invoice.id}</td>
              <td style={styles.cell}>{formatDate(invoice.invoice_date || invoice.created_at)}</td>
              <td style={styles.cell}>{invoice.clientLabel}</td>
              <td style={styles.cell}>{invoice.specialistLabel}</td>
              <td style={styles.cellAmount}>RD${Number(invoice.total || 0).toFixed(2)}</td>
              <td style={styles.cell}>{invoice.payment_method || "—"}</td>
              <td style={styles.cell}><StatusBadge status={invoice.payment_status || invoice.status || "pendiente"} /></td>
              <td style={styles.cell}>
                <div style={styles.actions}>
                  <ActionButton onClick={() => onView(invoice)} variant="secondary" style={styles.actionCompact}>Ver</ActionButton>
                  <ActionButton onClick={() => onEdit(invoice)} variant="ghost" style={styles.actionCompact}>Editar</ActionButton>
                  <ActionButton onClick={() => onMarkPaid(invoice)} variant="success" style={styles.actionCompact}>Marcar pagada</ActionButton>
                  <ActionButton onClick={() => onCancel(invoice)} variant="danger" style={styles.actionCompact}>Cancelar</ActionButton>
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
  try { return new Date(value).toLocaleDateString("es-DO"); } catch { return "—"; }
}

const styles = {
  wrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 14px 14px 0", borderBottom: "1px solid #EEE4D8", fontWeight: 700, letterSpacing: 0.35 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "18px 14px 18px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "middle", borderBottom: "1px solid #F5EFE9" },
  cellStrong: { padding: "18px 14px 18px 0", color: BRANDING.colors.primaryStrong, fontSize: 14, fontWeight: 700, verticalAlign: "middle", borderBottom: "1px solid #F5EFE9" },
  cellAmount: { padding: "18px 14px 18px 0", color: BRANDING.colors.primaryStrong, fontSize: 14, fontWeight: 700, verticalAlign: "middle", borderBottom: "1px solid #F5EFE9", whiteSpace: "nowrap" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionCompact: { padding: "9px 12px", borderRadius: 14, fontSize: 12 },
};
