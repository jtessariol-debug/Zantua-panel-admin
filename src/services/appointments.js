import { supabase } from "../lib/supabaseClient";
import { fetchSchedulingRules } from "./settings";
import { fetchServiceOffers, mergeServicesWithOffers } from "./serviceOffers";

const BLOCKING_STATUSES = ["pendiente", "confirmada", "completada"];
const DEFAULT_DURATION_MINUTES = 40;
const VALID_APPOINTMENT_STATUSES = ["pendiente", "confirmada", "completada", "cancelada", "no_asistio"];

function isOperationalSpecialist(specialist) {
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

export function formatLocalDateForInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) {
    return null;
  }

  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function buildWeekRange(dateString) {
  const base = parseLocalDate(dateString) || new Date();
  const day = base.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    from: formatLocalDateForInput(monday),
    to: formatLocalDateForInput(sunday),
  };
}

export function addMinutes(time, minutes = DEFAULT_DURATION_MINUTES) {
  return toTimeString(toMinutes(time) + minutes);
}

function normalizeDateValue(value) {
  const normalized = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeTimeValue(value) {
  const normalized = String(value || "").trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  return "";
}

function buildFriendlyAppointmentError(error, fallbackMessage) {
  const message = error?.message || "";

  if (error?.code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "No tienes permisos para crear citas.";
  }

  if (/failed to fetch|fetch failed|network/i.test(message)) {
    return "No se pudo conectar con el servidor.";
  }

  if (/invalid input syntax|date\/time field value out of range/i.test(message)) {
    return "La fecha o la hora de la cita no tienen un formato válido.";
  }

  if (/null value in column/i.test(message) || error?.code === "23502") {
    return "Faltan datos obligatorios de la cita.";
  }

  if (/violates check constraint/i.test(message) || error?.code === "23514") {
    return "El estado de la cita no es válido.";
  }

  if (/violates foreign key constraint/i.test(message) || error?.code === "23503") {
    return "Alguno de los datos seleccionados ya no existe o no está disponible.";
  }

  return message || fallbackMessage;
}

function sanitizeAppointmentPayload(payload) {
  const normalizedPayload = {
    client_id: payload?.client_id ? String(payload.client_id).trim() : "",
    specialist_id: payload?.specialist_id ? String(payload.specialist_id).trim() : "",
    service_id: payload?.service_id ? String(payload.service_id).trim() : "",
    cabin_id: payload?.cabin_id ? String(payload.cabin_id).trim() : "",
    appointment_date: normalizeDateValue(payload?.appointment_date),
    start_time: normalizeTimeValue(payload?.start_time),
    end_time: normalizeTimeValue(payload?.end_time),
    status: VALID_APPOINTMENT_STATUSES.includes(payload?.status) ? payload.status : "pendiente",
    notes: payload?.notes ? String(payload.notes).trim() : null,
  };

  const missingFields = [
    "client_id",
    "specialist_id",
    "service_id",
    "cabin_id",
    "appointment_date",
    "start_time",
    "end_time",
    "status",
  ].filter((field) => !normalizedPayload[field]);

  if (missingFields.length > 0) {
    const error = new Error("Faltan datos obligatorios de la cita.");
    error.code = "appointment/missing-fields";
    error.details = `Campos faltantes: ${missingFields.join(", ")}`;
    throw error;
  }

  return normalizedPayload;
}

function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}

function mapLookup(records, nameKey = "name") {
  return new Map((records || []).map((record) => [record.id, record[nameKey] || record.full_name || "—"]));
}

function mapById(records) {
  return new Map((records || []).map((record) => [record.id, record]));
}

function normalizeAppointment(record, lookups = {}) {
  const clientMap = lookups.clientMap || new Map();
  const specialistMap = lookups.specialistMap || new Map();
  const serviceMap = lookups.serviceMap || new Map();
  const cabinMap = lookups.cabinMap || new Map();
  const client = clientMap.get(record.client_id) || record.clients || null;
  const isGoldieImported = /importado desde goldie/i.test(record.notes || "");
  const resolvedSpecialistLabel = specialistMap.get(record.specialist_id) || record.specialists?.full_name || "";
  const resolvedServiceLabel = serviceMap.get(record.service_id) || record.services?.name || "";
  const resolvedCabinLabel = cabinMap.get(record.cabin_id) || record.cabins?.name || "";

  return {
    ...record,
    displayTime: record.start_time ? record.start_time.slice(0, 5) : "—",
    patientLabel: client?.full_name || "Paciente sin datos",
    patientPhone: client?.phone || "Sin teléfono",
    specialistLabel: resolvedSpecialistLabel || (isGoldieImported ? "Especialista histórica" : "Especialista"),
    serviceLabel: resolvedServiceLabel || (isGoldieImported ? "Servicio histórico" : "Servicio"),
    serviceType: record.services?.service_type || null,
    cabinLabel: resolvedCabinLabel || "Cabina no disponible",
    statusLabel: record.status || "pendiente",
    isGoldieImported,
    clientName: client?.full_name || "Paciente sin datos",
    clientPhone: client?.phone || "",
    specialistName: resolvedSpecialistLabel || (isGoldieImported ? "Especialista histórica" : "Especialista"),
    serviceName: resolvedServiceLabel || (isGoldieImported ? "Servicio histórico" : "Servicio"),
    cabinName: resolvedCabinLabel || "Cabina no disponible",
    appointmentDate: record.appointment_date || "",
    startTime: record.start_time || "",
  };
}

