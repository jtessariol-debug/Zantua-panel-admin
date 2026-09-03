import { supabase } from "../lib/supabaseClient";

function bookingError(error, fallback) {
  console.error("Public booking error", { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
  return new Error(error?.message || fallback);
}

export async function fetchPublicBookingConfig(slug) {
  const { data, error } = await supabase.rpc("get_zantua_booking_config", { requested_slug: slug });
  if (error) throw bookingError(error, "No fue posible cargar las reservas.");
  return data || { enabled: false, not_found: true };
}

export async function fetchPublicBookingSlots({ slug, serviceId, specialistId, date }) {
  if (!serviceId || !specialistId || !date) return [];
  const { data, error } = await supabase.rpc("get_zantua_booking_slots", { requested_slug: slug, requested_service_id: serviceId, requested_specialist_id: specialistId, requested_date: date });
  if (error) throw bookingError(error, "No fue posible cargar los horarios.");
  return data || [];
}

export async function createPublicBooking(payload) {
  const { data, error } = await supabase.rpc("create_zantua_public_booking", {
    requested_slug: payload.slug,
    requested_service_id: payload.serviceId,
    requested_specialist_id: payload.specialistId,
    requested_date: payload.date,
    requested_start: payload.startTime,
    patient_first_name: payload.firstName,
    patient_last_name: payload.lastName,
    patient_phone: payload.phone,
    patient_email: payload.email || null,
    requested_booking_id: payload.bookingId,
  });
  if (error) throw bookingError(error, "No fue posible confirmar la reserva.");
  return data;
}
