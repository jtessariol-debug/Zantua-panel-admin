import { supabase } from "../lib/supabaseClient";
import { BRANDING } from "../lib/branding";

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
    throw new Error("Configuración preparada. Requiere activar guardado persistente.");
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
    console.error("Error loading specialists settings", error);
    throw new Error("No fue posible cargar las especialistas.");
  }

  return data || [];
}

export async function updateSpecialistSettings(id, payload) {
  const { data, error } = await supabase
    .from("specialists")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating specialist settings", error);
    throw new Error("No fue posible actualizar el horario de la especialista.");
  }

  return data;
}

export async function fetchCabinsSettings() {
  const { data, error } = await supabase
    .from("cabins")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading cabins settings", error);
    throw new Error("No fue posible cargar las cabinas.");
  }

  return data || [];
}

export async function updateCabinSettings(id, payload) {
  const { data, error } = await supabase
    .from("cabins")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating cabin settings", error);
    throw new Error("No fue posible actualizar la cabina.");
  }

  return data;
}

export async function fetchServicesSettings() {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading services settings", error);
    throw new Error("No fue posible cargar los servicios.");
  }

  return data || [];
}

export async function createServiceSettings(payload) {
  const { data, error } = await supabase
    .from("services")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating service", error);
    throw new Error("No fue posible crear el servicio.");
  }

  return data;
}

export async function updateServiceSettings(id, payload) {
  const { data, error } = await supabase
    .from("services")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating service", error);
    throw new Error("No fue posible actualizar el servicio.");
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
    console.error("Error loading employees", error);
    throw new Error("No fue posible cargar los empleados.");
  }

  return { rows: data || [], persistenceAvailable: true };
}

export async function createEmployeeSettings(payload) {
  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating employee", error);
    throw new Error("No fue posible crear el empleado.");
  }

  return data;
}

export async function updateEmployeeSettings(id, payload) {
  const { data, error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating employee", error);
    throw new Error("No fue posible actualizar el empleado.");
  }

  return data;
}

export async function setEmployeeInactive(id) {
  return updateEmployeeSettings(id, {
    status: "inactivo",
    termination_date: new Date().toISOString().slice(0, 10),
  });
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
    specialists,
    cabins,
    services,
    employees,
    payroll,
  ] = await Promise.all([
    fetchSystemSettingsBundle(),
    fetchSpecialistsSettings(),
    fetchCabinsSettings(),
    fetchServicesSettings(),
    fetchEmployeesSettings(),
    fetchPayrollSettings(),
  ]);

  return {
    settings: settingsBundle.settings,
    settingsPersistenceAvailable: settingsBundle.persistenceAvailable,
    specialists,
    cabins,
    services,
    employees: employees.rows,
    employeesPersistenceAvailable: employees.persistenceAvailable,
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
