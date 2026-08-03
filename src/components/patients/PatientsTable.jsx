import ActionButton from "../ui/ActionButton";
import DataTable from "../ui/DataTable";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";

function formatDate(dateValue) {
  if (!dateValue) return "—";
  try {
    return new Date(dateValue).toLocaleDateString("es-DO");
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
          <div style={styles.subtle}>{row.address || "Sin dirección registrada"}</div>
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
          <ActionButton onClick={(event) => { event.stopPropagation(); onView(row); }} variant="secondary" style={styles.actionCompact}>
            Ver
          </ActionButton>
          <ActionButton onClick={(event) => { event.stopPropagation(); onEdit(row); }} variant="ghost" style={styles.actionCompact}>
            Editar
          </ActionButton>
          {isAdmin && !showInactive ? (
            <ActionButton onClick={(event) => { event.stopPropagation(); onDeactivate(row); }} variant="danger" style={styles.actionCompact}>
              Dar de baja
            </ActionButton>
          ) : null}
          {isAdmin && showInactive ? (
            <ActionButton onClick={(event) => { event.stopPropagation(); onReactivate(row); }} variant="success" style={styles.actionCompact}>
              Reactivar
            </ActionButton>
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
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    fontSize: 14,
  },
  subtle: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  actionCompact: {
    padding: "9px 12px",
    borderRadius: 14,
    fontSize: 12,
  },
};
