import { supabase } from "../lib/supabaseClient";
import { fetchPackagesByInvoice, upsertClientPackageFromInvoiceItem } from "./clientPackages";
import { fetchServiceOffers, mergeServicesWithOffers } from "./serviceOffers";

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeInvoicePayload(payload) {
  return {
    client_id: payload.client_id || null,
    specialist_id: payload.specialist_id || null,
    appointment_id: payload.appointment_id || null,
    invoice_date: payload.invoice_date || null,
    payment_method: payload.payment_method || null,
    payment_status: payload.payment_status || "pendiente",
    discount: safeNumber(payload.discount || 0),
    notes: payload.notes || null,
    invoice_number: payload.invoice_number || null,
  };
}

function sanitizeCommissionPayload(payload) {
  return {
    specialist_id: payload.specialist_id || null,
    type: payload.type || "producto",
    product_id: payload.product_id || null,
    invoice_id: payload.invoice_id || null,
    invoice_item_id: payload.invoice_item_id || null,
    sale_amount: safeNumber(payload.sale_amount),
    commission_percentage: safeNumber(payload.commission_percentage),
    commission_amount: payload.commission_amount != null ? safeNumber(payload.commission_amount) : null,
    commission_date: payload.commission_date || null,
    status: payload.status || "pendiente",
    notes: payload.notes || null,
    paid_at: payload.paid_at || null,
  };
}

function mapById(items, labelKey) {
  return new Map((items || []).map((item) => [item.id, item[labelKey] || "—"]));
}

function assertAdminProfile(profile) {
  if (profile && !["admin", "owner"].includes(profile.role)) {
    throw new Error("No tienes permisos para acceder a esta sección.");
  }
}

async function enrichServicesWithOffers(services) {
  const baseServices = services || [];

  if (!baseServices.length) {
    return [];
  }

  try {
    const offers = await fetchServiceOffers({
      activeOnly: true,
      currentOnly: true,
      serviceIds: baseServices.map((service) => service.id),
    });

    return mergeServicesWithOffers(baseServices, offers, {
      activeOnly: true,
      currentOnly: true,
    });
  } catch (error) {
    console.error("Error loading active offers for billing", error);
    return baseServices;
  }
}

function hydrateInvoices(invoices, items, lookups) {
  const clientMap = new Map((lookups.clients || []).map((client) => [client.id, client]));
  const specialistMap = mapById(lookups.specialists, "full_name");
  const productMap = mapById(lookups.products, "name");
  const serviceMap = mapById(lookups.services, "name");

  return (invoices || []).map((invoice) => {
    const client = clientMap.get(invoice.client_id) || null;
    const invoiceItems = (items || [])
      .filter((item) => item.invoice_id === invoice.id)
      .map((item) => ({
        ...item,
        product_name: productMap.get(item.product_id) || null,
        service_name: serviceMap.get(item.service_id) || null,
      }));

    return {
      ...invoice,
      clientLabel: client?.full_name || "Cliente",
      client,
      specialistLabel: specialistMap.get(invoice.specialist_id) || "Sin especialista",
      items: invoiceItems,
    };
  });
}

