require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const xlsx = require("xlsx");

const ROOT_DIR = process.cwd();
const IMPORTS_DIR = path.join(ROOT_DIR, "imports", "goldie");
const REPORTS_DIR = path.join(IMPORTS_DIR, "reports");
const BACKUPS_DIR = path.join(IMPORTS_DIR, "backups");
const DEFAULT_FILE_PATH = path.join(IMPORTS_DIR, "Appointments - 2026-01-01 - 2026-12-31.xlsx");
const SERVICE_MAPPING_PATH = path.join(IMPORTS_DIR, "service-mapping.json");

const DEFAULT_CLIENT_NOTE = "Importado desde Goldie. Datos de contacto pendientes de completar.";
const HISTORICAL_SPECIALIST_NAME = "ZANTUA - HISTÓRICO GOLDIE";
const TECHNICAL_SERVICE_NAME = "Cita histórica Goldie";
const TECHNICAL_SERVICE_DESCRIPTION = "Servicio técnico utilizado para citas históricas de Goldie cuyo servicio original no pudo relacionarse con seguridad.";
const HISTORICAL_SERVICE_DESCRIPTION = "Servicio histórico importado desde Goldie. No disponible para nuevas citas.";
const DEFAULT_CABIN_NAME = process.env.GOLDIE_DEFAULT_CABIN_NAME || "Cabina Calma";
const DEFAULT_CABIN_ID = "e2e24f82-8b30-498e-a900-13ef2c150351";
const EXPECTED_CONFIRMATION = "ZANTUA_GOLDIE_2026";
const DEFAULT_DRY_RUN = String(process.env.DRY_RUN || "true").toLowerCase() !== "false";
const BATCH_SIZE = Number(process.env.GOLDIE_BATCH_SIZE || 100);
const SAMPLE_LIMIT = 10;

const PLACEHOLDER_HISTORICAL_SPECIALIST = "__historical_specialist__";
const PLACEHOLDER_TECHNICAL_SERVICE = "__technical_service__";
const HISTORICAL_SERVICE_PREFIX = "__historical_service__:";

const KNOWN_APPOINTMENTS_SCHEMA = {
  client_id: { nullable: false },
  specialist_id: { nullable: false },
  service_id: { nullable: false },
  cabin_id: { nullable: false },
  appointment_date: { nullable: false },
  start_time: { nullable: false },
  end_time: { nullable: false },
  status: { nullable: false, default: "pendiente" },
  notes: { nullable: true },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function formatTimestampForPath(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function normalizeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return normalizeSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:()[\]{}\-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenizeText(value) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function maybeGetSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveFilePath() {
  return process.env.GOLDIE_IMPORT_FILE
    ? path.resolve(ROOT_DIR, process.env.GOLDIE_IMPORT_FILE)
    : DEFAULT_FILE_PATH;
}

function parseExcelDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = normalizeSpaces(value);
  if (!text) return null;

  const parts = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (parts) {
    const [, month, day, year] = parts;
    const yyyy = year.length === 2 ? `20${year}` : year;
    return `${yyyy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseExcelTime(value) {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  }

  let text = normalizeSpaces(value)
    .replace(/\./g, "")
    .replace(/\s*a\s*m\s*/i, " AM")
    .replace(/\s*p\s*m\s*/i, " PM")
    .replace(/\s+am$/i, " AM")
    .replace(/\s+pm$/i, " PM");

  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const suffix = match[4] ? match[4].toUpperCase() : null;

  if (suffix === "PM" && hours < 12) hours += 12;
  if (suffix === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseDurationMinutes(value) {
  if (value == null || value === "") return { minutes: 40, warning: true };
  if (typeof value === "number" && !Number.isNaN(value)) return { minutes: value, warning: false };

  const text = normalizeSpaces(value).toLowerCase();
  const hhmm = text.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return {
      minutes: (Number(hhmm[1]) * 60) + Number(hhmm[2]),
      warning: false,
    };
  }

  const numeric = Number(text);
  if (!Number.isNaN(numeric)) return { minutes: numeric, warning: false };
  return { minutes: 40, warning: true };
}

function addMinutesToTime(timeValue, minutesToAdd) {
  const [hours, minutes, seconds] = String(timeValue).split(":").map(Number);
  const total = (hours * 60) + minutes + minutesToAdd;
  const normalized = ((total % 1440) + 1440) % 1440;
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}:${String(seconds || 0).padStart(2, "0")}`;
}

function mapAppointmentStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === "completed") return { status: "completada", warning: false };
  if (normalized === "confirmed") return { status: "confirmada", warning: false };
  if (normalized === "scheduled" || normalized === "pending" || normalized === "upcoming") return { status: "pendiente", warning: false };
  if (normalized === "cancelled" || normalized === "canceled") return { status: "cancelada", warning: false };
  if (normalized === "no show" || normalized === "noshow") return { status: "no_asistio", warning: false };
  return { status: "pendiente", warning: Boolean(normalized) };
}

function parseAmount(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function loadWorkbookRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo fuente: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const worksheet = workbook.Sheets.Appointments;
  if (!worksheet) {
    throw new Error("No se encontró la hoja 'Appointments' en el archivo.");
  }

  return xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: true });
}

