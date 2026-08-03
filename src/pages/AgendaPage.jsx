import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import AppointmentFilters from "../components/appointments/AppointmentFilters";
import AppointmentForm from "../components/appointments/AppointmentForm";
import AppointmentModal from "../components/appointments/AppointmentModal";
import AppointmentsTable from "../components/appointments/AppointmentsTable";
import CalendarView from "../components/appointments/CalendarView";
import ActionButton from "../components/ui/ActionButton";
import EmptyState from "../components/ui/EmptyState";
import FilterToolbar from "../components/ui/FilterToolbar";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import {
  buildWeekRange,
  createAppointment,
  fetchAppointmentById,
  fetchAppointmentLookups,
  fetchAppointments,
  formatLocalDateForInput,
  updateAppointment,
  updateAppointmentStatus,
} from "../services/appointments";
import {
  buildAppointmentWhatsAppMessage,
  buildAppointmentWhatsAppUrl,
} from "../utils/whatsapp";

function formatDate(dateValue) {
  if (!dateValue) return "No registrada";
  try {
    return new Date(dateValue).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "No registrada";
  }
}

function buildWhatsAppLink(appointment) {
  return buildAppointmentWhatsAppUrl(appointment);
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

function AppointmentDetail({ appointment, onEdit }) {
  const whatsappLink = buildWhatsAppLink(appointment);
  const whatsappMessage = buildAppointmentWhatsAppMessage(appointment);
  const hasPhone = Boolean(whatsappLink);

  return (
    <div style={styles.detailGrid}>
      <div style={styles.detailHero}>
        <div>
          <div style={styles.detailEyebrow}>Cita programada</div>
          <div style={styles.detailTitle}>{appointment.patientLabel}</div>
          <div style={styles.detailSubtitle}>{appointment.specialistLabel} · {appointment.serviceLabel}</div>
        </div>
        <StatusBadge status={appointment.statusLabel} />
      </div>

      <SectionCard title="Resumen operativo" subtitle="Datos visibles para coordinación, recepción y seguimiento.">
        <div style={styles.detailRows}>
          <DetailRow label="Fecha" value={formatDate(appointment.appointment_date)} />
          <DetailRow label="Hora de inicio" value={appointment.start_time?.slice(0, 5) || "—"} />
          <DetailRow label="Hora de fin" value={appointment.end_time?.slice(0, 5) || "—"} />
          <DetailRow label="Teléfono" value={appointment.patientPhone || "Sin teléfono"} />
          <DetailRow label="Especialista" value={appointment.specialistLabel} />
          <DetailRow label="Servicio" value={appointment.serviceLabel} />
          <DetailRow label="Cabina" value={appointment.cabinLabel} />
          <DetailRow label="WhatsApp" value={appointment.clientPhone || appointment.patientPhone || "Sin teléfono registrado"} />
        </div>

        <div style={styles.detailActions}>
          <ActionButton onClick={() => onEdit?.(appointment)} variant="ghost">Editar cita</ActionButton>
          {hasPhone ? (
            <ActionButton
              onClick={() => navigator.clipboard?.writeText(appointment.clientPhone || appointment.patientPhone || "")}
              variant="secondary"
            >
              Copiar teléfono
            </ActionButton>
          ) : null}
          {whatsappLink ? (
            <ActionButton as="a" href={whatsappLink} target="_blank" rel="noreferrer" variant="success">
              Enviar WhatsApp
            </ActionButton>
          ) : (
            <span style={styles.detailHint}>Este paciente no tiene teléfono registrado.</span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Mensaje de WhatsApp" subtitle="Texto prellenado para confirmación manual.">
        <div style={styles.notesCopy}>{whatsappMessage}</div>
      </SectionCard>

      <SectionCard title="Notas" subtitle="Observaciones internas de la cita.">
        <div style={styles.notesCopy}>{appointment.notes || "Sin notas registradas para esta cita."}</div>
      </SectionCard>
    </div>
  );
}

export default function AgendaPage() {
  const { profile, isSpecialist } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [lookups, setLookups] = useState({ clients: [], specialists: [], services: [], cabins: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatLocalDateForInput());
  const [selectedSpecialist, setSelectedSpecialist] = useState("");
  const [selectedCabin, setSelectedCabin] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [calendarMode, setCalendarMode] = useState("day");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [viewingAppointment, setViewingAppointment] = useState(null);
  const loadRequestRef = useRef(0);

  const loadAgenda = useCallback(async ({ preserveFeedback = false, expectedAppointmentId = null } = {}) => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);

    if (!preserveFeedback) {
      setFeedback({ type: "", message: "" });
    }

    const normalizedDate = selectedDate || formatLocalDateForInput();
    const shouldLoadWeek = viewMode === "calendar" && calendarMode === "week";
    const weekRange = shouldLoadWeek ? buildWeekRange(normalizedDate) : null;
    const specialistId = isSpecialist ? profile?.specialist_id : null;

    try {
      const [appointmentsResult, lookupsResult] = await Promise.all([
        fetchAppointments(
          shouldLoadWeek
            ? { specialistId, dateFrom: weekRange?.from || normalizedDate, dateTo: weekRange?.to || normalizedDate }
            : { specialistId, appointmentDate: normalizedDate }
        ),
        fetchAppointmentLookups({ specialistId }),
      ]);

      if (requestId !== loadRequestRef.current) return null;

      if (expectedAppointmentId && !appointmentsResult.appointments.some((item) => item.id === expectedAppointmentId)) {
        throw new Error("La cita se creó, pero no pudo volver a consultarse desde el servidor.");
      }

      setAppointments(appointmentsResult.appointments);
      setLookups({
        clients: lookupsResult.clients || [],
        specialists: lookupsResult.specialists || [],
        services: lookupsResult.services || [],
        cabins: lookupsResult.cabins || [],
      });

      if (isSpecialist && specialistId) {
        setSelectedSpecialist(specialistId);
      }

      return appointmentsResult.appointments;
    } catch (error) {
      if (requestId !== loadRequestRef.current) return null;
      console.error("Error loading agenda data", error);
      setFeedback({ type: "error", message: error.message || "No se pudieron cargar las citas." });
      return null;
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [calendarMode, isSpecialist, profile?.specialist_id, selectedDate, viewMode]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesSpecialist = selectedSpecialist ? appointment.specialist_id === selectedSpecialist : true;
      const matchesCabin = selectedCabin ? appointment.cabin_id === selectedCabin : true;
      const matchesStatus = selectedStatus ? appointment.statusLabel === selectedStatus : true;

      if (viewMode === "calendar" && calendarMode === "week" && selectedDate) {
        return isDateWithinWeek(appointment.appointment_date, selectedDate) && matchesSpecialist && matchesCabin && matchesStatus;
      }

      const matchesDate = selectedDate ? appointment.appointment_date === selectedDate : true;
      return matchesDate && matchesSpecialist && matchesCabin && matchesStatus;
    });
  }, [appointments, selectedDate, selectedSpecialist, selectedCabin, selectedStatus, viewMode, calendarMode]);

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
        status: payload.status || "pendiente",
        notes: payload.notes,
      }, payload.specialist);

      const fetchedById = await fetchAppointmentById(created.id);
      if (!fetchedById?.id) {
        throw new Error("La cita se creó, pero no pudo volver a consultarse desde el servidor.");
      }

      const refreshedAppointments = await loadAgenda({ preserveFeedback: true, expectedAppointmentId: created.id });
      if (!refreshedAppointments?.some((item) => item.id === created.id)) {
        throw new Error("La cita se creó, pero no pudo recargarse en la agenda.");
      }

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

      const refreshedAppointments = await loadAgenda({ preserveFeedback: true, expectedAppointmentId: updated.id });
      if (!refreshedAppointments?.some((item) => item.id === updated.id)) {
        throw new Error("La cita se actualizó, pero no pudo recargarse en la agenda.");
      }

      const refreshedItem = refreshedAppointments.find((item) => item.id === updated.id) || null;
      setEditingAppointment(null);
      setViewingAppointment((current) => (current?.id === updated.id ? refreshedItem : current));
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
      const refreshedAppointments = await loadAgenda({ preserveFeedback: true, expectedAppointmentId: updated.id });
      const refreshedItem = refreshedAppointments?.find((item) => item.id === updated.id) || null;
      setViewingAppointment((current) => (current?.id === updated.id ? refreshedItem : current));
      setFeedback({ type: "success", message: "Estado actualizado correctamente." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No fue posible cambiar el estado." });
    }
  }

  function openEditFromDetail(appointment) {
    setViewingAppointment(null);
    setEditingAppointment(appointment);
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Operaciones"
          title="Agenda"
          subtitle="Gestión de citas por especialista, paciente y cabina con lectura clara para operación diaria."
          actions={(
            <>
              <div style={styles.viewModeGroup}>
                <button type="button" onClick={() => setViewMode("list")} style={{ ...styles.viewModeButton, ...(viewMode === "list" ? styles.viewModeButtonActive : {}) }}>
                  Lista
                </button>
                <button type="button" onClick={() => setViewMode("calendar")} style={{ ...styles.viewModeButton, ...(viewMode === "calendar" ? styles.viewModeButtonActive : {}) }}>
                  Calendario
                </button>
              </div>
              <ActionButton onClick={() => setShowCreateModal(true)}>Nueva cita</ActionButton>
            </>
          )}
        />

        <SectionCard title="Agenda operativa" subtitle="Visualiza, filtra y gestiona citas sin salir del panel principal.">
          <FilterToolbar align="flex-start">
            <AppointmentFilters
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedSpecialist={selectedSpecialist}
              onSpecialistChange={(value) => { if (!isSpecialist) setSelectedSpecialist(value); }}
              selectedCabin={selectedCabin}
              onCabinChange={setSelectedCabin}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              specialists={lookups.specialists}
              cabins={lookups.cabins}
              specialistLocked={isSpecialist}
            />
          </FilterToolbar>

          {feedback.message ? (
            <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>{feedback.message}</div>
          ) : null}

          <div style={{ marginTop: 18 }}>
            {loading ? (
              <div style={styles.loadingCopy}>Cargando citas...</div>
            ) : viewMode === "calendar" ? (
              <CalendarView
                appointments={filteredAppointments}
                selectedDate={selectedDate}
                calendarMode={calendarMode}
                onModeChange={setCalendarMode}
                onAppointmentClick={setViewingAppointment}
                onCreateAppointment={() => setShowCreateModal(true)}
              />
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
                    action={<ActionButton onClick={() => setShowCreateModal(true)}>Crear nueva cita</ActionButton>}
                  />
                )}
              />
            )}
          </div>
        </SectionCard>
      </div>

      {showCreateModal ? (
        <AppointmentModal title="Nueva cita" subtitle="Programa una nueva cita para el paciente, asignando especialista y cabina." onClose={() => setShowCreateModal(false)}>
          <AppointmentForm
            lookups={lookups}
            services={lookups.services}
            cabins={lookups.cabins}
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
        <AppointmentModal title="Editar cita" subtitle="Actualiza la información operativa y el estado de la cita." onClose={() => setEditingAppointment(null)}>
          <AppointmentForm
            lookups={lookups}
            services={lookups.services}
            cabins={lookups.cabins}
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
        <AppointmentModal title="Detalle de cita" subtitle="Resumen de la cita programada y datos operativos." onClose={() => setViewingAppointment(null)} wide>
          <AppointmentDetail appointment={viewingAppointment} onEdit={openEditFromDetail} />
        </AppointmentModal>
      ) : null}
    </AppLayout>
  );
}

