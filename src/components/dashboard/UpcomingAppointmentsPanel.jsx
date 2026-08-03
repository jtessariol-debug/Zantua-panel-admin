import { ChevronRight } from "lucide-react";
import { BRANDING } from "../../lib/branding";
import EmptyState from "../ui/EmptyState";
import StatusBadge from "../ui/StatusBadge";

function formatAppointmentTime(timeValue) {
  if (!timeValue) return "Sin hora";
  const [hours, minutes] = String(timeValue).split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes || 0);
  if (Number.isNaN(parsedHours)) return timeValue;

  const suffix = parsedHours >= 12 ? "PM" : "AM";
  const normalizedHours = parsedHours % 12 || 12;
  return `${normalizedHours}:${String(parsedMinutes).padStart(2, "0")} ${suffix}`;
}

export default function UpcomingAppointmentsPanel({ appointments = [], onOpenAgenda }) {
  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Próximas citas de hoy</div>
          <div style={styles.subtitle}>Hasta 5 registros próximos de la agenda actual.</div>
        </div>
        <button type="button" style={styles.linkButton} onClick={onOpenAgenda}>
          <span>Ver agenda</span>
          <ChevronRight size={15} />
        </button>
      </div>

      {appointments.length === 0 ? (
        <div style={styles.emptyWrap}>
          <EmptyState
            title="No hay citas programadas para hoy"
            description="Cuando existan citas visibles en la agenda, aparecerán aquí."
          />
        </div>
      ) : (
        <div style={styles.list}>
          {appointments.map((appointment) => (
            <article key={appointment.id} style={styles.item}>
              <div style={styles.itemTop}>
                <span style={styles.time}>{formatAppointmentTime(appointment.start_time || appointment.displayTime)}</span>
                <StatusBadge status={appointment.statusLabel || appointment.status} />
              </div>
              <div style={styles.patient}>{appointment.patientLabel}</div>
              <div style={styles.meta}>{appointment.serviceLabel || "Servicio"}</div>
              <div style={styles.metaSecondary}>{appointment.specialistLabel || "Especialista"}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 12,
    padding: 20,
    minHeight: 360,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.45,
  },
  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    padding: 0,
    color: BRANDING.colors.primaryStrong,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyWrap: {
    margin: "auto 0",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  item: {
    paddingBottom: 12,
    borderBottom: "1px solid #EBEEEA",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  itemTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  time: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 13,
    fontWeight: 700,
  },
  patient: {
    color: BRANDING.colors.text,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.35,
  },
  meta: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.35,
  },
  metaSecondary: {
    color: "#7D8782",
    fontSize: 12,
    lineHeight: 1.35,
  },
};