async function fetchAppointmentLookupsBase({ specialistId = null, onlyActive = true } = {}) {
  const [clientsResponse, specialistsResponse, servicesResponse, cabinsResponse] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone").order("full_name", { ascending: true }),
    (specialistId
      ? supabase.from("specialists").select("*").eq("id", specialistId).order("full_name", { ascending: true })
      : supabase.from("specialists").select("*").order("full_name", { ascending: true })),
    (onlyActive
      ? supabase
        .from("services")
        .select("id, name, category, service_type, price, sessions_count, payment_flexibility, duration_minutes, description, active")
        .eq("active", true)
        .order("name", { ascending: true })
      : supabase
        .from("services")
        .select("id, name, category, service_type, price, sessions_count, payment_flexibility, duration_minutes, description, active")
        .order("name", { ascending: true })),
    (onlyActive
      ? supabase
        .from("cabins")
        .select("id, name, type, active")
        .eq("active", true)
        .order("name", { ascending: true })
      : supabase
        .from("cabins")
        .select("id, name, type, active")
        .order("name", { ascending: true })),
  ]);

  const errors = [
    clientsResponse.error,
    specialistsResponse.error,
    servicesResponse.error,
    cabinsResponse.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("Error loading appointment lookups", errors.map((error) => error?.message || error));
    throw new Error("No fue posible cargar la información de agenda.");
  }

  const services = (servicesResponse.data || []).map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    service_type: service.service_type,
    price: service.price,
    sessions_count: service.sessions_count,
    payment_flexibility: service.payment_flexibility,
    duration_minutes: service.duration_minutes,
    active: service.active,
  }));

  const cabins = (cabinsResponse.data || []).map((cabin) => ({
    id: cabin.id,
    name: cabin.name,
    type: cabin.type,
    active: cabin.active,
  }));

  let enrichedServices = services;

  if (services.length > 0) {
    try {
      const offers = await fetchServiceOffers({
        activeOnly: onlyActive,
        currentOnly: onlyActive,
        serviceIds: services.map((service) => service.id),
      });

      enrichedServices = mergeServicesWithOffers(services, offers, {
        activeOnly: onlyActive,
        currentOnly: onlyActive,
      });
    } catch (error) {
      console.error("Error loading active offers for appointments", error?.message || error);
    }
  }

  return {
    clients: clientsResponse.data || [],
    specialists: onlyActive
      ? (specialistsResponse.data || []).filter(isOperationalSpecialist)
      : (specialistsResponse.data || []),
    services: enrichedServices,
    cabins,
  };
}

export async function fetchAppointmentLookups(options = {}) {
  return fetchAppointmentLookupsBase({ ...options, onlyActive: true });
}

export async function fetchAppointmentDisplayLookups(options = {}) {
  return fetchAppointmentLookupsBase({ ...options, onlyActive: false });
}

export async function fetchAppointmentById(appointmentId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at, clients(full_name, phone), specialists(full_name), services(name, service_type), cabins(name)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    console.error("Error loading appointment by id", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("No se pudo consultar la cita solicitada.");
  }

  return data;
}

export async function fetchAppointments({
  specialistId = null,
  appointmentDate = null,
  dateFrom = null,
  dateTo = null,
} = {}) {
  console.log("Agenda query:", {
    appointmentDate: appointmentDate || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    specialistId: specialistId || null,
  });

  let appointmentsQuery = supabase
    .from("appointments")
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at, clients(full_name, phone), specialists(full_name), services(name, service_type), cabins(name)");

  if (specialistId) {
    appointmentsQuery = appointmentsQuery.eq("specialist_id", specialistId);
  }

  if (appointmentDate) {
    appointmentsQuery = appointmentsQuery.eq("appointment_date", appointmentDate);
  } else {
    if (dateFrom) {
      appointmentsQuery = appointmentsQuery.gte("appointment_date", dateFrom);
    }
    if (dateTo) {
      appointmentsQuery = appointmentsQuery.lte("appointment_date", dateTo);
    }
  }

  appointmentsQuery = appointmentsQuery
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true });

  const [appointmentsResponse, lookups] = await Promise.all([
    appointmentsQuery,
    fetchAppointmentDisplayLookups({ specialistId }),
  ]);

  console.log("Agenda query result:", {
    count: appointmentsResponse.data?.length || 0,
    ids: appointmentsResponse.data?.map((item) => item.id) || [],
    errorCode: appointmentsResponse.error?.code || null,
    errorMessage: appointmentsResponse.error?.message || null,
  });

  if (appointmentsResponse.error) {
    console.error("Error loading appointments from Supabase", appointmentsResponse.error);
    throw new Error("No fue posible cargar las citas.");
  }

  const maps = {
    clientMap: mapById(lookups.clients),
    specialistMap: mapLookup(lookups.specialists, "full_name"),
    serviceMap: mapLookup(lookups.services, "name"),
    cabinMap: mapLookup(lookups.cabins, "name"),
  };

  return {
    appointments: (appointmentsResponse.data || []).map((item) => normalizeAppointment(item, maps)),
    lookups,
  };
}

