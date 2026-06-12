import { supabase } from "../lib/supabaseClient";

function normalizeProfile(profile) {
  return {
    ...profile,
    specialistLabel: profile.specialist_id
      ? profile.specialists?.full_name || "Especialista no encontrada"
      : "Sin vincular",
  };
}

export async function fetchUserProfiles() {
  const [profilesResponse, specialistsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, active, specialist_id, created_at, updated_at, specialists(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("specialists")
      .select("id, full_name, active")
      .order("full_name", { ascending: true }),
  ]);

  if (profilesResponse.error) {
    console.error("Error loading profiles", profilesResponse.error);
    throw new Error("No fue posible cargar los usuarios del panel.");
  }

  if (specialistsResponse.error) {
    console.error("Error loading specialists for profiles", specialistsResponse.error);
    throw new Error("No fue posible cargar las especialistas vinculables.");
  }

  console.log("USERS PROFILES RAW:", profilesResponse.data);
  console.log("USERS PROFILES COUNT:", profilesResponse.data?.length || 0);

  return {
    profiles: (profilesResponse.data || []).map((profile) => normalizeProfile(profile)),
    specialists: specialistsResponse.data || [],
  };
}

export async function updateUserProfile(userId, payload) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: payload.full_name,
      role: payload.role,
      active: payload.active,
      specialist_id: payload.specialist_id || null,
    })
    .eq("id", userId)
    .select("id, full_name, role, active, specialist_id, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error updating profile", error);
    throw new Error("No fue posible actualizar el perfil del usuario.");
  }

  return data;
}
