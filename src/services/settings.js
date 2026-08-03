import { supabase } from "../lib/supabaseClient";
import { BRANDING } from "../lib/branding";
import { fetchServiceOffers } from "./serviceOffers";

const DEFAULT_SETTINGS = {
  center_identity: {
    logo_path: BRANDING.logoPath,
    center_name: BRANDING.centerName,
    address: BRANDING.centerAddress,
    phone: "",
    email: "",
    currency: "RD$",
    palette: {
      primary: BRANDING.colors.primary,
      secondary: BRANDING.colors.secondary,
      background: BRANDING.colors.background,
      card: BRANDING.colors.card,
    },
  },
  scheduling_rules: {
    center_open: "07:00",
    center_close: "19:00",
    default_duration_minutes: 40,
    min_patients_per_specialist: 7,
    max_patients_per_specialist: 9,
  },
  billing_rules: {
    currency: "RD$",
    payment_methods: ["efectivo", "tarjeta", "transferencia", "mixto", "otro"],
    default_invoice_status: "pagada",
    invoice_prefix: "ZAN-",
    max_discount_percentage: 15,
    show_logo_on_receipts: true,
  },
  commission_rules: {
    product_default_percentage: 10,
    service_default_percentage: 0,
    automatic_commissions: true,
    manual_commissions: true,
    default_status: "pendiente",
  },
  inventory_rules: {
    low_stock_alert_enabled: true,
    global_min_stock: 3,
    allow_negative_stock: false,
    product_categories: ["Exfoliantes", "Protección solar", "Reparación", "Sueros"],
    supply_categories: ["Desechables", "Higiene", "Cabina", "Ambientación"],
    units: ["unidad", "caja", "paquete", "galón", "cubeta", "rollo"],
  },
  consent_rules: {
    version: "v1",
    requires_signature: true,
    requires_national_id: true,
    requires_clinical_history_before_signing: true,
    show_logo_in_pdf: true,
    show_address_in_pdf: true,
    base_text:
      "Declaro que he sido informada sobre el procedimiento estético a realizar, sus cuidados previos y posteriores, así como las posibles reacciones asociadas al tratamiento.",
  },
  security_roles: {
    admin: [
      "Acceso total al sistema",
      "Configuración",
      "Usuarios",
      "Reportes",
      "Facturación",
      "Inventario",
      "Comisiones",
    ],
    recepcion: [
      "Pacientes",
      "Agenda",
      "Facturación básica",
    ],
    especialista: [
      "Agenda asignada",
      "Láser",
      "Historial de pacientes relacionados",
    ],
  },
};

function isMissingRelationError(error) {
  return error?.code === "42P01" || /does not exist/i.test(error?.message || "");
}

function isMissingColumnError(error) {
  return error?.code === "42703" || /column .* does not exist/i.test(error?.message || "");
}

