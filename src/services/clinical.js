import { supabase } from "../lib/supabaseClient";

function normalizeClinicalHistory(record) {
  if (!record) return null;

  return {
    id: record.id,
    client_id: record.client_id,
    medical_history: record.medical_history || "",
    allergies: record.allergies || "",
    medications: record.medications || "",
    skin_conditions: record.skin_conditions || "",
    contraindications: record.contraindications || "",
    observations: record.observations || "",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function normalizeInformedConsent(record) {
  if (!record) return null;

  return {
    id: record.id,
    client_id: record.client_id,
    consent_text: record.consent_text || "",
    patient_name: record.patient_name || "",
    national_id: record.national_id || "",
    signature_data: record.signature_data || "",
    signed_at: record.signed_at || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

export async function fetchClinicalHistory(clientId) {
  const { data, error } = await supabase
    .from("clinical_histories")
    .select("*")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error loading clinical history", error);
    throw new Error("No fue posible cargar el historial clínico.");
  }

  return normalizeClinicalHistory(data?.[0] || null);
}

export async function upsertClinicalHistory(clientId, payload, existingId = null) {
  const sanitizedPayload = {
    client_id: clientId,
    medical_history: payload.medical_history?.trim() || null,
    allergies: payload.allergies?.trim() || null,
    medications: payload.medications?.trim() || null,
    skin_conditions: payload.skin_conditions?.trim() || null,
    contraindications: payload.contraindications?.trim() || null,
    observations: payload.observations?.trim() || null,
  };

  const query = existingId
    ? supabase.from("clinical_histories").update(sanitizedPayload).eq("id", existingId)
    : supabase.from("clinical_histories").insert(sanitizedPayload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving clinical history", error);
    throw new Error("No fue posible guardar el historial clínico.");
  }

  return normalizeClinicalHistory(data);
}

export async function fetchInformedConsent(clientId) {
  const consents = await fetchInformedConsents(clientId);
  return consents[0] || null;
}

export async function fetchInformedConsents(clientId) {
  const { data, error } = await supabase
    .from("informed_consents")
    .select("*")
    .eq("client_id", clientId)
    .order("signed_at", { ascending: false });

  if (error) {
    console.error("Error loading informed consents", error);
    throw new Error("No fue posible cargar el consentimiento informado.");
  }

  return (data || []).map(normalizeInformedConsent);
}

export async function fetchConsentLookups() {
  const [specialistsResponse, servicesResponse] = await Promise.all([
    supabase
      .from("specialists")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("services")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  const errors = [specialistsResponse.error, servicesResponse.error].filter(Boolean);
  if (errors.length > 0) {
    console.error("Error loading consent lookups", errors);
    throw new Error("No fue posible cargar especialistas y servicios para el consentimiento.");
  }

  return {
    specialists: specialistsResponse.data || [],
    services: servicesResponse.data || [],
  };
}

export async function createInformedConsent(clientId, payload) {
  const consentPayload = {
    client_id: clientId,
    consent_text: payload.consent_text?.trim() || "",
    patient_name: payload.patient_name?.trim() || "",
    national_id: payload.national_id?.trim() || "",
    signature_data: payload.signature_data || "",
    signed_at: payload.signed_at || new Date().toISOString(),
  };

  const { data: consentData, error: consentError } = await supabase
    .from("informed_consents")
    .insert(consentPayload)
    .select("*")
    .single();

  if (consentError) {
    console.error("Error saving informed consent", consentError);
    throw new Error(consentError.message || "No fue posible guardar el consentimiento informado.");
  }

  return normalizeInformedConsent(consentData);
}