async function syncInvoicePackages({ invoice, invoiceItems, previousPackages = [] }) {
  const serviceIds = Array.from(new Set(
    (invoiceItems || [])
      .filter((item) => item.service_id)
      .map((item) => item.service_id)
  ));

  if (!serviceIds.length || !invoice.client_id) {
    return [];
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, service_type, sessions_count")
    .in("id", serviceIds);

  if (servicesError) {
    console.error("Error loading services for package sync", servicesError);
    throw new Error("No fue posible sincronizar los paquetes comprados.");
  }

  const packageServicesMap = new Map(
    (services || [])
      .filter((service) => service.service_type === "paquete" && safeNumber(service.sessions_count) > 0)
      .map((service) => [service.id, service])
  );

  const packageItems = (invoiceItems || []).filter((item) => packageServicesMap.has(item.service_id));

  if (!packageItems.length) {
    return [];
  }

  const previousPackagesByService = previousPackages.reduce((acc, item) => {
    const key = item.service_id || "unknown";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const consumedPackageIds = new Set();
  const results = [];

  for (const item of packageItems) {
    const service = packageServicesMap.get(item.service_id);
    const candidates = previousPackagesByService[item.service_id] || [];
    const directMatch = candidates.find((candidate) => candidate.invoice_item_id === item.id);
    const fallbackMatch = candidates.find((candidate) => !consumedPackageIds.has(candidate.id));
    const existingPackage = directMatch || fallbackMatch || null;

    if (existingPackage?.id) {
      consumedPackageIds.add(existingPackage.id);
    }

    const synced = await upsertClientPackageFromInvoiceItem({
      existingPackage,
      clientId: invoice.client_id,
      service,
      invoiceId: invoice.id,
      invoiceItemId: item.id,
      invoiceDate: invoice.invoice_date,
      notes: item.description || null,
    });

    if (synced) {
      results.push(synced);
    }
  }

  return results;
}

export async function fetchInventoryData() {
  const [productsResponse, suppliesResponse, productMovementsResponse, supplyMovementsResponse] = await Promise.all([
    supabase.from("products").select("*").order("name", { ascending: true }),
    supabase.from("supplies").select("*").order("name", { ascending: true }),
    supabase.from("product_stock_movements").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("supply_stock_movements").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  const errors = [
    productsResponse.error,
    suppliesResponse.error,
    productMovementsResponse.error,
    supplyMovementsResponse.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("Error loading inventory data", errors);
    throw new Error("No fue posible cargar el inventario.");
  }

  const products = productsResponse.data || [];
  const supplies = suppliesResponse.data || [];
  const productMap = mapById(products, "name");
  const supplyMap = mapById(supplies, "name");

  const productMovements = (productMovementsResponse.data || []).map((movement) => ({
    ...movement,
    item_name: productMap.get(movement.product_id) || "Producto",
    item_type: "producto",
  }));

  const supplyMovements = (supplyMovementsResponse.data || []).map((movement) => ({
    ...movement,
    item_name: supplyMap.get(movement.supply_id) || "Insumo",
    item_type: "insumo",
  }));

  return {
    products,
    supplies,
    movements: [...productMovements, ...supplyMovements].sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    }),
  };
}

export async function createInventoryItem(table, payload) {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error(`Error creating item in ${table}`, error);
    throw new Error("No fue posible guardar el registro.");
  }

  return data;
}

export async function updateInventoryItem(table, id, payload) {
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error(`Error updating item in ${table}`, error);
    throw new Error("No fue posible actualizar el registro.");
  }

  return data;
}

export async function deactivateProduct(productId, active) {
  return updateInventoryItem("products", productId, { active });
}

export async function registerStockMovement({ itemType, itemId, movementType, quantity, reason }) {
  const sourceTable = itemType === "producto" ? "products" : "supplies";
  const movementTable = itemType === "producto" ? "product_stock_movements" : "supply_stock_movements";
  const foreignKey = itemType === "producto" ? "product_id" : "supply_id";

  const { data: currentItem, error: currentItemError } = await supabase
    .from(sourceTable)
    .select("*")
    .eq("id", itemId)
    .single();

  if (currentItemError) {
    console.error("Error loading current stock item", currentItemError);
    throw new Error("No fue posible cargar el inventario actual.");
  }

  const currentStock = safeNumber(currentItem.current_stock);
  const movementQty = safeNumber(quantity);
  const nextStock = movementType === "entrada"
    ? currentStock + movementQty
    : currentStock - movementQty;

  if (nextStock < 0) {
    throw new Error("No se puede dejar el stock en negativo.");
  }

  const { error: movementError } = await supabase
    .from(movementTable)
    .insert({
      [foreignKey]: itemId,
      movement_type: movementType,
      quantity: movementQty,
      reason: reason || null,
    });

  if (movementError) {
    console.error("Error creating stock movement", movementError);
    throw new Error("No fue posible registrar el movimiento de stock.");
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from(sourceTable)
    .update({ current_stock: nextStock })
    .eq("id", itemId)
    .select("*")
    .single();

  if (updateError) {
    console.error("Error updating current stock", updateError);
    throw new Error("No fue posible actualizar el stock.");
  }

  return updatedItem;
}

export async function fetchBillingLookups({ specialistId = null } = {}) {
  const [clientsResponse, specialistsResponse, appointmentsResponse, servicesResponse, productsResponse] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone, email, national_id").order("full_name", { ascending: true }),
    (specialistId
      ? supabase.from("specialists").select("id, full_name").eq("id", specialistId).order("full_name", { ascending: true })
      : supabase.from("specialists").select("id, full_name").order("full_name", { ascending: true })),
    (specialistId
      ? supabase.from("appointments").select("id, appointment_date, start_time").eq("specialist_id", specialistId).order("appointment_date", { ascending: false }).limit(200)
      : supabase.from("appointments").select("id, appointment_date, start_time").order("appointment_date", { ascending: false }).limit(200)),
    supabase
      .from("services")
      .select("id, name, price, service_type, sessions_count, payment_flexibility, description, active")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase.from("products").select("id, name, price, current_stock, active").order("name", { ascending: true }),
  ]);

  const errors = [clientsResponse.error, specialistsResponse.error, appointmentsResponse.error, servicesResponse.error, productsResponse.error].filter(Boolean);
  if (errors.length > 0) {
    console.error("Error loading billing lookups", errors);
    throw new Error("No fue posible cargar la información de facturación.");
  }

  const enrichedServices = await enrichServicesWithOffers(servicesResponse.data || []);

  return {
    clients: clientsResponse.data || [],
    specialists: specialistsResponse.data || [],
    appointments: (appointmentsResponse.data || []).map((appointment) => ({
      ...appointment,
      label: `${appointment.appointment_date || ""} ${appointment.start_time?.slice(0, 5) || ""}`.trim(),
    })),
    services: enrichedServices,
    products: productsResponse.data || [],
  };
}