async function loadReferenceData(supabase) {
  if (!supabase) {
    return {
      available: false,
      reason: "Falta SUPABASE_SERVICE_ROLE_KEY para contrastar datos existentes.",
      clients: [],
      services: [],
      specialists: [],
      cabins: [],
      appointments: [],
    };
  }

  const [clientsRes, servicesRes, specialistsRes, cabinsRes, appointmentsRes] = await Promise.all([
    supabase.from("clients").select("id, full_name"),
    supabase.from("services").select("id, name, service_type, active"),
    supabase.from("specialists").select("id, full_name, active"),
    supabase.from("cabins").select("id, name, active"),
    supabase.from("appointments").select("id, client_id, appointment_date, start_time, service_id"),
  ]);

  for (const response of [clientsRes, servicesRes, specialistsRes, cabinsRes, appointmentsRes]) {
    if (response.error) {
      throw new Error(response.error.message || "No fue posible cargar datos de referencia.");
    }
  }

  return {
    available: true,
    reason: "",
    clients: clientsRes.data || [],
    services: servicesRes.data || [],
    specialists: specialistsRes.data || [],
    cabins: cabinsRes.data || [],
    appointments: appointmentsRes.data || [],
  };
}

function buildReferenceMaps(referenceData) {
  const clientsByNormalizedName = new Map();
  const servicesByNormalizedName = new Map();
  const servicesById = new Map();
  const specialistsByNormalizedName = new Map();
  const cabinsByNormalizedName = new Map();
  const appointmentKeys = new Set();

  for (const client of referenceData.clients) {
    clientsByNormalizedName.set(normalizeText(client.full_name), client);
  }

  for (const service of referenceData.services) {
    const normalized = normalizeText(service.name);
    if (!servicesByNormalizedName.has(normalized)) {
      servicesByNormalizedName.set(normalized, service);
    }
    servicesById.set(service.id, service);
  }

  for (const specialist of referenceData.specialists) {
    specialistsByNormalizedName.set(normalizeText(specialist.full_name), specialist);
  }

  for (const cabin of referenceData.cabins) {
    cabinsByNormalizedName.set(normalizeText(cabin.name), cabin);
  }

  for (const appointment of referenceData.appointments) {
    appointmentKeys.add(buildAppointmentKey(
      appointment.client_id,
      appointment.appointment_date,
      appointment.start_time,
      appointment.service_id
    ));
  }

  return {
    clientsByNormalizedName,
    servicesByNormalizedName,
    servicesById,
    specialistsByNormalizedName,
    cabinsByNormalizedName,
    appointmentKeys,
  };
}

function buildClientPayload(fullName) {
  return {
    full_name: normalizeSpaces(fullName),
    phone: null,
    email: null,
    national_id: null,
    birth_date: null,
    address: null,
    notes: DEFAULT_CLIENT_NOTE,
    active: true,
  };
}

function buildServicePayload(name, durationMinutes) {
  return {
    name: normalizeSpaces(name),
    category: "Importado Goldie",
    service_type: "servicio",
    price: 0,
    sessions_count: null,
    payment_flexibility: null,
    duration_minutes: durationMinutes || 40,
    description: HISTORICAL_SERVICE_DESCRIPTION,
    active: false,
  };
}

function buildTechnicalServicePayload() {
  return {
    name: TECHNICAL_SERVICE_NAME,
    category: "Importado Goldie",
    service_type: "servicio",
    price: 0,
    sessions_count: null,
    payment_flexibility: null,
    duration_minutes: 40,
    description: TECHNICAL_SERVICE_DESCRIPTION,
    active: false,
  };
}

function resolvePlannedServiceId(servicePlan, serviceNormalized) {
  if (!servicePlan) return PLACEHOLDER_TECHNICAL_SERVICE;
  if (servicePlan.action === "reutilizar_existente") return servicePlan.suggestedId;
  if (servicePlan.action === "usar_servicio_tecnico") return PLACEHOLDER_TECHNICAL_SERVICE;
  if (servicePlan.action === "crear_historico") return `${HISTORICAL_SERVICE_PREFIX}${serviceNormalized || "sin_servicio"}`;
  return PLACEHOLDER_TECHNICAL_SERVICE;
}

function buildAppointmentNotes(row) {
  return [
    "Importado desde Goldie.",
    `Servicio original: ${normalizeSpaces(row.Services) || "Sin servicio"}`,
    `Staff original: ${normalizeSpaces(row.Staff) || "Sin staff"}`,
    `Ingreso registrado en Goldie: RD$${parseAmount(row["Revenue (DOP)"]) ?? ""}`,
    `Descuento registrado en Goldie: RD$${parseAmount(row["Discount applied (DOP)"]) ?? ""}`,
    `Productos: ${normalizeSpaces(row.Products) || ""}`,
    `Add-ons: ${normalizeSpaces(row["Add-ons"]) || ""}`,
    "Cabina no disponible en la exportación de Goldie. Se asignó Cabina Calma únicamente como referencia técnica de importación histórica.",
  ].join("\n");
}