function logSupabaseError(context, table, operation, error) {
  console.error(context, {
    table,
    operation,
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

const EMPLOYEE_PAYMENT_FREQUENCIES = ["semanal", "quincenal", "mensual"];
const OFFICIAL_PAYROLL_SPECIALIST_NAMES = new Set([
  "ANNERIS MELENCIANO",
  "LEIDY LAURA HERNANDEZ",
  "PENELOPE LUNA",
  "RIQUEIMELIN ESPIRITUD",
  "RUT VERICUT",
]);

function isHistoricalGoldieName(value) {
  return normalizeName(value).includes("HISTORICO GOLDIE");
}

function isMarjanName(value) {
  const normalized = normalizeName(value);
  return normalized === "MARJAN PENA";
}

function isExcludedOperationalName(value) {
  return isHistoricalGoldieName(value) || isMarjanName(value);
}

function isOfficialPayrollSpecialistName(value) {
  return OFFICIAL_PAYROLL_SPECIALIST_NAMES.has(normalizeName(value));
}

function isOperationalSpecialistRecord(specialist) {
  return specialist?.active === true && !isExcludedOperationalName(specialist?.full_name);
}

function buildScheduleLabel(specialist) {
  if (!specialist) return "Sin horario";
  if (specialist.has_open_schedule) return "Agenda abierta";
  if (specialist.start_time && specialist.end_time) {
    return `${String(specialist.start_time).slice(0, 5)} - ${String(specialist.end_time).slice(0, 5)}`;
  }
  return "Horario no definido";
}

function mergeSetting(defaultValue, incomingValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(incomingValue) ? incomingValue : defaultValue;
  }

  if (
    defaultValue
    && typeof defaultValue === "object"
    && !Array.isArray(defaultValue)
    && incomingValue
    && typeof incomingValue === "object"
    && !Array.isArray(incomingValue)
  ) {
    return Object.keys(defaultValue).reduce((acc, key) => {
      acc[key] = mergeSetting(defaultValue[key], incomingValue[key]);
      return acc;
    }, { ...incomingValue });
  }

  return incomingValue ?? defaultValue;
}

function assertAdminProfile(profile, message = "No tienes permisos para gestionar esta sección.") {
  if (profile?.role !== "admin") {
    throw new Error(message);
  }
}

function sanitizePayrollPeriodPayload(payload) {
  const startDate = payload.start_date || null;
  const endDate = payload.end_date || null;

  if (startDate && endDate && endDate < startDate) {
    throw new Error("La fecha final no puede ser anterior a la fecha inicial.");
  }

  return {
    name: payload.name?.trim() || "",
    start_date: startDate,
    end_date: endDate,
    payment_date: payload.payment_date || null,
    status: payload.status || "abierto",
    notes: payload.notes?.trim() || null,
  };
}

function sanitizePayrollEntryPayload(payload) {
  return {
    payroll_period_id: payload.payroll_period_id || payload.period_id || null,
    employee_id: payload.employee_id || null,
    specialist_id: payload.specialist_id || null,
    payment_method: payload.payment_method?.trim() || null,
    status: payload.status || "borrador",
    base_salary: safeNumber(payload.base_salary),
    commission_amount: safeNumber(payload.commission_amount),
    bonus_amount: safeNumber(payload.bonus_amount),
    overtime_amount: safeNumber(payload.overtime_amount),
    other_income: safeNumber(payload.other_income),
    advances: safeNumber(payload.advances),
    absences_deduction: safeNumber(payload.absences_deduction),
    legal_deductions: safeNumber(payload.legal_deductions),
    other_deductions: safeNumber(payload.other_deductions),
    notes: payload.notes?.trim() || null,
  };
}

function attachPayrollAggregates(periods = [], entries = []) {
  const summaryByPeriod = entries.reduce((acc, entry) => {
    const periodId = entry.payroll_period_id || entry.period_id;
    if (!periodId) {
      return acc;
    }

    if (!acc[periodId]) {
      acc[periodId] = {
        employees_count: 0,
        gross_total: 0,
        deductions_total: 0,
        net_total: 0,
        paid_entries_count: 0,
      };
    }

    if (entry.status !== "anulada") {
      acc[periodId].employees_count += 1;
      acc[periodId].gross_total += safeNumber(entry.gross_total);
      acc[periodId].deductions_total += safeNumber(entry.deductions_total);
      acc[periodId].net_total += safeNumber(entry.net_total);

      if (entry.status === "pagada") {
        acc[periodId].paid_entries_count += 1;
      }
    }

    return acc;
  }, {});

  return periods.map((period) => ({
    ...period,
    ...(summaryByPeriod[period.id] || {
      employees_count: 0,
      gross_total: 0,
      deductions_total: 0,
      net_total: 0,
      paid_entries_count: 0,
    }),
  }));
}

function normalizePayrollEntry(entry, commissionsByEntryId = new Map()) {
  return {
    ...entry,
    employee: entry.employees || null,
    specialist: entry.specialists || null,
    period: entry.payroll_periods || null,
    commissions: commissionsByEntryId.get(entry.id) || [],
  };
}

function getTeamStatus(employee, specialist, profile) {
  if (employee?.status) return employee.status;
  if (specialist) return specialist.active === false ? "inactivo" : "activo";
  if (profile) return profile.active === false ? "inactivo" : "activo";
  return "activo";
}

function isTeamRecordActive(status) {
  return status === "activo";
}

function buildTeamRow({
  employee = null,
  specialist = null,
  profile = null,
  sourceStatus,
}) {
  const fullName = employee?.full_name || specialist?.full_name || profile?.full_name || "Sin nombre";
  const status = getTeamStatus(employee, specialist, profile);
  const active = isTeamRecordActive(status);
  const systemRole = profile?.role || null;
  const hasSystemAccess = Boolean(profile?.id && profile?.active !== false);
  const isAdministrative = systemRole === "admin" || (!specialist && Boolean(profile?.id));
  const position = employee?.position
    || (isAdministrative ? "Administración / propietaria" : null)
    || (specialist ? "Especialista" : null);

  return {
    id: employee?.id || specialist?.id || profile?.id || fullName,
    employee_id: employee?.id || null,
    specialist_id: specialist?.id || employee?.specialist_id || profile?.specialist_id || null,
    profile_id: profile?.id || null,
    full_name: fullName,
    position,
    employee_role: employee?.role || null,
    system_role: systemRole,
    phone: employee?.phone || null,
    email: employee?.email || null,
    base_salary: safeNumber(employee?.base_salary),
    payment_frequency: employee?.payment_frequency || "quincenal",
    status,
    active,
    has_system_access: hasSystemAccess,
    specialist_name: specialist?.full_name || null,
    start_time: specialist?.start_time || null,
    end_time: specialist?.end_time || null,
    has_open_schedule: Boolean(specialist?.has_open_schedule),
    schedule_label: buildScheduleLabel(specialist),
    specialist_active: specialist?.active !== false,
    hire_date: employee?.hire_date || null,
    termination_date: employee?.termination_date || null,
    notes: employee?.notes || null,
    source_status: sourceStatus,
    profile_active: profile?.active !== false,
    warning_access_separate: Boolean(employee && (profile?.active !== false || specialist?.active === true)),
  };
}

function sanitizePaymentFrequency(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EMPLOYEE_PAYMENT_FREQUENCIES.includes(normalized) ? normalized : "quincenal";
}

function sanitizeEmployeePayload(payload, fallbackPosition = null) {
  const fullName = payload.full_name?.trim() || "";
  const position = payload.position?.trim() || fallbackPosition || null;
  const baseSalary = safeNumber(payload.base_salary);

  if (!fullName) {
    throw new Error("El nombre completo es obligatorio.");
  }

  if (baseSalary < 0) {
    throw new Error("El salario base no puede ser negativo.");
  }

  return {
    full_name: fullName,
    position,
    role: payload.role?.trim() || null,
    specialist_id: payload.specialist_id || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    status: payload.status || "activo",
    hire_date: payload.hire_date || null,
    termination_date: payload.termination_date || null,
    notes: payload.notes?.trim() || null,
    base_salary: baseSalary,
    payment_frequency: sanitizePaymentFrequency(payload.payment_frequency),
  };
}

async function assertEmployeePayloadIsUnique(payload, excludeEmployeeId = null) {
  const employeesResult = await fetchEmployeesSettings();
  const employees = employeesResult.rows || [];
  const targetName = normalizeName(payload.full_name);

  const duplicated = employees.find((employee) => {
    if (excludeEmployeeId && employee.id === excludeEmployeeId) {
      return false;
    }

    if (payload.specialist_id && employee.specialist_id === payload.specialist_id) {
      return true;
    }

    return normalizeName(employee.full_name) === targetName;
  });

  if (duplicated) {
    if (payload.specialist_id && duplicated.specialist_id === payload.specialist_id) {
      throw new Error("Ya existe una ficha administrativa para esta especialista.");
    }

    throw new Error("Ya existe una ficha administrativa con este nombre.");
  }
}

async function assertSpecialistSelectionAllowed(specialistId, currentSpecialistId = null) {
  if (!specialistId) return;

  const specialists = await fetchSpecialistsSettings();
  const selected = (specialists || []).find((item) => item.id === specialistId);

  if (!selected) {
    throw new Error("La especialista seleccionada no existe.");
  }

  if (isExcludedOperationalName(selected.full_name)) {
    throw new Error("No puedes vincular una ficha administrativa a una especialista histórica o inactiva para operación.");
  }

  if (selected.active === false && specialistId !== currentSpecialistId) {
    throw new Error("Solo puedes vincular especialistas operativas activas.");
  }
}

async function fetchSettingRecord(settingKey) {
  const { data, error } = await supabase
    .from("system_settings")
    .select("id, setting_key, setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { persistenceAvailable: false, data: null };
    }
    console.error(`Error loading setting ${settingKey}`, error);
    throw new Error("No fue posible cargar la configuración del sistema.");
  }

  return {
    persistenceAvailable: true,
    data,
  };
}

export async function fetchSystemSettingsBundle() {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const results = await Promise.all(keys.map((key) => fetchSettingRecord(key)));
  const persistenceAvailable = results.every((item) => item.persistenceAvailable);

  const settings = keys.reduce((acc, key, index) => {
    acc[key] = mergeSetting(DEFAULT_SETTINGS[key], results[index].data?.setting_value);
    return acc;
  }, {});

  return { settings, persistenceAvailable };
}

export async function saveSystemSetting(settingKey, settingValue) {
  const { persistenceAvailable } = await fetchSettingRecord(settingKey);

  if (!persistenceAvailable) {
    throw new Error("El guardado persistente de esta sección no está disponible en este momento.");
  }

  const { data, error } = await supabase
    .from("system_settings")
    .upsert(
      {
        setting_key: settingKey,
        setting_value: settingValue,
      },
      { onConflict: "setting_key" }
    )
    .select("id, setting_key, setting_value")
    .single();

  if (error) {
    console.error(`Error saving setting ${settingKey}`, error);
    throw new Error("No fue posible guardar la configuración.");
  }

  return data;
}

export async function fetchSpecialistsSettings() {
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error loading specialists settings", {
      table: "specialists",
      operation: "select",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("No fue posible cargar las especialistas.");
  }

  return data || [];
}

