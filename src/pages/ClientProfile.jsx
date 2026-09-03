import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  FilePenLine,
  FileSignature,
  NotebookTabs,
  ReceiptText,
  Waves,
  Camera,
  ListChecks,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ClinicalHistoryForm from "../components/clinical/ClinicalHistoryForm";
import ClinicalHistoryView from "../components/clinical/ClinicalHistoryView";
import ConsentDocumentView from "../components/clinical/ConsentDocumentView";
import InformedConsentForm from "../components/clinical/InformedConsentForm";
import InformedConsentView from "../components/clinical/InformedConsentView";
import AppLayout from "../components/layout/AppLayout";
import LaserSessionDetail from "../components/laser/LaserSessionDetail";
import ClientPackagesCard from "../components/patients/ClientPackagesCard";
import { EvolutionPhotosPanel, PatientFollowupsPanel, PatientRelationshipOverview } from "../components/patients/PatientGrowthPanels";
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
import { fetchAppointmentsByClient } from "../services/appointments";
import { fetchClientPackagesByClient } from "../services/clientPackages";
import { fetchInvoicesByClient } from "../services/finance";
import { fetchLaserSessionsByClient } from "../services/laser";
import { fetchPatientById } from "../services/patients";
import { fetchPatientEvolutionPhotos, fetchPatientFollowups } from "../services/patientGrowth";
import { exportConsentPDF } from "../utils/exportPDF";
import { useAuth } from "../hooks/useAuth";

const TABS = [
  { key: "overview", label: "Información general", icon: NotebookTabs },
  { key: "appointments", label: "Historial de citas", icon: CalendarClock },
  { key: "clinical", label: "Historial clínico", icon: FilePenLine },
  { key: "consent", label: "Consentimiento informado", icon: FileSignature },
  { key: "laser", label: "Sesiones láser", icon: Waves },
  { key: "billing", label: "Facturación", icon: ReceiptText },
  { key: "followups", label: "Seguimientos", icon: ListChecks },
  { key: "evolution", label: "Evolución", icon: Camera },
];