function buildPotentialDuplicateClients(clientRowsByNormalizedName) {
  const items = [...clientRowsByNormalizedName.values()].map((entry) => ({
    fullName: entry.fullName,
    normalizedName: entry.normalizedName,
    rows: entry.rows,
    tokens: tokenizeText(entry.fullName),
  }));

  const duplicates = [];
  for (let index = 0; index < items.length; index += 1) {
    for (let inner = index + 1; inner < items.length; inner += 1) {
      const left = items[index];
      const right = items[inner];
      const shared = left.tokens.filter((token) => right.tokens.includes(token));
      const similarity = shared.length / Math.max(left.tokens.length, right.tokens.length);
      if (similarity >= 0.8 && left.normalizedName !== right.normalizedName) {
        duplicates.push({
          left_name: left.fullName,
          left_normalized: left.normalizedName,
          left_rows: left.rows.join("|"),
          right_name: right.fullName,
          right_normalized: right.normalizedName,
          right_rows: right.rows.join("|"),
          recommendation: "Revisar manualmente. Parece un cliente combinado o un nombre compuesto; mantener separados salvo confirmación.",
        });
      }
    }
  }

  return duplicates;
}

function buildServiceStats(rows) {
  const stats = new Map();
  for (const row of rows) {
    const serviceOriginal = normalizeSpaces(row.Services);
    const normalized = normalizeText(serviceOriginal);
    if (!normalized) continue;

    const entry = stats.get(normalized) || {
      source: serviceOriginal,
      normalized,
      count: 0,
      durationCounts: new Map(),
      revenueTotal: 0,
      revenueCount: 0,
    };

    entry.count += 1;
    const duration = parseDurationMinutes(row.Duration).minutes;
    entry.durationCounts.set(duration, (entry.durationCounts.get(duration) || 0) + 1);

    const revenue = parseAmount(row["Revenue (DOP)"]);
    if (revenue != null) {
      entry.revenueTotal += revenue;
      entry.revenueCount += 1;
    }

    stats.set(normalized, entry);
  }

  return stats;
}

function mostFrequentDuration(durationCounts) {
  let winner = 40;
  let best = -1;
  for (const [duration, count] of durationCounts.entries()) {
    if (count > best) {
      best = count;
      winner = duration;
    }
  }
  return winner;
}

function normalizeSchemaInfo() {
  return {
    available: true,
    reason: "Usando resultados confirmados del esquema de Supabase proporcionados manualmente.",
    appointments: { ...KNOWN_APPOINTMENTS_SCHEMA },
  };
}

function classifyService(serviceName, serviceStats, maps, manualMapping) {
  const normalized = normalizeText(serviceName);
  const stats = serviceStats.get(normalized);
  const source = normalizeSpaces(serviceName);
  const topDuration = stats ? mostFrequentDuration(stats.durationCounts) : 40;
  const avgRevenue = stats?.revenueCount ? Number((stats.revenueTotal / stats.revenueCount).toFixed(2)) : null;

  const exactService = maps.servicesByNormalizedName.get(normalized);
  if (exactService) {
    return {
      source,
      count: stats?.count || 0,
      topDuration,
      avgRevenue,
      suggestedMatch: exactService.name,
      suggestedId: exactService.id,
      action: "reutilizar_existente",
      confidence: "exacta",
    };
  }

  const mappedId = manualMapping[source] || manualMapping[normalized];
  if (mappedId) {
    const mappedService = maps.servicesById.get(mappedId);
    return {
      source,
      count: stats?.count || 0,
      topDuration,
      avgRevenue,
      suggestedMatch: mappedService?.name || "Servicio mapeado manualmente",
      suggestedId: mappedId,
      action: "reutilizar_existente",
      confidence: "manual_segura",
    };
  }

  const normalizedSource = normalizeText(source);
  if (normalizedSource.includes("cita de continuacion") || normalizedSource.includes("continuacion")) {
    return {
      source,
      count: stats?.count || 0,
      topDuration,
      avgRevenue,
      suggestedMatch: TECHNICAL_SERVICE_NAME,
      suggestedId: PLACEHOLDER_TECHNICAL_SERVICE,
      action: "usar_servicio_tecnico",
      confidence: "ambiguo",
      suggestedPayload: buildTechnicalServicePayload(),
    };
  }

  return {
    source,
    count: stats?.count || 0,
    topDuration,
    avgRevenue,
    suggestedMatch: "",
    suggestedId: "",
    action: "crear_historico",
    confidence: "especifico",
    suggestedPayload: buildServicePayload(source, topDuration),
  };
}

function buildServiceAnalysis(rows, maps, manualMapping) {
  const stats = buildServiceStats(rows);
  const analysis = [];
  for (const stat of stats.values()) {
    analysis.push(classifyService(stat.source, stats, maps, manualMapping));
  }
  analysis.sort((left, right) => right.count - left.count || left.source.localeCompare(right.source));
  return analysis;
}

function buildStaffAnalysis(rows, maps) {
  const stats = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const original = normalizeSpaces(row.Staff) || "(vacío)";
    const normalized = normalizeText(original);
    const entry = stats.get(normalized) || {
      original,
      normalized,
      count: 0,
      rows: [],
    };
    entry.count += 1;
    entry.rows.push(index + 2);
    stats.set(normalized, entry);
  }

  const analysis = [];
  for (const entry of stats.values()) {
    const specialist = maps.specialistsByNormalizedName.get(entry.normalized) || null;
    let mappingStatus = "requiere_historico";
    let proposedId = "";
    let proposedMatch = "";

    if (specialist) {
      mappingStatus = "coincidencia_exacta";
      proposedId = specialist.id;
      proposedMatch = specialist.full_name;
    } else if (entry.original === "(vacío)") {
      mappingStatus = "vacío";
    } else {
      proposedMatch = HISTORICAL_SPECIALIST_NAME;
      proposedId = PLACEHOLDER_HISTORICAL_SPECIALIST;
    }

    analysis.push({
      staff_original: entry.original,
      count: entry.count,
      possible_match: proposedMatch,
      proposed_id: proposedId,
      mapping_status: mappingStatus,
      rows: entry.rows.join("|"),
    });
  }

  return analysis.sort((left, right) => right.count - left.count);
}