export function getOperationalSpecialists(records = []) {
  return (records || []).filter((item) => isOperationalSpecialistRecord(item));
}

export async function updateSpecialistSettings(id, payload, profile = null) {
  if (profile) {
    assertAdminProfile(profile, "No tienes permisos para administrar horarios.");
  }

  const { data, error } = await supabase
    .from("specialists")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating specialist settings", {
      table: "specialists",
      operation: "update",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "No fue posible actualizar el horario de la especialista.");
  }

  return data;
}

export async function fetchCabinsSettings() {
  const { data, error } = await supabase
    .from("cabins")
    .select("id, name, type, active")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading cabins settings", {
      table: "cabins",
      operation: "select",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("No fue posible cargar las cabinas.");
  }

  return data || [];
}

export async function updateCabinSettings(id, payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar cabinas.");

  const { data, error } = await supabase
    .from("cabins")
    .update({
      name: payload.name?.trim() || "",
      type: payload.type || "laser",
      active: payload.active !== false,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating cabin settings", {
      table: "cabins",
      operation: "update",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "No fue posible actualizar la cabina.");
  }

  return data;
}

export async function createCabinSettings(payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar cabinas.");

  const normalizedPayload = {
    name: payload.name?.trim() || "",
    type: payload.type || "laser",
    active: payload.active !== false,
  };

  const { data, error } = await supabase
    .from("cabins")
    .insert(normalizedPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating cabin settings", {
      table: "cabins",
      operation: "insert",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "No fue posible crear la cabina.");
  }

  return data;
}

