import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import AppointmentFilters from "../components/appointments/AppointmentFilters";
import AppointmentForm from "../components/appointments/AppointmentForm";
import AppointmentModal from "../components/appointments/AppointmentModal";
import AppointmentsTable from "../components/appointments/AppointmentsTable";
import EmptyState from "../components/ui/EmptyState";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import {
  createAppointment,
  fetchAppointmentLookups,
  fetchAppointments,
  normalizeAppointmentsWithLookups,
  updateAppointment,
  updateAppointmentStatus,
} from "../services/appointments";

function formatDate(dateValue) {
  if (!dateValue) return "No registrada";
  try {
    return new Date(dateValue).toLocaleDateString();
  } catch {
    return "No registrada";
  }
}

function AppointmentDetail({ appointment }) {
  return (
    <div style={styles.detailGrid}>
      <div style={styles.detailCard}>
        <div style={styles.detailTitle}>{appointment.patientLabel}</div>
        <div style={styles.detailRows}>
          <DetailRow label="Fecha" value={formatDate(appointment.appointment_date)} />
          <DetailRow label="Hora de inicio" value={appointment.start_time?.slice(0, 5) || "—"} />
          <DetailRow label="Hora de fin" value={appointment.end_time?.slice(0, 5) || "—"} />
          <DetailRow label="Especialista" value={appointment.specialistLabel} />
          <DetailRow label="Servicio" value={appointment.serviceLabel} />
          <DetailRow label="Cabina" value={appointment.cabinLabel} />
          <DetailRow label="Estado" value={<StatusBadge status={appointment.statusLabel} />} />
        </div>
      </div>

      <div style={styles.detailCard}>
        <div style={styles.detailTitle}>Notas</div>
        <div style={styles.notesCopy}>{appointment.notes || "Sin notas registradas para esta cita."}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

export default function AgendaPage() {
  const { profile, isSpecialist } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [lookups, setLookups] = useState({ clients: [], specialists: [], services: [], cabins: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSpecialist, setSelectedSpecialist] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [viewingAppointment, setViewingAppointment] = useState(null);

  useEffect(() => {
    loadAgenda();
  }, [isSpecialist, profile?.specialist_id]);

  async function loadAgenda() {
    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const [appointmentsResult, lookupsResult] = await Promise.all([
        fetchAppointments({ specialistId: isSpecialist ? profile?.specialist_id : null }),
        fetchAppointmentLookups({ specialistId: isSpecialist ? profile?.specialist_id : null }),
      ]);

      setAppointments(appointmentsResult.appointments);
      setLookups(lookupsResult);
      if (isSpecialist && profile?.specialist_id) {
        setSelectedSpecialist(profile.specialist_id);
      }
    } catch (error) {
      console.error("Error loading agenda data", error);
      setFeedback({ type: "error", message: error.message || "No fue posible cargar la agenda." });
    } finally {
      setLoading(false);
    }
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesDate = selectedDate ? appointment.appointment_date === selectedDate : true;
      const matchesSpecialist = selectedSpecialist ? appointment.specialist_id === selectedSpecialist : true;
      const matchesStatus = selectedStatus ? appointment.statusLabel === selectedStatus : true;
      return matchesDate && matchesSpecialist && matchesStatus;
    });
  }, [appointments, selectedDate, selectedSpecialist, selectedStatus]);

  async function handleCreate(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const created = await createAppointment({
        client_id: payload.client_id,
        specialist_id: payload.specialist_id,
        service_id: payload.service_id,
        cabin_id: payload.cabin_id,
        appointment_date: payload.appointment_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        status: "pendiente",
        notes: payload.notes,
      }, payload.specialist);

      const normalized = normalizeAppointmentsWithLookups([created], lookups)[0];
      setAppointments((current) => [...current, normalized].sort(sortAppointments));
      setShowCreateModal(false);
      setFeedback({ type: "success", message: "Cita creada correctamente." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible guardar la cita." });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(payload) {
    if (!editingAppointment) return;

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const updated = await updateAppointment(editingAppointment.id, {
        client_id: payload.client_id,
        specialist_id: payload.specialist_id,
        service_id: payload.service_id,
        cabin_id: payload.cabin_id,
        appointment_date: payload.appointment_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        status: payload.status,
        notes: payload.notes,
      }, payload.specialist);

      const normalized = normalizeAppointmentsWithLookups([updated], lookups)[0];
      setAppointments((current) => current.map((item) => (item.id === normalized.id ? normalized : item)).sort(sortAppointments));
      setEditingAppointment(null);
      setViewingAppointment((current) => (current?.id === normalized.id ? normalized : current));
      setFeedback({ type: "success", message: "Cita actualizada correctamente." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar la cita." });
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatusChange(appointment, status) {
    setFeedback({ type: "", message: "" });

    try {
      const updated = await updateAppointmentStatus(appointment.id, status);
      const normalized = normalizeAppointmentsWithLookups([updated], lookups)[0];
      setAppointments((current) => current.map((item) => (item.id === normalized.id ? normalized : item)).sort(sortAppointments));
      setViewingAppointment((current) => (current?.id === normalized.id ? normalized : current));
      setFeedback({ type: "success", message: "Estado actualizado correctamente." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible cambiar el estado." });
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Agenda</h1>
            <p style={styles.subtitle}>Gestión de citas por especialista y cabina</p>
          </div>
          <button type="button" onClick={() => setShowCreateModal(true)} style={styles.primaryButton}>+ Nueva cita</button>
        </div>

        <SectionCard title="Agenda del día" subtitle="Organiza la operación diaria del centro con filtros por fecha, especialista y estado.">
          <AppointmentFilters
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedSpecialist={selectedSpecialist}
            onSpecialistChange={(value) => {
              if (!isSpecialist) {
                setSelectedSpecialist(value);
              }
            }}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            specialists={lookups.specialists}
            specialistLocked={isSpecialist}
          />

          {feedback.message ? (
            <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
              {feedback.message}
            </div>
          ) : null}

          <div style={{ marginTop: 18 }}>
            {loading ? (
              <div style={styles.loadingCopy}>Cargando citas...</div>
            ) : (
              <AppointmentsTable
                appointments={filteredAppointments}
                onView={setViewingAppointment}
                onEdit={setEditingAppointment}
                onStatusChange={handleQuickStatusChange}
                emptyState={(
                  <EmptyState
                    title="No hay citas programadas para esta fecha."
                    description="Cuando registres una nueva cita, aparecerá aquí con su especialista, cabina y estado."
                    action={(
                      <button type="button" onClick={() => setShowCreateModal(true)} style={styles.primaryButton}>
                        Crear nueva cita
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
        <AppointmentModal
          title="Nueva cita"
          subtitle="Programa una nueva cita para el paciente, asignando especialista y cabina."
          onClose={() => setShowCreateModal(false)}
        >
          <AppointmentForm
            lookups={lookups}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Guardar cita"
            loading={saving}
            initialValues={{ appointment_date: selectedDate, status: "pendiente", specialist_id: isSpecialist ? profile?.specialist_id || "" : "" }}
            specialistLocked={isSpecialist}
          />
        </AppointmentModal>
      ) : null}

      {editingAppointment ? (
        <AppointmentModal
          title="Editar cita"
          subtitle="Actualiza la información operativa y el estado de la cita."
          onClose={() => setEditingAppointment(null)}
        >
          <AppointmentForm
            lookups={lookups}
            onSubmit={handleEdit}
            onCancel={() => setEditingAppointment(null)}
            submitLabel="Guardar cambios"
            loading={saving}
            initialValues={editingAppointment}
            specialistLocked={isSpecialist}
          />
        </AppointmentModal>
      ) : null}

      {viewingAppointment ? (
        <AppointmentModal
          title="Detalle de cita"
          subtitle="Resumen de la cita programada y datos operativos."
          onClose={() => setViewingAppointment(null)}
          wide
        >
          <AppointmentDetail appointment={viewingAppointment} />
        </AppointmentModal>
      ) : null}
    </AppLayout>
  );
}

function sortAppointments(a, b) {
  const aDate = `${a.appointment_date || ""} ${a.start_time || ""}`;
  const bDate = `${b.appointment_date || ""} ${b.start_time || ""}`;
  return aDate.localeCompare(bDate);
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  title: { color: "#241F1D", fontSize: 34, fontWeight: 700, margin: 0 },
  subtitle: { color: "#8B7E74", fontSize: 15, margin: "8px 0 0", lineHeight: 1.6 },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  loadingCopy: { color: "#8A7B72", fontSize: 14, padding: "8px 0" },
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
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 16,
  },
  detailCard: {
    background: "#FCFAF7",
    border: "1px solid #F0E6DD",
    borderRadius: 20,
    padding: 18,
  },
  detailTitle: {
    color: "#2B2522",
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 14,
  },
  detailRows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  detailRow: {
    borderBottom: "1px solid #F3ECE6",
    paddingBottom: 10,
  },
  detailLabel: {
    color: "#9C8E84",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#2A2522",
    fontSize: 15,
    marginTop: 6,
    lineHeight: 1.5,
  },
  notesCopy: {
    color: "#4A403B",
    fontSize: 14,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
};
