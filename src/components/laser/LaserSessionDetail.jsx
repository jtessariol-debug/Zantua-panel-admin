import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";

function formatDate(value) {
  if (!value) return "No registrada";
  try {
    return new Date(value).toLocaleDateString();
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
          </div>
        </SectionCard>

        <SectionCard title="Observaciones generales" subtitle="Notas clínicas principales">
          <div style={styles.notes}>{session.general_notes || "Sin observaciones generales registradas."}</div>
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
                <div style={styles.parameterTitle}>{parameter.zone}</div>
                <div style={styles.parameterSubzone}>{parameter.subzone || "Sin subzona"}</div>

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
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    borderBottom: "1px solid #F3ECE6",
    paddingBottom: 10,
  },
  label: {
    color: "#9C8E84",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  value: {
    color: "#2A2522",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
  parameterCard: {
    background: "#FCFAF7",
    border: "1px solid #F0E6DD",
    borderRadius: 20,
    padding: 18,
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
  parameterRows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 16,
  },
  parameterNotes: {
    marginTop: 16,
    borderTop: "1px solid #F3ECE6",
    paddingTop: 14,
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
