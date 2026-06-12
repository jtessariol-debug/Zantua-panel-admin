import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";

function formatDate(dateValue) {
  if (!dateValue) return "No registrada";
  try {
    return new Date(dateValue).toLocaleDateString();
  } catch {
    return "No registrada";
  }
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value || "No disponible"}</div>
    </div>
  );
}

export default function PatientDetail({ patient }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.grid}>
        <SectionCard title={patient.full_name} subtitle="Ficha general del paciente">
          <div style={styles.rows}>
            <DetailRow label="Teléfono" value={patient.phone || "No registrado"} />
            <DetailRow label="Correo" value={patient.email || "No registrado"} />
            <DetailRow label="Cédula" value={patient.national_id || "No registrada"} />
            <DetailRow label="Fecha de nacimiento" value={formatDate(patient.birth_date)} />
            <DetailRow label="Dirección" value={patient.address || "No registrada"} />
            <DetailRow label="Fecha de registro" value={formatDate(patient.created_at)} />
          </div>
        </SectionCard>

        <SectionCard title="Notas generales" subtitle="Observaciones registradas para este paciente">
          <div style={styles.notes}>{patient.notes || "Sin notas generales todavía."}</div>
        </SectionCard>
      </div>

      <div style={styles.modules}>
        <SectionCard title="Historial de citas" subtitle="Próxima integración operativa">
          <EmptyState
            title="Módulo pendiente de conexión."
            description="Aquí se mostrará el historial completo de citas del paciente."
          />
        </SectionCard>

        <SectionCard title="Historial clínico" subtitle="Próxima integración operativa">
          <EmptyState
            title="Módulo pendiente de conexión."
            description="Aquí se visualizarán antecedentes, notas clínicas y evolución del paciente."
          />
        </SectionCard>

        <SectionCard title="Sesiones láser" subtitle="Próxima integración operativa">
          <EmptyState
            title="Módulo pendiente de conexión."
            description="Aquí aparecerán los parámetros, áreas tratadas y seguimiento por sesión."
          />
        </SectionCard>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 16,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    borderBottom: "1px solid #F3ECE6",
    paddingBottom: 12,
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
    minHeight: 120,
    whiteSpace: "pre-wrap",
  },
  modules: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
};
