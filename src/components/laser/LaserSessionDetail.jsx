import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";

function formatDate(value) {
  if (!value) return "No registrada";
  try {
    return new Date(value).toLocaleDateString("es-DO");
  } catch {
    return "No registrada";
  }
}

export default function LaserSessionDetail({ session }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.topGrid}>
        <SectionCard title={session.clientLabel} subtitle="Resumen general de la sesión">
          <div style={styles.rows}>
            <DetailRow label="Especialista" value={session.specialistLabel} />
            <DetailRow label="Fecha de sesión" value={formatDate(session.session_date)} />
            <DetailRow label="Cita relacionada" value={session.appointmentLabel || "No relacionada"} />
            <DetailRow label="Paquete utilizado" value={session.clientPackageLabel || "Sesión suelta"} />
          </div>
        </SectionCard>

        <SectionCard title="Observaciones generales" subtitle="Notas clínicas principales">
          <div style={styles.notes}>
            {session.general_notes || "Sin observaciones generales registradas."}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Zonas tratadas" subtitle="Parámetros aplicados por zona en esta sesión.">
        {session.parameters.length === 0 ? (
          <EmptyState
            title="Sin parámetros registrados"
            description="Esta sesión todavía no tiene parámetros asociados por zona."
          />
        ) : (
          <div style={styles.parametersGrid}>
            {session.parameters.map((parameter) => (
              <div key={parameter.id || `${parameter.zone}-${parameter.subzone}`} style={styles.parameterCard}>
                <div style={styles.parameterTop}>
                  <div>
                    <div style={styles.parameterTitle}>{parameter.zone}</div>
                    <div style={styles.parameterSubzone}>{parameter.subzone || "Sin subzona"}</div>
                  </div>
                  <div style={styles.zoneChip}>Zona tratada</div>
                </div>

                <div style={styles.parameterRows}>
                  <DetailRow label="Frecuencia Hz" value={parameter.frequency_hz || "—"} />
                  <DetailRow label="Intensidad J" value={parameter.intensity_j || "—"} />
                  <DetailRow label="Ancho de pulso" value={parameter.pulse_width || "—"} />
                  <DetailRow label="Número de pulsos" value={parameter.pulse_count || "—"} />
                </div>

                <div style={styles.parameterNotes}>
                  <div style={styles.parameterNotesLabel}>Notas</div>
                  <div style={styles.parameterNotesValue}>{parameter.notes || "Sin notas específicas."}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  topGrid: {
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
    borderBottom: `1px solid ${BRANDING.colors.border}`,
    paddingBottom: 10,
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
    lineHeight: 1.5,
  },
  notes: {
    color: "#4A403B",
    fontSize: 14,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    minHeight: 120,
  },
  parametersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  parameterCard: {
    background: "#FCFAF7",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  parameterTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  parameterTitle: {
    color: "#2B2522",
    fontSize: 18,
    fontWeight: 700,
  },
  parameterSubzone: {
    color: "#8B7E74",
    fontSize: 13,
    marginTop: 4,
  },
  zoneChip: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#EEF5F1",
    border: "1px solid #D8E7DF",
    color: BRANDING.colors.primaryStrong,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  parameterRows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  parameterNotes: {
    background: BRANDING.colors.card,
    borderRadius: 18,
    border: `1px solid ${BRANDING.colors.border}`,
    padding: 14,
  },
  parameterNotesLabel: {
    color: "#9C8E84",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  parameterNotesValue: {
    color: "#4A403B",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 6,
  },
};
