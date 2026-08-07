import { supabase } from "../lib/supabaseClient";

function logUserManagementError(context, error) {
  console.error(context, {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
}

function normalizeProfile(profile) {
  return {
    ...profile,
    specialistLabel: profile.specialist_id
      ? profile.specialists?.full_name || "Especialista no encontrada"
      : "Sin vincular",
  };
}

export async function fetchUserProfiles() {
  const [profilesResponse, specialistsResponse, employeesResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, active, specialist_id, created_at, updated_at, specialists(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("specialists")
      .select("id, full_name, active")
      .order("full_name", { ascending: true }),
    supabase
      .from("employees")
      .select("id, full_name, position, specialist_id, status")
      .order("full_name", { ascending: true }),
  ]);

  if (profilesResponse.error) {
    logUserManagementError("Error loading profiles", profilesResponse.error);
    throw new Error("No fue posible cargar los usuarios del panel.");
  }

  if (specialistsResponse.error) {
    logUserManagementError("Error loading specialists for profiles", specialistsResponse.error);
    throw new Error("No fue posible cargar las especialistas vinculables.");
  }

  if (employeesResponse.error) {
    logUserManagementError("Error loading employees for profiles", employeesResponse.error);
    throw new Error("No fue posible cargar los cargos vinculados.");
  }

  const employees = employeesResponse.data || [];
  const employeesBySpecialistId = new Map(
    employees.filter((employee) => employee.specialist_id).map((employee) => [employee.specialist_id, employee])
  );
  const employeesByName = new Map(
    employees.map((employee) => [String(employee.full_name || "").trim().toUpperCase(), employee])
  );

  return {
    profiles: (profilesResponse.data || []).map((profile) => {
      const employee = profile.specialist_id
        ? employeesBySpecialistId.get(profile.specialist_id) || null
        : employeesByName.get(String(profile.full_name || "").trim().toUpperCase()) || null;

      return normalizeProfile({
        ...profile,
        position: employee?.position || "",
        employee_id: employee?.id || null,
        employee_status: employee?.status || null,
      });
    }),
    specialists: (specialistsResponse.data || []).filter((specialist) => specialist.active !== false),
  };
}

async function syncEmployeePosition({ specialist_id, position }) {
  if (!specialist_id || !position?.trim()) {
    return;
  }

  const { data: employee, error: employeeLookupError } = await supabase
    .from("employees")
    .select("id, position")
    .eq("specialist_id", specialist_id)
    .maybeSingle();

  if (employeeLookupError) {
    logUserManagementError("Error loading employee for position sync", employeeLookupError);
    return;
  }

  if (!employee?.id) {
    return;
  }

  const { error: employeeUpdateError } = await supabase
    .from("employees")
    .update({
      position: position.trim(),
    })
    .eq("id", employee.id);

  if (employeeUpdateError) {
    logUserManagementError("Error updating employee position from user module", employeeUpdateError);
  }
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
    logUserManagementError("Error updating profile", error);
    throw new Error("No fue posible actualizar el perfil del usuario.");
  }

  await syncEmployeePosition(payload);

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
      position: payload.position || null,
      specialist_id: payload.specialist_id || null,
      active: payload.active !== false,
    },
  });

  if (error) {
    logUserManagementError("Error invoking create-user function", error);

    if (
      error.name === "FunctionsFetchError"
      || error.message?.includes("404")
      || error.message?.includes("FunctionsHttpError")
      || error.message?.includes("Failed to send a request")
    ) {
      throw new Error("La creación automática de usuarios requiere que la Edge Function `create-user` esté desplegada, accesible y activa.");
    }

    throw new Error(error.message || "No fue posible crear el usuario.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  await syncEmployeePosition(payload);

  return data?.user || null;
}