export async function fetchServicesSettings() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, service_type, price, sessions_count, payment_flexibility, duration_minutes, description, active")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading services settings", error);
    throw new Error("No fue posible cargar los servicios.");
  }

  return data || [];
}

export async function fetchServiceOffersSettings() {
  return fetchServiceOffers();
}

function sanitizeServicePayload(payload) {
  return {
    name: payload.name?.trim() || "",
    category: payload.category?.trim() || null,
    service_type: payload.service_type || "servicio",
    price: Number(payload.price || 0),
    sessions_count: payload.sessions_count === "" || payload.sessions_count == null
      ? null
      : Number(payload.sessions_count),
    payment_flexibility: payload.payment_flexibility?.trim() || null,
    duration_minutes: payload.duration_minutes === "" || payload.duration_minutes == null
      ? 40
      : Number(payload.duration_minutes),
    description: payload.description?.trim() || null,
    active: payload.active !== false,
  };
}

function sanitizeServiceOfferPayload(payload) {
  return {
    service_id: payload.service_id || null,
    title: payload.title?.trim() || "",
    regular_price: Number(payload.regular_price || 0),
    offer_price: Number(payload.offer_price || 0),
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
    active: payload.active !== false,
    description: payload.description?.trim() || null,
  };
}

export async function createServiceSettings(payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para modificar precios o servicios.");
  const normalizedPayload = sanitizeServicePayload(payload);

  const { data, error } = await supabase
    .from("services")
    .insert(normalizedPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creando servicio:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload: normalizedPayload,
    });
    throw new Error(error.message || "No fue posible crear el servicio.");
  }

  return data;
}

export async function updateServiceSettings(id, payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para modificar precios o servicios.");
  const normalizedPayload = sanitizeServicePayload(payload);

  const { data, error } = await supabase
    .from("services")
    .update(normalizedPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error actualizando servicio:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload: normalizedPayload,
    });
    throw new Error(error.message || "No fue posible actualizar el servicio.");
  }

  return data;
}

export async function createServiceOfferSettings(payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para modificar ofertas.");
  const normalized = sanitizeServiceOfferPayload(payload);

  const { data, error } = await supabase
    .from("service_offers")
    .insert(normalized)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating service offer", error);
    throw new Error("No fue posible crear la oferta.");
  }

  return data;
}

export async function updateServiceOfferSettings(id, payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para modificar ofertas.");
  const normalized = sanitizeServiceOfferPayload(payload);

  const { data, error } = await supabase
    .from("service_offers")
    .update(normalized)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating service offer", error);
    throw new Error("No fue posible actualizar la oferta.");
  }

  return data;
}

export async function fetchEmployeesSettings() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return { rows: [], persistenceAvailable: false };
    }
    console.error("Error loading employees", {
      table: "employees",
      operation: "select",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("No se pudo cargar la información del equipo.");
  }

  return { rows: data || [], persistenceAvailable: true };
}

export async function fetchEmployees() {
  return fetchEmployeesSettings();
}

export async function fetchProfilesSettings() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, specialist_id, created_at, updated_at, specialists(full_name)")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error loading profiles for settings", {
      table: "profiles",
      operation: "select",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("No se pudo cargar la información de accesos del equipo.");
  }

  return data || [];
}

export async function fetchTeamSettings() {
  const [employeesResult, specialists, profiles] = await Promise.all([
    fetchEmployeesSettings(),
    fetchSpecialistsSettings(),
    fetchProfilesSettings(),
  ]);

  const employees = employeesResult.rows || [];
  const specialistsById = new Map((specialists || []).map((item) => [item.id, item]));
  const specialistsByName = new Map((specialists || []).map((item) => [normalizeName(item.full_name), item]));
  const profilesBySpecialistId = new Map(
    (profiles || [])
      .filter((item) => item.specialist_id)
      .map((item) => [item.specialist_id, item])
  );
  const profilesByName = new Map((profiles || []).map((item) => [normalizeName(item.full_name), item]));

  const rows = [];
  const usedSpecialistIds = new Set();
  const usedProfileIds = new Set();

  employees.forEach((employee) => {
    const linkedSpecialist = employee.specialist_id
      ? specialistsById.get(employee.specialist_id) || null
      : specialistsByName.get(normalizeName(employee.full_name)) || null;
    const linkedProfile = linkedSpecialist?.id
      ? profilesBySpecialistId.get(linkedSpecialist.id) || null
      : profilesByName.get(normalizeName(employee.full_name)) || null;

    if (isHistoricalGoldieName(employee.full_name) || isHistoricalGoldieName(linkedSpecialist?.full_name)) {
      return;
    }

    rows.push(
      buildTeamRow({
        employee,
        specialist: linkedSpecialist,
        profile: linkedProfile,
        sourceStatus: linkedSpecialist
          ? "ficha_completa"
          : linkedProfile
            ? "usuario_sin_ficha"
            : "administrativo",
      })
    );

    if (linkedSpecialist?.id) usedSpecialistIds.add(linkedSpecialist.id);
    if (linkedProfile?.id) usedProfileIds.add(linkedProfile.id);
  });

  getOperationalSpecialists(specialists).forEach((specialist) => {
    if (usedSpecialistIds.has(specialist.id)) return;
    const linkedProfile = profilesBySpecialistId.get(specialist.id) || null;

    rows.push(
      buildTeamRow({
        specialist,
        profile: linkedProfile,
        sourceStatus: linkedProfile?.role === "admin"
          ? "administrativo"
          : linkedProfile
            ? "usuario_sin_ficha"
            : "especialista_sin_ficha",
      })
    );

    usedSpecialistIds.add(specialist.id);
    if (linkedProfile?.id) usedProfileIds.add(linkedProfile.id);
  });

  (profiles || []).forEach((profile) => {
    if (usedProfileIds.has(profile.id)) return;
    if (isExcludedOperationalName(profile.full_name)) return;

    const linkedSpecialist = profile.specialist_id ? specialistsById.get(profile.specialist_id) || null : null;
    if (linkedSpecialist && !isOperationalSpecialistRecord(linkedSpecialist)) {
      return;
    }

    rows.push(
      buildTeamRow({
        profile,
        specialist: linkedSpecialist,
        sourceStatus: "administrativo",
      })
    );
  });

  const sortedRows = rows.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.full_name || "").localeCompare(b.full_name || "");
  });

  return {
    rows: sortedRows,
    employees,
    specialists,
    profiles,
    persistenceAvailable: employeesResult.persistenceAvailable,
  };
}

