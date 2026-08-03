import { supabase } from "../lib/supabaseClient";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function sortOffersByPriority(offers) {
  return [...(offers || [])].sort((a, b) => {
    const startA = new Date(a.start_date || 0).getTime();
    const startB = new Date(b.start_date || 0).getTime();
    if (startB !== startA) return startB - startA;
    const updatedA = new Date(a.updated_at || a.created_at || 0).getTime();
    const updatedB = new Date(b.updated_at || b.created_at || 0).getTime();
    return updatedB - updatedA;
  });
}

export function selectPreferredOffer(offers) {
  return sortOffersByPriority(offers)[0] || null;
}

export function mergeServicesWithOffers(services, offers, { activeOnly = true, currentOnly = true } = {}) {
  const today = getTodayIsoDate();
  const offersByService = new Map();

  (offers || []).forEach((offer) => {
    const isActive = offer.active !== false;
    const isCurrent = (!offer.start_date || offer.start_date <= today) && (!offer.end_date || offer.end_date >= today);
    if ((activeOnly && !isActive) || (currentOnly && !isCurrent)) return;
    const list = offersByService.get(offer.service_id) || [];
    list.push(offer);
    offersByService.set(offer.service_id, list);
  });

  return (services || []).map((service) => {
    const serviceOffers = sortOffersByPriority(offersByService.get(service.id) || []);
    return {
      ...service,
      offers: serviceOffers,
      active_offer: serviceOffers[0] || null,
    };
  });
}

export async function fetchServiceOffers({ activeOnly = false, currentOnly = false, serviceIds = null } = {}) {
  let query = supabase
    .from("service_offers")
    .select("*")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("active", true);
  }

  if (currentOnly) {
    const today = getTodayIsoDate();
    query = query.lte("start_date", today).gte("end_date", today);
  }

  if (Array.isArray(serviceIds) && serviceIds.length > 0) {
    query = query.in("service_id", serviceIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading service offers", error);
    throw new Error("No fue posible cargar las ofertas.");
  }

  return data || [];
}
