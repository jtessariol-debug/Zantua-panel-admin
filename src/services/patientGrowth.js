import { supabase } from "../lib/supabaseClient";

export const PATIENT_EVOLUTION_BUCKET = "patient-evolution";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FOLLOWUP_SELECT = "id, client_id, appointment_id, laser_session_id, specialist_id, created_by, title, scheduled_for, completed_at, status, notes, created_at, updated_at, specialists(full_name), appointments(appointment_date, start_time)";

function toError(error, fallback) {
  console.error("Patient growth operation failed", { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
  return new Error(error?.message || fallback);
}

function normalizeFollowup(record) {
  return { ...record, specialistLabel: record.specialists?.full_name || "Equipo Zantua" };
}

export async function fetchPatientFollowups(clientId) {
  const { data, error } = await supabase.from("patient_followups").select(FOLLOWUP_SELECT).eq("client_id", clientId).order("scheduled_for", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw toError(error, "No fue posible cargar los seguimientos.");
  return (data || []).map(normalizeFollowup);
}

export async function fetchFollowupQueue({ status = "pendiente", dueOnly = false } = {}) {
  let query = supabase.from("patient_followups").select("id, client_id, title, scheduled_for, completed_at, status, notes, specialists(full_name), clients(full_name, phone)").order("scheduled_for", { ascending: true });
  if (status) query = query.eq("status", status);
  if (dueOnly) query = query.lte("scheduled_for", new Date().toISOString().slice(0, 10));
  const { data, error } = await query;
  if (error) throw toError(error, "No fue posible cargar los seguimientos pendientes.");
  return data || [];
}

export async function savePatientFollowup(payload, profile, id = null) {
  if (!payload.client_id || !payload.title?.trim() || !payload.scheduled_for) throw new Error("Indica el seguimiento y la fecha prevista.");
  const values = {
    client_id: payload.client_id,
    appointment_id: payload.appointment_id || null,
    laser_session_id: payload.laser_session_id || null,
    specialist_id: payload.specialist_id || profile?.specialist_id || null,
    title: payload.title.trim(),
    scheduled_for: payload.scheduled_for,
    status: payload.status || "pendiente",
    completed_at: payload.status === "realizado" ? (payload.completed_at || new Date().toISOString()) : null,
    notes: payload.notes?.trim() || null,
  };
  if (!id) values.created_by = profile?.id || null;
  const query = id ? supabase.from("patient_followups").update(values).eq("id", id) : supabase.from("patient_followups").insert(values);
  const { data, error } = await query.select(FOLLOWUP_SELECT).single();
  if (error) throw toError(error, "No fue posible guardar el seguimiento.");
  return normalizeFollowup(data);
}

export async function updateFollowupStatus(id, status) {
  const { data, error } = await supabase.from("patient_followups").update({ status, completed_at: status === "realizado" ? new Date().toISOString() : null }).eq("id", id).select(FOLLOWUP_SELECT).single();
  if (error) throw toError(error, "No fue posible actualizar el seguimiento.");
  return normalizeFollowup(data);
}

export async function fetchPatientEvolutionPhotos(clientId) {
  const { data, error } = await supabase.from("patient_evolution_photos").select("id, client_id, appointment_id, laser_session_id, uploaded_by, captured_at, body_area, stage, storage_path, notes, created_at, updated_at").eq("client_id", clientId).order("captured_at", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw toError(error, "No fue posible cargar las fotografías de evolución.");
  return Promise.all((data || []).map(async (photo) => {
    const { data: signed, error: signedError } = await supabase.storage.from(PATIENT_EVOLUTION_BUCKET).createSignedUrl(photo.storage_path, 60 * 20);
    if (signedError) throw toError(signedError, "No fue posible abrir una fotografía privada.");
    return { ...photo, signedUrl: signed?.signedUrl || "" };
  }));
}

export async function uploadPatientEvolutionPhoto({ clientId, file, capturedAt, stage, bodyArea, notes, appointmentId, laserSessionId, profile }) {
  if (!clientId || !file || !stage) throw new Error("Selecciona una fotografía y su etapa de evolución.");
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw new Error("La fotografía debe ser JPG, PNG o WEBP.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("La fotografía no puede superar 10 MB.");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const storagePath = `${clientId}/${uniqueId}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(PATIENT_EVOLUTION_BUCKET).upload(storagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (uploadError) throw toError(uploadError, "No fue posible subir la fotografía.");
  const { data, error } = await supabase.from("patient_evolution_photos").insert({ client_id: clientId, appointment_id: appointmentId || null, laser_session_id: laserSessionId || null, uploaded_by: profile?.id || null, captured_at: capturedAt || new Date().toISOString().slice(0, 10), body_area: bodyArea?.trim() || null, stage, storage_path: storagePath, notes: notes?.trim() || null }).select("id, client_id, appointment_id, laser_session_id, uploaded_by, captured_at, body_area, stage, storage_path, notes, created_at, updated_at").single();
  if (error) { await supabase.storage.from(PATIENT_EVOLUTION_BUCKET).remove([storagePath]); throw toError(error, "No fue posible registrar la fotografía."); }
  return data;
}

export async function fetchClientReactivation(filters = {}) {
  const { data, error } = await supabase.rpc("get_client_reactivation", { minimum_days: filters.minimumDays ?? 30, maximum_days: filters.maximumDays ?? null, custom_from: filters.customFrom || null, custom_to: filters.customTo || null, page_limit: filters.limit ?? 100, page_offset: filters.offset ?? 0 });
  if (error) throw toError(error, "No fue posible cargar los pacientes por reactivar.");
  return data || { summary: {}, rows: [], total: 0 };
}

export async function fetchPatientGrowthOpportunities() {
  const { data, error } = await supabase.rpc("get_patient_growth_opportunities");
  if (error) throw toError(error, "No fue posible cargar las oportunidades.");
  return data || {};
}