export async function fetchInvoices({ specialistId = null } = {}) {
  const invoicesQuery = specialistId
    ? supabase.from("invoices").select("*").eq("specialist_id", specialistId).order("created_at", { ascending: false })
    : supabase.from("invoices").select("*").order("created_at", { ascending: false });

  const [invoicesResponse, itemsResponse, lookups] = await Promise.all([
    invoicesQuery,
    supabase.from("invoice_items").select("*").order("created_at", { ascending: true }),
    fetchBillingLookups({ specialistId }),
  ]);

  if (invoicesResponse.error) {
    console.error("Error loading invoices", invoicesResponse.error);
    throw new Error("No fue posible cargar las facturas.");
  }

  if (itemsResponse.error) {
    console.error("Error loading invoice items", itemsResponse.error);
    throw new Error("No fue posible cargar los items de facturación.");
  }

  return {
    invoices: hydrateInvoices(invoicesResponse.data || [], itemsResponse.data || [], lookups),
    lookups,
  };
}

export async function fetchInvoicesByClient(clientId) {
  const [invoicesResponse, lookups] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    fetchBillingLookups(),
  ]);

  if (invoicesResponse.error) {
    console.error("Error loading invoices by client", invoicesResponse.error);
    throw new Error("No fue posible cargar la facturación vinculada.");
  }

  const invoiceIds = (invoicesResponse.data || []).map((invoice) => invoice.id);
  let invoiceItems = [];

  if (invoiceIds.length > 0) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading invoice items by client", error);
      throw new Error("No fue posible cargar los items de facturación del paciente.");
    }

    invoiceItems = data || [];
  }

  return hydrateInvoices(invoicesResponse.data || [], invoiceItems, lookups);
}

