import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { fetchAppointmentsByClient } from "../../services/appointments";
import { fetchClinicalHistory } from "../../services/clinical";
import { fetchLaserSessionsByClient } from "../../services/laser";
import { BRANDING } from "../../lib/branding";

function formatDate(dateValue) {
  if (!dateValue) return "No registrada";
  try {
    return new Date(dateValue).toLocaleDateString("es-DO");
  } catch {
    return "No registrada";
  }
}

function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return "Hora no disponible";
  const start = startTime ? startTime.slice(0, 5) : "--:--";
  const end = endTime ? endTime.slice(0, 5) : "--:--";
  return `${start} - ${end}`;
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value || "No disponible"}</div>
    </div>
  );
}

function SummaryItem({ title, subtitle, content }) {
  return (
    <div style={styles.summaryItem}>
      <div style={styles.summaryTitle}>{title}</div>
      {subtitle ? <div style={styles.summarySubtitle}>{subtitle}</div> : null}
      {content ? <div style={styles.summaryContent}>{content}</div> : null}
    </div>
  );
}

export default function PatientDetail({ patient }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState(null);
  const [laserSessions, setLaserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({
    appointments: "",
    clinical: "",
    laser: "",
  });

  useEffect(() => {
    let active = true;

    async function loadPatientSummary() {
      setLoading(true);
      setErrors({ appointments: "", clinical: "", laser: "" });

      const results = await Promise.allSettled([
        fetchAppointmentsByClient(patient.id),
        fetchClinicalHistory(patient.id),
        fetchLaserSessionsByClient(patient.id),
      ]);

      if (!active) return;

      const [appointmentsResult, clinicalResult, laserResult] = results;

      if (appointmentsResult.status === "fulfilled") {
        setAppointments(appointmentsResult.value.slice(0, 3));
      } else {
        setAppointments([]);
        setErrors((current) => ({ ...current, appointments: "No se pudo cargar el historial de citas." }));
      }

      if (clinicalResult.status === "fulfilled") {
        setClinicalHistory(clinicalResult.value);
      } else {
        setClinicalHistory(null);
        setErrors((current) => ({ ...current, clinical: "No se pudo cargar el historial clínico." }));
      }

      if (laserResult.status === "fulfilled") {
        setLaserSessions(laserResult.value.slice(0, 2));
      } else {
        setLaserSessions([]);
        setErrors((current) => ({ ...current, laser: "No se pudieron cargar las sesiones láser." }));
      }

      setLoading(false);
    }

    loadPatientSummary();

    return () => {
      active = false;
    };
  }, [patient.id]);

  return (
    <div style={styles.wrap}>
      <div style={styles.heroCard}>
        <div style={styles.heroCopy}>
          <div style={styles.heroEyebrow}>Ficha del paciente</div>
          <h3 style={styles.heroTitle}>{patient.full_name}</h3>
          <p style={styles.heroSubtitle}>Resumen de contacto, actividad clínica reciente y accesos rápidos.</p>
        </div>
        <ActionButton onClick={() => navigate(`/client/${patient.id}`)}>Abrir ficha completa</ActionButton>
      </div>

      <div style={styles.grid}>
        <SectionCard title="Datos generales" subtitle="Información base del paciente.">
          <div style={styles.rows}>
            <DetailRow label="Teléfono" value={patient.phone || "No registrado"} />
            <DetailRow label="Correo" value={patient.email || "No registrado"} />
            <DetailRow label="Cédula" value={patient.national_id || "No registrada"} />
            <DetailRow label="Fecha de nacimiento" value={formatDate(patient.birth_date)} />
            <DetailRow label="Dirección" value={patient.address || "No registrada"} />
            <DetailRow label="Fecha de registro" value={formatDate(patient.created_at)} />
          </div>
        </SectionCard>

        <SectionCard title="Notas generales" subtitle="Observaciones registradas para este paciente.">
          <div style={styles.notes}>{patient.notes || "Sin notas generales todavía."}</div>
        </SectionCard>
      </div>

      <div style={styles.modules}>
        <SectionCard title="Historial de citas" subtitle="Últimas citas registradas del paciente.">
          {loading ? <div style={styles.loadingCopy}>Cargando historial...</div> : null}
          {!loading && errors.appointments ? <div style={styles.errorCopy}>{errors.appointments}</div> : null}
          {!loading && !errors.appointments && appointments.length === 0 ? (
            <EmptyState
              title="No hay citas registradas para este paciente."
              description="Cuando se creen citas desde Agenda, aparecerán aquí."
            />
          ) : null}
          {!loading && !errors.appointments && appointments.length > 0 ? (
            <div style={styles.summaryList}>
              {appointments.map((appointment) => (
                <SummaryItem
                  key={appointment.id}
                  title={`${formatDate(appointment.appointment_date)} · ${formatTimeRange(appointment.start_time, appointment.end_time)}`}
                  subtitle={`${appointment.specialistLabel} · ${appointment.serviceLabel}`}
                  content={`${appointment.cabinLabel || "Sin cabina"} · ${formatStatus(appointment.status)}`}
                />
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Historial clínico" subtitle="Resumen del expediente clínico actual.">
          {loading ? <div style={styles.loadingCopy}>Cargando historial...</div> : null}
          {!loading && errors.clinical ? <div style={styles.errorCopy}>{errors.clinical}</div> : null}
          {!loading && !errors.clinical && !clinicalHistory ? (
            <EmptyState
              title="No hay historial clínico registrado."
              description="Puedes crearlo desde la ficha completa del paciente."
            />
          ) : null}
          {!loading && !errors.clinical && clinicalHistory ? (
            <div style={styles.summaryList}>
              <SummaryItem title="Alergias" content={clinicalHistory.allergies || "Sin alergias registradas."} />
              <SummaryItem title="Medicamentos" content={clinicalHistory.medications || "Sin medicamentos registrados."} />
              <SummaryItem title="Observaciones" content={clinicalHistory.observations || "Sin observaciones registradas."} />
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Sesiones láser" subtitle="Últimas sesiones y zonas tratadas.">
          {loading ? <div style={styles.loadingCopy}>Cargando sesiones...</div> : null}
          {!loading && errors.laser ? <div style={styles.errorCopy}>{errors.laser}</div> : null}
          {!loading && !errors.laser && laserSessions.length === 0 ? (
            <EmptyState
              title="No hay sesiones láser registradas para este paciente."
              description="Las sesiones aparecerán aquí cuando se registren desde el módulo Láser."
            />
          ) : null}
          {!loading && !errors.laser && laserSessions.length > 0 ? (
            <div style={styles.summaryList}>
              {laserSessions.map((session) => (
                <SummaryItem
                  key={session.id}
                  title={formatDate(session.session_date)}
                  subtitle={session.specialistLabel}
                  content={session.zonesSummary || session.general_notes || "Sin parámetros registrados."}
                />
              ))}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}

function formatStatus(value) {
  const labels = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    completada: "Completada",
    cancelada: "Cancelada",
    no_asistio: "No asistió",
  };

  return labels[value] || value || "Sin estado";
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    padding: 22,
    borderRadius: 24,
    background: "linear-gradient(180deg, #FFFCF7 0%, #FBF6EE 100%)",
    border: `1px solid ${BRANDING.colors.border}`,
  },
  heroCopy: {
    maxWidth: 620,
  },
  heroEyebrow: {
    color: BRANDING.colors.secondary,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 28,
    fontWeight: 700,
    margin: "8px 0 0",
  },
  heroSubtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    lineHeight: 1.7,
    margin: "8px 0 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    borderBottom: "1px solid #F0E7DB",
    paddingBottom: 12,
  },
  label: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  value: {
    color: BRANDING.colors.text,
    fontSize: 15,
    marginTop: 6,
    lineHeight: 1.6,
  },
  notes: {
    color: "#4A403B",
    fontSize: 14,
    lineHeight: 1.8,
    minHeight: 120,
    whiteSpace: "pre-wrap",
  },
  modules: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
  loadingCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
  },
  errorCopy: {
    color: "#A34A52",
    fontSize: 14,
  },
  summaryList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  summaryItem: {
    background: "#FFFDF8",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 18,
    padding: 16,
  },
  summaryTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 14,
    fontWeight: 700,
  },
  summarySubtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  summaryContent: {
    color: "#3E3935",
    fontSize: 13,
    lineHeight: 1.7,
    marginTop: 8,
    whiteSpace: "pre-wrap",
  },
};