function buildAppointmentKey(clientId, appointmentDate, startTime, serviceId) {
  return [
    clientId || "no-client",
    appointmentDate || "no-date",
    startTime || "no-time",
    serviceId || "no-service",
  ].join("|");
}

function transformRows(rows, maps, serviceAnalysisByNormalized) {
  const summary = {
    totalRows: rows.length,
    validRows: 0,
    errors: [],
    warnings: [],
    duplicateAppointments: 0,
    uniqueClients: new Map(),
    clientRowsByNormalizedName: new Map(),
    appointmentsToImport: [],
    transformedSample: [],
    counts: {
      appointmentsReadyWithClient: 0,
      appointmentsReadyWithService: 0,
      appointmentsPendingService: 0,
      appointmentsWithIdentifiedSpecialist: 0,
      appointmentsRequiringHistoricalSpecialist: 0,
      appointmentsWithDefaultCabin: 0,
      appointmentsBlocked: 0,
      appointmentsBlockedByService: 0,
      appointmentsBlockedBySpecialist: 0,
      appointmentsBlockedByCabin: 0,
      appointmentsWithUnknownStatus: 0,
    },
  };

  const defaultCabin = maps.cabinsByNormalizedName.get(normalizeText(DEFAULT_CABIN_NAME))
    || [...maps.cabinsByNormalizedName.values()].find((item) => item.id === DEFAULT_CABIN_ID)
    || null;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const clientName = normalizeSpaces(row.Client);
    const appointmentDate = parseExcelDate(row["Appointment date"]);
    const startTime = parseExcelTime(row.Time);
    const durationInfo = parseDurationMinutes(row.Duration);
    const endTime = startTime ? addMinutesToTime(startTime, durationInfo.minutes) : null;

    if (!clientName) {
      summary.errors.push({
        rowNumber,
        client: "",
        date: row["Appointment date"],
        time: row.Time,
        cause: "Cliente vacío. Corresponde a fila de totales/resumen del Excel.",
        autoFix: "Omitir",
      });
      continue;
    }

    if (!appointmentDate) {
      summary.errors.push({
        rowNumber,
        client: clientName,
        date: row["Appointment date"],
        time: row.Time,
        cause: "Fecha inválida.",
        autoFix: "No automática",
      });
      continue;
    }

    if (!startTime) {
      summary.errors.push({
        rowNumber,
        client: clientName,
        date: row["Appointment date"],
        time: row.Time,
        cause: "Hora inválida.",
        autoFix: "No automática",
      });
      continue;
    }

    if (durationInfo.warning) {
      summary.warnings.push({
        rowNumber,
        client: clientName,
        date: appointmentDate,
        time: startTime,
        cause: "Duración faltante o inválida. Se usarían 40 minutos.",
      });
    }

    const clientNormalized = normalizeText(clientName);
    if (!summary.uniqueClients.has(clientNormalized)) {
      summary.uniqueClients.set(clientNormalized, buildClientPayload(clientName));
      summary.clientRowsByNormalizedName.set(clientNormalized, {
        fullName: clientName,
        normalizedName: clientNormalized,
        rows: [rowNumber],
      });
    } else {
      summary.clientRowsByNormalizedName.get(clientNormalized).rows.push(rowNumber);
    }

    const staffOriginal = normalizeSpaces(row.Staff) || "(vacío)";
    const specialist = maps.specialistsByNormalizedName.get(normalizeText(staffOriginal)) || null;
    const serviceOriginal = normalizeSpaces(row.Services);
    const serviceNormalized = normalizeText(serviceOriginal);
    const servicePlan = serviceAnalysisByNormalized.get(serviceNormalized) || null;
    const plannedServiceId = resolvePlannedServiceId(servicePlan, serviceNormalized);
    const mappedStatus = mapAppointmentStatus(row.Status);
    const duplicateKey = buildAppointmentKey(clientNormalized, appointmentDate, startTime, plannedServiceId);

    if (maps.appointmentKeys.has(duplicateKey)) {
      summary.duplicateAppointments += 1;
      continue;
    }
    maps.appointmentKeys.add(duplicateKey);

    summary.validRows += 1;
    summary.counts.appointmentsReadyWithClient += 1;
    summary.counts.appointmentsWithDefaultCabin += 1;
    if (specialist) {
      summary.counts.appointmentsWithIdentifiedSpecialist += 1;
    } else {
      summary.counts.appointmentsRequiringHistoricalSpecialist += 1;
    }
    summary.counts.appointmentsReadyWithService += 1;

    if (mappedStatus.warning) {
      summary.counts.appointmentsWithUnknownStatus += 1;
      summary.warnings.push({
        rowNumber,
        client: clientName,
        date: appointmentDate,
        time: startTime,
        cause: `Estado desconocido '${normalizeSpaces(row.Status)}'. Se usaría 'pendiente'.`,
      });
    }

    const transformed = {
      rowNumber,
      client_name: clientName,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      status: mappedStatus.status,
      service_original: serviceOriginal || null,
      service_action: servicePlan?.action || "usar_servicio_tecnico",
      service_id: plannedServiceId,
      specialist_id: specialist?.id || PLACEHOLDER_HISTORICAL_SPECIALIST,
      staff_original: staffOriginal,
      cabin_id: defaultCabin?.id || DEFAULT_CABIN_ID,
      notes: buildAppointmentNotes(row),
    };

    summary.appointmentsToImport.push(transformed);
    if (summary.transformedSample.length < SAMPLE_LIMIT) {
      summary.transformedSample.push(transformed);
    }
  }

  return summary;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const content = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
  fs.writeFileSync(filePath, content, "utf8");
}

