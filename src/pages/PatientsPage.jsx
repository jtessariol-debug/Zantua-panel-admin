import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import PatientOnboardingWizard from "../components/patients/PatientOnboardingWizard";
import PatientDeactivateModal from "../components/patients/PatientDeactivateModal";
import PatientDetail from "../components/patients/PatientDetail";
import PatientForm from "../components/patients/PatientForm";
import PatientModal from "../components/patients/PatientModal";
import PatientsTable from "../components/patients/PatientsTable";
import EmptyState from "../components/ui/EmptyState";
import SearchInput from "../components/ui/SearchInput";
import SectionCard from "../components/ui/SectionCard";
import { useAuth } from "../hooks/useAuth";
import { fetchConsentLookups, createInformedConsent, upsertClinicalHistory } from "../services/clinical";
import { createPatient, deactivatePatient, fetchPatients, reactivatePatient, updatePatient } from "../services/patients";
import { exportConsentPDF } from "../utils/exportPDF";
import { useNavigate } from "react-router-dom";

export default function PatientsPage() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [reactivationTarget, setReactivationTarget] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [onboardingStep, setOnboardingStep] = useState("patient");
  const [onboardingPatient, setOnboardingPatient] = useState(null);
  const [generatedConsent, setGeneratedConsent] = useState(null);
  const [consentLookups, setConsentLookups] = useState({ specialists: [], services: [] });

  useEffect(() => {
    loadPatients();
    loadConsentLookups();
  }, [statusFilter, isAdmin]);

  async function loadPatients() {
    setLoading(true);
    try {
      if (statusFilter === "inactive" && !isAdmin) {
        setFeedback({ type: "error", message: "No tienes permisos para realizar esta acción." });
        setPatients([]);
        setLoading(false);
        return;
      }

      const result = await fetchPatients({ active: statusFilter !== "inactive" });
      setPatients(result);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible cargar los pacientes." });
    } finally {
      setLoading(false);
    }
  }

  async function loadConsentLookups() {
    try {
      const result = await fetchConsentLookups();
      setConsentLookups(result);
    } catch (error) {
      console.error(error);
    }
  }

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((patient) => (
      patient.full_name?.toLowerCase().includes(term)
      || patient.phone?.toLowerCase().includes(term)
      || patient.email?.toLowerCase().includes(term)
      || patient.national_id?.toLowerCase().includes(term)
    ));
  }, [patients, search]);

  async function handleDeactivatePatient() {
    if (!deactivationTarget) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await deactivatePatient(deactivationTarget.id, deactivationReason, profile);
      setDeactivationTarget(null);
      setDeactivationReason("");
      setFeedback({ type: "success", message: "Paciente dado de baja correctamente." });
      await loadPatients();
      if (selectedPatient?.id === deactivationTarget.id) {
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible dar de baja al paciente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivatePatient() {
    if (!reactivationTarget) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await reactivatePatient(reactivationTarget.id, profile);
      setReactivationTarget(null);
      setFeedback({ type: "success", message: "Paciente reactivado correctamente." });
      await loadPatients();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible reactivar al paciente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const created = await createPatient(payload);
      setPatients((current) => [created, ...current]);
      setOnboardingPatient(created);
      setOnboardingStep("clinical");
      setFeedback({ type: "success", message: "Paciente creado correctamente. Continúa con el historial clínico y consentimiento." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible guardar el paciente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveClinicalHistory(payload) {
    if (!onboardingPatient) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await upsertClinicalHistory(onboardingPatient.id, payload, null);
      setOnboardingStep("consent");
      setFeedback({ type: "success", message: "Historial clínico guardado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible guardar el historial clínico." });
    } finally {
      setSaving(false);
    }
  }

  function handleSkipClinicalHistory() {
    setOnboardingStep("consent");
  }

  async function handleSaveConsent(payload) {
    if (!onboardingPatient) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const createdClient = onboardingPatient;
      const consentText = payload.consent_text;
      const patientName = payload.patient_name;
      const nationalId = payload.national_id;
      const signatureData = payload.signature_data;
      const consentPayload = {
        client_id: createdClient.id,
        consent_text: consentText,
        patient_name: patientName,
        national_id: nationalId,
        signature_data: signatureData,
        signed_at: new Date().toISOString(),
      };

      console.log("CREATED CLIENT:", createdClient);
      console.log("CONSENT TEXT:", consentText);
      console.log("PATIENT NAME:", patientName);
      console.log("NATIONAL ID:", nationalId);
      console.log("SIGNATURE DATA:", signatureData);
      console.log("CONSENT PAYLOAD:", consentPayload);

      const consent = await createInformedConsent(createdClient.id, consentPayload);
      setGeneratedConsent(consent);
      await exportConsentPDF(createdClient, consent);
      setOnboardingStep("done");
      setFeedback({ type: "success", message: "Consentimiento guardado y PDF generado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible guardar el consentimiento informado." });
    } finally {
      setSaving(false);
    }
  }

  function resetOnboarding() {
    setShowCreateModal(false);
    setOnboardingStep("patient");
    setOnboardingPatient(null);
    setGeneratedConsent(null);
  }

  function handleFinishOnboarding() {
    const patientId = onboardingPatient?.id;
    resetOnboarding();
    if (patientId) {
      navigate(`/client/${patientId}`);
    }
  }

  async function handleEdit(payload) {
    if (!editingPatient) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const updated = await updatePatient(editingPatient.id, payload);
      setPatients((current) => current.map((patient) => (patient.id === updated.id ? updated : patient)));
      setEditingPatient(null);
      setSelectedPatient((current) => (current?.id === updated.id ? updated : current));
      setFeedback({ type: "success", message: "Paciente actualizado correctamente." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar el paciente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Pacientes</h1>
            <p style={styles.subtitle}>Gestión de pacientes y datos de contacto</p>
          </div>

          <button type="button" onClick={() => setShowCreateModal(true)} style={styles.primaryButton}>
            + Nuevo paciente
          </button>
        </div>

        <SectionCard title="Listado de pacientes" subtitle="Busca, consulta y actualiza la información base de cada paciente.">
          <div style={styles.toolbar}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, teléfono, correo o cédula"
            />
            <div style={styles.segmented}>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                style={{ ...styles.segmentButton, ...(statusFilter === "active" ? styles.segmentButtonActive : {}) }}
              >
                Pacientes activos
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  style={{ ...styles.segmentButton, ...(statusFilter === "inactive" ? styles.segmentButtonActive : {}) }}
                >
                  Pacientes inactivos
                </button>
              ) : null}
            </div>
          </div>

          {feedback.message ? (
            <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
              {feedback.message}
            </div>
          ) : null}

          <div style={{ marginTop: 18 }}>
            {loading ? (
              <div style={styles.loadingCopy}>Cargando pacientes...</div>
            ) : (
              <PatientsTable
                rows={filteredPatients}
                onView={setSelectedPatient}
                onEdit={setEditingPatient}
                onDeactivate={(patient) => {
                  if (!isAdmin) {
                    setFeedback({ type: "error", message: "No tienes permisos para realizar esta acción." });
                    return;
                  }
                  setDeactivationTarget(patient);
                  setDeactivationReason(patient.deletion_reason || "");
                }}
                onReactivate={(patient) => {
                  if (!isAdmin) {
                    setFeedback({ type: "error", message: "No tienes permisos para realizar esta acción." });
                    return;
                  }
                  setReactivationTarget(patient);
                }}
                isAdmin={isAdmin}
                showInactive={statusFilter === "inactive"}
                emptyState={(
                  <EmptyState
                    title={statusFilter === "inactive" ? "No hay pacientes inactivos." : "No hay pacientes registrados todavía."}
                    description={statusFilter === "inactive"
                      ? "Cuando des de baja pacientes, aparecerán aquí con su fecha y motivo."
                      : "Comienza creando el primer paciente para empezar a construir el historial clínico y operativo del centro."}
                    action={(
                      statusFilter === "active" ? (
                        <button type="button" onClick={() => setShowCreateModal(true)} style={styles.primaryButton}>
                          Crear primer paciente
                        </button>
                      ) : null
                    )}
                  />
                )}
              />
            )}
          </div>
        </SectionCard>
      </div>

      {showCreateModal ? (
        <PatientModal
          title="Nuevo paciente"
          subtitle="Flujo clínico inicial: datos del paciente, historial clínico y consentimiento informado."
          onClose={resetOnboarding}
          wide
        >
          <PatientOnboardingWizard
            lookups={consentLookups}
            patient={onboardingPatient}
            currentStep={onboardingStep}
            loading={saving}
            generatedConsent={generatedConsent}
            onCreatePatient={handleCreate}
            onSaveClinicalHistory={handleSaveClinicalHistory}
            onSkipClinicalHistory={handleSkipClinicalHistory}
            onSaveConsent={handleSaveConsent}
            onDownloadConsentPdf={async () => {
              if (onboardingPatient && generatedConsent) {
                await exportConsentPDF(onboardingPatient, generatedConsent);
              }
            }}
            onFinish={handleFinishOnboarding}
            onClose={resetOnboarding}
          />
        </PatientModal>
      ) : null}

      {editingPatient ? (
        <PatientModal
          title="Editar paciente"
          subtitle="Actualiza la información de contacto y referencia del paciente."
          onClose={() => setEditingPatient(null)}
        >
          <PatientForm
            initialValues={editingPatient}
            onSubmit={handleEdit}
            onCancel={() => setEditingPatient(null)}
            submitLabel="Guardar cambios"
            loading={saving}
          />
        </PatientModal>
      ) : null}

      {selectedPatient ? (
        <PatientModal
          title="Detalle del paciente"
          subtitle="Resumen de contacto e información clínica base."
          onClose={() => setSelectedPatient(null)}
          wide
        >
          <PatientDetail patient={selectedPatient} />
        </PatientModal>
      ) : null}

      {deactivationTarget ? (
        <PatientDeactivateModal
          patient={deactivationTarget}
          mode="deactivate"
          reason={deactivationReason}
          onReasonChange={setDeactivationReason}
          onConfirm={handleDeactivatePatient}
          onClose={() => {
            setDeactivationTarget(null);
            setDeactivationReason("");
          }}
          loading={saving}
        />
      ) : null}

      {reactivationTarget ? (
        <PatientDeactivateModal
          patient={reactivationTarget}
          mode="reactivate"
          reason=""
          onReasonChange={() => {}}
          onConfirm={handleReactivatePatient}
          onClose={() => setReactivationTarget(null)}
          loading={saving}
        />
      ) : null}
    </AppLayout>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  title: {
    color: "#241F1D",
    fontSize: 34,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#8B7E74",
    fontSize: 15,
    margin: "8px 0 0",
    lineHeight: 1.6,
  },
  toolbar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segmented: {
    display: "inline-flex",
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 16,
    padding: 4,
    gap: 4,
    flexWrap: "wrap",
  },
  segmentButton: {
    background: "transparent",
    color: "#6F6258",
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  segmentButtonActive: {
    background: "#EAF3EE",
    color: "#12382F",
  },
  primaryButton: {
    background: "linear-gradient(135deg, #C38A63, #A85A66)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  loadingCopy: {
    color: "#8A7B72",
    fontSize: 14,
    padding: "8px 0",
  },
  errorBanner: {
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 14,
    padding: "12px 14px",
    marginTop: 16,
    fontSize: 13,
  },
  successBanner: {
    background: "rgba(95, 168, 123, 0.1)",
    border: "1px solid rgba(95, 168, 123, 0.25)",
    color: "#2F7A4A",
    borderRadius: 14,
    padding: "12px 14px",
    marginTop: 16,
    fontSize: 13,
  },
};
