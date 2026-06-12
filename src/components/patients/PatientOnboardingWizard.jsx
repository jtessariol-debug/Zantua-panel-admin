import { useMemo, useState } from "react";
import ClinicalHistoryForm from "../clinical/ClinicalHistoryForm";
import InformedConsentForm from "../clinical/InformedConsentForm";
import SectionCard from "../ui/SectionCard";
import PatientForm from "./PatientForm";

const STEPS = [
  { key: "patient", title: "Datos del paciente" },
  { key: "clinical", title: "Historial clínico básico" },
  { key: "consent", title: "Consentimiento informado" },
  { key: "done", title: "Confirmación" },
];

export default function PatientOnboardingWizard({
  lookups,
  patient,
  currentStep,
  loading,
  generatedConsent,
  onCreatePatient,
  onSaveClinicalHistory,
  onSkipClinicalHistory,
  onSaveConsent,
  onDownloadConsentPdf,
  onFinish,
  onClose,
}) {
  const [localFeedback, setLocalFeedback] = useState("");

  const activeIndex = useMemo(() => STEPS.findIndex((step) => step.key === currentStep), [currentStep]);

  function handleConsentSubmit(payload) {
    setLocalFeedback("Al guardar el consentimiento, se generará el PDF automáticamente.");
    onSaveConsent(payload);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.stepper}>
        {STEPS.map((step, index) => (
          <div key={step.key} style={styles.stepItem}>
            <div
              style={{
                ...styles.stepDot,
                ...(index <= activeIndex ? styles.stepDotActive : {}),
              }}
            >
              {index + 1}
            </div>
            <div style={styles.stepCopy}>
              <div style={{ ...styles.stepLabel, ...(index === activeIndex ? styles.stepLabelActive : {}) }}>{step.title}</div>
            </div>
          </div>
        ))}
      </div>

      {currentStep === "patient" ? (
        <SectionCard
          title="Paso 1. Datos del paciente"
          subtitle="Registra primero la información base y luego continúa con historial clínico y consentimiento."
        >
          <PatientForm
            onSubmit={onCreatePatient}
            onCancel={onClose}
            submitLabel="Guardar y continuar"
            loading={loading}
          />
        </SectionCard>
      ) : null}

      {currentStep === "clinical" && patient ? (
        <SectionCard
          title="Paso 2. Historial clínico básico"
          subtitle="Completa la información clínica relevante o sáltala para finalizarla después."
        >
          <ClinicalHistoryForm
            onSubmit={onSaveClinicalHistory}
            onCancel={onSkipClinicalHistory}
            submitLabel="Guardar y continuar"
            loading={loading}
          />

          <div style={styles.skipRow}>
            <button type="button" onClick={onSkipClinicalHistory} style={styles.secondaryButton}>
              Omitir por ahora
            </button>
          </div>
        </SectionCard>
      ) : null}

      {currentStep === "consent" && patient ? (
        <SectionCard
          title="Paso 3. Consentimiento informado"
          subtitle="Solicita la aceptación del documento, registra la firma y genera el PDF del consentimiento."
        >
          {localFeedback ? <div style={styles.infoBanner}>{localFeedback}</div> : null}
          <InformedConsentForm
            patient={patient}
            lookups={lookups}
            onSubmit={handleConsentSubmit}
            onCancel={onClose}
            loading={loading}
          />
        </SectionCard>
      ) : null}

      {currentStep === "done" && patient ? (
        <SectionCard
          title="Paso 4. Confirmación"
          subtitle="El paciente fue creado y el flujo clínico inicial quedó registrado."
        >
          <div style={styles.doneCard}>
            <div style={styles.doneTitle}>Paciente registrado correctamente</div>
            <div style={styles.doneCopy}>
              Ya puedes continuar con agenda, láser, facturación y seguimiento clínico desde el perfil del paciente.
            </div>

            <div style={styles.summaryGrid}>
              <SummaryItem label="Paciente" value={patient.full_name} />
              <SummaryItem label="Teléfono" value={patient.phone || "No registrado"} />
              <SummaryItem label="Consentimiento" value={generatedConsent ? "Firmado" : "Pendiente"} />
            </div>

            <div style={styles.actions}>
              {generatedConsent ? (
                <button type="button" onClick={onDownloadConsentPdf} style={styles.secondaryButton}>
                  Descargar PDF
                </button>
              ) : null}
              <button type="button" onClick={onFinish} style={styles.primaryButton}>
                Ir al perfil del paciente
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 20 },
  stepper: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  stepItem: { display: "flex", alignItems: "center", gap: 10, background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 12, minHeight: 68 },
  stepDot: { width: 30, height: 30, borderRadius: 999, background: "#EADFD4", color: "#8B7E74", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepDotActive: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff" },
  stepCopy: { minWidth: 0 },
  stepLabel: { color: "#8B7E74", fontSize: 13, fontWeight: 700, lineHeight: 1.35 },
  stepLabelActive: { color: "#2A2522" },
  skipRow: { display: "flex", justifyContent: "flex-end", marginTop: 14 },
  doneCard: { display: "flex", flexDirection: "column", gap: 18 },
  doneTitle: { color: "#241F1D", fontSize: 24, fontWeight: 700 },
  doneCopy: { color: "#6E625B", fontSize: 14, lineHeight: 1.7 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  summaryCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 16 },
  summaryLabel: { color: "#9C8E84", fontSize: 11, textTransform: "uppercase", fontWeight: 700 },
  summaryValue: { color: "#2A2522", fontSize: 15, marginTop: 8, lineHeight: 1.5 },
  infoBanner: { background: "#FFF8EA", border: "1px solid #F2D8AA", color: "#8F6A00", borderRadius: 14, padding: "12px 14px", fontSize: 13, marginBottom: 16 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
