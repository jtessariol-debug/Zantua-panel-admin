import { useState } from "react";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { generateInvoicePdf } from "../../utils/invoicePdf";
import { BRANDING } from "../../lib/branding";

function formatCurrency(value) {
  return `RD$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatStatus(value) {
  const normalized = String(value || "pendiente").trim().toLowerCase();
  if (normalized === "pagada") return "Pagada";
  if (normalized === "cancelada") return "Cancelada";
  return "Pendiente";
}

function resolveItemType(item) {
  const description = String(item?.description || item?.service_name || item?.product_name || "").toLowerCase();
  if (item?.item_type === "producto") return "Producto";
  if (/paquete/.test(description)) return "Paquete";
  return "Servicio";
}

function resolveItemTotal(item) {
  if (item?.line_total != null) {
    return Number(item.line_total || 0);
  }
  if (item?.total != null) {
    return Number(item.total || 0);
  }
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

export default function InvoiceDetail({ invoice }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExportPdf() {
    setExporting(true);
    setExportError("");

    try {
      await generateInvoicePdf(invoice);
    } catch (error) {
      console.error("Error exporting invoice PDF", error);
      setExportError("No se pudo generar el PDF de la factura.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topGrid}>
        <SectionCard title={invoice.invoice_number || "Factura"} subtitle="Resumen general del comprobante">
          <div style={styles.rows}>
            <DetailRow label="Cliente" value={invoice.client?.full_name || invoice.clientLabel} />
            <DetailRow label="Teléfono" value={invoice.client?.phone || "—"} />
            <DetailRow label="Correo" value={invoice.client?.email || "—"} />
            <DetailRow label="Cédula" value={invoice.client?.national_id || "—"} />
            <DetailRow label="Especialista" value={invoice.specialistLabel} />
            <DetailRow label="Fecha" value={formatDate(invoice.invoice_date || invoice.created_at)} />
            <DetailRow label="Método de pago" value={invoice.payment_method || "—"} />
            <DetailRow label="Estado" value={formatStatus(invoice.payment_status || invoice.status)} />
          </div>
        </SectionCard>

        <SectionCard title="Totales" subtitle="Desglose económico">
          <div style={styles.summaryHero}>
            <div style={styles.summaryTotalLabel}>Total final</div>
            <div style={styles.summaryTotalValue}>{formatCurrency(invoice.total)}</div>
          </div>

          <div style={styles.summaryCard}>
            <SummaryRow label="Subtotal" value={invoice.subtotal} />
            <SummaryRow label="Descuento" value={invoice.discount} />
            <SummaryRow label="Total final" value={invoice.total} emphasized />
          </div>

          <ActionButton onClick={handleExportPdf} disabled={exporting} style={styles.exportButton}>
            {exporting ? "Generando PDF..." : "Imprimir / Exportar PDF"}
          </ActionButton>

          {exportError ? <div style={styles.exportError}>{exportError}</div> : null}
        </SectionCard>
      </div>

      <SectionCard title="Items de factura" subtitle="Servicios, paquetes y productos incluidos en esta venta.">
        {invoice.items?.length ? (
          <div style={styles.itemsList}>
            {invoice.items.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                <div style={styles.itemHead}>
                  <div>
                    <div style={styles.itemTitle}>{item.description || item.product_name || item.service_name || "Item"}</div>
                    <div style={styles.itemMeta}>{resolveItemType(item)}</div>
                  </div>
                  <div style={styles.itemTotal}>{formatCurrency(resolveItemTotal(item))}</div>
                </div>
                <div style={styles.itemGrid}>
                  <span>Cantidad: {Number(item.quantity || 0).toLocaleString("en-US")}</span>
                  <span>Precio unitario: {formatCurrency(item.unit_price)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin items" description="Esta factura todavía no tiene items asociados." />
        )}
      </SectionCard>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.row}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div style={{ ...styles.summaryRow, ...(emphasized ? styles.summaryRowStrong : {}) }}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 18 },
  topGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  rows: { display: "flex", flexDirection: "column", gap: 12 },
  row: { borderBottom: "1px solid #F3ECE6", paddingBottom: 10 },
  label: { color: BRANDING.colors.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  value: { color: BRANDING.colors.text, fontSize: 15, marginTop: 6, lineHeight: 1.6 },
  summaryHero: {
    padding: 18,
    borderRadius: 20,
    background: "linear-gradient(180deg, #FFFCF7 0%, #FBF7F0 100%)",
    border: `1px solid ${BRANDING.colors.border}`,
    marginBottom: 14,
  },
  summaryTotalLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: 0.35,
  },
  summaryTotalValue: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 32,
    fontWeight: 700,
    marginTop: 10,
    lineHeight: 1,
  },
  summaryCard: { display: "flex", flexDirection: "column", gap: 10 },
  summaryRow: { display: "flex", justifyContent: "space-between", color: "#5E5753", fontSize: 14 },
  summaryRowStrong: { color: "#2A2522", fontSize: 16 },
  exportButton: { marginTop: 18, width: "100%" },
  exportError: {
    marginTop: 10,
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
  itemsList: { display: "flex", flexDirection: "column", gap: 12 },
  itemCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 16 },
  itemHead: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" },
  itemTitle: { color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 15 },
  itemMeta: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "capitalize", marginTop: 4 },
  itemTotal: { color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 16 },
  itemGrid: { display: "flex", gap: 16, flexWrap: "wrap", color: "#5E5753", fontSize: 13, marginTop: 12 },
};
