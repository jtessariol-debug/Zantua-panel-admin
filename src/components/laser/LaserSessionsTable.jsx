import ActionButton from "../ui/ActionButton";
import DataTable from "../ui/DataTable";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-DO");
  } catch {
    return "—";
  }
}

export default function LaserSessionsTable({ sessions, emptyState, onView, onEdit }) {
  const columns = [
    {
      key: "session_date",
      label: "Fecha",
      render: (session) => (
        <div>
          <div style={styles.primary}>{formatDate(session.session_date)}</div>
          <div style={styles.secondary}>{session.clientPackageLabel || "Sesión suelta"}</div>
        </div>
      ),
    },
    {
      key: "client",
      label: "Paciente",
      render: (session) => (
        <div>
          <div style={styles.primary}>{session.clientLabel}</div>
          <div style={styles.secondary}>{session.specialistLabel}</div>
        </div>
      ),
    },
    {
      key: "zones",
      label: "Zonas tratadas",
      render: (session) => (
        <div style={styles.longText}>{session.zonesSummary || "Sin zonas registradas"}</div>
      ),
    },
    {
      key: "notes",
      label: "Observaciones",
      render: (session) => (
        <div style={styles.longText}>{session.general_notes || "Sin observaciones"}</div>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (session) => (
        <div style={styles.actions}>
          <ActionButton variant="secondary" onClick={() => onView(session)} style={styles.actionButton}>
            Ver detalle
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => onEdit(session)} style={styles.actionButton}>
            Editar
          </ActionButton>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} rows={sessions} emptyState={emptyState} />;
}

const styles = {
  primary: {
    color: "#0F332B",
    fontWeight: 700,
  },
  secondary: {
    color: "#6F6258",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 1.5,
  },
  longText: {
    color: "#1B1B1B",
    lineHeight: 1.6,
    minWidth: 180,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    padding: "10px 12px",
    borderRadius: 14,
  },
};
