import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";

export default function ClinicalHistoryView({ history, onEdit, onCreate }) {
  if (!history) {
    return (
      <EmptyState
        title="No hay historial clínico registrado."
        description="Agrega antecedentes médicos, alergias, medicamentos y observaciones para este paciente."
        action={(
          <button type="button" onClick={onCreate} style={styles.primaryButton}>
            Crear historial clínico
          </button>
        )}
      />
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.headerActions}>
        <button type="button" onClick={onEdit} style={styles.primaryButton}>Editar historial</button>
      </div>

      <div style={styles.grid}>
        <SectionCard title="Antecedentes médicos">
          <Content value={history.medical_history} />
        </SectionCard>
        <SectionCard title="Alergias">
          <Content value={history.allergies} />
        </SectionCard>
        <SectionCard title="Medicamentos">
          <Content value={history.medications} />
        </SectionCard>
        <SectionCard title="Condiciones de piel">
          <Content value={history.skin_conditions} />
        </SectionCard>
        <SectionCard title="Contraindicaciones">
          <Content value={history.contraindications} />
        </SectionCard>
        <SectionCard title="Observaciones">
          <Content value={history.observations} />
        </SectionCard>
      </div>
    </div>
  );
}

function Content({ value }) {
  return <div style={styles.copy}>{value || "Sin información registrada."}</div>;
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  headerActions: { display: "flex", justifyContent: "flex-end" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  copy: { color: "#4A403B", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 72 },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