function isDateWithinWeek(appointmentDate, selectedDate) {
  if (!appointmentDate || !selectedDate) return false;
  const [year, month, day] = selectedDate.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  const weekDay = base.getDay();
  const offset = weekDay === 0 ? -6 : 1 - weekDay;
  const monday = new Date(base);
  monday.setDate(base.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const [appointmentYear, appointmentMonth, appointmentDay] = appointmentDate.split("-").map(Number);
  const current = new Date(appointmentYear, appointmentMonth - 1, appointmentDay, 12, 0, 0, 0);
  return current >= monday && current <= sunday;
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  viewModeGroup: {
    display: "inline-flex",
    background: "#F5EFE6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  viewModeButton: {
    border: "none",
    background: "transparent",
    color: BRANDING.colors.textMuted,
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  viewModeButtonActive: {
    background: BRANDING.colors.primary,
    color: "#FFFDF8",
  },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14, padding: "8px 0" },
  errorBanner: {
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 16,
    padding: "12px 14px",
    marginTop: 16,
    fontSize: 13,
  },
  successBanner: {
    background: "rgba(95, 168, 123, 0.1)",
    border: "1px solid rgba(95, 168, 123, 0.25)",
    color: "#2F7A4A",
    borderRadius: 16,
    padding: "12px 14px",
    marginTop: 16,
    fontSize: 13,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  detailHero: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
    padding: 20,
    borderRadius: 24,
    background: "linear-gradient(180deg, #FFFCF7 0%, #FBF6EE 100%)",
    border: `1px solid ${BRANDING.colors.border}`,
  },
  detailEyebrow: {
    color: BRANDING.colors.secondary,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  detailTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 24,
    fontWeight: 700,
    marginTop: 8,
  },
  detailSubtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 1.6,
  },
  detailRows: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  detailActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  detailRow: {
    borderBottom: "1px solid #F3ECE6",
    paddingBottom: 10,
  },
  detailLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  detailValue: {
    color: BRANDING.colors.text,
    fontSize: 15,
    marginTop: 6,
    lineHeight: 1.6,
  },
  notesCopy: {
    color: "#4A403B",
    fontSize: 14,
    lineHeight: 1.75,
    whiteSpace: "pre-wrap",
  },
  detailHint: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    alignSelf: "center",
  },
};
