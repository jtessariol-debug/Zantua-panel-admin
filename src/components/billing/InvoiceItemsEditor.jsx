import { useEffect, useMemo, useState } from "react";
import { BRANDING } from "../../lib/branding";
import {
  fetchServiceOffers,
  mergeServicesWithOffers,
} from "../../services/serviceOffers";

export default function InvoiceItemsEditor({ items, onChange, lookups }) {
  const [servicesWithOffers, setServicesWithOffers] = useState(lookups.services || []);

  useEffect(() => {
    let mounted = true;

    async function loadOffers() {
      const services = lookups.services || [];
      if (!services.length) {
        if (mounted) setServicesWithOffers([]);
        return;
      }

      try {
        const offers = await fetchServiceOffers({
          activeOnly: true,
          currentOnly: true,
          serviceIds: services.map((service) => service.id),
        });

        if (mounted) {
          setServicesWithOffers(mergeServicesWithOffers(services, offers, {
            activeOnly: true,
            currentOnly: true,
          }));
        }
      } catch (error) {
        console.error("Error loading active offers for invoice items", error);
        if (mounted) {
          setServicesWithOffers(services);
        }
      }
    }

    loadOffers();

    return () => {
      mounted = false;
    };
  }, [lookups.services]);

  const availableServices = useMemo(() => servicesWithOffers, [servicesWithOffers]);

  function updateItem(index, nextPartial) {
    onChange(items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...nextPartial } : item
    )));
  }

  function addItem(type) {
    onChange([
      ...items,
      {
        item_type: type,
        product_id: "",
        service_id: "",
        description: "",
        quantity: 1,
        unit_price: 0,
      },
    ]);
  }

  function removeItem(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Items de factura</div>
          <div style={styles.subtitle}>Agrega servicios, paquetes o productos a la factura.</div>
        </div>
        <div style={styles.headerActions}>
          <button type="button" onClick={() => addItem("servicio")} style={styles.secondaryButton}>+ Servicio</button>
          <button type="button" onClick={() => addItem("producto")} style={styles.secondaryButton}>+ Producto</button>
        </div>
      </div>

      <div style={styles.list}>
        {items.map((item, index) => {
          const isProduct = item.item_type === "producto";
          const selectedSource = isProduct
            ? lookups.products.find((product) => product.id === item.product_id)
            : availableServices.find((service) => service.id === item.service_id);

          return (
            <div key={`${item.item_type}-${index}`} style={styles.card}>
              <div style={styles.row}>
                <select
                  value={item.item_type}
                  onChange={(event) => updateItem(index, {
                    item_type: event.target.value,
                    product_id: "",
                    service_id: "",
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                  })}
                  style={styles.input}
                >
                  <option value="servicio">Servicio</option>
                  <option value="producto">Producto</option>
                </select>

                <select
                  value={isProduct ? item.product_id || "" : item.service_id || ""}
                  onChange={(event) => {
                    const selectedItem = event.target.value;
                    const source = isProduct
                      ? lookups.products.find((product) => product.id === selectedItem)
                      : availableServices.find((service) => service.id === selectedItem);

                    updateItem(index, isProduct ? {
                      product_id: selectedItem,
                      description: source?.name || "",
                      unit_price: source?.price || 0,
                    } : {
                      service_id: selectedItem,
                      description: source?.description || source?.name || "",
                      unit_price: source?.active_offer?.offer_price ?? source?.price ?? 0,
                    });
                  }}
                  style={styles.input}
                >
                  <option value="">Seleccionar</option>
                  {(isProduct ? lookups.products : availableServices).map((source) => (
                    <option key={source.id} value={source.id}>
                      {isProduct ? source.name : formatServiceOptionLabel(source)}
                    </option>
                  ))}
                </select>
              </div>

              {!isProduct && selectedSource ? (
                <div style={styles.serviceInfoCard}>
                  <div style={styles.serviceInfoHeader}>
                    <span style={{
                      ...styles.serviceBadge,
                      ...(selectedSource.service_type === "paquete" ? styles.packageBadge : styles.standardBadge),
                    }}
                    >
                      {selectedSource.service_type === "paquete" ? "Paquete" : "Servicio"}
                    </span>
                    <span style={styles.servicePrice}>
                      RD$ {Number(selectedSource.active_offer?.offer_price ?? selectedSource.price ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.serviceMeta}>
                    {selectedSource.sessions_count ? `Sesiones: ${selectedSource.sessions_count}` : "Sesión individual"}
                    {selectedSource.payment_flexibility ? ` · ${selectedSource.payment_flexibility}` : ""}
                  </div>
                  {selectedSource.active_offer ? (
                    <div style={styles.offerMeta}>
                      Precio regular: RD$ {Number(selectedSource.price || 0).toFixed(2)}
                      {" · "}
                      Oferta activa: {selectedSource.active_offer.title || "Promoción vigente"}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={styles.rowThree}>
                <input
                  value={item.description || selectedSource?.description || selectedSource?.name || ""}
                  onChange={(event) => updateItem(index, { description: event.target.value })}
                  placeholder="Descripción"
                  style={styles.input}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: Number(event.target.value || 0) })}
                  placeholder="Cantidad"
                  style={styles.input}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(event) => updateItem(index, { unit_price: Number(event.target.value || 0) })}
                  placeholder="Precio unitario"
                  style={styles.input}
                />
              </div>

              <div style={styles.footer}>
                <div style={styles.total}>Total: RD$ {(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}</div>
                <button type="button" onClick={() => removeItem(index)} style={styles.removeButton}>Quitar</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatServiceOptionLabel(service) {
  const typeLabel = service.service_type === "paquete" ? "Paquete" : "Servicio";
  const priceLabel = service.price != null ? `RD$ ${Number(service.price).toFixed(2)}` : "Sin precio";
  const sessionsLabel = service.service_type === "paquete" && service.sessions_count
    ? ` · ${service.sessions_count} sesiones`
    : "";
  const offerLabel = service.active_offer?.offer_price != null
    ? ` · Oferta RD$ ${Number(service.active_offer.offer_price).toFixed(2)}`
    : "";

  return `${service.name} · ${typeLabel} · ${priceLabel}${sessionsLabel}${offerLabel}`;
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  header: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" },
  title: { color: "#2A2522", fontWeight: 700, fontSize: 18 },
  subtitle: { color: "#8B7E74", fontSize: 13, marginTop: 4 },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { border: "1px solid #EFE2D7", borderRadius: 18, background: "#FCFAF7", padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "grid", gridTemplateColumns: "180px 1fr", gap: 12 },
  rowThree: { display: "grid", gridTemplateColumns: "1fr 120px 160px", gap: 12 },
  input: { width: "100%", background: "#FFFFFF", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 14, boxSizing: "border-box", outline: "none" },
  serviceInfoCard: { background: "#FFFCF8", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
  serviceInfoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  serviceBadge: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, border: "1px solid transparent" },
  packageBadge: { background: "#EEF4F1", color: BRANDING.colors.primaryStrong, borderColor: "#D2E3DB" },
  standardBadge: { background: "#F8F1E8", color: "#8A6844", borderColor: "#E9DCC8" },
  servicePrice: { color: BRANDING.colors.primaryStrong, fontSize: 13, fontWeight: 700 },
  serviceMeta: { color: "#6C615B", fontSize: 13, lineHeight: 1.5 },
  offerMeta: { color: BRANDING.colors.secondary, fontSize: 12, fontWeight: 700, background: "#EEF6F2", border: "1px solid #D4E4DD", borderRadius: 12, padding: "10px 12px" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  total: { color: "#2A2522", fontWeight: 700, fontSize: 14 },
  secondaryButton: { background: "#F1F6F3", color: BRANDING.colors.primaryStrong, border: "1px solid #D4E4DD", borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  removeButton: { background: "#FFF4F5", color: "#A24F5D", border: "1px solid #F3D6DB", borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};

