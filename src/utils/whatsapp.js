function pad(value) {
  return String(value).padStart(2, "0");
}

export function getPublicSpecialistName(name) {
  const value = String(name || "").trim();
  const normalized = value.toLowerCase();

  if (
    !value
    || normalized.includes("histórico goldie")
    || normalized.includes("historico goldie")
    || normalized.includes("goldie")
  ) {
    return "Equipo Zantua";
  }

  return value;
}

export function getPublicServiceName(name) {
  const value = String(name || "").trim();
  const normalized = value.toLowerCase();

  if (
    !value
    || normalized.includes("cita histórica goldie")
    || normalized.includes("cita historica goldie")
    || normalized.includes("goldie")
  ) {
    return "Servicio programado";
  }

  return value;
}

export function normalizeDominicanPhone(phone) {
  if (!phone) return "";

  let digits = String(phone).replace(/\D/g, "");

  if (digits.length === 10) {
    digits = `1${digits}`;
  }

  if (
    digits.startsWith("1809")
    || digits.startsWith("1829")
    || digits.startsWith("1849")
  ) {
    return digits;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits;
  }

  return digits;
}

export function formatWhatsAppDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) {
    return "Fecha por confirmar";
  }

  const [year, month, day] = String(dateString).split("-");
  return `${day}/${month}/${year}`;
}

export function formatWhatsAppTime(timeString) {
  const normalized = String(timeString || "").trim();
  const match = normalized.match(/^(\d{2}):(\d{2})/);

  if (!match) {
    return "Hora por confirmar";
  }

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${pad(hours12)}:${minutes} ${suffix}`;
}

export function buildAppointmentWhatsAppMessage(appointment) {
  const patientName = appointment?.clientName || appointment?.patientLabel || "paciente";
  const appointmentDate = formatWhatsAppDate(appointment?.appointmentDate || appointment?.appointment_date);
  const appointmentTime = formatWhatsAppTime(appointment?.startTime || appointment?.start_time);
  const serviceName = getPublicServiceName(
    appointment?.serviceName || appointment?.serviceLabel || "Servicio por confirmar"
  );
  const specialistName = getPublicSpecialistName(
    appointment?.specialistName || appointment?.specialistLabel || "Especialista por confirmar"
  );
  const cabinName = appointment?.cabinName || appointment?.cabinLabel || "Cabina por confirmar";

  return [
    `Hola ${patientName}, te recordamos tu cita en Zantua Aesthetic Wellness.`,
    "",
    `Fecha: ${appointmentDate}`,
    `Hora: ${appointmentTime}`,
    `Servicio: ${serviceName}`,
    `Especialista: ${specialistName}`,
    `Cabina: ${cabinName}`,
    "",
    "Por favor confirma tu asistencia. ¡Gracias por preferirnos!",
  ].join("\n");
}

export function buildAppointmentWhatsAppUrl(appointment) {
  const normalizedPhone = normalizeDominicanPhone(appointment?.clientPhone || appointment?.patientPhone);

  if (!normalizedPhone) {
    return "";
  }

  const message = buildAppointmentWhatsAppMessage(appointment);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function openAppointmentWhatsApp(appointment) {
  const url = buildAppointmentWhatsAppUrl(appointment);

  if (!url) {
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
