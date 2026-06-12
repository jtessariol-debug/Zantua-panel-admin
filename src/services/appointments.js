import { supabase } from "../lib/supabaseClient";
import { fetchSchedulingRules } from "./settings";

const BLOCKING_STATUSES = ["pendiente", "confirmada", "completada"];
const DEFAULT_DURATION_MINUTES = 40;

function toMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = String(time).split(":").map(Number);
  return (hours * 60) + minutes;
}

function toTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutes(time, minutes = DEFAULT_DURATION_MINUTES) {
  return toTimeString(toMinutes(time) + minutes);
}

function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}

function mapLookup(records, nameKey = "name") {
  return new Map((records || []).map((record) => [record.id, record[nameKey] || record.full_name || "—"]));
}

function normalizeAppointment(record, lookups = {}) {
  const clientMap = lookups.clientMap || new Map();
  const specialistMap = lookups.specialistMap || new Map();
  const serviceMap = lookups.serviceMap || new Map();
  const cabinMap = lookups.cabinMap || new Map();

  return {
    ...record,
    displayTime: record.start_time ? record.start_time.slice(0, 5) : "—",
    patientLabel: clientMap.get(record.client_id) || record.clients?.full_name || "Paciente",
    specialistLabel: specialistMap.get(record.specialist_id) || record.specialists?.full_name || "Especialista",
    serviceLabel: serviceMap.get(record.service_id) || record.services?.name || "Servicio",
    cabinLabel: cabinMap.get(record.cabin_id) || record.cabins?.name || "Cabina",
    statusLabel: record.status || "pendiente",
  };
}

export async function fetchAppointmentLookups({ specialistId = null } = {}) {
  const [clientsResponse, specialistsResponse, servicesResponse, cabinsResponse] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name", { ascending: true }),
    (specialistId
      ? supabase.from("specialists").select("*").eq("id", specialistId).order("full_name", { ascending: true })
      : supabase.from("specialists").select("*").order("full_name", { ascending: true })),
    supabase.from("services").select("id, name").order("name", { ascending: true }),
    supabase.from("cabins").select("id, name").order("name", { ascending: true }),
  ]);

  const errors = [
    clientsResponse.error,
    specialistsResponse.error,
    servicesResponse.error,
    cabinsResponse.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("Error loading appointment lookups", errors);
    throw new Error("No fue posible cargar la información de agenda.");
  }

  return {
    clients: clientsResponse.data || [],
    specialists: specialistsResponse.data || [],
    services: servicesResponse.data || [],
    cabins: cabinsResponse.data || [],
  };
}

export async function fetchAppointments({ specialistId = null } = {}) {
  const appointmentsQuery = specialistId
    ? supabase
      .from("appointments")
      .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
      .eq("specialist_id", specialistId)
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true })
    : supabase
      .from("appointments")
      .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true });

  const [appointmentsResponse, lookups] = await Promise.all([
    appointmentsQuery,
    fetchAppointmentLookups({ specialistId }),
  ]);

  if (appointmentsResponse.error) {
    console.error("Error loading appointments from Supabase", appointmentsResponse.error);
    throw new Error("No fue posible cargar las citas.");
  }

  const maps = {
    clientMap: mapLookup(lookups.clients, "full_name"),
    specialistMap: mapLookup(lookups.specialists, "full_name"),
    serviceMap: mapLookup(lookups.services, "name"),
    cabinMap: mapLookup(lookups.cabins, "name"),
  };

  return {
    appointments: (appointmentsResponse.data || []).map((item) => normalizeAppointment(item, maps)),
    lookups,
  };
}

export async function validateAppointmentConflict({ appointmentId, specialistId, cabinId, appointmentDate, startTime, endTime }) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, specialist_id, cabin_id, appointment_date, start_time, end_time, status")
    .eq("appointment_date", appointmentDate)
    .in("status", BLOCKING_STATUSES)
    .or(`specialist_id.eq.${specialistId},cabin_id.eq.${cabinId}`);

  if (error) {
    console.error("Error validating appointment conflict", error);
    throw new Error("No fue posible validar la disponibilidad.");
  }

  const collision = (data || []).some((item) => {
    if (appointmentId && item.id === appointmentId) return false;
    const sameSpecialist = item.specialist_id === specialistId;
    const sameCabin = item.cabin_id === cabinId;
    if (!sameSpecialist && !sameCabin) return false;
    return overlaps(startTime, endTime, item.start_time, item.end_time);
  });

  if (collision) {
    throw new Error("Ya existe una cita para esta especialista o cabina en ese horario.");
  }
}

export async function validateAppointmentSchedule({ specialist, startTime, endTime }) {
  const rules = await fetchSchedulingRules();
  const centerStart = rules?.center_open || "07:00";
  const centerEnd = rules?.center_close || "19:00";
  const specialistRule = specialist
    ? {
      start: specialist.start_time || null,
      end: specialist.end_time || null,
      open: Boolean(specialist.has_open_schedule),
    }
    : null;

  if (toMinutes(startTime) < toMinutes(centerStart)) {
    throw new Error("La hora de inicio debe ser igual o posterior a las 7:00 AM.");
  }

  if (!specialistRule?.open && toMinutes(endTime) > toMinutes(centerEnd)) {
    throw new Error("La cita excede el horario general del centro.");
  }

  if (specialistRule && !specialistRule.open && specialistRule.start && specialistRule.end) {
    if (toMinutes(startTime) < toMinutes(specialistRule.start) || toMinutes(endTime) > toMinutes(specialistRule.end)) {
      throw new Error("La cita está fuera del horario disponible de la especialista.");
    }
  }
}

export async function createAppointment(payload, specialist) {
  await validateAppointmentSchedule({
    specialist,
    startTime: payload.start_time,
    endTime: payload.end_time,
  });

  await validateAppointmentConflict({
    specialistId: payload.specialist_id,
    cabinId: payload.cabin_id,
    appointmentDate: payload.appointment_date,
    startTime: payload.start_time,
    endTime: payload.end_time,
  });

  const { data, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error creating appointment", error);
    throw new Error("No fue posible guardar la cita.");
  }

  return data;
}

export async function updateAppointment(appointmentId, payload, specialist) {
  await validateAppointmentSchedule({
    specialist,
    startTime: payload.start_time,
    endTime: payload.end_time,
  });

  await validateAppointmentConflict({
    appointmentId,
    specialistId: payload.specialist_id,
    cabinId: payload.cabin_id,
    appointmentDate: payload.appointment_date,
    startTime: payload.start_time,
    endTime: payload.end_time,
  });

  const { data, error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", appointmentId)
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error updating appointment", error);
    throw new Error("No fue posible actualizar la cita.");
  }

  return data;
}

export async function updateAppointmentStatus(appointmentId, status) {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error updating appointment status", error);
    throw new Error("No fue posible cambiar el estado de la cita.");
  }

  return data;
}

export function normalizeAppointmentsWithLookups(appointments, lookups) {
  const maps = {
    clientMap: mapLookup(lookups.clients, "full_name"),
    specialistMap: mapLookup(lookups.specialists, "full_name"),
    serviceMap: mapLookup(lookups.services, "name"),
    cabinMap: mapLookup(lookups.cabins, "name"),
  };

  return appointments.map((item) => normalizeAppointment(item, maps));
}

export function getDefaultDurationMinutes() {
  return DEFAULT_DURATION_MINUTES;
}