export async function createInvoice(payload) {
  const { items, commissionPercentage = 10, ...invoicePayload } = payload;
  const normalizedInvoicePayload = sanitizeInvoicePayload(invoicePayload);

  const normalizedItems = items.map((item) => ({
    ...item,
    quantity: safeNumber(item.quantity),
    unit_price: safeNumber(item.unit_price),
    total: safeNumber(item.quantity) * safeNumber(item.unit_price),
  }));

  const subtotal = normalizedItems.reduce((acc, item) => acc + item.total, 0);
  const discount = safeNumber(normalizedInvoicePayload.discount || 0);
  const total = subtotal - discount;

  if (total < 0) {
    throw new Error("El total no puede ser negativo.");
  }

  const productIds = normalizedItems
    .filter((item) => item.item_type === "producto" && item.product_id)
    .map((item) => item.product_id);

  let productsById = new Map();
  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError) {
      console.error("Error loading products before invoice", productsError);
      throw new Error("No fue posible validar el stock de productos.");
    }

    productsById = new Map((products || []).map((product) => [product.id, product]));
  }

  normalizedItems.forEach((item) => {
    if (item.item_type !== "producto") return;
    const product = productsById.get(item.product_id);
    if (!product) {
      throw new Error("Uno de los productos seleccionados no existe.");
    }
    if (safeNumber(product.current_stock) < item.quantity) {
      throw new Error(`No hay stock suficiente para ${product.name}.`);
    }
  });

  const invoiceNumber = `FAC-${Date.now()}`;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      ...normalizedInvoicePayload,
      invoice_number: normalizedInvoicePayload.invoice_number || invoiceNumber,
      subtotal,
      discount,
      total,
    })
    .select("*")
    .single();

  if (invoiceError) {
    console.error("Error creating invoice", invoiceError);
    throw new Error("No fue posible guardar la factura.");
  }

  const invoiceItemsPayload = normalizedItems.map((item) => ({
    invoice_id: invoice.id,
    item_type: item.item_type,
    product_id: item.product_id || null,
    service_id: item.service_id || null,
    description: item.description || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItemsPayload)
    .select("*");

  if (itemsError) {
    console.error("Error creating invoice items", itemsError);
    throw new Error("La factura fue creada, pero falló el registro de los items.");
  }

  await syncInvoicePackages({
    invoice,
    invoiceItems: insertedItems || [],
    previousPackages: [],
  });

  for (const item of normalizedItems.filter((entry) => entry.item_type === "producto")) {
    const product = productsById.get(item.product_id);
    const nextStock = safeNumber(product.current_stock) - item.quantity;

    const { error: productUpdateError } = await supabase
      .from("products")
      .update({ current_stock: nextStock })
      .eq("id", item.product_id);

    if (productUpdateError) {
      console.error("Error updating product stock after invoice", productUpdateError);
      throw new Error("No fue posible descontar el stock del producto vendido.");
    }

    const { error: movementError } = await supabase
      .from("product_stock_movements")
      .insert({
        product_id: item.product_id,
        movement_type: "salida",
        quantity: item.quantity,
        reason: `Venta factura ${invoice.invoice_number}`,
      });

    if (movementError) {
      console.error("Error creating product stock movement after invoice", movementError);
    }

    if (invoice.specialist_id) {
      const commissionAmount = Number(((item.total * commissionPercentage) / 100).toFixed(2));
      const matchingInvoiceItem = (insertedItems || []).find((entry) => entry.product_id === item.product_id && entry.total === item.total);

      const { error: commissionError } = await supabase
        .from("commissions")
        .insert({
          specialist_id: invoice.specialist_id,
          type: "producto",
          product_id: item.product_id,
          invoice_id: invoice.id,
          invoice_item_id: matchingInvoiceItem?.id || null,
          sale_amount: item.total,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
          commission_date: invoice.invoice_date || invoice.created_at,
          status: "pendiente",
          notes: `Comisión generada por venta en factura ${invoice.invoice_number}`,
        });

      if (commissionError) {
        console.error("Error creating commission from invoice", commissionError);
      }
    }
  }

  return invoice;
}

export async function updateInvoice(invoiceId, payload) {
  const { items = [], commissionPercentage = 10, ...invoicePayload } = payload;
  const normalizedInvoicePayload = sanitizeInvoicePayload(invoicePayload);
  const normalizedItems = items.map((item) => ({
    ...item,
    quantity: safeNumber(item.quantity),
    unit_price: safeNumber(item.unit_price),
    total: safeNumber(item.quantity) * safeNumber(item.unit_price),
  }));

  const subtotal = normalizedItems.reduce((acc, item) => acc + item.total, 0);
  const discount = safeNumber(normalizedInvoicePayload.discount || 0);
  const total = subtotal - discount;

  if (total < 0) {
    throw new Error("El total no puede ser negativo.");
  }

  const { data: previousItems, error: previousItemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);

  if (previousItemsError) {
    console.error("Error loading previous invoice items", previousItemsError);
    throw new Error("No fue posible preparar la actualización de la factura.");
  }

  const previousPackages = await fetchPackagesByInvoice(invoiceId);

  const allProductIds = Array.from(new Set([
    ...normalizedItems
      .filter((item) => item.item_type === "producto" && item.product_id)
      .map((item) => item.product_id),
    ...(previousItems || [])
      .filter((item) => item.item_type === "producto" && item.product_id)
      .map((item) => item.product_id),
  ]));

  let productsById = new Map();
  if (allProductIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", allProductIds);

    if (productsError) {
      console.error("Error loading products before invoice update", productsError);
      throw new Error("No fue posible validar el stock para actualizar la factura.");
    }

    productsById = new Map((products || []).map((product) => [product.id, product]));
  }

  const stockDeltaByProduct = new Map();
  (previousItems || []).forEach((item) => {
    if (item.item_type !== "producto" || !item.product_id) return;
    stockDeltaByProduct.set(
      item.product_id,
      safeNumber(stockDeltaByProduct.get(item.product_id)) + safeNumber(item.quantity)
    );
  });

  normalizedItems.forEach((item) => {
    if (item.item_type !== "producto" || !item.product_id) return;
    stockDeltaByProduct.set(
      item.product_id,
      safeNumber(stockDeltaByProduct.get(item.product_id)) - safeNumber(item.quantity)
    );
  });

  for (const [productId, delta] of stockDeltaByProduct.entries()) {
    const product = productsById.get(productId);
    if (!product) {
      throw new Error("Uno de los productos seleccionados no existe.");
    }

    const nextStock = safeNumber(product.current_stock) + safeNumber(delta);
    if (nextStock < 0) {
      throw new Error(`No hay stock suficiente para ${product.name}.`);
    }
  }

  const { data: updatedInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .update({
      ...normalizedInvoicePayload,
      subtotal,
      discount,
      total,
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (invoiceError) {
    console.error("Error updating invoice", invoiceError);
    throw new Error("No fue posible actualizar la factura.");
  }

  const { error: deleteItemsError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);

  if (deleteItemsError) {
    console.error("Error deleting previous invoice items", deleteItemsError);
    throw new Error("No fue posible actualizar los items de la factura.");
  }

  const { error: deleteCommissionsError } = await supabase
    .from("commissions")
    .delete()
    .eq("invoice_id", invoiceId);

  if (deleteCommissionsError) {
    console.error("Error deleting previous invoice commissions", deleteCommissionsError);
  }

  const { data: insertedItems, error: itemsError } = await supabase
    .from("invoice_items")
    .insert(normalizedItems.map((item) => ({
      invoice_id: invoiceId,
      item_type: item.item_type,
      product_id: item.product_id || null,
      service_id: item.service_id || null,
      description: item.description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    })))
    .select("*");

  if (itemsError) {
    console.error("Error recreating invoice items", itemsError);
    throw new Error("No fue posible guardar los items actualizados.");
  }

  await syncInvoicePackages({
    invoice: updatedInvoice,
    invoiceItems: insertedItems || [],
    previousPackages,
  });

  for (const [productId, delta] of stockDeltaByProduct.entries()) {
    const product = productsById.get(productId);
    const nextStock = safeNumber(product.current_stock) + safeNumber(delta);

    const { error: productUpdateError } = await supabase
      .from("products")
      .update({ current_stock: nextStock })
      .eq("id", productId);

    if (productUpdateError) {
      console.error("Error updating product stock after invoice update", productUpdateError);
      throw new Error("No fue posible actualizar el inventario asociado a la factura.");
    }

    if (delta !== 0) {
      const { error: movementError } = await supabase
        .from("product_stock_movements")
        .insert({
          product_id: productId,
          movement_type: delta > 0 ? "entrada" : "salida",
          quantity: Math.abs(delta),
          reason: `Ajuste por edición de factura ${updatedInvoice.invoice_number || invoiceId}`,
        });

      if (movementError) {
        console.error("Error creating stock movement after invoice update", movementError);
      }
    }
  }

  if (updatedInvoice.specialist_id) {
    for (const item of normalizedItems.filter((entry) => entry.item_type === "producto" && entry.product_id)) {
      const commissionAmount = Number(((item.total * commissionPercentage) / 100).toFixed(2));
      const matchingInvoiceItem = (insertedItems || []).find(
        (entry) => entry.product_id === item.product_id && entry.total === item.total
      );

      const { error: commissionError } = await supabase
        .from("commissions")
        .insert({
          specialist_id: updatedInvoice.specialist_id,
          type: "producto",
          product_id: item.product_id,
          invoice_id: updatedInvoice.id,
          invoice_item_id: matchingInvoiceItem?.id || null,
          sale_amount: item.total,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
          commission_date: updatedInvoice.invoice_date || updatedInvoice.updated_at || updatedInvoice.created_at,
          status: "pendiente",
          notes: `Comisión actualizada por venta en factura ${updatedInvoice.invoice_number || updatedInvoice.id}`,
        });

      if (commissionError) {
        console.error("Error updating commission from invoice", commissionError);
      }
    }
  }

  return updatedInvoice;
}

export async function fetchCommissions({ specialistId = null } = {}) {
  const [commissionsResponse, specialistsResponse, productsResponse, invoicesResponse] = await Promise.all([
    (specialistId
      ? supabase.from("commissions").select("*").eq("specialist_id", specialistId).order("commission_date", { ascending: false })
      : supabase.from("commissions").select("*").order("commission_date", { ascending: false })),
    supabase.from("specialists").select("id, full_name"),
    supabase.from("products").select("id, name"),
    supabase.from("invoices").select("id, invoice_number"),
  ]);

  const errors = [commissionsResponse.error, specialistsResponse.error, productsResponse.error, invoicesResponse.error].filter(Boolean);
  if (errors.length > 0) {
    console.error("Error loading commissions", errors);
    throw new Error("No fue posible cargar las comisiones.");
  }

  const specialistMap = mapById(specialistsResponse.data || [], "full_name");
  const productMap = mapById(productsResponse.data || [], "name");
  const invoiceMap = mapById(invoicesResponse.data || [], "invoice_number");

  return (commissionsResponse.data || []).map((commission) => ({
    ...commission,
    specialistLabel: specialistMap.get(commission.specialist_id) || "Especialista",
    productLabel: productMap.get(commission.product_id) || "—",
    invoiceLabel: invoiceMap.get(commission.invoice_id) || "—",
  }));
}

export async function createCommission(payload, profile = null) {
  assertAdminProfile(profile);
  const normalizedPayload = sanitizeCommissionPayload(payload);
  const saleAmount = safeNumber(normalizedPayload.sale_amount);
  const percentage = safeNumber(normalizedPayload.commission_percentage);
  const commissionAmount = payload.commission_amount != null
    ? safeNumber(payload.commission_amount)
    : Number(((saleAmount * percentage) / 100).toFixed(2));

  const { data, error } = await supabase
    .from("commissions")
    .insert({
      ...normalizedPayload,
      sale_amount: saleAmount,
      commission_percentage: percentage,
      commission_amount: commissionAmount,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating commission", error);
    throw new Error("No fue posible registrar la comisión.");
  }

  return data;
}

export async function updateCommission(commissionId, payload, profile = null) {
  assertAdminProfile(profile);
  const normalizedPayload = sanitizeCommissionPayload(payload);
  const saleAmount = safeNumber(normalizedPayload.sale_amount);
  const percentage = safeNumber(normalizedPayload.commission_percentage);
  const commissionAmount = payload.commission_amount != null
    ? safeNumber(payload.commission_amount)
    : Number(((saleAmount * percentage) / 100).toFixed(2));

  const { data, error } = await supabase
    .from("commissions")
    .update({
      ...normalizedPayload,
      sale_amount: saleAmount,
      commission_percentage: percentage,
      commission_amount: commissionAmount,
    })
    .eq("id", commissionId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating commission", error);
    throw new Error("No fue posible actualizar la comisión.");
  }

  return data;
}

export async function markCommissionAsPaid(commissionId, profile = null) {
  assertAdminProfile(profile);
  return updateCommission(commissionId, {
    status: "pagada",
    paid_at: new Date().toISOString(),
  }, profile);
}

export async function fetchFinanceDashboardMetrics({ specialistId = null } = {}) {
  try {
    const [invoices, commissions, products, supplies, invoiceItems] = await Promise.all([
      (specialistId ? supabase.from("invoices").select("*").eq("specialist_id", specialistId) : supabase.from("invoices").select("*")),
      (specialistId ? supabase.from("commissions").select("*").eq("specialist_id", specialistId) : supabase.from("commissions").select("*")),
      supabase.from("products").select("id, current_stock, min_stock"),
      supabase.from("supplies").select("id, current_stock, min_stock"),
      supabase.from("invoice_items").select("*"),
    ]);

    const errors = [invoices.error, commissions.error, products.error, supplies.error, invoiceItems.error].filter(Boolean);
    if (errors.length > 0) {
      console.error("Error loading finance dashboard metrics", errors);
      return {
        ingresosHoy: 0,
        ingresosSemana: 0,
        ingresosMes: 0,
        productosVendidos: 0,
        comisionesPendientes: 0,
        inventarioBajo: 0,
      };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidInvoices = (invoices.data || []).filter((invoice) => invoice.payment_status === "pagada" || invoice.status === "pagada");
    const ingresosHoy = paidInvoices.filter((invoice) => new Date(invoice.created_at || invoice.invoice_date || 0) >= startOfDay).reduce((acc, invoice) => acc + safeNumber(invoice.total), 0);
    const ingresosSemana = paidInvoices.filter((invoice) => new Date(invoice.created_at || invoice.invoice_date || 0) >= startOfWeek).reduce((acc, invoice) => acc + safeNumber(invoice.total), 0);
    const ingresosMes = paidInvoices.filter((invoice) => new Date(invoice.created_at || invoice.invoice_date || 0) >= startOfMonth).reduce((acc, invoice) => acc + safeNumber(invoice.total), 0);
    const productosVendidos = (invoiceItems.data || []).filter((item) => item.item_type === "producto").reduce((acc, item) => acc + safeNumber(item.quantity), 0);
    const comisionesPendientes = (commissions.data || []).filter((commission) => commission.status === "pendiente").reduce((acc, commission) => acc + safeNumber(commission.commission_amount), 0);
    const inventarioBajo = [...(products.data || []), ...(supplies.data || [])].filter((item) => safeNumber(item.current_stock) <= safeNumber(item.min_stock)).length;

    return {
      ingresosHoy,
      ingresosSemana,
      ingresosMes,
      productosVendidos,
      comisionesPendientes,
      inventarioBajo,
    };
  } catch (error) {
    console.error("Error computing finance dashboard metrics", error);
    return {
      ingresosHoy: 0,
      ingresosSemana: 0,
      ingresosMes: 0,
      productosVendidos: 0,
      comisionesPendientes: 0,
      inventarioBajo: 0,
    };
  }
}







