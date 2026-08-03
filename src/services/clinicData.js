import { supabase } from "../lib/supabaseClient";
import { SPECIALIST_SCHEDULES } from "../lib/navigation";
import { fetchAppointments } from "./appointments";

function safeString(value) {
  return String(value || "").trim().toLowerCase();
}

function isVisibleOperationalSpecialist(specialist) {
  const normalizedName = String(specialist?.full_name || specialist?.name || "")
    .trim()
    .toUpperCase();

  return (
    specialist?.active === true
    && normalizedName !== "MARJAN PEÑA"
    && normalizedName !== "MARJAN PENA"
    && !normalizedName.includes("HISTÓRICO GOLDIE")
    && !normalizedName.includes("HISTORICO GOLDIE")
  );
}

function getDateFromAppointment(record) {
  const rawValue = record.starts_at
    || record.scheduled_at
    || record.date
    || record.appointment_date
    || record.start_time
    || null;

  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(date, reference = new Date()) {
  if (!date) return false;
  return (
    date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate()
  );
}

function formatTime(date) {
  if (!date) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function deriveAppointmentPatientName(item) {
  return item.patient_name
    || item.client_name
    || item.patient?.full_name
    || item.client?.name
    || item.patient_id
    || "Paciente";
}

function deriveSpecialistName(item) {
  return item.specialist_name
    || item.specialist?.full_name
    || item.provider_name
    || item.employee_name
    || "Especialista";
}

function deriveServiceName(item) {
  return item.service_name
    || item.service?.name
    || item.treatment_name
    || item.service_id
    || "Servicio";
}

function deriveCabinName(item) {
  return item.cabin_name
    || item.room_name
    || item.cabin?.name
    || item.room?.name
    || "Cabina no asignada";
}

export async function fetchSupabaseAppointments({ specialistId = null } = {}) {
  try {
    const result = await fetchAppointments({ specialistId });
    return result.appointments.map((item) => {
      const date = getDateFromAppointment(item);
      return {
        ...item,
        displayTime: item.displayTime || formatTime(date),
        parsedDate: date,
        patientLabel: item.patientLabel || deriveAppointmentPatientName(item),
        specialistLabel: item.specialistLabel || deriveSpecialistName(item),
        serviceLabel: item.serviceLabel || deriveServiceName(item),
        cabinLabel: item.cabinLabel || deriveCabinName(item),
        statusLabel: item.statusLabel || item.status || "pendiente",
      };
    });
  } catch (error) {
    console.error("Error loading appointments from Supabase", error);
    return [];
  }
}

export async function fetchSupabaseSpecialists({ specialistId = null } = {}) {
  try {
    let specialistsQuery = supabase
      .from("specialists")
      .select("*")
      .order("full_name", { ascending: true });

    if (specialistId) {
      specialistsQuery = specialistsQuery.eq("id", specialistId);
    }

    const { data, error } = await specialistsQuery;

    if (error) throw error;

    if (!data || data.length === 0) {
      return SPECIALIST_SCHEDULES.map((item) => ({
        id: item.name,
        full_name: item.name,
        schedule: item.schedule,
      }));
    }

    return data
      .filter(isVisibleOperationalSpecialist)
      .map((specialist) => {
      const fallback = SPECIALIST_SCHEDULES.find((entry) => safeString(entry.name) === safeString(specialist.full_name || specialist.name));
      return {
        ...specialist,
        full_name: specialist.full_name || specialist.name,
        schedule: specialist.schedule || fallback?.schedule || "Horario no definido",
      };
      });
  } catch (error) {
    console.error("Error loading specialists from Supabase", error);
    return SPECIALIST_SCHEDULES.map((item) => ({
      id: item.name,
      full_name: item.name,
      schedule: item.schedule,
    }));
  }
}

export async function fetchSupabaseClients({ clientIds = null } = {}) {
  try {
    let clientsQuery = supabase
      .from("clients")
      .select("id, full_name, phone, email, national_id, birth_date, address, notes, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (Array.isArray(clientIds)) {
      if (clientIds.length === 0) return [];
      clientsQuery = clientsQuery.in("id", clientIds);
    }

    const { data, error } = await clientsQuery;

    if (error) throw error;

    return (data || []).map((client) => ({
      ...client,
      name: client.full_name,
    }));
  } catch (error) {
    console.error("Error loading clients from Supabase", error);
    return [];
  }
}

export function getTodayAppointments(appointments) {
  return appointments.filter((appointment) => isSameDay(appointment.parsedDate));
}

export function getAppointmentStatusSummary(appointments) {
  return appointments.reduce((acc, appointment) => {
    const key = appointment.statusLabel || "pendiente";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function getAppointmentsBySpecialist(appointments) {
  return appointments.reduce((acc, appointment) => {
    const key = appointment.specialistLabel || "Especialista";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function getWeeklyIncomeSummary(appointments) {
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const result = days.map((label) => ({ label, value: 0 }));
  const now = new Date();
  const startOfWindow = new Date(now);
  startOfWindow.setDate(now.getDate() - 6);
  startOfWindow.setHours(0, 0, 0, 0);

  appointments.forEach((appointment) => {
    const date = appointment.parsedDate;
    if (!date || date < startOfWindow) return;

    const amount = Number(appointment.total || appointment.amount || appointment.price || 0);
    const dayIndex = date.getDay();
    result[dayIndex === 0 ? 6 : dayIndex - 1].value += Number.isFinite(amount) ? amount : 0;
  });

  return result;
}

export function mapSpecialistAvailability(specialists, appointments) {
  const todayAppointments = getTodayAppointments(appointments);

  return specialists.map((specialist) => {
    const specialistName = safeString(specialist.full_name || specialist.name);
    const dayAppointments = todayAppointments.filter(
      (appointment) => safeString(appointment.specialistLabel) === specialistName
    );

    return {
      ...specialist,
      appointmentsToday: dayAppointments.length,
      isAvailable: dayAppointments.length < 6,
    };
  });
}