export async function createEmployeeSettings(payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar empleados.");
  const normalizedPayload = sanitizeEmployeePayload(payload);

  await assertSpecialistSelectionAllowed(normalizedPayload.specialist_id);
  await assertEmployeePayloadIsUnique(normalizedPayload);

  const { data, error } = await supabase
    .from("employees")
    .insert(normalizedPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating employee", {
      table: "employees",
      operation: "insert",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "No fue posible crear el empleado.");
  }

  return data;
}

export async function createEmployee(payload, profile) {
  return createEmployeeSettings(payload, profile);
}

export async function updateEmployeeSettings(id, payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar empleados.");
  const employeesResult = await fetchEmployeesSettings();
  const currentEmployee = (employeesResult.rows || []).find((employee) => employee.id === id);

  if (!currentEmployee) {
    throw new Error("No se encontró la ficha administrativa.");
  }

  const normalizedPayload = sanitizeEmployeePayload(payload, currentEmployee.position || null);

  await assertSpecialistSelectionAllowed(normalizedPayload.specialist_id, currentEmployee.specialist_id || null);
  await assertEmployeePayloadIsUnique(normalizedPayload, id);

  const { data, error } = await supabase
    .from("employees")
    .update(normalizedPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating employee", {
      table: "employees",
      operation: "update",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "No fue posible actualizar el empleado.");
  }

  return data;
}

export async function updateEmployee(id, payload, profile) {
  return updateEmployeeSettings(id, payload, profile);
}

export async function setEmployeeInactive(id, profile) {
  return updateEmployeeSettings(id, {
    status: "inactivo",
    termination_date: new Date().toISOString().slice(0, 10),
  }, profile);
}

export async function fetchSpecialistsWithoutEmployee() {
  const [employeesResult, specialists] = await Promise.all([
    fetchEmployeesSettings(),
    fetchSpecialistsSettings(),
  ]);

  const employees = employeesResult.rows || [];
  const employeeSpecialistIds = new Set(
    employees
      .map((employee) => employee.specialist_id)
      .filter(Boolean)
  );
  const employeeNames = new Set(employees.map((employee) => normalizeName(employee.full_name)));

  return getOperationalSpecialists(specialists)
    .filter((specialist) => isOfficialPayrollSpecialistName(specialist.full_name))
    .filter((specialist) => !employeeSpecialistIds.has(specialist.id))
    .filter((specialist) => !employeeNames.has(normalizeName(specialist.full_name)));
}

export async function createMissingEmployeeRecords(profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar empleados.");

  const pendingSpecialists = await fetchSpecialistsWithoutEmployee();

  if (!pendingSpecialists.length) {
    return {
      created: [],
      skipped: [],
    };
  }

  const payloads = pendingSpecialists.map((specialist) => ({
    full_name: specialist.full_name,
    position: "Especialista",
    role: "especialista",
    specialist_id: specialist.id,
    phone: null,
    email: null,
    status: "activo",
    hire_date: null,
    termination_date: null,
    notes: null,
    base_salary: 0,
    payment_frequency: "quincenal",
  }));

  const { data, error } = await supabase
    .from("employees")
    .insert(payloads)
    .select("*");

  if (error) {
    console.error("Error creating missing employee records", {
      table: "employees",
      operation: "insert",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "No fue posible crear las fichas administrativas pendientes.");
  }

  return {
    created: data || [],
    skipped: [],
  };
}

export async function fetchPayrollPeriods() {
  const [periodsResponse, entriesResponse] = await Promise.all([
    supabase
      .from("payroll_periods")
      .select("*")
      .order("start_date", { ascending: false }),
    supabase
      .from("payroll_entries")
      .select("id, payroll_period_id, status, gross_total, deductions_total, net_total"),
  ]);

  if (periodsResponse.error) {
    logSupabaseError("Error loading payroll periods", "payroll_periods", "select", periodsResponse.error);
    throw new Error("No se pudo cargar la nómina.");
  }

  if (entriesResponse.error) {
    logSupabaseError("Error loading payroll entries summary", "payroll_entries", "select", entriesResponse.error);
    throw new Error("No se pudo cargar la nómina.");
  }

  return attachPayrollAggregates(periodsResponse.data || [], entriesResponse.data || []);
}

export async function createPayrollPeriod(payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar nómina.");
  const normalized = sanitizePayrollPeriodPayload(payload);

  const { data, error } = await supabase
    .from("payroll_periods")
    .insert(normalized)
    .select("*")
    .single();

  if (error) {
    logSupabaseError("Error creating payroll period", "payroll_periods", "insert", error);
    throw new Error(error.message || "No se pudo guardar el período.");
  }

  return data;
}

export async function updatePayrollPeriod(id, payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar nómina.");
  const normalized = sanitizePayrollPeriodPayload(payload);

  const { data, error } = await supabase
    .from("payroll_periods")
    .update(normalized)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logSupabaseError("Error updating payroll period", "payroll_periods", "update", error);
    throw new Error(error.message || "No se pudo guardar el período.");
  }

  return data;
}

