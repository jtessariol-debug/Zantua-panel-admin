import ActionButton from "../ui/ActionButton";
import StatusBadge from "../ui/StatusBadge";
import { buildAppointmentWhatsAppUrl } from "../../utils/whatsapp";
import { BRANDING } from "../../lib/branding";

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
          {appointments.map((appointment) => {
            const whatsappUrl = buildAppointmentWhatsAppUrl(appointment);
            const hasPhone = Boolean(whatsappUrl);

            return (
              <tr key={appointment.id} style={styles.row}>
                <td style={styles.cellTime}>{appointment.displayTime}</td>
                <td style={styles.cell}>
                  <div style={styles.primaryText}>{appointment.patientLabel}</div>
                  {appointment.isGoldieImported ? <span style={styles.importBadge}>Importada de Goldie</span> : null}
                </td>
                <td style={styles.cell}>{appointment.specialistLabel}</td>
                <td style={styles.cell}>{appointment.serviceLabel}</td>
                <td style={styles.cell}>{appointment.cabinLabel}</td>
                <td style={styles.cell}>
                  <StatusBadge status={appointment.statusLabel} />
                </td>
                <td style={styles.cell}>
                  <div style={styles.actions}>
                    <ActionButton onClick={() => onView(appointment)} variant="secondary" style={styles.actionCompact}>
                      Ver
                    </ActionButton>
                    <ActionButton onClick={() => onEdit(appointment)} variant="ghost" style={styles.actionCompact}>
                      Editar
                    </ActionButton>
                    {hasPhone ? (
                      <ActionButton
                        as="a"
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        variant="success"
                        style={styles.actionCompact}
                      >
                        WhatsApp
                      </ActionButton>
                    ) : (
                      <span style={styles.disabledHint}>Paciente sin teléfono</span>
                    )}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 },
  head: {
    textAlign: "left",
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    padding: "0 14px 14px 0",
    borderBottom: "1px solid #EEE4D8",
    fontWeight: 700,
    letterSpacing: 0.35,
  },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "18px 14px 18px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "middle", borderBottom: "1px solid #F5EFE9" },
  cellTime: { padding: "18px 14px 18px 0", color: BRANDING.colors.primaryStrong, fontSize: 14, fontWeight: 700, verticalAlign: "middle", borderBottom: "1px solid #F5EFE9" },
  primaryText: { fontSize: 14, fontWeight: 700, color: BRANDING.colors.primaryStrong },
  importBadge: {
    display: "inline-flex",
    marginTop: 8,
    background: "#F2EFEA",
    color: BRANDING.colors.textMuted,
    border: "1px solid #E3DDD5",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  actionCompact: {
    padding: "9px 12px",
    borderRadius: 14,
    fontSize: 12,
  },
  disabledHint: {
    fontSize: 11,
    color: BRANDING.colors.textMuted,
  },
  statusSelect: {
    background: "#FFFDF8",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 14,
    padding: "9px 10px",
    color: BRANDING.colors.text,
    fontSize: 12,
  },
};
