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

  return {
    profiles: (profilesResponse.data || []).map((profile) => normalizeProfile(profile)),
    specialists: (specialistsResponse.data || []).filter((specialist) => specialist.active !== false),
  };
}

export async function updateUserProfile(userId, payload, currentProfile = null) {
  if (currentProfile?.role !== "admin") {
    throw new Error("No tienes permisos para actualizar usuarios.");
  }

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

export async function createUserAccount(payload, currentProfile) {
  if (currentProfile?.role !== "admin") {
    throw new Error("No tienes permisos para crear usuarios.");
  }

  const { data, error } = await supabase.functions.invoke("create-user", {
    body: {
      full_name: payload.full_name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      specialist_id: payload.specialist_id || null,
      active: payload.active !== false,
    },
  });

  if (error) {
    console.error("Error invoking create-user function", error);
    if (
      error.message?.includes("404")
      || error.message?.includes("FunctionsHttpError")
      || error.message?.includes("Failed to send a request")
    ) {
      throw new Error("La creación automática de usuarios requiere que la Edge Function `create-user` esté desplegada y activa.");
    }
    throw new Error(error.message || "No fue posible crear el usuario.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.user || null;
}