export async function fetchPayrollEntries(periodId) {
  let query = supabase
    .from("payroll_entries")
    .select(`
      *,
      employees(*),
      specialists(*),
      payroll_periods(*)
    `)
    .order("created_at", { ascending: false });

  if (periodId) {
    query = query.eq("payroll_period_id", periodId);
  }

  const { data: entries, error } = await query;

  if (error) {
    logSupabaseError("Error loading payroll entries", "payroll_entries", "select", error);
    throw new Error("No se pudo cargar la nómina.");
  }

  const entryIds = (entries || []).map((entry) => entry.id);
  let commissionsByEntryId = new Map();

  if (entryIds.length) {
    const { data: commissions, error: commissionsError } = await supabase
      .from("commissions")
      .select("*")
      .in("payroll_entry_id", entryIds)
      .order("commission_date", { ascending: true });

    if (commissionsError) {
      logSupabaseError("Error loading payroll entry commissions", "commissions", "select", commissionsError);
      throw new Error("No se pudo cargar la nómina.");
    }

    commissionsByEntryId = (commissions || []).reduce((acc, commission) => {
      const key = commission.payroll_entry_id;
      acc.set(key, [...(acc.get(key) || []), commission]);
      return acc;
    }, new Map());
  }

  return (entries || []).map((entry) => normalizePayrollEntry(entry, commissionsByEntryId));
}

