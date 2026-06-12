import { useEffect, useMemo, useState } from "react";
import { FlameKindling, Sparkles, Stethoscope, Users } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import LaserSessionDetail from "../components/laser/LaserSessionDetail";
import LaserSessionForm from "../components/laser/LaserSessionForm";
import LaserSessionModal from "../components/laser/LaserSessionModal";
import LaserSessionsTable from "../components/laser/LaserSessionsTable";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import SearchInput from "../components/ui/SearchInput";
import SectionCard from "../components/ui/SectionCard";
import { useAuth } from "../hooks/useAuth";
import { createLaserSession, fetchLaserLookups, fetchLaserSessions, updateLaserSession } from "../services/laser";

function isSameDay(value, reference = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate()
  );
}

function withinLastDays(value, days) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);
  return date >= cutoff;
}

export default function LaserPage() {
  const { profile, isSpecialist } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [lookups, setLookups] = useState({ clients: [], specialists: [], appointments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSpecialist, setSelectedSpecialist] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [viewingSession, setViewingSession] = useState(null);

  useEffect(() => {
    loadLaserData();
  }, [isSpecialist, profile?.specialist_id]);

  async function loadLaserData() {
    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const [sessionsResult, lookupsResult] = await Promise.all([
        fetchLaserSessions({ specialistId: isSpecialist ? profile?.specialist_id : null }),
        fetchLaserLookups({ specialistId: isSpecialist ? profile?.specialist_id : null }),
      ]);

      setSessions(sessionsResult.sessions);
      setLookups(lookupsResult);
      if (isSpecialist && profile?.specialist_id) {
        setSelectedSpecialist(profile.specialist_id);
      }
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible cargar las sesiones láser." });
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesSearch = !term
        || session.clientLabel?.toLowerCase().includes(term)
        || session.specialistLabel?.toLowerCase().includes(term)
        || session.zonesSummary?.toLowerCase().includes(term);

      const matchesDate = selectedDate ? session.session_date === selectedDate : true;
      const matchesSpecialist = selectedSpecialist ? session.specialist_id === selectedSpecialist : true;

      return matchesSearch && matchesDate && matchesSpecialist;
    });
  }, [sessions, search, selectedDate, selectedSpecialist]);

  const uniquePatients = new Set(sessions.map((session) => session.client_id).filter(Boolean)).size;
  const specialistCounts = sessions.reduce((acc, session) => {
    const key = session.specialistLabel || "Especialista";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topSpecialistEntry = Object.entries(specialistCounts).sort((a, b) => b[1] - a[1])[0];

  const summaryCards = [
    {
      title: "Sesiones hoy",
      value: sessions.filter((session) => isSameDay(session.session_date)).length,
      description: "Sesiones registradas durante la jornada actual.",
      icon: Sparkles,
      accent: { background: "#FCEEE5", color: "#B76A4D" },
    },
    {
      title: "Sesiones últimos 7 días",
      value: sessions.filter((session) => withinLastDays(session.session_date, 7)).length,
      description: "Seguimiento acumulado de la última semana.",
      icon: FlameKindling,
      accent: { background: "#F3EAF8", color: "#915AA6" },
    },
    {
      title: "Pacientes tratados",
      value: uniquePatients,
      description: "Pacientes únicos con al menos una sesión registrada.",
      icon: Users,
      accent: { background: "#EAF6ED", color: "#28704B" },
    },
    {
      title: "Especialista con más sesiones",
      value: topSpecialistEntry ? topSpecialistEntry[0] : "—",
      description: topSpecialistEntry ? `${topSpecialistEntry[1]} sesiones registradas.` : "Todavía no hay sesiones acumuladas.",
      icon: Stethoscope,
      accent: { background: "#FBE7EE", color: "#AB496B" },
    },
  ];

  async function handleCreate(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await createLaserSession(payload);
      await loadLaserData();
      setShowCreateModal(false);
      setFeedback({ type: "success", message: "Sesión láser registrada correctamente." });
    } catch (error) {
      console.error("Error creating laser session", error);
      setFeedback({ type: "error", message: error.message || "No fue posible registrar la sesión láser." });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(payload) {
    if (!editingSession) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await updateLaserSession(editingSession.id, payload);
      await loadLaserData();
      setEditingSession(null);
      setFeedback({ type: "success", message: "Sesión láser actualizada correctamente." });
    } catch (error) {
      console.error("Error updating laser session", error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar la sesión láser." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Láser</h1>
            <p style={styles.subtitle}>Registro de parámetros por zona, sesiones y observaciones clínicas</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={styles.primaryButton}
            disabled={!lookups.clients.length}
          >
            + Nueva sesión láser
          </button>
        </div>

        <div style={styles.metricsGrid}>
          {summaryCards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>

        <SectionCard title="Sesiones registradas" subtitle="Consulta, filtra y administra el seguimiento técnico de las sesiones láser.">
          <div style={styles.toolbar}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por paciente, especialista o zona"
            />

            <div style={styles.filterGroup}>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={styles.filterInput} />
              <select value={selectedSpecialist} onChange={(event) => { if (!isSpecialist) setSelectedSpecialist(event.target.value); }} disabled={isSpecialist} style={{ ...styles.filterInput, ...(isSpecialist ? styles.filterInputDisabled : {}) }}>
                <option value="">Todas las especialistas</option>
                {lookups.specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>{specialist.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {feedback.message ? (
            <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
              {feedback.message}
            </div>
          ) : null}

          <div style={{ marginTop: 18 }}>
            {loading ? (
              <div style={styles.loadingCopy}>Cargando sesiones láser...</div>
            ) : lookups.clients.length === 0 ? (
              <EmptyState
                title="Primero debes registrar un paciente antes de crear una sesión láser."
                description="Una vez que existan pacientes en el sistema, podrás registrar sus parámetros de depilación láser."
              />
            ) : (
              <LaserSessionsTable
                sessions={filteredSessions}
                onView={setViewingSession}
                onEdit={setEditingSession}
                emptyState={(
                  <EmptyState
                    title="No hay sesiones láser registradas todavía."
                    description="Comienza registrando la primera sesión para llevar trazabilidad completa por zona y parámetros."
                    action={(
                      <button type="button" onClick={() => setShowCreateModal(true)} style={styles.primaryButton}>
                        Registrar primera sesión
                      </button>
                    )}
                  />
                )}
              />
            )}
          </div>
        </SectionCard>
      </div>

      {showCreateModal ? (
        <LaserSessionModal
          title="Nueva sesión láser"
          subtitle="Registra la sesión, las zonas tratadas y los parámetros técnicos correspondientes."
          onClose={() => setShowCreateModal(false)}
          wide
        >
          <LaserSessionForm
            lookups={lookups}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Guardar sesión"
            loading={saving}
            initialValues={{ session_date: new Date().toISOString().split("T")[0], specialist_id: isSpecialist ? profile?.specialist_id || "" : "" }}
            specialistLocked={isSpecialist}
          />
        </LaserSessionModal>
      ) : null}

      {editingSession ? (
        <LaserSessionModal
          title="Editar sesión láser"
          subtitle="Actualiza paciente, especialista, observaciones y parámetros por zona."
          onClose={() => setEditingSession(null)}
          wide
        >
          <LaserSessionForm
            lookups={lookups}
            initialValues={editingSession}
            onSubmit={handleEdit}
            onCancel={() => setEditingSession(null)}
            submitLabel="Guardar cambios"
            loading={saving}
            specialistLocked={isSpecialist}
          />
        </LaserSessionModal>
      ) : null}

      {viewingSession ? (
        <LaserSessionModal
          title="Detalle de sesión láser"
          subtitle="Resumen clínico y técnico de la sesión seleccionada."
          onClose={() => setViewingSession(null)}
          wide
        >
          <LaserSessionDetail session={viewingSession} />
        </LaserSessionModal>
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
    alignItems: "flex-start",
    gap: 16,
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
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  toolbar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterGroup: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  filterInput: {
    minWidth: 220,
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 14,
    padding: "14px 15px",
    color: "#2A2522",
    fontSize: 14,
  },
  filterInputDisabled: {
    background: "#F1EFEA",
    color: "#7A716A",
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
