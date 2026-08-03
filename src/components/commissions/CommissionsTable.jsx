import ActionButton from "../ui/ActionButton";
import DataTable from "../ui/DataTable";
import StatusBadge from "../ui/StatusBadge";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-DO");
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

export default function CommissionsTable({
  commissions,
  emptyState,
  onView,
  onEdit,
  onMarkPaid,
  onCancel,
  canManage = false,
}) {
  const columns = [
    {
      key: "date",
      label: "Fecha",
      render: (commission) => formatDate(commission.commission_date || commission.created_at),
    },
    {
      key: "specialist",
      label: "Especialista",
      render: (commission) => (
        <div>
          <div style={styles.primary}>{commission.specialistLabel}</div>
          <div style={styles.secondary}>{humanizeType(commission.type)}</div>
        </div>
      ),
    },
    {
      key: "product",
      label: "Producto",
      render: (commission) => commission.productLabel || "—",
    },
    {
      key: "sale_amount",
      label: "Venta",
      render: (commission) => <span style={styles.amount}>RD$ {Number(commission.sale_amount || 0).toFixed(2)}</span>,
    },
    {
      key: "commission_amount",
      label: "Comisión",
      render: (commission) => <span style={styles.amountStrong}>RD$ {Number(commission.commission_amount || 0).toFixed(2)}</span>,
    },
    {
      key: "status",
      label: "Estado",
      render: (commission) => <StatusBadge status={commission.status || "pendiente"} />,
    },
    {
      key: "actions",
      label: "Acciones",
      render: (commission) => (
        <div style={styles.actions}>
          <ActionButton variant="secondary" onClick={() => onView(commission)} style={styles.button}>
            Ver
          </ActionButton>
          {canManage ? (
            <>
              <ActionButton variant="ghost" onClick={() => onEdit(commission)} style={styles.button}>
                Editar
              </ActionButton>
              <ActionButton variant="success" onClick={() => onMarkPaid(commission)} style={styles.button}>
                Marcar pagada
              </ActionButton>
              <ActionButton variant="danger" onClick={() => onCancel(commission)} style={styles.button}>
                Cancelar
              </ActionButton>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} rows={commissions} emptyState={emptyState} />;
}

const styles = {
  primary: { fontWeight: 700, color: "#0F332B" },
  secondary: { color: "#6F6258", fontSize: 12, marginTop: 4 },
  amount: { fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  amountStrong: { fontWeight: 800, color: "#12382F", fontVariantNumeric: "tabular-nums" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  button: { padding: "10px 12px", borderRadius: 14 },
};
