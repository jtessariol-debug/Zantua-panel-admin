import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FilePenLine, FileSignature, NotebookTabs, ReceiptText, Waves } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ConsentDocumentView from "../components/clinical/ConsentDocumentView";
import ClinicalHistoryForm from "../components/clinical/ClinicalHistoryForm";
import ClinicalHistoryView from "../components/clinical/ClinicalHistoryView";
import InformedConsentForm from "../components/clinical/InformedConsentForm";
import InformedConsentView from "../components/clinical/InformedConsentView";
import LaserSessionDetail from "../components/laser/LaserSessionDetail";
import PatientModal from "../components/patients/PatientModal";
import EmptyState from "../components/ui/EmptyState";
import SectionCard from "../components/ui/SectionCard";
import {
  createInformedConsent,
  fetchClinicalHistory,
  fetchConsentLookups,
  fetchInformedConsents,
  upsertClinicalHistory,
} from "../services/clinical";
import { fetchInvoices } from "../services/finance";
import { fetchLaserSessionsByClient } from "../services/laser";
import { fetchPatientById } from "../services/patients";
import { exportConsentPDF } from "../utils/exportPDF";

const TABS = [
  { key: "overview", label: "Información general", icon: NotebookTabs },
  { key: "clinical", label: "Historial clínico", icon: FilePenLine },
  { key: "consent", label: "Consentimiento informado", icon: FileSignature },
  { key: "laser", label: "Sesiones láser", icon: Waves },
  { key: "billing", label: "Facturación", icon: ReceiptText },
];

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [clinicalHistory, setClinicalHistory] = useState(null);
  const [consents, setConsents] = useState([]);
  const [laserSessions, setLaserSessions] = useState([]);
  const [billingItems, setBillingItems] = useState([]);
  const [consentLookups, setConsentLookups] = useState({ specialists: [], services: [] });
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [error, setError] = useState("");
  const [clinicalModalOpen, setClinicalModalOpen] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [selectedLaserSession, setSelectedLaserSession] = useState(null);
  const [selectedConsent, setSelectedConsent] = useState(null);

  async function loadPatientProfile() {
    setLoading(true);
    setError("");

    try {
      const [patientResult, clinicalResult, consentResults, laserResult, consentLookupResult, invoicesResult] = await Promise.all([
        fetchPatientById(id),
        fetchClinicalHistory(id),
        fetchInformedConsents(id),
        fetchLaserSessionsByClient(id),
        fetchConsentLookups(),
        fetchInvoices(),
      ]);

      setPatient(patientResult);
      setClinicalHistory(clinicalResult);
      setConsents(consentResults);
      setLaserSessions(laserResult);
      setConsentLookups(consentLookupResult);
      setBillingItems((invoicesResult?.invoices || []).filter((invoice) => invoice.client_id === id));
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No fue posible cargar este paciente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatientProfile();
  }, [id]);

  const latestConsent = consents[0] || null;

  const patientStats = useMemo(() => ([
    { label: "Sesiones láser", value: laserSessions.length },
    { label: "Historial clínico", value: clinicalHistory ? "Completo" : "Pendiente" },
    { label: "Consentimiento", value: latestConsent ? "Firmado" : "Sin firmar" },
  ]), [laserSessions.length, clinicalHistory, latestConsent]);

  async function handleClinicalSave(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const saved = await upsertClinicalHistory(id, payload, clinicalHistory?.id || null);
      setClinicalHistory(saved);
      setClinicalModalOpen(false);
      setFeedback({ type: "success", message: "Historial clínico guardado correctamente." });
    } catch (submitError) {
      console.error(submitError);
      setFeedback({ type: "error", message: submitError.message || "No fue posible guardar el historial clínico." });
    } finally {
      setSaving(false);
    }
  }

  async function handleConsentSave(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const saved = await createInformedConsent(id, payload);
      setConsents((current) => [saved, ...current]);
      setConsentModalOpen(false);
      setFeedback({ type: "success", message: "Consentimiento informado guardado correctamente." });
    } catch (submitError) {
      console.error(submitError);
      setFeedback({ type: "error", message: submitError.message || "No fue posible guardar el consentimiento informado." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingWrap}>Cargando detalle del paciente...</div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <div style={styles.page}>
          <button type="button" onClick={() => navigate("/patients")} style={styles.backButton}>
            <ArrowLeft size={18} />
            Volver a pacientes
          </button>
          <EmptyState
            title="No fue posible cargar este paciente."
            description={error || "Intenta nuevamente en unos segundos."}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <button type="button" onClick={() => navigate("/patients")} style={styles.backButton}>
          <ArrowLeft size={18} />
          Volver a pacientes
        </button>

        <section style={styles.hero}>
          <div style={styles.heroIdentity}>
            <div style={styles.avatar}>{(patient.full_name || "P").charAt(0).toUpperCase()}</div>
            <div>
              <h1 style={styles.title}>{patient.full_name}</h1>
              <div style={styles.subtitle}>Detalle integral del paciente y seguimiento clínico</div>
              <div style={styles.metaList}>
                <span>{patient.phone || "Sin teléfono"}</span>
                <span>{patient.email || "Sin correo"}</span>
                <span>{patient.national_id || "Sin cédula"}</span>
              </div>
            </div>
          </div>

          <div style={styles.statsGrid}>
            {patientStats.map((item) => (
              <div key={item.label} style={styles.statCard}>
                <div style={styles.statLabel}>{item.label}</div>
                <div style={styles.statValue}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {feedback.message ? (
          <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
            {feedback.message}
          </div>
        ) : null}

        <div style={styles.tabs}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{ ...styles.tabButton, ...(isActive ? styles.tabButtonActive : {}) }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" ? (
          <div style={styles.grid}>
            <SectionCard title="Datos de contacto" subtitle="Información principal y de localización del paciente.">
              <DetailRows
                rows={[
                  ["Nombre", patient.full_name],
                  ["Teléfono", patient.phone || "No registrado"],
                  ["Correo", patient.email || "No registrado"],
                  ["Cédula", patient.national_id || "No registrada"],
                  ["Nacimiento", patient.birth_date || "No registrada"],
                  ["Dirección", patient.address || "No registrada"],
                ]}
              />
            </SectionCard>

            <SectionCard title="Notas generales" subtitle="Observaciones capturadas en el registro base del paciente.">
              <div style={styles.longCopy}>{patient.notes || "Sin notas generales registradas."}</div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === "clinical" ? (
          <ClinicalHistoryView
            history={clinicalHistory}
            onCreate={() => setClinicalModalOpen(true)}
            onEdit={() => setClinicalModalOpen(true)}
          />
        ) : null}

        {activeTab === "consent" ? (
          <InformedConsentView
            consent={latestConsent}
            consents={consents}
            onCreate={() => setConsentModalOpen(true)}
            onView={setSelectedConsent}
            onDownloadPdf={async (consent) => exportConsentPDF(patient, consent)}
          />
        ) : null}

        {activeTab === "laser" ? (
          <SectionCard title="Historial de sesiones láser" subtitle="Sesiones registradas para este paciente, ordenadas de más reciente a más antigua.">
            {laserSessions.length === 0 ? (
              <EmptyState
                title="No hay sesiones láser registradas todavía."
                description="Cuando se registren sesiones desde el módulo Láser, aparecerán aquí con su especialista y parámetros."
              />
            ) : (
              <div style={styles.sessionList}>
                {laserSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedLaserSession(session)}
                    style={styles.sessionCard}
                  >
                    <div style={styles.sessionTop}>
                      <div>
                        <div style={styles.sessionDate}>{formatDate(session.session_date)}</div>
                        <div style={styles.sessionSpecialist}>{session.specialistLabel}</div>
                      </div>
                      <div style={styles.sessionZoneBadge}>{session.zonesSummary || "Sin zonas"}</div>
                    </div>
                    <div style={styles.sessionNotes}>{session.general_notes || "Sin observaciones generales registradas."}</div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeTab === "billing" ? (
          <SectionCard title="Facturación" subtitle="Resumen de facturas relacionadas con este paciente.">
            {billingItems.length === 0 ? (
              <EmptyState
                title="No hay facturación registrada todavía."
                description="Cuando se creen facturas vinculadas a este paciente, aparecerán aquí para consulta rápida."
              />
            ) : (
              <div style={styles.billingList}>
                {billingItems.map((invoice) => (
                  <div key={invoice.id} style={styles.billingCard}>
                    <div style={styles.billingTop}>
                      <div>
                        <div style={styles.billingNumber}>{invoice.invoice_number || invoice.id}</div>
                        <div style={styles.billingMeta}>{formatDate(invoice.invoice_date || invoice.created_at)} · {invoice.specialistLabel || "Sin especialista"}</div>
                      </div>
                      <div style={styles.billingTotal}>${Number(invoice.total || 0).toFixed(2)}</div>
                    </div>
                    <div style={styles.billingStatusRow}>
                      <span style={styles.billingMethod}>{invoice.payment_method || "Método no definido"}</span>
                      <span style={styles.billingStatus}>{invoice.payment_status || "pendiente"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}
      </div>

      {clinicalModalOpen ? (
        <PatientModal
          title={clinicalHistory ? "Editar historial clínico" : "Crear historial clínico"}
          subtitle="Registra antecedentes, alergias, medicamentos y observaciones del paciente."
          onClose={() => setClinicalModalOpen(false)}
          wide
        >
          <ClinicalHistoryForm
            initialValues={clinicalHistory}
            onSubmit={handleClinicalSave}
            onCancel={() => setClinicalModalOpen(false)}
            loading={saving}
            submitLabel={clinicalHistory ? "Guardar cambios" : "Guardar historial"}
          />
        </PatientModal>
      ) : null}

      {consentModalOpen ? (
        <PatientModal
          title="Consentimiento informado"
          subtitle="Captura la aceptación del procedimiento con firma digital."
          onClose={() => setConsentModalOpen(false)}
          wide
        >
          <InformedConsentForm
            patient={patient}
            lookups={consentLookups}
            onSubmit={handleConsentSave}
            onCancel={() => setConsentModalOpen(false)}
            loading={saving}
          />
        </PatientModal>
      ) : null}

      {selectedLaserSession ? (
        <PatientModal
          title="Detalle de sesión láser"
          subtitle={selectedLaserSession.clientLabel || patient.full_name}
          onClose={() => setSelectedLaserSession(null)}
          wide
        >
          <LaserSessionDetail session={selectedLaserSession} />
        </PatientModal>
      ) : null}

      {selectedConsent ? (
        <PatientModal
          title="Consentimiento informado"
          subtitle={selectedConsent.patient_name}
          onClose={() => setSelectedConsent(null)}
          wide
        >
          <ConsentDocumentView consent={selectedConsent} />
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={async () => exportConsentPDF(patient, selectedConsent)} style={styles.downloadButton}>
              Descargar PDF
            </button>
          </div>
        </PatientModal>
      ) : null}
    </AppLayout>
  );
}

function DetailRows({ rows }) {
  return (
    <div style={styles.detailRows}>
      {rows.map(([label, value]) => (
        <div key={label} style={styles.detailRow}>
          <div style={styles.detailLabel}>{label}</div>
          <div style={styles.detailValue}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "No registrada";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "No registrada";
  }
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  loadingWrap: { color: "#8A7B72", fontSize: 16, padding: 24 },
  backButton: { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 14, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  hero: { background: "#FFFFFF", border: "1px solid #EFE5DC", borderRadius: 24, boxShadow: "0 18px 36px rgba(71, 47, 30, 0.05)", padding: 24, display: "grid", gridTemplateColumns: "1.3fr .7fr", gap: 20 },
  heroIdentity: { display: "flex", gap: 18, alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #D9B08A, #C77B72)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 700, flexShrink: 0 },
  title: { color: "#241F1D", fontSize: 32, fontWeight: 700, margin: 0 },
  subtitle: { color: "#8B7E74", fontSize: 15, lineHeight: 1.6, marginTop: 8 },
  metaList: { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, color: "#6E625B", fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  statCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 16 },
  statLabel: { color: "#9C8E84", fontSize: 12, textTransform: "uppercase", fontWeight: 700 },
  statValue: { color: "#261F1D", fontSize: 22, fontWeight: 700, marginTop: 8 },
  successBanner: { background: "rgba(95, 168, 123, 0.1)", border: "1px solid rgba(95, 168, 123, 0.25)", color: "#2F7A4A", borderRadius: 14, padding: "12px 14px", fontSize: 13 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 14, padding: "12px 14px", fontSize: 13 },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", background: "#F5EFE8", borderRadius: 18, padding: 6 },
  tabButton: { background: "transparent", border: "1px solid transparent", borderRadius: 14, padding: "12px 14px", color: "#7A6E67", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 },
  tabButtonActive: { background: "#FFFFFF", borderColor: "#E8DBCF", color: "#A15A58", boxShadow: "0 8px 18px rgba(75, 52, 35, 0.06)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  detailRows: { display: "flex", flexDirection: "column", gap: 12 },
  detailRow: { borderBottom: "1px solid #F3ECE6", paddingBottom: 10 },
  detailLabel: { color: "#9C8E84", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  detailValue: { color: "#2A2522", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
  longCopy: { color: "#4A403B", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 120 },
  sessionList: { display: "flex", flexDirection: "column", gap: 12 },
  sessionCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 18, textAlign: "left", cursor: "pointer" },
  sessionTop: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" },
  sessionDate: { color: "#241F1D", fontSize: 16, fontWeight: 700 },
  sessionSpecialist: { color: "#8B7E74", fontSize: 13, marginTop: 4 },
  sessionZoneBadge: { background: "#F3EAF8", color: "#915AA6", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  sessionNotes: { color: "#4A403B", fontSize: 14, lineHeight: 1.6, marginTop: 12 },
  billingList: { display: "flex", flexDirection: "column", gap: 12 },
  billingCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 18 },
  billingTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  billingNumber: { color: "#241F1D", fontSize: 16, fontWeight: 700 },
  billingMeta: { color: "#8B7E74", fontSize: 13, marginTop: 4 },
  billingTotal: { color: "#A15A58", fontSize: 22, fontWeight: 700 },
  billingStatusRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" },
  billingMethod: { color: "#6E625B", fontSize: 13 },
  billingStatus: { color: "#28704B", fontSize: 13, fontWeight: 700, textTransform: "capitalize" },
  downloadButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
