import { supabase } from "../lib/supabaseClient";
import { applyPackageConsumption, fetchPackageById } from "./clientPackages";

export const LASER_ZONES = [
  "Rostro",
  "Axilas",
  "Brasileño",
  "Piernas completas",
  "Brazos",
  "Glúteos",
  "Espalda",
];

export const LASER_SUBZONES = {
  "Brasileño": ["Labios mayores", "Monte de venus"],
  "Piernas completas": ["Muslos", "Pantorrillas"],
};

function mapById(items, labelKey) {
  return new Map((items || []).map((item) => [item.id, item[labelKey] || "—"]));
}

function formatSessionRecord(session, lookups, parameters) {
  const sessionParameters = parameters.filter((parameter) => parameter.laser_session_id === session.id);

  return {
    ...session,
    clientLabel: lookups.clientMap.get(session.client_id) || "Paciente",
    specialistLabel: lookups.specialistMap.get(session.specialist_id) || "Especialista",
    appointmentLabel: lookups.appointmentMap.get(session.appointment_id) || null,
    clientPackageLabel: lookups.packageMap.get(session.client_package_id) || null,
    general_notes: session.general_notes || "",
    parameters: sessionParameters,
    zonesSummary: sessionParameters.map((parameter) => parameter.zone).filter(Boolean).join(", "),
  };
}

export async function fetchLaserLookups({ specialistId = null } = {}) {
  const [clientsResponse, specialistsResponse, appointmentsResponse] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name", { ascending: true }),
    (specialistId
      ? supabase.from("specialists").select("id, full_name").eq("id", specialistId).order("full_name", { ascending: true })
      : supabase.from("specialists").select("id, full_name").order("full_name", { ascending: true })),
    (specialistId
      ? supabase.from("appointments").select("id, appointment_date, start_time").eq("specialist_id", specialistId).order("appointment_date", { ascending: false }).limit(200)
      : supabase.from("appointments").select("id, appointment_date, start_time").order("appointment_date", { ascending: false }).limit(200)),
  ]);

  const errors = [clientsResponse.error, specialistsResponse.error, appointmentsResponse.error].filter(Boolean);

  if (errors.length > 0) {
    console.error("Error loading laser lookups", errors);
    throw new Error("No fue posible cargar la información de referencia para sesiones láser.");
  }

  const appointments = (appointmentsResponse.data || []).map((appointment) => ({
    ...appointment,
    label: `${appointment.appointment_date || ""} ${appointment.start_time?.slice(0, 5) || ""}`.trim(),
  }));

  return {
    clients: clientsResponse.data || [],
    specialists: specialistsResponse.data || [],
    appointments,
  };
}

export async function fetchLaserSessions({ specialistId = null } = {}) {
  const sessionsQuery = specialistId
    ? supabase
      .from("laser_sessions")
      .select("id, client_id, specialist_id, appointment_id, client_package_id, session_date, general_notes, created_at, updated_at")
      .eq("specialist_id", specialistId)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
    : supabase
      .from("laser_sessions")
      .select("id, client_id, specialist_id, appointment_id, client_package_id, session_date, general_notes, created_at, updated_at")
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false });

  const [sessionsResponse, parametersResponse, lookups, packagesResponse] = await Promise.all([
    sessionsQuery,
    supabase
      .from("laser_session_parameters")
      .select("id, laser_session_id, zone, subzone, frequency_hz, intensity_j, pulse_width, pulse_count, notes, created_at")
      .order("created_at", { ascending: true }),
    fetchLaserLookups({ specialistId }),
    supabase
      .from("client_service_packages")
      .select("id, services(name)")
      .order("created_at", { ascending: false }),
  ]);

  if (sessionsResponse.error) {
    console.error("Error loading laser sessions", sessionsResponse.error);
    throw new Error("No fue posible cargar las sesiones láser.");
  }

  if (parametersResponse.error) {
    console.error("Error loading laser session parameters", parametersResponse.error);
    throw new Error("No fue posible cargar los parámetros de las sesiones láser.");
  }

  if (packagesResponse.error) {
    console.error("Error loading client packages for laser sessions", packagesResponse.error);
    throw new Error("No fue posible cargar los paquetes asociados a las sesiones láser.");
  }

  const lookupMaps = {
    clientMap: mapById(lookups.clients, "full_name"),
    specialistMap: mapById(lookups.specialists, "full_name"),
    appointmentMap: new Map(lookups.appointments.map((appointment) => [appointment.id, appointment.label])),
    packageMap: new Map((packagesResponse.data || []).map((item) => [item.id, item.services?.name || "Paquete"])),
  };

  return {
    sessions: (sessionsResponse.data || []).map((session) => formatSessionRecord(session, lookupMaps, parametersResponse.data || [])),
    lookups,
  };
}

