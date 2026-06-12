export default function ConsentDocumentView({ consent }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={styles.brand}>Zantua Aesthetic Wellness</div>
          <h2 style={styles.title}>Consentimiento informado</h2>
        </div>
        <button type="button" style={styles.secondaryButton}>Exportar PDF</button>
      </div>

      <div style={styles.metaGrid}>
        <MetaCard label="Paciente" value={consent.patient_name} />
        <MetaCard label="Cédula" value={consent.national_id} />
        <MetaCard label="Fecha de firma" value={formatDate(consent.signed_at)} />
        <MetaCard label="Estado" value="Firmado" />
      </div>

      <div style={styles.documentCard}>
        <div style={styles.documentText}>{consent.consent_text}</div>
      </div>

      <div style={styles.signatureSection}>
        <div style={styles.signatureLabel}>Firma digital</div>
        {consent.signature_data ? (
          <img src={consent.signature_data} alt="Firma del paciente" style={styles.signatureImage} />
        ) : (
          <div style={styles.signatureEmpty}>No se encontró una firma asociada.</div>
        )}
      </div>
    </div>
  );
}

function MetaCard({ label, value }) {
  return (
    <div style={styles.metaCard}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value || "—"}</div>
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
  wrap: { display: "flex", flexDirection: "column", gap: 18 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  brand: { color: "#A15A58", fontSize: 13, textTransform: "uppercase", fontWeight: 700 },
  title: { color: "#241F1D", fontSize: 28, fontWeight: 700, margin: "8px 0 0" },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  metaCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 16 },
  metaLabel: { color: "#9C8E84", fontSize: 11, textTransform: "uppercase", fontWeight: 700 },
  metaValue: { color: "#2A2522", fontSize: 15, marginTop: 8, lineHeight: 1.5 },
  documentCard: { background: "#FFFFFF", border: "1px solid #EFE5DC", borderRadius: 20, boxShadow: "0 14px 30px rgba(71, 47, 30, 0.05)", padding: 22, maxHeight: 320, overflowY: "auto" },
  documentText: { color: "#4A403B", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" },
  signatureSection: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 20, padding: 18 },
  signatureLabel: { color: "#9C8E84", fontSize: 11, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 },
  signatureImage: { maxWidth: "100%", height: "auto", borderRadius: 12, border: "1px solid #E8DCD1", background: "#fff" },
  signatureEmpty: { color: "#8B7E74", fontSize: 14 },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
