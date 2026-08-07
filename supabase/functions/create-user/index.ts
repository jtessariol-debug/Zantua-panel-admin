import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_ROLES = ["admin", "recepcion", "especialista"] as const;

type UserRole = (typeof USER_ROLES)[number];

type CreateUserPayload = {
  full_name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  specialist_id?: string | null;
  position?: string | null;
  active?: boolean;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "La funcion no esta configurada correctamente." }, 500);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "No autorizado." }, 401);
  }

  const accessToken = authHeader.replace("Bearer ", "").trim();

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const supabaseUserContext = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authUserError || !authUserData.user) {
    console.error("create-user auth error", authUserError);
    return jsonResponse({ error: "No fue posible validar la sesion." }, 401);
  }

  const currentUserId = authUserData.user.id;

  const { data: currentProfile, error: currentProfileError } = await supabaseUserContext
    .from("profiles")
    .select("id, role, active")
    .eq("id", currentUserId)
    .maybeSingle();

  if (currentProfileError) {
    console.error("create-user profile lookup error", currentProfileError);
    return jsonResponse({ error: "No fue posible validar los permisos del usuario." }, 500);
  }

  if (!currentProfile || currentProfile.role !== "admin" || currentProfile.active === false) {
    return jsonResponse({ error: "No tienes permisos para crear usuarios." }, 403);
  }

  let payload: CreateUserPayload;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("create-user invalid json", error);
    return jsonResponse({ error: "Solicitud invalida." }, 400);
  }

  const fullName = String(payload.full_name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const role = payload.role;
  const specialistId = payload.specialist_id ? String(payload.specialist_id) : null;
  const position = payload.position ? String(payload.position).trim() : null;
  const active = payload.active !== false;

  if (!fullName) {
    return jsonResponse({ error: "El nombre completo es obligatorio." }, 400);
  }

  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: "Debes indicar un correo electronico valido." }, 400);
  }

  if (!password || password.length < 8) {
    return jsonResponse({ error: "La contrasena temporal debe tener al menos 8 caracteres." }, 400);
  }

  if (!role || !USER_ROLES.includes(role)) {
    return jsonResponse({ error: "Debes seleccionar un rol valido." }, 400);
  }

  if (role === "especialista" && !specialistId) {
    return jsonResponse({ error: "Debes vincular una especialista para este usuario." }, 400);
  }

  if (specialistId) {
    const { data: specialist, error: specialistError } = await supabaseUserContext
      .from("specialists")
      .select("id, active")
      .eq("id", specialistId)
      .maybeSingle();

    if (specialistError) {
      console.error("create-user specialist validation error", specialistError);
      return jsonResponse({ error: "No fue posible validar la especialista vinculada." }, 500);
    }

    if (!specialist || specialist.active === false) {
      return jsonResponse({ error: "La especialista vinculada no esta disponible." }, 400);
    }
  }

  if (specialistId) {
    const { data: existingSpecialistProfile, error: existingSpecialistProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("specialist_id", specialistId)
      .limit(1)
      .maybeSingle();

    if (existingSpecialistProfileError) {
      console.error("create-user existing specialist profile lookup error", existingSpecialistProfileError);
      return jsonResponse({ error: "No fue posible validar si la especialista ya tiene usuario." }, 500);
    }

    if (existingSpecialistProfile) {
      return jsonResponse({ error: "La especialista seleccionada ya tiene un usuario vinculado." }, 409);
    }
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("full_name", fullName)
    .limit(1);

  if (existingProfile?.length && role === "especialista" && specialistId) {
    // No bloquea por nombre duplicado; solo evita silencios en un caso comun.
    console.warn("create-user duplicate full_name detected", fullName);
  }

  const { data: createdAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
    app_metadata: {
      role,
    },
    ban_duration: active ? "none" : "876000h",
  });

  if (createAuthError || !createdAuthUser.user) {
    console.error("create-user auth create error", createAuthError);
    return jsonResponse({ error: createAuthError?.message || "No fue posible crear el usuario en autenticacion." }, 400);
  }

  const newUserId = createdAuthUser.user.id;

  const { error: profileInsertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: newUserId,
      full_name: fullName,
      role,
      active,
      specialist_id: role === "recepcion" ? null : specialistId,
    });

  if (profileInsertError) {
    console.error("create-user profile insert error", profileInsertError);
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return jsonResponse({ error: "No fue posible crear el perfil del usuario." }, 500);
  }

  if (specialistId && position) {
    const { data: employee, error: employeeLookupError } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("specialist_id", specialistId)
      .maybeSingle();

    if (employeeLookupError) {
      console.error("create-user employee lookup error", employeeLookupError);
    } else if (employee?.id) {
      const { error: employeeUpdateError } = await supabaseAdmin
        .from("employees")
        .update({ position })
        .eq("id", employee.id);

      if (employeeUpdateError) {
        console.error("create-user employee position sync error", employeeUpdateError);
      }
    }
  }

  if (!active) {
    const { error: updateBanError } = await supabaseAdmin.auth.admin.updateUserById(newUserId, {
      ban_duration: "876000h",
    });

    if (updateBanError) {
      console.error("create-user auth ban error", updateBanError);
    }
  }

  return jsonResponse({
    message: "Usuario creado correctamente.",
    user: {
      id: newUserId,
      full_name: fullName,
      email,
      role,
      active,
      position,
      specialist_id: role === "recepcion" ? null : specialistId,
    },
  });
});
