import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Receipt, Wallet, WalletCards } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import InvoiceDetail from "../components/billing/InvoiceDetail";
import InvoiceForm from "../components/billing/InvoiceForm";
import InvoiceModal from "../components/billing/InvoiceModal";
import InvoicesTable from "../components/billing/InvoicesTable";
import ActionButton from "../components/ui/ActionButton";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import { createInvoice, fetchInvoices, updateInvoice } from "../services/finance";

export default function BillingPage() {
  const { profile, isSpecialist } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookups, setLookups] = useState({ clients: [], specialists: [], appointments: [], services: [], products: [] });
  const [invoices, setInvoices] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState(null);

  async function loadBilling() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchInvoices({ specialistId: isSpecialist ? profile?.specialist_id : null });
      setInvoices(result.invoices);
      setLookups(result.lookups);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No fue posible cargar la facturación.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
  }, [isSpecialist, profile?.specialist_id]);

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = (invoice) => new Date(invoice.invoice_date || invoice.created_at || 0);
    const paidInvoices = invoices.filter((invoice) => invoice.payment_status === "pagada");
    const todayTotal = paidInvoices.filter((invoice) => toDate(invoice) >= startOfDay).reduce((acc, invoice) => acc + Number(invoice.total || 0), 0);
    const weekTotal = paidInvoices.filter((invoice) => toDate(invoice) >= startOfWeek).reduce((acc, invoice) => acc + Number(invoice.total || 0), 0);
    const monthTotal = paidInvoices.filter((invoice) => toDate(invoice) >= startOfMonth).reduce((acc, invoice) => acc + Number(invoice.total || 0), 0);
    return [
      {
        title: "Facturado hoy",
        value: `RD$${todayTotal.toFixed(2)}`,
        description: "Ingresos cobrados en la jornada actual.",
        icon: Wallet,
        accent: { background: "#EAF6ED", color: "#28704B" },
      },
      {
        title: "Facturado esta semana",
        value: `RD$${weekTotal.toFixed(2)}`,
        description: "Ventas pagadas acumuladas en los últimos 7 días.",
        icon: CalendarRange,
        accent: { background: "#F3EAF8", color: "#915AA6" },
      },
      {
        title: "Facturado este mes",
        value: `RD$${monthTotal.toFixed(2)}`,
        description: "Resumen mensual de ingresos registrados.",
        icon: WalletCards,
        accent: { background: "#FCEEE5", color: "#B76A4D" },
      },
      {
        title: "Facturas pendientes",
        value: invoices.filter((invoice) => invoice.payment_status === "pendiente").length,
        description: "Comprobantes pendientes de cobro o cierre.",
        icon: Receipt,
        accent: { background: "#FFF4DF", color: "#A66D1D" },
      },
      {
        title: "Facturas pagadas",
        value: invoices.filter((invoice) => invoice.payment_status === "pagada").length,
        description: "Facturas cerradas y cobradas correctamente.",
        icon: WalletCards,
        accent: { background: "#EAF6ED", color: "#28704B" },
      },
    ];
  }, [invoices]);

  async function handleCreateInvoice(payload) {
    setSaving(true);
    setError("");
    try {
      await createInvoice(payload);
      setFeedback("Factura creada correctamente.");
      setModalState(null);
      await loadBilling();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible guardar la factura.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateInvoice(payload, currentInvoice) {
    setSaving(true);
    setError("");
    try {
      await updateInvoice(currentInvoice.id, payload);
      setFeedback("Factura actualizada correctamente.");
      setModalState(null);
      await loadBilling();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible actualizar la factura.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(invoice) {
    setSaving(true);
    setError("");
    try {
      await updateInvoice(invoice.id, { ...invoice, items: invoice.items || [], payment_status: "pagada" });
      setFeedback("Factura marcada como pagada.");
      await loadBilling();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible marcar la factura como pagada.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(invoice) {
    setSaving(true);
    setError("");
    try {
      await updateInvoice(invoice.id, { ...invoice, items: invoice.items || [], payment_status: "cancelada" });
      setFeedback("Factura cancelada.");
      await loadBilling();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible cancelar la factura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Finanzas"
          title="Facturación"
          subtitle="Control de ventas, servicios, productos y comprobantes con una lectura más ejecutiva y clara."
          actions={<ActionButton onClick={() => setModalState({ mode: "create" })}>Nueva factura</ActionButton>}
        />

        <div style={styles.metricsGrid}>
          {metrics.map((metric) => <DashboardCard key={metric.title} {...metric} />)}
        </div>

        {feedback ? <div style={styles.successBanner}>{feedback}</div> : null}
        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <SectionCard title="Listado de facturas" subtitle="Consulta ventas registradas, estado de pago y detalle por cliente.">
          {loading ? (
            <div style={styles.loadingCopy}>Cargando facturas...</div>
          ) : (
            <InvoicesTable
              invoices={invoices}
              onView={(invoice) => setModalState({ mode: "view", invoice })}
              onEdit={(invoice) => setModalState({ mode: "edit", invoice })}
              onMarkPaid={handleMarkPaid}
              onCancel={handleCancel}
              emptyState={(
                <EmptyState
                  title="No hay facturas registradas todavía."
                  description="Crea la primera factura para comenzar el control de ventas y cobros."
                  action={<ActionButton onClick={() => setModalState({ mode: "create" })}>Crear primera factura</ActionButton>}
                />
              )}
            />
          )}
        </SectionCard>

        {modalState?.mode === "create" ? (
          <InvoiceModal title="Nueva factura" subtitle="Registra servicios y productos vendidos con su forma de pago." onClose={() => setModalState(null)} wide>
            <InvoiceForm
              lookups={lookups}
              onSubmit={handleCreateInvoice}
              onCancel={() => setModalState(null)}
              loading={saving}
              submitLabel="Guardar factura"
              specialistLocked={isSpecialist}
              initialValues={{ specialist_id: isSpecialist ? profile?.specialist_id || "" : "" }}
            />
          </InvoiceModal>
        ) : null}

        {modalState?.mode === "edit" ? (
          <InvoiceModal title="Editar factura" subtitle={modalState.invoice?.invoice_number || "Actualiza datos e items de la factura."} onClose={() => setModalState(null)} wide>
            <InvoiceForm
              lookups={lookups}
              initialValues={modalState.invoice}
              onSubmit={(payload) => handleUpdateInvoice(payload, modalState.invoice)}
              onCancel={() => setModalState(null)}
              loading={saving}
              submitLabel="Guardar cambios"
              specialistLocked={isSpecialist}
            />
          </InvoiceModal>
        ) : null}

        {modalState?.mode === "view" ? (
          <InvoiceModal title="Detalle de factura" subtitle={modalState.invoice?.invoice_number || "Resumen del comprobante"} onClose={() => setModalState(null)} wide>
            <InvoiceDetail invoice={modalState.invoice} />
          </InvoiceModal>
        ) : null}
      </div>
    </AppLayout>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14, padding: "6px 0" },
  successBanner: { background: "#EAF6ED", border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
};
