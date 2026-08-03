import { supabase } from "../lib/supabaseClient";

function formatPatientRecord(record) {
  return {
    ...record,
    full_name: record.full_name || "",
    phone: record.phone || "",
    email: record.email || "",
    national_id: record.national_id || "",
    birth_date: record.birth_date || "",
    address: record.address || "",
    notes: record.notes || "",
    active: record.active !== false,
    deleted_at: record.deleted_at || null,
    deleted_by: record.deleted_by || null,
    deletion_reason: record.deletion_reason || "",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function assertAdmin(profile) {
  if (profile?.role !== "admin") {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
}

const PATIENT_SELECT = "id, full_name, phone, email, national_id, birth_date, address, notes, active, deleted_at, deleted_by, deletion_reason, created_at, updated_at";

export async function fetchPatients({ active = true } = {}) {
  const { data, error } = await supabase
    .from("clients")
    .select(PATIENT_SELECT)
    .eq("active", active)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading patients from Supabase", error);
    throw new Error("No fue posible cargar los pacientes.");
  }

  return (data || []).map(formatPatientRecord);
}

export async function fetchPatientById(id) {
  const { data, error } = await supabase
    .from("clients")
    .select(PATIENT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading patient from Supabase", error);
    throw new Error("No fue posible cargar el detalle del paciente.");
  }

  return formatPatientRecord(data);
}

export async function createPatient(payload) {
  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select(PATIENT_SELECT)
    .single();

  if (error) {
    console.error("Error creating patient in Supabase", error);
    throw new Error("No fue posible guardar el paciente.");
  }

  return formatPatientRecord(data);
}

export async function updatePatient(id, payload) {
  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select(PATIENT_SELECT)
    .single();

  if (error) {
    console.error("Error updating patient in Supabase", error);
    throw new Error("No fue posible actualizar el paciente.");
  }

  return formatPatientRecord(data);
}

export async function deactivatePatient(id, reason, profile) {
  assertAdmin(profile);

  const payload = {
    active: false,
    deleted_at: new Date().toISOString(),
    deleted_by: profile.id,
    deletion_reason: String(reason || "").trim() || null,
  };

  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select(PATIENT_SELECT)
    .single();

  if (error) {
    console.error("Error deactivating patient in Supabase", error);
    throw new Error("No fue posible dar de baja al paciente.");
  }

  return formatPatientRecord(data);
}

export async function reactivatePatient(id, profile) {
  assertAdmin(profile);

  const { data, error } = await supabase
    .from("clients")
    .update({
      active: true,
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
    })
    .eq("id", id)
    .select(PATIENT_SELECT)
    .single();

  if (error) {
    console.error("Error reactivating patient in Supabase", error);
    throw new Error("No fue posible reactivar al paciente.");
  }

  return formatPatientRecord(data);
}

