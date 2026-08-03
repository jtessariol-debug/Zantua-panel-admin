import { supabase } from "../lib/supabaseClient";

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeClientPackage(record) {
  const totalSessions = safeNumber(record.total_sessions);
  const usedSessions = safeNumber(record.used_sessions);
  const remainingSessions = safeNumber(record.remaining_sessions);

  return {
    ...record,
    total_sessions: totalSessions,
    used_sessions: usedSessions,
    remaining_sessions: remainingSessions,
    serviceLabel: record.services?.name || "Paquete",
    invoiceLabel: record.invoices?.invoice_number || null,
    progressLabel: `${usedSessions} de ${totalSessions} sesiones usadas`,
    remainingLabel: `${remainingSessions} restantes`,
  };
}

export async function fetchClientPackagesByClient(clientId, { activeOnly = false } = {}) {
  let query = supabase
    .from("client_service_packages")
    .select("id, client_id, service_id, invoice_id, invoice_item_id, total_sessions, used_sessions, remaining_sessions, status, purchase_date, completed_at, notes, created_at, updated_at, services(name), invoices(invoice_number)")
    .eq("client_id", clientId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("status", "activo");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading client packages", error);
    throw new Error("No fue posible cargar los paquetes del paciente.");
  }

  return (data || []).map(normalizeClientPackage);
}

export async function fetchPackageById(packageId) {
  const { data, error } = await supabase
    .from("client_service_packages")
    .select("id, client_id, service_id, invoice_id, invoice_item_id, total_sessions, used_sessions, remaining_sessions, status, purchase_date, completed_at, notes, created_at, updated_at, services(name), invoices(invoice_number)")
    .eq("id", packageId)
    .single();

  if (error) {
    console.error("Error loading package by id", error);
    throw new Error("No fue posible cargar el paquete seleccionado.");
  }

  return normalizeClientPackage(data);
}

export async function fetchPackagesByInvoice(invoiceId) {
  const { data, error } = await supabase
    .from("client_service_packages")
    .select("id, client_id, service_id, invoice_id, invoice_item_id, total_sessions, used_sessions, remaining_sessions, status, purchase_date, completed_at, notes, created_at, updated_at")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading invoice packages", error);
    throw new Error("No fue posible cargar los paquetes asociados a la factura.");
  }

  return (data || []).map(normalizeClientPackage);
}

export async function upsertClientPackageFromInvoiceItem({
  existingPackage,
  clientId,
  service,
  invoiceId,
  invoiceItemId,
  invoiceDate,
  notes = null,
}) {
  const totalSessions = safeNumber(service.sessions_count);
  const purchaseDate = invoiceDate || new Date().toISOString().slice(0, 10);

  if (totalSessions <= 0) {
    return null;
  }

  if (existingPackage) {
    const usedSessions = safeNumber(existingPackage.used_sessions);
    const remainingSessions = Math.max(totalSessions - usedSessions, 0);
    const nextStatus = remainingSessions === 0 ? "completado" : (existingPackage.status === "cancelado" ? "cancelado" : "activo");

    const { data, error } = await supabase
      .from("client_service_packages")
      .update({
        client_id: clientId,
        service_id: service.id,
        invoice_id: invoiceId,
        invoice_item_id: invoiceItemId,
        total_sessions: totalSessions,
        remaining_sessions: remainingSessions,
        status: nextStatus,
        purchase_date: purchaseDate,
        completed_at: nextStatus === "completado" ? (existingPackage.completed_at || new Date().toISOString()) : null,
        notes: notes || existingPackage.notes || null,
      })
      .eq("id", existingPackage.id)
      .select("id, client_id, service_id, invoice_id, invoice_item_id, total_sessions, used_sessions, remaining_sessions, status, purchase_date, completed_at, notes, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error updating client package from invoice item", error);
      throw new Error("No fue posible actualizar el paquete comprado.");
    }

    return normalizeClientPackage(data);
  }

  const { data, error } = await supabase
    .from("client_service_packages")
    .insert({
      client_id: clientId,
      service_id: service.id,
      invoice_id: invoiceId,
      invoice_item_id: invoiceItemId,
      total_sessions: totalSessions,
      used_sessions: 0,
      remaining_sessions: totalSessions,
      status: "activo",
      purchase_date: purchaseDate,
      notes: notes || null,
    })
    .select("id, client_id, service_id, invoice_id, invoice_item_id, total_sessions, used_sessions, remaining_sessions, status, purchase_date, completed_at, notes, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error creating client package from invoice item", error);
    throw new Error("No fue posible crear el paquete comprado.");
  }

  return normalizeClientPackage(data);
}

export async function applyPackageConsumption(packageId, delta) {
  const currentPackage = await fetchPackageById(packageId);
  const totalSessions = safeNumber(currentPackage.total_sessions);
  const currentUsed = safeNumber(currentPackage.used_sessions);
  const nextUsed = currentUsed + delta;

  if (nextUsed < 0 || nextUsed > totalSessions) {
    throw new Error(delta > 0
      ? "No hay sesiones disponibles en el paquete seleccionado."
      : "No fue posible devolver la sesión al paquete.");
  }

  const nextRemaining = totalSessions - nextUsed;
  const nextStatus = currentPackage.status === "cancelado"
    ? "cancelado"
    : (nextRemaining === 0 ? "completado" : "activo");

  const { data, error } = await supabase
    .from("client_service_packages")
    .update({
      used_sessions: nextUsed,
      remaining_sessions: nextRemaining,
      status: nextStatus,
      completed_at: nextStatus === "completado" ? new Date().toISOString() : null,
    })
    .eq("id", packageId)
    .select("id, client_id, service_id, invoice_id, invoice_item_id, total_sessions, used_sessions, remaining_sessions, status, purchase_date, completed_at, notes, created_at, updated_at, services(name), invoices(invoice_number)")
    .single();

  if (error) {
    console.error("Error applying package consumption", error);
    throw new Error(delta > 0
      ? "No fue posible descontar la sesión del paquete."
      : "No fue posible devolver la sesión al paquete.");
  }

  return normalizeClientPackage(data);
}