function writeReports(summary, serviceAnalysis, staffAnalysis, schemaInfo, referenceInfo) {
  ensureDir(REPORTS_DIR);
  const duplicateClients = buildPotentialDuplicateClients(summary.clientRowsByNormalizedName);
  const unmappedServices = serviceAnalysis.filter((item) => item.action !== "reutilizar_existente");

  const summaryJson = {
    mode: DEFAULT_DRY_RUN ? "DRY_RUN" : "REAL",
    sourceFile: resolveFilePath(),
    schema: schemaInfo,
    referenceDataAvailable: referenceInfo.available,
    totals: {
      totalRows: summary.totalRows,
      validRows: summary.validRows,
      uniqueClients: summary.uniqueClients.size,
      duplicateAppointments: summary.duplicateAppointments,
      errors: summary.errors.length,
      warnings: summary.warnings.length,
      totalExistingServices: referenceInfo.services.length,
      totalGoldieUniqueServices: serviceAnalysis.length,
      uniqueServicesMapped: serviceAnalysis.filter((item) => item.action === "reutilizar_existente").length,
      uniqueServicesHistoricalToCreate: serviceAnalysis.filter((item) => item.action === "crear_historico").length,
      uniqueServicesUsingTechnicalService: serviceAnalysis.filter((item) => item.action === "usar_servicio_tecnico").length,
      uniqueServicesBlocked: 0,
      appointmentsReadyWithClient: summary.counts.appointmentsReadyWithClient,
      appointmentsReadyWithService: summary.counts.appointmentsReadyWithService,
      appointmentsPendingService: summary.counts.appointmentsPendingService,
      appointmentsWithIdentifiedSpecialist: summary.counts.appointmentsWithIdentifiedSpecialist,
      appointmentsRequiringHistoricalSpecialist: summary.counts.appointmentsRequiringHistoricalSpecialist,
      appointmentsWithDefaultCabin: summary.counts.appointmentsWithDefaultCabin,
      appointmentsBlocked: summary.counts.appointmentsBlocked,
      appointmentsBlockedByService: summary.counts.appointmentsBlockedByService,
      appointmentsBlockedBySpecialist: summary.counts.appointmentsBlockedBySpecialist,
      appointmentsBlockedByCabin: summary.counts.appointmentsBlockedByCabin,
      appointmentsWithUnknownStatus: summary.counts.appointmentsWithUnknownStatus,
      appointmentsTechnicallyReadyAfterHistoricalResolutions: summary.appointmentsToImport.length,
    },
  };

  writeJsonFile(path.join(REPORTS_DIR, "summary.json"), summaryJson);
  writeCsv(path.join(REPORTS_DIR, "errors.csv"), summary.errors);
  writeCsv(path.join(REPORTS_DIR, "duplicate-clients.csv"), duplicateClients);
  writeCsv(path.join(REPORTS_DIR, "duplicates.csv"), duplicateClients);
  writeCsv(path.join(REPORTS_DIR, "unmapped-services.csv"), unmappedServices);
  writeCsv(path.join(REPORTS_DIR, "service-analysis.csv"), serviceAnalysis);
  writeCsv(path.join(REPORTS_DIR, "staff-values.csv"), staffAnalysis);
  writeCsv(path.join(REPORTS_DIR, "transformed-sample.csv"), summary.transformedSample);
  writeCsv(path.join(REPORTS_DIR, "imported-appointments.csv"), summary.appointmentsToImport);
}