export async function fetchPayrollEntryById(id) {
  const { data: entry, error } = await supabase
    .from("payroll_entries")
    .select(`
      *,
      employees(*),
      specialists(*),
      payroll_periods(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    logSupabaseError("Error loading payroll entry", "payroll_entries", "select", error);
    throw new Error("No se pudo cargar el pago de nómina.");
  }

  const { data: commissions, error: commissionsError } = await supabase
    .from("commissions")
    .select("*")
    .eq("payroll_entry_id", id)
    .order("commission_date", { ascending: true });

  if (commissionsError) {
    logSupabaseError("Error loading payroll entry commissions", "commissions", "select", commissionsError);
    throw new Error("No se pudo cargar el pago de nómina.");
  }

  return normalizePayrollEntry(entry, new Map([[id, commissions || []]]));
}

export async function fetchEligiblePayrollEmployees() {
  const [employeesResponse, specialistsResponse, profilesResponse] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
      .eq("status", "activo")
      .order("full_name", { ascending: true }),
    supabase
      .from("specialists")
      .select("id, full_name, active")
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, role, active, specialist_id"),
  ]);

  if (employeesResponse.error) {
    logSupabaseError("Error loading payroll employees", "employees", "select", employeesResponse.error);
    throw new Error("No se pudo cargar la nómina.");
  }

  if (specialistsResponse.error) {
    logSupabaseError("Error loading payroll specialists", "specialists", "select", specialistsResponse.error);
    throw new Error("No se pudo cargar la nómina.");
  }

  if (profilesResponse.error) {
    logSupabaseError("Error loading payroll profiles", "profiles", "select", profilesResponse.error);
    throw new Error("No se pudo cargar la nómina.");
  }

  const specialists = specialistsResponse.data || [];
  const specialistsById = new Map(specialists.map((item) => [item.id, item]));
  const specialistsByName = new Map(specialists.map((item) => [normalizeName(item.full_name), item]));
  const profiles = profilesResponse.data || [];
  const warnings = [];

  const rows = (employeesResponse.data || [])
    .filter((employee) => !isExcludedOperationalName(employee.full_name))
    .map((employee) => {
      const specialist = employee.specialist_id
        ? specialistsById.get(employee.specialist_id) || null
        : specialistsByName.get(normalizeName(employee.full_name)) || null;

      const linkedProfile = profiles.find((profile) => profile.specialist_id === specialist?.id) || null;

      return {
        ...employee,
        specialist,
        specialist_name: specialist?.full_name || null,
        has_system_access: Boolean(linkedProfile?.active !== false && linkedProfile?.id),
        payment_frequency: employee.payment_frequency || "mensual",
        base_salary: safeNumber(employee.base_salary),
        payroll_warning: safeNumber(employee.base_salary) <= 0
          ? "Esta empleada todavía no tiene salario base configurado."
          : "",
      };
    });

  specialists
    .filter((specialist) => !isExcludedOperationalName(specialist.full_name))
    .forEach((specialist) => {
      const hasEmployeeRecord = rows.some((employee) => employee.specialist_id === specialist.id);
      if (!hasEmployeeRecord) {
        warnings.push({
          specialist_id: specialist.id,
          full_name: specialist.full_name,
          message: "Requiere ficha administrativa antes de incluirla en nómina.",
        });
      }
    });

  return { rows, warnings };
}

export async function fetchPendingCommissionsForPayroll(specialistId, startDate, endDate) {
  if (!specialistId || !startDate || !endDate) {
    return [];
  }

  const { data, error } = await supabase
    .from("commissions")
    .select("*")
    .eq("specialist_id", specialistId)
    .eq("status", "pendiente")
    .gte("commission_date", startDate)
    .lte("commission_date", endDate)
    .order("commission_date", { ascending: true });

  if (error) {
    logSupabaseError("Error loading pending commissions for payroll", "commissions", "select", error);
    throw new Error("No se pudo cargar las comisiones pendientes.");
  }

  return data || [];
}

export async function assignCommissionsToPayrollEntry(entryId, commissionIds = []) {
  if (!entryId) {
    throw new Error("No se encontró la nómina para asignar comisiones.");
  }

  const uniqueIds = Array.from(new Set((commissionIds || []).filter(Boolean)));

  const { data: currentLinked, error: currentLinkedError } = await supabase
    .from("commissions")
    .select("id, payroll_entry_id, status")
    .eq("payroll_entry_id", entryId);

  if (currentLinkedError) {
    logSupabaseError("Error loading current payroll commissions", "commissions", "select", currentLinkedError);
    throw new Error("No se pudo actualizar las comisiones de nómina.");
  }

  const toRelease = (currentLinked || [])
    .filter((commission) => !uniqueIds.includes(commission.id) && commission.status !== "pagada")
    .map((commission) => commission.id);

  if (toRelease.length) {
    const { error: releaseError } = await supabase
      .from("commissions")
      .update({ payroll_entry_id: null })
      .in("id", toRelease)
      .eq("payroll_entry_id", entryId);

    if (releaseError) {
      logSupabaseError("Error releasing payroll commissions", "commissions", "update", releaseError);
      throw new Error("No se pudo actualizar las comisiones de nómina.");
    }
  }

  if (!uniqueIds.length) {
    return [];
  }

  const { data: selectedCommissions, error: selectedCommissionsError } = await supabase
    .from("commissions")
    .select("id, payroll_entry_id, status")
    .in("id", uniqueIds);

  if (selectedCommissionsError) {
    logSupabaseError("Error validating payroll commissions", "commissions", "select", selectedCommissionsError);
    throw new Error("No se pudo actualizar las comisiones de nómina.");
  }

  const conflicting = (selectedCommissions || []).find(
    (commission) => commission.payroll_entry_id && commission.payroll_entry_id !== entryId
  );

  if (conflicting) {
    throw new Error("Esta comisión ya fue incluida en otra nómina.");
  }

  const { data, error } = await supabase
    .from("commissions")
    .update({ payroll_entry_id: entryId })
    .in("id", uniqueIds)
    .select("*");

  if (error) {
    logSupabaseError("Error assigning payroll commissions", "commissions", "update", error);
    throw new Error("No se pudo actualizar las comisiones de nómina.");
  }

  return data || [];
}

export async function createPayrollEntry(payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar nómina.");
  const normalized = sanitizePayrollEntryPayload(payload);

  const { data, error } = await supabase
    .from("payroll_entries")
    .insert(normalized)
    .select(`
      *,
      employees(*),
      specialists(*),
      payroll_periods(*)
    `)
    .single();

  if (error) {
    logSupabaseError("Error creating payroll entry", "payroll_entries", "insert", error);
    throw new Error(error.message || "No se pudo guardar el pago.");
  }

  await assignCommissionsToPayrollEntry(data.id, payload.commission_ids || []);
  return fetchPayrollEntryById(data.id);
}

export async function updatePayrollEntry(id, payload, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar nómina.");
  const normalized = sanitizePayrollEntryPayload(payload);

  const { data: currentEntry, error: currentError } = await supabase
    .from("payroll_entries")
    .select("id, status")
    .eq("id", id)
    .single();

  if (currentError) {
    logSupabaseError("Error loading payroll entry before update", "payroll_entries", "select", currentError);
    throw new Error("No se pudo guardar el pago.");
  }

  if (currentEntry.status === "pagada") {
    throw new Error("La nómina pagada no puede modificarse.");
  }

  const { error } = await supabase
    .from("payroll_entries")
    .update(normalized)
    .eq("id", id);

  if (error) {
    logSupabaseError("Error updating payroll entry", "payroll_entries", "update", error);
    throw new Error(error.message || "No se pudo guardar el pago.");
  }

  await assignCommissionsToPayrollEntry(id, payload.commission_ids || []);
  return fetchPayrollEntryById(id);
}

export async function markPayrollEntryAsPaid(entryId, commissionIds = [], profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar nómina.");

  const { data: entry, error: entryError } = await supabase
    .from("payroll_entries")
    .select("id, status")
    .eq("id", entryId)
    .single();

  if (entryError) {
    logSupabaseError("Error loading payroll entry before pay", "payroll_entries", "select", entryError);
    throw new Error("No se pudo marcar como pagada.");
  }

  if (entry.status === "anulada") {
    throw new Error("No se puede marcar como pagada una nómina anulada.");
  }

  const { error: updateEntryError } = await supabase
    .from("payroll_entries")
    .update({ status: "pagada" })
    .eq("id", entryId);

  if (updateEntryError) {
    logSupabaseError("Error marking payroll entry as paid", "payroll_entries", "update", updateEntryError);
    throw new Error("No se pudo marcar como pagada.");
  }

  const uniqueIds = Array.from(new Set((commissionIds || []).filter(Boolean)));

  if (uniqueIds.length) {
    const { data: linkedCommissions, error: linkedError } = await supabase
      .from("commissions")
      .select("id, payroll_entry_id, status")
      .in("id", uniqueIds);

    if (linkedError) {
      logSupabaseError("Error loading commissions before pay", "commissions", "select", linkedError);
      throw new Error("No se pudo marcar como pagada.");
    }

    const invalidCommission = (linkedCommissions || []).find((commission) => commission.payroll_entry_id !== entryId);
    if (invalidCommission) {
      throw new Error("Esta comisión ya fue incluida en otra nómina.");
    }

    const payableIds = (linkedCommissions || [])
      .filter((commission) => commission.status !== "pagada")
      .map((commission) => commission.id);

    if (payableIds.length) {
      const { error: commissionsError } = await supabase
        .from("commissions")
        .update({
          status: "pagada",
          paid_at: new Date().toISOString(),
          payroll_entry_id: entryId,
        })
        .in("id", payableIds)
        .eq("payroll_entry_id", entryId);

      if (commissionsError) {
        logSupabaseError("Error marking payroll commissions as paid", "commissions", "update", commissionsError);
        throw new Error("No se pudo marcar como pagada.");
      }
    }
  }

  return fetchPayrollEntryById(entryId);
}

export async function annulPayrollEntry(entryId, profile) {
  assertAdminProfile(profile, "No tienes permisos para gestionar nómina.");

  const { data: entry, error: entryError } = await supabase
    .from("payroll_entries")
    .select("id, status")
    .eq("id", entryId)
    .single();

  if (entryError) {
    logSupabaseError("Error loading payroll entry before annul", "payroll_entries", "select", entryError);
    throw new Error("No se pudo anular el pago.");
  }

  if (entry.status === "pagada") {
    throw new Error("No se puede anular una nómina pagada.");
  }

  const { error: updateEntryError } = await supabase
    .from("payroll_entries")
    .update({ status: "anulada" })
    .eq("id", entryId);

  if (updateEntryError) {
    logSupabaseError("Error annulling payroll entry", "payroll_entries", "update", updateEntryError);
    throw new Error("No se pudo anular el pago.");
  }

  const { error: releaseError } = await supabase
    .from("commissions")
    .update({ payroll_entry_id: null })
    .eq("payroll_entry_id", entryId)
    .eq("status", "pendiente");

  if (releaseError) {
    logSupabaseError("Error releasing payroll commissions after annul", "commissions", "update", releaseError);
    throw new Error("No se pudo anular el pago.");
  }

  return fetchPayrollEntryById(entryId);
}

export async function fetchPayrollSettings() {
  const { data, error } = await supabase
    .from("payroll_payments")
    .select("*")
    .order("payment_date", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return { rows: [], persistenceAvailable: false };
    }
    console.error("Error loading payroll payments", error);
    throw new Error("No fue posible cargar la nómina.");
  }

  return { rows: data || [], persistenceAvailable: true };
}

export async function createPayrollPayment(payload) {
  const { data, error } = await supabase
    .from("payroll_payments")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating payroll payment", error);
    throw new Error("No fue posible registrar el pago de nómina.");
  }

  return data;
}

export async function fetchSettingsData() {
  const [
    settingsBundle,
    team,
    specialists,
    cabins,
    services,
    serviceOffers,
    employees,
    payroll,
  ] = await Promise.all([
    fetchSystemSettingsBundle(),
    fetchTeamSettings(),
    fetchSpecialistsSettings(),
    fetchCabinsSettings(),
    fetchServicesSettings(),
    fetchServiceOffersSettings(),
    fetchEmployeesSettings(),
    fetchPayrollSettings(),
  ]);

  return {
    settings: settingsBundle.settings,
    settingsPersistenceAvailable: settingsBundle.persistenceAvailable,
    specialists,
    cabins,
    services,
    serviceOffers,
    employees: employees.rows,
    employeesPersistenceAvailable: team.persistenceAvailable,
    teamRows: team.rows,
    teamProfiles: team.profiles,
    payrollPayments: payroll.rows,
    payrollPersistenceAvailable: payroll.persistenceAvailable,
  };
}

export async function fetchSchedulingRules() {
  try {
    const { settings } = await fetchSystemSettingsBundle();
    return settings.scheduling_rules;
  } catch (error) {
    console.error("Error loading scheduling rules", error);
    return DEFAULT_SETTINGS.scheduling_rules;
  }
}

export function getDefaultSettings() {
  return DEFAULT_SETTINGS;
}

export function canPersistEmployeesError(error) {
  return !(isMissingRelationError(error) || isMissingColumnError(error));
}
