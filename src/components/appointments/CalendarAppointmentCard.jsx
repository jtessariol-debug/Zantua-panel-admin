import StatusBadge from "../ui/StatusBadge";
import { buildAppointmentWhatsAppUrl } from "../../utils/whatsapp";
import { BRANDING } from "../../lib/branding";

export default function CalendarAppointmentCard({ appointment, compact = false, onClick }) {
  const whatsappUrl = buildAppointmentWhatsAppUrl(appointment);
  const hasPhone = Boolean(whatsappUrl);

  return (
    <button
      type="button"
      onClick={() => onClick?.(appointment)}
      style={{ ...styles.card, ...getStatusCardStyle(appointment.statusLabel), ...(compact ? styles.cardCompact : {}) }}
    >
      <div style={styles.timeRow}>
        <span style={styles.timeText}>{appointment.startTime?.slice(0, 5) || appointment.start_time?.slice(0, 5) || "—"}</span>
        <StatusBadge status={appointment.statusLabel} />
      </div>

      <div style={styles.patientName}>{appointment.clientName || appointment.patientLabel}</div>
      {appointment.isGoldieImported ? <span style={styles.importBadge}>Importada de Goldie</span> : null}
      <div style={styles.meta}>{appointment.clientPhone || appointment.patientPhone || "Sin teléfono"}</div>
      <div style={styles.meta}>{appointment.specialistName || appointment.specialistLabel}</div>
      <div style={styles.meta}>
        {appointment.serviceName || appointment.serviceLabel}
        {appointment.serviceType === "paquete" ? " · Paquete" : ""}
      </div>
      <div style={styles.meta}>{appointment.cabinName || appointment.cabinLabel}</div>

      {hasPhone ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          style={styles.whatsappLink}
        >
          WhatsApp
        </a>
      ) : (
        <span style={styles.disabledHint}>Paciente sin teléfono</span>
      )}
    </button>
  );
}

function getStatusCardStyle(status) {
  switch (status) {
    case "confirmada":
      return { borderColor: "#C8DDD2", background: "#F4FAF6" };
    case "completada":
      return { borderColor: "#D0DCEE", background: "#F6F9FD" };
    case "cancelada":
      return { borderColor: "#E7C4C9", background: "#FFF8F8" };
    case "no_asistio":
      return { borderColor: "#DFDCD9", background: "#FAF8F6" };
    default:
      return { borderColor: BRANDING.colors.border, background: "#FFFDF9" };
  }
}

const styles = {
  card: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 7,
    padding: "13px 13px 12px",
    borderRadius: 18,
    border: `1px solid ${BRANDING.colors.border}`,
    cursor: "pointer",
    textAlign: "left",
    boxSizing: "border-box",
    color: BRANDING.colors.text,
    boxShadow: "0 10px 20px rgba(18, 56, 47, 0.03)",
  },
  cardCompact: {
    padding: "10px 10px 9px",
    gap: 4,
  },
  timeRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  timeText: {
    fontSize: 13,
    fontWeight: 700,
    color: BRANDING.colors.primaryStrong,
  },
  patientName: {
    fontSize: 14,
    fontWeight: 700,
    color: BRANDING.colors.primaryStrong,
    lineHeight: 1.4,
  },
  importBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
    background: "#F2EFEA",
    color: BRANDING.colors.textMuted,
    border: "1px solid #E3DDD5",
  },
  meta: {
    fontSize: 12,
    color: BRANDING.colors.textMuted,
    lineHeight: 1.5,
  },
  whatsappLink: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700,
    color: BRANDING.colors.secondary,
    textDecoration: "none",
  },
  disabledHint: {
    marginTop: 4,
    fontSize: 12,
    color: BRANDING.colors.textMuted,
  },
};
