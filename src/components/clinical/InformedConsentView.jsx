import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import StatusBadge from "../ui/StatusBadge";
import ConsentHistoryTable from "./ConsentHistoryTable";

export default function InformedConsentView({ consent, consents, onCreate, onView, onDownloadPdf }) {
  if (!consent) {
    return (
      <div style={styles.wrap}>
        <EmptyState
          title="No hay consentimiento informado registrado."
          description="Registra la firma digital, cédula y fecha del paciente para dejar constancia del consentimiento."
          action={(
            <button type="button" onClick={onCreate} style={styles.primaryButton}>
              Crear consentimiento
            </button>
          )}
        />
        <ConsentHistoryTable consents={consents || []} onView={onView} onCreate={onCreate} />
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.actions}>
        <button type="button" onClick={onCreate} style={styles.primaryButton}>Crear nuevo consentimiento</button>
      </div>

      <div style={styles.grid}>
        <SectionCard title="Estado del consentimiento" subtitle="Resumen del consentimiento más reciente.">
          <div style={styles.rows}>
            <DetailRow label="Estado" value={<StatusBadge status="pagada" />} />
            <DetailRow label="Fecha de firma" value={formatDate(consent.signed_at)} />
            <DetailRow label="Nombre del paciente" value={consent.patient_name} />
            <DetailRow label="Cédula" value={consent.national_id} />
            <div style={styles.inlineActions}>
              <button type="button" onClick={() => onView(consent)} style={styles.actionButton}>Ver consentimiento</button>
              <button type="button" onClick={() => onDownloadPdf?.(consent)} style={styles.secondaryButton}>Descargar PDF</button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Texto del consentimiento" subtitle="Versión registrada del documento firmado.">
          <div style={styles.copy}>{consent.consent_text}</div>
        </SectionCard>
      </div>

      <SectionCard title="Firma digital" subtitle="Registro capturado en el consentimiento informado.">
        {consent.signature_data ? (
          <div style={styles.signatureCard}>
            <img src={consent.signature_data} alt="Firma del paciente" style={styles.signatureImage} />
          </div>
        ) : (
          <EmptyState title="Sin firma" description="No se encontró una firma asociada a este consentimiento." />
        )}
      </SectionCard>

      <ConsentHistoryTable consents={consents || []} onView={onView} onCreate={onCreate} />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value || "—"}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "No registrada";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "No registrada";
  }
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  actions: { display: "flex", justifyContent: "flex-end" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  copy: { color: "#4A403B", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" },
  rows: { display: "flex", flexDirection: "column", gap: 12 },
  row: { borderBottom: "1px solid #F3ECE6", paddingBottom: 10 },
  label: { color: "#9C8E84", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  value: { color: "#2A2522", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
  inlineActions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 },
  signatureCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 20, padding: 20, display: "flex", justifyContent: "center" },
  signatureImage: { maxWidth: "100%", height: "auto", borderRadius: 12, border: "1px solid #E8DCD1", background: "#fff" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  actionButton: { background: "#F7ECE6", color: "#A15A58", border: "1px solid #EBCFC6", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
