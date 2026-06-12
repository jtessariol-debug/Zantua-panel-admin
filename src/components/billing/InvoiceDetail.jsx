import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";

export default function InvoiceDetail({ invoice }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.topGrid}>
        <SectionCard title={invoice.invoice_number || "Factura"} subtitle="Resumen general de la factura">
          <div style={styles.rows}>
            <DetailRow label="Cliente" value={invoice.clientLabel} />
            <DetailRow label="Especialista" value={invoice.specialistLabel} />
            <DetailRow label="Fecha" value={formatDate(invoice.invoice_date || invoice.created_at)} />
            <DetailRow label="Método de pago" value={invoice.payment_method || "—"} />
            <DetailRow label="Estado" value={invoice.payment_status || invoice.status || "pendiente"} />
          </div>
        </SectionCard>

        <SectionCard title="Totales" subtitle="Desglose económico">
          <div style={styles.summaryCard}>
            <SummaryRow label="Subtotal" value={invoice.subtotal} />
            <SummaryRow label="Descuento" value={invoice.discount} />
            <SummaryRow label="Total" value={invoice.total} emphasized />
          </div>
          <div style={styles.exportPlaceholder}>Imprimir / Exportar PDF</div>
        </SectionCard>
      </div>

      <SectionCard title="Items de factura" subtitle="Servicios y productos incluidos en esta venta.">
        {invoice.items?.length ? (
          <div style={styles.itemsList}>
            {invoice.items.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                <div style={styles.itemTitle}>{item.description || item.product_name || item.service_name || "Item"}</div>
                <div style={styles.itemMeta}>{item.item_type}</div>
                <div style={styles.itemGrid}>
                  <span>Cantidad: {item.quantity}</span>
                  <span>Precio unitario: ${Number(item.unit_price || 0).toFixed(2)}</span>
                  <strong>Total: ${Number(item.total || 0).toFixed(2)}</strong>
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
      <strong>${Number(value || 0).toFixed(2)}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString(); } catch { return "—"; }
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 18 },
  topGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  rows: { display: "flex", flexDirection: "column", gap: 12 },
  row: { borderBottom: "1px solid #F3ECE6", paddingBottom: 10 },
  label: { color: "#9C8E84", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  value: { color: "#2A2522", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
  summaryCard: { display: "flex", flexDirection: "column", gap: 10 },
  summaryRow: { display: "flex", justifyContent: "space-between", color: "#5E5753", fontSize: 14 },
  summaryRowStrong: { color: "#2A2522", fontSize: 16 },
  exportPlaceholder: { marginTop: 18, background: "#FCFAF7", border: "1px dashed #E6D8CC", borderRadius: 16, padding: "14px 16px", color: "#8B7E74", fontWeight: 700, textAlign: "center" },
  itemsList: { display: "flex", flexDirection: "column", gap: 12 },
  itemCard: { background: "#FCFAF7", border: "1px solid #F0E6DD", borderRadius: 18, padding: 16 },
  itemTitle: { color: "#2A2522", fontWeight: 700, fontSize: 15 },
  itemMeta: { color: "#8B7E74", fontSize: 12, textTransform: "capitalize", marginTop: 4 },
  itemGrid: { display: "flex", gap: 16, flexWrap: "wrap", color: "#5E5753", fontSize: 13, marginTop: 12 },
};