export default function ClientProfile() {
  const { profile } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState(null);
  const [consents, setConsents] = useState([]);
  const [laserSessions, setLaserSessions] = useState([]);
  const [clientPackages, setClientPackages] = useState([]);
  const [billingItems, setBillingItems] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [evolutionPhotos, setEvolutionPhotos] = useState([]);
  const [consentLookups, setConsentLookups] = useState({ specialists: [], services: [] });
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({
    appointments: "",
    clinical: "",
    laser: "",
    billing: "",
    followups: "",
    evolution: "",
  });
  const [clinicalModalOpen, setClinicalModalOpen] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [selectedLaserSession, setSelectedLaserSession] = useState(null);
  const [selectedConsent, setSelectedConsent] = useState(null);

  async function loadPatientProfile() {
    setLoading(true);
    setError("");
    setSectionErrors({
      appointments: "",
      clinical: "",
      laser: "",
      billing: "",
      followups: "",
      evolution: "",
    });

    try {
      const patientResult = await fetchPatientById(id);
      setPatient(patientResult);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No fue posible cargar este paciente.");
      setLoading(false);
      return;
    }

    const results = await Promise.allSettled([
      fetchAppointmentsByClient(id),
      fetchClinicalHistory(id),
      fetchInformedConsents(id),
      fetchLaserSessionsByClient(id),
      fetchConsentLookups(),
      fetchInvoicesByClient(id),
      fetchClientPackagesByClient(id, { activeOnly: true }),
      fetchPatientFollowups(id),
      fetchPatientEvolutionPhotos(id),
    ]);

    const [
      appointmentsResult,
      clinicalResult,
      consentResults,
      laserResult,
      consentLookupResult,
      invoicesResult,
      packagesResult,
      followupsResult,
      evolutionResult,
    ] = results;

    if (appointmentsResult.status === "fulfilled") {
      setAppointments(appointmentsResult.value);
    } else {
      setAppointments([]);
      setSectionErrors((current) => ({
        ...current,
        appointments: "No se pudo cargar el historial de citas.",
      }));
      console.error(appointmentsResult.reason);
    }

    if (clinicalResult.status === "fulfilled") {
      setClinicalHistory(clinicalResult.value);
    } else {
      setClinicalHistory(null);
      setSectionErrors((current) => ({
        ...current,
        clinical: "No se pudo cargar el historial clínico.",
      }));
      console.error(clinicalResult.reason);
    }

    if (consentResults.status === "fulfilled") {
      setConsents(consentResults.value);
    } else {
      setConsents([]);
      console.error(consentResults.reason);
    }

    if (laserResult.status === "fulfilled") {
      setLaserSessions(laserResult.value);
    } else {
      setLaserSessions([]);
      setSectionErrors((current) => ({
        ...current,
        laser: "No se pudieron cargar las sesiones láser.",
      }));
      console.error(laserResult.reason);
    }

    if (consentLookupResult.status === "fulfilled") {
      setConsentLookups(consentLookupResult.value);
    } else {
      setConsentLookups({ specialists: [], services: [] });
      console.error(consentLookupResult.reason);
    }

    if (invoicesResult.status === "fulfilled") {
      setBillingItems(invoicesResult.value || []);
    } else {
      setBillingItems([]);
      setSectionErrors((current) => ({
        ...current,
        billing: "No se pudo cargar la facturación vinculada.",
      }));
      console.error(invoicesResult.reason);
    }

    if (packagesResult.status === "fulfilled") {
      setClientPackages(packagesResult.value);
    } else {
      setClientPackages([]);
      console.error(packagesResult.reason);
    }

    if (followupsResult.status === "fulfilled") {
      setFollowups(followupsResult.value);
    } else {
      setFollowups([]);
      setSectionErrors((current) => ({ ...current, followups: "No se pudieron cargar los seguimientos." }));
      console.error(followupsResult.reason);
    }

    if (evolutionResult.status === "fulfilled") {
      setEvolutionPhotos(evolutionResult.value);
    } else {
      setEvolutionPhotos([]);
      setSectionErrors((current) => ({ ...current, evolution: "No se pudieron cargar las fotografías de evolución." }));
      console.error(evolutionResult.reason);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPatientProfile();
  }, [id]);

  const latestConsent = consents[0] || null;

  async function refreshPatientGrowth() {
    const results = await Promise.allSettled([fetchPatientFollowups(id), fetchPatientEvolutionPhotos(id)]);
    if (results[0].status === "fulfilled") setFollowups(results[0].value);
    if (results[1].status === "fulfilled") setEvolutionPhotos(results[1].value);
  }

  const patientStats = useMemo(
    () => [
      { label: "Citas registradas", value: appointments.length },
      { label: "Sesiones láser", value: laserSessions.length },
      { label: "Historial clínico", value: clinicalHistory ? "Completo" : "Pendiente" },
      { label: "Consentimiento", value: latestConsent ? "Firmado" : "Sin firmar" },
    ],
    [appointments.length, laserSessions.length, clinicalHistory, latestConsent],
  );

  async function handleClinicalSave(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const saved = await upsertClinicalHistory(id, payload, clinicalHistory?.id || null);
      setClinicalHistory(saved);
      setClinicalModalOpen(false);
      setFeedback({ type: "success", message: "Historial clínico guardado correctamente." });
      setSectionErrors((current) => ({ ...current, clinical: "" }));
    } catch (submitError) {
      console.error(submitError);
      setFeedback({
        type: "error",
        message: submitError.message || "No fue posible guardar el historial clínico.",
      });
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
      setFeedback({
        type: "error",
        message: submitError.message || "No fue posible guardar el consentimiento informado.",
      });
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
          <div style={styles.overviewStack}>
            <div style={styles.grid}>
              <SectionCard
                title="Datos de contacto"
                subtitle="Información principal y de localización del paciente."
              >
                <DetailRows
                  rows={[
                    ["Nombre", patient.full_name],
                    ["Teléfono", patient.phone || "No registrado"],
                    ["Correo", patient.email || "No registrado"],
                    ["Cédula", patient.national_id || "No registrada"],
                    ["Nacimiento", formatDate(patient.birth_date)],
                    ["Dirección", patient.address || "No registrada"],
                  ]}
                />
              </SectionCard>

              <SectionCard
                title="Notas generales"
                subtitle="Observaciones capturadas en el registro base del paciente."
              >
                <div style={styles.longCopy}>{patient.notes || "Sin notas generales registradas."}</div>
              </SectionCard>
            </div>

            <ClientPackagesCard packages={clientPackages} />
            <PatientRelationshipOverview patient={patient} appointments={appointments} packages={clientPackages} laserSessions={laserSessions} />
          </div>
        ) : null}

        {activeTab === "appointments" ? (
          <SectionCard
            title="Historial de citas"
            subtitle="Seguimiento cronológico de citas, servicios y cabinas asignadas."
          >
            {sectionErrors.appointments ? (
              <div style={styles.inlineError}>{sectionErrors.appointments}</div>
            ) : null}

            {!sectionErrors.appointments && appointments.length === 0 ? (
              <EmptyState
                title="No hay citas registradas para este paciente."
                description="Cuando se creen citas desde Agenda, aparecerán aquí con su estado y detalles."
              />
            ) : null}

            {!sectionErrors.appointments && appointments.length > 0 ? (
              <div style={styles.appointmentList}>
                {appointments.map((appointment) => (
                  <div key={appointment.id} style={styles.appointmentCard}>
                    <div style={styles.appointmentTop}>
                      <div>
                        <div style={styles.appointmentDate}>
                          {formatDate(appointment.appointment_date)} · {formatTimeRange(appointment.start_time, appointment.end_time)}
                        </div>
                        <div style={styles.appointmentMeta}>
                          {appointment.specialistLabel} · {appointment.serviceLabel}
                        </div>
                      </div>
                      <span style={getStatusBadgeStyle(appointment.status)}>{formatStatus(appointment.status)}</span>
                    </div>
                    <div style={styles.appointmentMetaGrid}>
                      <InfoPill label="Cabina" value={appointment.cabinLabel || "Sin cabina"} />
                      <InfoPill label="Tipo" value={appointment.serviceType === "paquete" ? "Paquete" : "Servicio"} />
                    </div>
                    {appointment.notes ? <div style={styles.appointmentNotes}>{appointment.notes}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "clinical" ? (
          <>
            {sectionErrors.clinical ? <div style={styles.inlineError}>{sectionErrors.clinical}</div> : null}
            <ClinicalHistoryView
              history={clinicalHistory}
              onCreate={() => setClinicalModalOpen(true)}
              onEdit={() => setClinicalModalOpen(true)}
            />
          </>
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
          <SectionCard
            title="Historial de sesiones láser"
            subtitle="Sesiones registradas para este paciente, ordenadas de más reciente a más antigua."
            action={(
              <button
                type="button"
                onClick={() => navigate(`/laser?client_id=${patient.id}`)}
                style={styles.secondaryButton}
              >
                Registrar sesión láser
              </button>
            )}
          >
            {sectionErrors.laser ? <div style={styles.inlineError}>{sectionErrors.laser}</div> : null}

            {!sectionErrors.laser && laserSessions.length === 0 ? (
              <EmptyState
                title="No hay sesiones láser registradas para este paciente."
                description="Cuando se registren sesiones desde el módulo Láser, aparecerán aquí con su especialista y parámetros."
              />
            ) : null}

            {!sectionErrors.laser && laserSessions.length > 0 ? (
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
                    {session.clientPackageLabel ? (
                      <div style={styles.sessionPackage}>Paquete: {session.clientPackageLabel}</div>
                    ) : null}
                    <div style={styles.sessionNotes}>
                      {session.general_notes || "Sin observaciones generales registradas."}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "billing" ? (
          <SectionCard title="Facturación" subtitle="Resumen de facturas relacionadas con este paciente.">
            {sectionErrors.billing ? <div style={styles.inlineError}>{sectionErrors.billing}</div> : null}

            {!sectionErrors.billing && billingItems.length === 0 ? (
              <EmptyState
                title="No hay facturación registrada todavía."
                description="Cuando se creen facturas vinculadas a este paciente, aparecerán aquí para consulta rápida."
              />
            ) : null}

            {!sectionErrors.billing && billingItems.length > 0 ? (
              <div style={styles.billingList}>
                {billingItems.map((invoice) => (
                  <div key={invoice.id} style={styles.billingCard}>
                    <div style={styles.billingTop}>
                      <div>
                        <div style={styles.billingNumber}>{invoice.invoice_number || invoice.id}</div>
                        <div style={styles.billingMeta}>
                          {formatDate(invoice.invoice_date || invoice.created_at)} · {invoice.specialistLabel || "Sin especialista"}
                        </div>
                      </div>
                      <div style={styles.billingTotal}>RD${formatCurrency(invoice.total || 0)}</div>
                    </div>
                    <div style={styles.billingStatusRow}>
                      <span style={styles.billingMethod}>{invoice.payment_method || "Método no definido"}</span>
                      <span style={styles.billingStatus}>{formatStatus(invoice.payment_status || "pendiente")}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "followups" ? (
          <>
            {sectionErrors.followups ? <div style={styles.inlineError}>{sectionErrors.followups}</div> : null}
            <PatientFollowupsPanel patient={patient} appointments={appointments} laserSessions={laserSessions} followups={followups} profile={profile} onChanged={refreshPatientGrowth} />
          </>
        ) : null}

        {activeTab === "evolution" ? (
          <>
            {sectionErrors.evolution ? <div style={styles.inlineError}>{sectionErrors.evolution}</div> : null}
            <EvolutionPhotosPanel patient={patient} appointments={appointments} laserSessions={laserSessions} photos={evolutionPhotos} profile={profile} onChanged={refreshPatientGrowth} />
          </>
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
            <button
              type="button"
              onClick={async () => exportConsentPDF(patient, selectedConsent)}
              style={styles.secondaryButton}
            >
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

function InfoPill({ label, value }) {
  return (
    <div style={styles.infoPill}>
      <span style={styles.infoPillLabel}>{label}</span>
      <span style={styles.infoPillValue}>{value}</span>
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

function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return "Hora no disponible";
  const start = startTime ? startTime.slice(0, 5) : "--:--";
  const end = endTime ? endTime.slice(0, 5) : "--:--";
  return `${start} - ${end}`;
}

function formatStatus(value) {
  const labels = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    completada: "Completada",
    cancelada: "Cancelada",
    no_asistio: "No asistió",
    pagada: "Pagada",
  };

  return labels[value] || value || "Sin estado";
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusBadgeStyle(status) {
  const map = {
    pendiente: { background: "#F8EFD0", color: "#8D6A14" },
    confirmada: { background: "#E3F2E8", color: "#1E5A49" },
    completada: { background: "#E2ECF8", color: "#315B96" },
    cancelada: { background: "#F8E2E3", color: "#A34A52" },
    no_asistio: { background: "#ECE8E4", color: "#6F6258" },
    pagada: { background: "#E3F2E8", color: "#1E5A49" },
  };

  return {
    ...styles.statusBadge,
    ...(map[status] || map.pendiente),
  };
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  loadingWrap: { color: "#6F6258", fontSize: 16, padding: 24 },
  backButton: {
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#FFFDF8",
    color: "#12382F",
    border: "1px solid #E7DCCB",
    borderRadius: 14,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  hero: {
    background: "#FFFDF8",
    border: "1px solid #E7DCCB",
    borderRadius: 24,
    boxShadow: "0 18px 36px rgba(18, 56, 47, 0.06)",
    padding: 24,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
  heroIdentity: { display: "flex", gap: 18, alignItems: "center" },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    background: "linear-gradient(135deg, #12382F, #1E5A49)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 28,
    fontWeight: 700,
    flexShrink: 0,
  },
  title: { color: "#1B1B1B", fontSize: 32, fontWeight: 700, margin: 0 },
  subtitle: { color: "#6F6258", fontSize: 15, lineHeight: 1.6, marginTop: 8 },
  metaList: { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, color: "#6F6258", fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 },
  statCard: { background: "#F8F3EA", border: "1px solid #E7DCCB", borderRadius: 18, padding: 16 },
  statLabel: { color: "#6F6258", fontSize: 12, textTransform: "uppercase", fontWeight: 700 },
  statValue: { color: "#12382F", fontSize: 22, fontWeight: 700, marginTop: 8 },
  successBanner: {
    background: "rgba(30, 90, 73, 0.08)",
    border: "1px solid rgba(30, 90, 73, 0.18)",
    color: "#1E5A49",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
  },
  errorBanner: {
    background: "rgba(194, 95, 102, 0.1)",
    border: "1px solid rgba(194, 95, 102, 0.2)",
    color: "#9B3F48",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
  },
  inlineError: {
    background: "#FCECEC",
    border: "1px solid #F3D3D6",
    color: "#9B3F48",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", background: "#F8F3EA", borderRadius: 18, padding: 6 },
  tabButton: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 14,
    padding: "12px 14px",
    color: "#6F6258",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  tabButtonActive: {
    background: "#FFFDF8",
    borderColor: "#D8CAB5",
    color: "#12382F",
    boxShadow: "0 8px 18px rgba(18, 56, 47, 0.05)",
  },
  overviewStack: { display: "flex", flexDirection: "column", gap: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  detailRows: { display: "flex", flexDirection: "column", gap: 12 },
  detailRow: { borderBottom: "1px solid #F0E7DB", paddingBottom: 10 },
  detailLabel: { color: "#6F6258", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  detailValue: { color: "#1B1B1B", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
  longCopy: { color: "#3E3935", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 120 },
  appointmentList: { display: "flex", flexDirection: "column", gap: 12 },
  appointmentCard: { background: "#FFFDF8", border: "1px solid #E7DCCB", borderRadius: 18, padding: 18 },
  appointmentTop: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" },
  appointmentDate: { color: "#1B1B1B", fontSize: 16, fontWeight: 700 },
  appointmentMeta: { color: "#6F6258", fontSize: 13, marginTop: 4 },
  appointmentMetaGrid: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  appointmentNotes: { color: "#4A403B", fontSize: 14, lineHeight: 1.6, marginTop: 14, whiteSpace: "pre-wrap" },
  infoPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#F8F3EA",
    border: "1px solid #E7DCCB",
    borderRadius: 999,
    padding: "8px 12px",
  },
  infoPillLabel: { color: "#6F6258", fontSize: 12, fontWeight: 700 },
  infoPillValue: { color: "#12382F", fontSize: 12, fontWeight: 700 },
  statusBadge: { borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700, display: "inline-flex" },
  secondaryButton: {
    background: "#12382F",
    color: "#FFFDF8",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  sessionList: { display: "flex", flexDirection: "column", gap: 12 },
  sessionCard: {
    background: "#FFFDF8",
    border: "1px solid #E7DCCB",
    borderRadius: 18,
    padding: 18,
    textAlign: "left",
    cursor: "pointer",
  },
  sessionTop: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" },
  sessionDate: { color: "#1B1B1B", fontSize: 16, fontWeight: 700 },
  sessionSpecialist: { color: "#6F6258", fontSize: 13, marginTop: 4 },
  sessionZoneBadge: { background: "#EAF3EE", color: "#1E5A49", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  sessionPackage: { color: "#12382F", fontSize: 13, fontWeight: 700, marginTop: 12 },
  sessionNotes: { color: "#4A403B", fontSize: 14, lineHeight: 1.6, marginTop: 12 },
  billingList: { display: "flex", flexDirection: "column", gap: 12 },
  billingCard: { background: "#FFFDF8", border: "1px solid #E7DCCB", borderRadius: 18, padding: 18 },
  billingTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  billingNumber: { color: "#1B1B1B", fontSize: 16, fontWeight: 700 },
  billingMeta: { color: "#6F6258", fontSize: 13, marginTop: 4 },
  billingTotal: { color: "#12382F", fontSize: 22, fontWeight: 700 },
  billingStatusRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" },
  billingMethod: { color: "#6F6258", fontSize: 13 },
  billingStatus: { color: "#1E5A49", fontSize: 13, fontWeight: 700, textTransform: "capitalize" },
};