export async function fetchLaserSessionsByClient(clientId) {
  const [sessionsResponse, parametersResponse, lookups, packagesResponse] = await Promise.all([
    supabase
      .from("laser_sessions")
      .select("id, client_id, specialist_id, appointment_id, client_package_id, session_date, general_notes, created_at, updated_at")
      .eq("client_id", clientId)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("laser_session_parameters")
      .select("id, laser_session_id, zone, subzone, frequency_hz, intensity_j, pulse_width, pulse_count, notes, created_at")
      .order("created_at", { ascending: true }),
    fetchLaserLookups(),
    supabase
      .from("client_service_packages")
      .select("id, services(name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  if (sessionsResponse.error) {
    console.error("Error loading laser sessions by client", sessionsResponse.error);
    throw new Error("No fue posible cargar las sesiones láser del paciente.");
  }

  if (parametersResponse.error) {
    console.error("Error loading laser session parameters by client", parametersResponse.error);
    throw new Error("No fue posible cargar los parámetros láser del paciente.");
  }

  if (packagesResponse.error) {
    console.error("Error loading client packages by client", packagesResponse.error);
    throw new Error("No fue posible cargar los paquetes del paciente.");
  }

  const lookupMaps = {
    clientMap: mapById(lookups.clients, "full_name"),
    specialistMap: mapById(lookups.specialists, "full_name"),
    appointmentMap: new Map(lookups.appointments.map((appointment) => [appointment.id, appointment.label])),
    packageMap: new Map((packagesResponse.data || []).map((item) => [item.id, item.services?.name || "Paquete"])),
  };

  return (sessionsResponse.data || []).map((session) => formatSessionRecord(session, lookupMaps, parametersResponse.data || []));
}

export async function createLaserSession(payload) {
  const { parameters, client_package_id, ...sessionPayload } = payload;

  if (client_package_id) {
    const selectedPackage = await fetchPackageById(client_package_id);

    if (selectedPackage.client_id !== sessionPayload.client_id) {
      throw new Error("El paquete seleccionado no pertenece a este paciente.");
    }

    if (selectedPackage.status !== "activo" || selectedPackage.remaining_sessions <= 0) {
      throw new Error("No hay sesiones disponibles en el paquete seleccionado.");
    }

    await applyPackageConsumption(client_package_id, 1);
  }

  const { data: session, error: sessionError } = await supabase
    .from("laser_sessions")
    .insert({
      ...sessionPayload,
      client_package_id: client_package_id || null,
    })
    .select("id, client_id, specialist_id, appointment_id, client_package_id, session_date, general_notes, created_at, updated_at")
    .single();

  if (sessionError) {
    console.error("Error creating laser session", sessionError);
    if (client_package_id) {
      try {
        await applyPackageConsumption(client_package_id, -1);
      } catch (rollbackError) {
        console.error("Error rolling back package consumption after session create failure", rollbackError);
      }
    }
    throw new Error("No fue posible registrar la sesión láser.");
  }

  const parameterPayload = parameters.map((parameter) => ({
    laser_session_id: session.id,
    zone: parameter.zone,
    subzone: parameter.subzone || null,
    frequency_hz: parameter.frequency_hz || null,
    intensity_j: parameter.intensity_j || null,
    pulse_width: parameter.pulse_width || null,
    pulse_count: parameter.pulse_count || null,
    notes: parameter.notes || null,
  }));

  const { error: parametersError } = await supabase
    .from("laser_session_parameters")
    .insert(parameterPayload);

  if (parametersError) {
    console.error("Error creating laser session parameters", parametersError);
    if (client_package_id) {
      try {
        await applyPackageConsumption(client_package_id, -1);
        await supabase
          .from("laser_sessions")
          .update({ client_package_id: null })
          .eq("id", session.id);
      } catch (rollbackError) {
        console.error("Error rolling back package consumption after parameter failure", rollbackError);
      }
    }
    throw new Error("La sesión fue creada, pero falló el registro de parámetros por zona.");
  }

  return session;
}

export async function updateLaserSession(sessionId, payload) {
  const { data: currentSession, error: currentSessionError } = await supabase
    .from("laser_sessions")
    .select("id, client_id, client_package_id")
    .eq("id", sessionId)
    .single();

  if (currentSessionError) {
    console.error("Error loading current laser session", currentSessionError);
    throw new Error("No fue posible preparar la actualización de la sesión láser.");
  }

  const { parameters, client_package_id, ...sessionPayload } = payload;
  const previousPackageId = currentSession.client_package_id || null;
  const nextPackageId = client_package_id || null;

  if (previousPackageId !== nextPackageId) {
    if (previousPackageId) {
      await applyPackageConsumption(previousPackageId, -1);
    }

    if (nextPackageId) {
      try {
        const nextPackage = await fetchPackageById(nextPackageId);

        if (nextPackage.client_id !== sessionPayload.client_id) {
          throw new Error("El paquete seleccionado no pertenece a este paciente.");
        }

        if (nextPackage.status !== "activo" || nextPackage.remaining_sessions <= 0) {
          throw new Error("No hay sesiones disponibles en el paquete seleccionado.");
        }

        await applyPackageConsumption(nextPackageId, 1);
      } catch (error) {
        if (previousPackageId) {
          try {
            await applyPackageConsumption(previousPackageId, 1);
          } catch (rollbackError) {
            console.error("Error restoring previous package after package switch failure", rollbackError);
          }
        }
        throw error;
      }
    }
  }

  const { data: session, error: sessionError } = await supabase
    .from("laser_sessions")
    .update({
      ...sessionPayload,
      client_package_id: nextPackageId,
    })
    .eq("id", sessionId)
    .select("id, client_id, specialist_id, appointment_id, client_package_id, session_date, general_notes, created_at, updated_at")
    .single();

  if (sessionError) {
    console.error("Error updating laser session", sessionError);
    if (previousPackageId !== nextPackageId) {
      if (nextPackageId) {
        try {
          await applyPackageConsumption(nextPackageId, -1);
        } catch (rollbackError) {
          console.error("Error rolling back new package after session update failure", rollbackError);
        }
      }

      if (previousPackageId) {
        try {
          await applyPackageConsumption(previousPackageId, 1);
        } catch (rollbackError) {
          console.error("Error restoring previous package after session update failure", rollbackError);
        }
      }
    }
    throw new Error("No fue posible actualizar la sesión láser.");
  }

  const { error: deleteError } = await supabase
    .from("laser_session_parameters")
    .delete()
    .eq("laser_session_id", sessionId);

  if (deleteError) {
    console.error("Error clearing laser session parameters", deleteError);
    throw new Error("No fue posible actualizar los parámetros de la sesión.");
  }

  const parameterPayload = parameters.map((parameter) => ({
    laser_session_id: sessionId,
    zone: parameter.zone,
    subzone: parameter.subzone || null,
    frequency_hz: parameter.frequency_hz || null,
    intensity_j: parameter.intensity_j || null,
    pulse_width: parameter.pulse_width || null,
    pulse_count: parameter.pulse_count || null,
    notes: parameter.notes || null,
  }));

  const { error: parametersError } = await supabase
    .from("laser_session_parameters")
    .insert(parameterPayload);

  if (parametersError) {
    console.error("Error recreating laser session parameters", parametersError);
    throw new Error("No fue posible guardar los parámetros actualizados.");
  }

  return session;
}

