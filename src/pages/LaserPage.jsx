import { useEffect, useMemo, useState } from "react";
import { FlameKindling, Sparkles, Stethoscope, Users } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import LaserSessionDetail from "../components/laser/LaserSessionDetail";
import LaserSessionForm from "../components/laser/LaserSessionForm";
import LaserSessionModal from "../components/laser/LaserSessionModal";
import LaserSessionsTable from "../components/laser/LaserSessionsTable";
import ActionButton from "../components/ui/ActionButton";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import FilterToolbar from "../components/ui/FilterToolbar";
import PageHeader from "../components/ui/PageHeader";
import SearchInput from "../components/ui/SearchInput";
import SectionCard from "../components/ui/SectionCard";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import {
  createLaserSession,
  fetchLaserLookups,
  fetchLaserSessions,
  updateLaserSession,
} from "../services/laser";

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
      setFeedback({
        type: "error",
        message: error.message || "No fue posible cargar las sesiones láser.",
      });
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
      description: "Actividad registrada en la jornada actual.",
      icon: Sparkles,
      accent: { background: "#EEF5F1", color: BRANDING.colors.primaryStrong },
    },
    {
      title: "Últimos 7 días",
      value: sessions.filter((session) => withinLastDays(session.session_date, 7)).length,
      description: "Seguimiento acumulado de la semana clínica.",
      icon: FlameKindling,
      accent: { background: "#F4EEE6", color: "#9A774A" },
    },
    {
      title: "Pacientes tratados",
      value: uniquePatients,
      description: "Pacientes únicos con al menos una sesión registrada.",
      icon: Users,
      accent: { background: "#EEF3F8", color: "#496985" },
    },
    {
      title: "Mayor actividad",
      value: topSpecialistEntry ? topSpecialistEntry[0] : "—",
      description: topSpecialistEntry ? `${topSpecialistEntry[1]} sesiones registradas.` : "Todavía no hay sesiones acumuladas.",
      icon: Stethoscope,
      accent: { background: "#F5ECEF", color: "#93506A" },
    },
  ];

  async function handleCreate(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await createLaserSession(payload);
      await loadLaserData();
      setShowCreateModal(false);
      setFeedback({
        type: "success",
        message: payload.client_package_id
          ? "Sesión registrada y descontada del paquete."
          : "Sesión láser registrada correctamente.",
      });
    } catch (error) {
      console.error("Error creating laser session", error);
      setFeedback({
        type: "error",
        message: error.message || "No fue posible registrar la sesión láser.",
      });
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
      setFeedback({
        type: "error",
        message: error.message || "No fue posible actualizar la sesión láser.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Seguimiento técnico"
          title="Láser"
          subtitle="Registro de parámetros por zona, paquete utilizado y observaciones clínicas de cada sesión."
          actions={(
            <ActionButton
              onClick={() => setShowCreateModal(true)}
              disabled={!lookups.clients.length}
            >
              + Registrar sesión
            </ActionButton>
          )}
        />

        <div style={styles.metricsGrid}>
          {summaryCards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>

        <SectionCard
          title="Sesiones registradas"
          subtitle="Consulta el historial técnico, filtra por fecha o especialista y abre cada sesión sin perder contexto clínico."
        >
          <FilterToolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por paciente, especialista o zona"
            />

            <div style={styles.filterGroup}>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                style={styles.filterInput}
              />
              <select
                value={selectedSpecialist}
                onChange={(event) => {
                  if (!isSpecialist) setSelectedSpecialist(event.target.value);
                }}
                disabled={isSpecialist}
                style={{
                  ...styles.filterInput,
                  minWidth: 240,
                  ...(isSpecialist ? styles.filterInputDisabled : {}),
                }}
              >
                <option value="">Todas las especialistas</option>
                {lookups.specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.full_name}
                  </option>
                ))}
              </select>
            </div>
          </FilterToolbar>

          {feedback.message ? (
            <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
              {feedback.message}
            </div>
          ) : null}

          <div style={styles.contentWrap}>
            {loading ? (
              <div style={styles.loadingCopy}>Cargando sesiones láser...</div>
            ) : lookups.clients.length === 0 ? (
              <EmptyState
                title="Primero debes registrar un paciente antes de crear una sesión láser."
                description="Una vez que existan pacientes en el sistema, podrás registrar sus parámetros y dejar trazabilidad técnica por zona."
              />
            ) : (
              <LaserSessionsTable
                sessions={filteredSessions}
                onView={setViewingSession}
                onEdit={setEditingSession}
                emptyState={(
                  <EmptyState
                    title="No hay sesiones láser registradas todavía."
                    description="Comienza registrando la primera sesión para documentar zonas tratadas, parámetros y progreso por paciente."
                    action={(
                      <ActionButton onClick={() => setShowCreateModal(true)}>
                        Registrar primera sesión
                      </ActionButton>
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
          subtitle="Registra paciente, paquete activo, zonas tratadas y parámetros técnicos correspondientes."
          onClose={() => setShowCreateModal(false)}
          wide
        >
          <LaserSessionForm
            lookups={lookups}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Guardar sesión"
            loading={saving}
            initialValues={{
              session_date: new Date().toISOString().split("T")[0],
              specialist_id: isSpecialist ? profile?.specialist_id || "" : "",
            }}
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
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginLeft: "auto",
  },
  filterInput: {
    minHeight: 46,
    borderRadius: 16,
    border: `1px solid ${BRANDING.colors.border}`,
    background: BRANDING.colors.card,
    padding: "0 14px",
    color: BRANDING.colors.text,
    fontSize: 14,
    outline: "none",
  },
  filterInputDisabled: {
    background: "#F1EEE8",
    color: BRANDING.colors.textMuted,
  },
  successBanner: {
    marginTop: 16,
    background: "#EAF6ED",
    border: "1px solid #CFE8D8",
    color: "#28704B",
    borderRadius: 18,
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 600,
  },
  errorBanner: {
    marginTop: 16,
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 18,
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 600,
  },
  contentWrap: {
    marginTop: 18,
  },
  loadingCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    padding: "6px 0",
  },
};
