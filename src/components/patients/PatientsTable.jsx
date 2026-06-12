import DataTable from "../ui/DataTable";
import StatusBadge from "../ui/StatusBadge";

function formatDate(dateValue) {
  if (!dateValue) return "—";
  try {
    return new Date(dateValue).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function PatientsTable({
  rows,
  emptyState,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  isAdmin = false,
  showInactive = false,
}) {
  const columns = [
    {
      key: "full_name",
      label: "Nombre",
      render: (row) => (
        <div>
          <div style={styles.name}>{row.full_name}</div>
        </div>
      ),
    },
    { key: "phone", label: "Teléfono", render: (row) => row.phone || "—" },
    { key: "email", label: "Correo", render: (row) => row.email || "—" },
    { key: "national_id", label: "Cédula", render: (row) => row.national_id || "—" },
    { key: "birth_date", label: "Fecha de nacimiento", render: (row) => formatDate(row.birth_date) },
    { key: "created_at", label: "Fecha de registro", render: (row) => formatDate(row.created_at) },
    ...(showInactive ? [
      {
        key: "status",
        label: "Estado",
        render: () => <StatusBadge status="cancelada" />,
      },
      {
        key: "deleted_at",
        label: "Fecha de baja",
        render: (row) => formatDate(row.deleted_at),
      },
      {
        key: "deletion_reason",
        label: "Motivo",
        render: (row) => row.deletion_reason || "Sin motivo registrado",
      },
    ] : []),
    {
      key: "actions",
      label: "Acciones",
      render: (row) => (
        <div style={styles.actions}>
          <button type="button" onClick={(event) => { event.stopPropagation(); onView(row); }} style={styles.actionButton}>
            Ver
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(row); }} style={styles.actionButtonPrimary}>
            Editar
          </button>
          {isAdmin && !showInactive ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); onDeactivate(row); }} style={styles.actionButtonDanger}>
              Dar de baja
            </button>
          ) : null}
          {isAdmin && showInactive ? (
            <button type="button" onClick={(event) => { event.stopPropagation(); onReactivate(row); }} style={styles.actionButtonSuccess}>
              Reactivar
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyState={emptyState}
    />
  );
}

const styles = {
  name: {
    color: "#2A2522",
    fontWeight: 700,
    fontSize: 14,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
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
    background: "#EAF3EE",
    color: "#12382F",
    border: "1px solid #D3E7DE",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionButtonDanger: {
    background: "#FBE5E8",
    color: "#8A2F3F",
    border: "1px solid #EFC7CE",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionButtonSuccess: {
    background: "#E4F2EA",
    color: "#1E5A49",
    border: "1px solid #CFE8D8",
    borderRadius: 12,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};