export async function fetchAppointmentsByClient(clientId) {
  const appointmentsQuery = supabase
    .from("appointments")
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at, clients(full_name, phone), specialists(full_name), services(name, service_type), cabins(name)")
    .eq("client_id", clientId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  const [appointmentsResponse, lookups] = await Promise.all([
    appointmentsQuery,
    fetchAppointmentDisplayLookups(),
  ]);

  if (appointmentsResponse.error) {
    console.error("Error loading appointments by client", appointmentsResponse.error);
    throw new Error("No se pudo cargar el historial de citas.");
  }

  const maps = {
    clientMap: mapById(lookups.clients),
    specialistMap: mapLookup(lookups.specialists, "full_name"),
    serviceMap: mapLookup(lookups.services, "name"),
    cabinMap: mapLookup(lookups.cabins, "name"),
  };

  return (appointmentsResponse.data || []).map((item) => normalizeAppointment(item, maps));
}

export async function validateAppointmentConflict({
  appointmentId,
  specialistId,
  cabinId,
  appointmentDate,
  startTime,
  endTime,
}) {
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
    const conflictingSpecialist = (data || []).some((item) => {
      if (appointmentId && item.id === appointmentId) return false;
      return item.specialist_id === specialistId && overlaps(startTime, endTime, item.start_time, item.end_time);
    });

    if (conflictingSpecialist) {
      throw new Error("La especialista ya tiene una cita en ese horario.");
    }

    const conflictingCabin = (data || []).some((item) => {
      if (appointmentId && item.id === appointmentId) return false;
      return item.cabin_id === cabinId && overlaps(startTime, endTime, item.start_time, item.end_time);
    });

    if (conflictingCabin) {
      throw new Error("La cabina ya está ocupada en ese horario.");
    }

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
  const normalizedPayload = sanitizeAppointmentPayload(payload);

  console.log("Appointment payload:", {
    client_id: normalizedPayload.client_id,
    specialist_id: normalizedPayload.specialist_id,
    service_id: normalizedPayload.service_id,
    cabin_id: normalizedPayload.cabin_id,
    appointment_date: normalizedPayload.appointment_date,
    start_time: normalizedPayload.start_time,
    end_time: normalizedPayload.end_time,
    status: normalizedPayload.status,
  });

  await validateAppointmentSchedule({
    specialist,
    startTime: normalizedPayload.start_time,
    endTime: normalizedPayload.end_time,
  });

  await validateAppointmentConflict({
    specialistId: normalizedPayload.specialist_id,
    cabinId: normalizedPayload.cabin_id,
    appointmentDate: normalizedPayload.appointment_date,
    startTime: normalizedPayload.start_time,
    endTime: normalizedPayload.end_time,
  });

  const { data, error } = await supabase
    .from("appointments")
    .insert(normalizedPayload)
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error creando cita:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(buildFriendlyAppointmentError(error, "No fue posible guardar la cita."));
  }

  return data;
}

export async function updateAppointment(appointmentId, payload, specialist) {
  const normalizedPayload = sanitizeAppointmentPayload(payload);

  await validateAppointmentSchedule({
    specialist,
    startTime: normalizedPayload.start_time,
    endTime: normalizedPayload.end_time,
  });

  await validateAppointmentConflict({
    appointmentId,
    specialistId: normalizedPayload.specialist_id,
    cabinId: normalizedPayload.cabin_id,
    appointmentDate: normalizedPayload.appointment_date,
    startTime: normalizedPayload.start_time,
    endTime: normalizedPayload.end_time,
  });

  const { data, error } = await supabase
    .from("appointments")
    .update(normalizedPayload)
    .eq("id", appointmentId)
    .select("id, client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error actualizando cita:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(buildFriendlyAppointmentError(error, "No fue posible actualizar la cita."));
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
    clientMap: mapById(lookups.clients),
    specialistMap: mapLookup(lookups.specialists, "full_name"),
    serviceMap: mapLookup(lookups.services, "name"),
    cabinMap: mapLookup(lookups.cabins, "name"),
  };

  return appointments.map((item) => normalizeAppointment(item, maps));
}

export function getDefaultDurationMinutes() {
  return DEFAULT_DURATION_MINUTES;
}