async function fetchTableBackup(supabase, tableName, columns = "*", orderColumn = "id") {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`No fue posible exportar ${tableName}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function createBackups(supabase) {
  ensureDir(BACKUPS_DIR);
  const backupDir = path.join(BACKUPS_DIR, formatTimestampForPath());
  ensureDir(backupDir);

  const tables = ["clients", "appointments", "services", "specialists", "cabins"];
  const manifest = {
    createdAt: new Date().toISOString(),
    backupDir,
    tables: {},
  };

  for (const table of tables) {
    const rows = await fetchTableBackup(supabase, table, "*");
    const filePath = path.join(backupDir, `${table}.json`);
    writeJsonFile(filePath, rows);
    manifest.tables[table] = { rows: rows.length, file: filePath };
  }

  writeJsonFile(path.join(backupDir, "manifest.json"), manifest);
  return manifest;
}

function updateServiceMaps(maps, service) {
  maps.servicesById.set(service.id, service);
  const normalized = normalizeText(service.name);
  if (!maps.servicesByNormalizedName.has(normalized)) {
    maps.servicesByNormalizedName.set(normalized, service);
  }
}

function updateClientMaps(maps, client) {
  maps.clientsByNormalizedName.set(normalizeText(client.full_name), client);
}

function updateSpecialistMaps(maps, specialist) {
  maps.specialistsByNormalizedName.set(normalizeText(specialist.full_name), specialist);
}

async function insertSingleRow(supabase, tableName, payload) {
  const { data, error } = await supabase.from(tableName).insert(payload).select().single();
  if (error) throw new Error(error.message || `No fue posible insertar en ${tableName}`);
  return data;
}

async function ensureHistoricalSpecialist(supabase, maps) {
  const existing = maps.specialistsByNormalizedName.get(normalizeText(HISTORICAL_SPECIALIST_NAME));
  if (existing) return { specialist: existing, created: false };

  const inserted = await insertSingleRow(supabase, "specialists", {
    full_name: HISTORICAL_SPECIALIST_NAME,
    start_time: null,
    end_time: null,
    has_open_schedule: false,
    active: false,
  });
  updateSpecialistMaps(maps, inserted);
  return { specialist: inserted, created: true };
}

async function ensureTechnicalService(supabase, maps) {
  const existing = maps.servicesByNormalizedName.get(normalizeText(TECHNICAL_SERVICE_NAME));
  if (existing) return { service: existing, created: false };

  const inserted = await insertSingleRow(supabase, "services", buildTechnicalServicePayload());
  updateServiceMaps(maps, inserted);
  return { service: inserted, created: true };
}

async function ensureHistoricalServices(supabase, maps, serviceAnalysis) {
  const plannedIds = new Map();
  let created = 0;
  let reused = 0;

  for (const item of serviceAnalysis) {
    const normalized = normalizeText(item.source);

    if (item.action === "reutilizar_existente") {
      plannedIds.set(normalized, item.suggestedId);
      continue;
    }

    if (item.action === "usar_servicio_tecnico") {
      plannedIds.set(normalized, PLACEHOLDER_TECHNICAL_SERVICE);
      continue;
    }

    const existing = maps.servicesByNormalizedName.get(normalized);
    if (existing) {
      plannedIds.set(normalized, existing.id);
      reused += 1;
      continue;
    }

    const inserted = await insertSingleRow(supabase, "services", item.suggestedPayload || buildServicePayload(item.source, item.topDuration));
    updateServiceMaps(maps, inserted);
    plannedIds.set(normalized, inserted.id);
    created += 1;
  }

  return { plannedIds, created, reused };
}

async function ensureClients(supabase, maps, uniqueClients) {
  let reused = 0;
  const missingPayloads = [];
  for (const [normalized, payload] of uniqueClients.entries()) {
    if (maps.clientsByNormalizedName.has(normalized)) reused += 1;
    else missingPayloads.push(payload);
  }

  let created = 0;
  const errors = [];

  for (const chunk of chunkArray(missingPayloads, BATCH_SIZE)) {
    const { data, error } = await supabase.from("clients").insert(chunk).select("id, full_name");

    if (error) {
      for (const payload of chunk) {
        try {
          const inserted = await insertSingleRow(supabase, "clients", payload);
          updateClientMaps(maps, inserted);
          created += 1;
        } catch (singleError) {
          errors.push({ full_name: payload.full_name, message: singleError.message });
        }
      }
      continue;
    }

    for (const client of data || []) {
      updateClientMaps(maps, client);
      created += 1;
    }
  }

  return { created, reused, errors };
}

function buildResolvedAppointments(summary, maps, historicalSpecialistId, technicalServiceId, historicalServiceIds, defaultCabinId) {
  const existingKeys = new Set();
  for (const key of maps.appointmentKeys) {
    existingKeys.add(key);
  }

  const resolved = [];
  let duplicates = 0;

  for (const appointment of summary.appointmentsToImport) {
    const client = maps.clientsByNormalizedName.get(normalizeText(appointment.client_name));
    if (!client) {
      throw new Error(`Cliente no resuelto: ${appointment.client_name}`);
    }

    let serviceId = appointment.service_id;
    if (serviceId === PLACEHOLDER_TECHNICAL_SERVICE) {
      serviceId = technicalServiceId;
    } else if (typeof serviceId === "string" && serviceId.startsWith(HISTORICAL_SERVICE_PREFIX)) {
      serviceId = historicalServiceIds.get(normalizeText(appointment.service_original));
    }

    if (!serviceId) {
      throw new Error(`Servicio no resuelto: ${appointment.service_original || "(sin servicio)"}`);
    }

    const specialistId = appointment.specialist_id === PLACEHOLDER_HISTORICAL_SPECIALIST
      ? historicalSpecialistId
      : appointment.specialist_id;

    const duplicateKey = buildAppointmentKey(client.id, appointment.appointment_date, appointment.start_time, serviceId);
    if (existingKeys.has(duplicateKey)) {
      duplicates += 1;
      continue;
    }

    existingKeys.add(duplicateKey);
    resolved.push({
      client_id: client.id,
      specialist_id: specialistId,
      service_id: serviceId,
      cabin_id: defaultCabinId,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      status: appointment.status,
      notes: appointment.notes,
    });
  }

  return { resolved, duplicates };
}

async function insertAppointmentsInBatches(supabase, appointments) {
  let imported = 0;
  const errors = [];

  for (const chunk of chunkArray(appointments, BATCH_SIZE)) {
    const { error } = await supabase.from("appointments").insert(chunk);
    if (!error) {
      imported += chunk.length;
      continue;
    }

    for (const row of chunk) {
      const { error: singleError } = await supabase.from("appointments").insert(row);
      if (singleError) {
        errors.push({
          client_id: row.client_id,
          appointment_date: row.appointment_date,
          start_time: row.start_time,
          service_id: row.service_id,
          message: singleError.message,
        });
      } else {
        imported += 1;
      }
    }
  }

  return { imported, errors };
}

async function fetchPostImportSummary(supabase, historicalSpecialistId, technicalServiceId, historicalServiceIds) {
  const uniqueHistoricalServiceIds = [...new Set(historicalServiceIds.filter(Boolean))];
  const [specialistRes, technicalServiceRes, historicalAppointmentsRes, importedClientsRes] = await Promise.all([
    supabase.from("specialists").select("id, full_name, active").eq("id", historicalSpecialistId).maybeSingle(),
    supabase.from("services").select("id, name, active").eq("id", technicalServiceId).maybeSingle(),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("specialist_id", historicalSpecialistId),
    supabase.from("clients").select("id", { count: "exact", head: true }).ilike("notes", "%Importado desde Goldie%"),
  ]);

  if (specialistRes.error) throw new Error(specialistRes.error.message);
  if (technicalServiceRes.error) throw new Error(technicalServiceRes.error.message);
  if (historicalAppointmentsRes.error) throw new Error(historicalAppointmentsRes.error.message);
  if (importedClientsRes.error) throw new Error(importedClientsRes.error.message);

  let historicalServicesCount = 0;
  if (uniqueHistoricalServiceIds.length) {
    const { count, error } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .in("id", uniqueHistoricalServiceIds);
    if (error) throw new Error(error.message);
    historicalServicesCount = count || 0;
  }

  return {
    historicalSpecialist: specialistRes.data || null,
    technicalService: technicalServiceRes.data || null,
    importedClientsVisibleCount: importedClientsRes.count || 0,
    historicalAppointmentsCount: historicalAppointmentsRes.count || 0,
    historicalServicesCount,
  };
}

function writeImportResultReport(result) {
  const filePath = path.join(REPORTS_DIR, "import-result.json");
  writeJsonFile(filePath, result);
  return filePath;
}

async function run() {
  ensureDir(IMPORTS_DIR);
  ensureDir(REPORTS_DIR);

  if (!fs.existsSync(SERVICE_MAPPING_PATH)) {
    fs.writeFileSync(SERVICE_MAPPING_PATH, "{}\n", "utf8");
  }

  const filePath = resolveFilePath();
  const rows = loadWorkbookRows(filePath);
  const manualMapping = readJsonFile(SERVICE_MAPPING_PATH, {});
  const supabase = maybeGetSupabaseClient();
  const referenceInfo = await loadReferenceData(supabase);
  const schemaInfo = normalizeSchemaInfo();
  const maps = buildReferenceMaps(referenceInfo);
  const serviceAnalysis = buildServiceAnalysis(rows, maps, manualMapping);
  const serviceAnalysisByNormalized = new Map(serviceAnalysis.map((item) => [normalizeText(item.source), item]));
  const staffAnalysis = buildStaffAnalysis(rows, maps);
  const summary = transformRows(rows, maps, serviceAnalysisByNormalized);

  writeReports(summary, serviceAnalysis, staffAnalysis, schemaInfo, referenceInfo);

  const duplicateClients = buildPotentialDuplicateClients(summary.clientRowsByNormalizedName);
  console.log(`\n=== GOLDIE ${DEFAULT_DRY_RUN ? "DRY RUN" : "IMPORT PREVIEW"} ===`);
  console.table({
    total_filas: summary.totalRows,
    filas_validas: summary.validRows,
    clientes_unicos: summary.uniqueClients.size,
    servicios_existentes_supabase: referenceInfo.services.length,
    servicios_unicos_goldie: serviceAnalysis.length,
    servicios_realmente_mapeados: serviceAnalysis.filter((item) => item.action === "reutilizar_existente").length,
    servicios_historicos_propuestos: serviceAnalysis.filter((item) => item.action === "crear_historico").length,
    servicios_tecnicos_ambiguos: serviceAnalysis.filter((item) => item.action === "usar_servicio_tecnico").length,
    servicios_bloqueados: 0,
    citas_con_service_id: summary.counts.appointmentsReadyWithService,
    citas_pendientes_servicio: summary.counts.appointmentsPendingService,
    citas_con_especialista_identificada: summary.counts.appointmentsWithIdentifiedSpecialist,
    citas_que_requieren_historico: summary.counts.appointmentsRequiringHistoricalSpecialist,
    citas_con_cabina_calma: summary.counts.appointmentsWithDefaultCabin,
    citas_bloqueadas: summary.counts.appointmentsBlocked,
    citas_bloqueadas_por_servicio: summary.counts.appointmentsBlockedByService,
    citas_bloqueadas_por_especialista: summary.counts.appointmentsBlockedBySpecialist,
    citas_bloqueadas_por_cabina: summary.counts.appointmentsBlockedByCabin,
    estados_invalidos: summary.counts.appointmentsWithUnknownStatus,
    errores: summary.errors.length,
    duplicados: summary.duplicateAppointments,
    posibles_duplicados_cliente: duplicateClients.length,
  });

  console.log(`Reportes generados en: ${REPORTS_DIR}`);

  if (DEFAULT_DRY_RUN) {
    console.log("\nDRY_RUN activo. No se insertó ningún registro.");
    return;
  }

  if (process.env.CONFIRM_IMPORT !== EXPECTED_CONFIRMATION) {
    throw new Error(`Importación bloqueada. Define CONFIRM_IMPORT=${EXPECTED_CONFIRMATION}`);
  }
  if (!supabase) {
    throw new Error("Falta el cliente de Supabase para la importación real.");
  }

  const defaultCabin = maps.cabinsByNormalizedName.get(normalizeText(DEFAULT_CABIN_NAME))
    || [...maps.cabinsByNormalizedName.values()].find((item) => item.id === DEFAULT_CABIN_ID)
    || null;
  if (!defaultCabin) {
    throw new Error(`No fue posible resolver la cabina histórica ${DEFAULT_CABIN_NAME}.`);
  }

  const backupManifest = await createBackups(supabase);
  const { specialist: historicalSpecialist, created: historicalSpecialistCreated } = await ensureHistoricalSpecialist(supabase, maps);
  const { service: technicalService, created: technicalServiceCreated } = await ensureTechnicalService(supabase, maps);
  const historicalServicesResult = await ensureHistoricalServices(supabase, maps, serviceAnalysis);

  for (const [normalized, plannedId] of historicalServicesResult.plannedIds.entries()) {
    if (plannedId === PLACEHOLDER_TECHNICAL_SERVICE) {
      historicalServicesResult.plannedIds.set(normalized, technicalService.id);
    }
  }

  const clientsResult = await ensureClients(supabase, maps, summary.uniqueClients);
  const resolvedAppointments = buildResolvedAppointments(
    summary,
    maps,
    historicalSpecialist.id,
    technicalService.id,
    historicalServicesResult.plannedIds,
    defaultCabin.id
  );
  const appointmentsResult = await insertAppointmentsInBatches(supabase, resolvedAppointments.resolved);
  const postImport = await fetchPostImportSummary(
    supabase,
    historicalSpecialist.id,
    technicalService.id,
    [...historicalServicesResult.plannedIds.values()].filter((id) => id && id !== technicalService.id)
  );

  const importResult = {
    executedAt: new Date().toISOString(),
    backupManifest,
    totals: {
      rowsAnalyzed: summary.totalRows,
      validRows: summary.validRows,
      rowsOmitted: summary.errors.length,
      duplicateAppointmentsPreImport: summary.duplicateAppointments,
      duplicateAppointmentsDuringImport: resolvedAppointments.duplicates,
      clientsCreated: clientsResult.created,
      clientsReused: clientsResult.reused,
      historicalServicesCreated: historicalServicesResult.created,
      historicalServicesReused: historicalServicesResult.reused,
      existingServicesReused: serviceAnalysis.filter((item) => item.action === "reutilizar_existente").length,
      technicalAmbiguousServices: serviceAnalysis.filter((item) => item.action === "usar_servicio_tecnico").length,
      appointmentsPrepared: resolvedAppointments.resolved.length,
      appointmentsImported: appointmentsResult.imported,
      appointmentsNotImported: resolvedAppointments.resolved.length - appointmentsResult.imported,
      totalErrors: summary.errors.length + clientsResult.errors.length + appointmentsResult.errors.length,
    },
    createdOrReused: {
      historicalSpecialist: {
        id: historicalSpecialist.id,
        created: historicalSpecialistCreated,
        active: historicalSpecialist.active,
      },
      technicalService: {
        id: technicalService.id,
        created: technicalServiceCreated,
        active: technicalService.active,
      },
    },
    errors: {
      sourceRows: summary.errors,
      clientInsert: clientsResult.errors,
      appointmentInsert: appointmentsResult.errors,
    },
    postImport,
  };

  const importReportPath = writeImportResultReport(importResult);

  console.log("\n=== GOLDIE IMPORT REAL ===");
  console.table({
    clientes_creados: clientsResult.created,
    clientes_reutilizados: clientsResult.reused,
    servicios_historicos_creados: historicalServicesResult.created,
    servicios_historicos_reutilizados: historicalServicesResult.reused,
    servicios_existentes_reutilizados: serviceAnalysis.filter((item) => item.action === "reutilizar_existente").length,
    citas_preparadas: resolvedAppointments.resolved.length,
    citas_importadas: appointmentsResult.imported,
    duplicados_omitidos: summary.duplicateAppointments + resolvedAppointments.duplicates,
    errores_totales: importResult.totals.totalErrors,
    filas_omitidas: summary.errors.length,
    citas_no_importadas: importResult.totals.appointmentsNotImported,
  });
  console.log(`Backups: ${backupManifest.backupDir}`);
  console.log(`Reporte de importación: ${importReportPath}`);
}

run().catch((error) => {
  console.error("\nImportación Goldie falló.");
  console.error(error.message || error);
  process.exit(1);
});
