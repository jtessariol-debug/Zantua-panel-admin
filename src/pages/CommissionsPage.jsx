import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Coins, PiggyBank, WalletCards } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import CommissionForm from "../components/commissions/CommissionForm";
import CommissionsTable from "../components/commissions/CommissionsTable";
import PatientModal from "../components/patients/PatientModal";
import ActionButton from "../components/ui/ActionButton";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import {
  createCommission,
  fetchBillingLookups,
  fetchCommissions,
  markCommissionAsPaid,
  updateCommission,
} from "../services/finance";

export default function CommissionsPage() {
  const { profile, isAdmin, isSpecialist } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissions, setCommissions] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [products, setProducts] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState(null);

  async function loadCommissions() {
    setLoading(true);
    setError("");
    try {
      const specialistId = isSpecialist ? profile?.specialist_id : null;
      const [commissionResult, billingLookups] = await Promise.all([
        fetchCommissions({ specialistId }),
        fetchBillingLookups({ specialistId }),
      ]);
      setCommissions(commissionResult);
      setSpecialists(billingLookups.specialists || []);
      setProducts(billingLookups.products || []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No fue posible cargar las comisiones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommissions();
  }, [isSpecialist, profile?.specialist_id]);

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const pending = commissions.filter((commission) => commission.status === "pendiente");
    const paidThisMonth = commissions.filter(
      (commission) => commission.status === "pagada"
        && new Date(commission.paid_at || commission.updated_at || 0) >= startOfMonth
    );

    return [
      {
        title: "Comisiones pendientes",
        value: pending.length,
        description: "Pagos aún abiertos por liquidar a especialistas.",
        icon: BadgeDollarSign,
        accent: { background: "#FFF4DF", color: "#A66D1D" },
      },
      {
        title: "Pagadas este mes",
        value: paidThisMonth.length,
        description: "Comisiones liquidadas durante el mes actual.",
        icon: WalletCards,
        accent: { background: "#EAF6ED", color: "#28704B" },
      },
      {
        title: "Total pendiente",
        value: `RD$ ${pending.reduce((acc, item) => acc + Number(item.commission_amount || 0), 0).toFixed(2)}`,
        description: "Monto total de comisiones por pagar.",
        icon: Coins,
        accent: { background: "#FCEEE5", color: "#B76A4D" },
      },
      {
        title: "Total pagado",
        value: `RD$ ${commissions.filter((item) => item.status === "pagada").reduce((acc, item) => acc + Number(item.commission_amount || 0), 0).toFixed(2)}`,
        description: "Histórico visible de comisiones ya saldadas.",
        icon: PiggyBank,
        accent: { background: "#F3EAF8", color: "#915AA6" },
      },
    ];
  }, [commissions]);

  async function handleCreateCommission(payload) {
    if (!isAdmin) {
      setError("No tienes permisos para acceder a esta sección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createCommission(payload, profile);
      setFeedback("Comisión registrada correctamente.");
      setModalState(null);
      await loadCommissions();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible guardar la comisión.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCommission(payload, currentCommission) {
    if (!isAdmin) {
      setError("No tienes permisos para acceder a esta sección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateCommission(currentCommission.id, payload, profile);
      setFeedback("Comisión actualizada correctamente.");
      setModalState(null);
      await loadCommissions();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible actualizar la comisión.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAsPaid(commission) {
    if (!isAdmin) {
      setError("No tienes permisos para acceder a esta sección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await markCommissionAsPaid(commission.id, profile);
      setFeedback("Comisión marcada como pagada.");
      await loadCommissions();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible marcar la comisión como pagada.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(commission) {
    if (!isAdmin) {
      setError("No tienes permisos para acceder a esta sección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateCommission(commission.id, { ...commission, status: "cancelada" }, profile);
      setFeedback("Comisión cancelada.");
      await loadCommissions();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible cancelar la comisión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Control financiero"
          title="Comisiones"
          subtitle="Consulta comisiones por especialista, revisa el estado de pago y administra liquidaciones desde un flujo sobrio y claro."
          actions={isAdmin ? (
            <ActionButton onClick={() => setModalState({ mode: "create" })}>
              + Nueva comisión manual
            </ActionButton>
          ) : null}
        />

        <div style={styles.metricsGrid}>
          {metrics.map((metric) => <DashboardCard key={metric.title} {...metric} />)}
        </div>

        {feedback ? <div style={styles.successBanner}>{feedback}</div> : null}
        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <SectionCard
          title="Listado de comisiones"
          subtitle="Consulta comisiones generadas por productos, bonos o ajustes manuales con lectura rápida de monto, estado y especialista."
        >
          {loading ? (
            <div style={styles.loadingCopy}>Cargando comisiones...</div>
          ) : (
            <CommissionsTable
              commissions={commissions}
              onView={(commission) => setModalState({ mode: "view", commission })}
              onEdit={(commission) => setModalState({ mode: "edit", commission })}
              onMarkPaid={handleMarkAsPaid}
              onCancel={handleCancel}
              canManage={isAdmin}
              emptyState={(
                <EmptyState
                  title="No hay comisiones registradas todavía."
                  description="Las comisiones generadas por ventas o creadas manualmente aparecerán aquí."
                  action={isAdmin ? (
                    <ActionButton onClick={() => setModalState({ mode: "create" })}>
                      Registrar primera comisión
                    </ActionButton>
                  ) : null}
                />
              )}
            />
          )}
        </SectionCard>

        {modalState?.mode === "create" && isAdmin ? (
          <PatientModal
            title="Nueva comisión manual"
            subtitle="Registra bonos, porcentajes o comisiones asociadas a producto."
            onClose={() => setModalState(null)}
            wide
          >
            <CommissionForm
              specialists={specialists}
              products={products}
              onSubmit={handleCreateCommission}
              onCancel={() => setModalState(null)}
              loading={saving}
              submitLabel="Guardar comisión"
              specialistLocked={isSpecialist}
              initialValues={{ specialist_id: isSpecialist ? profile?.specialist_id || "" : "" }}
            />
          </PatientModal>
        ) : null}

        {modalState?.mode === "edit" ? (
          <PatientModal
            title="Editar comisión"
            subtitle={modalState.commission?.specialistLabel || "Actualiza el detalle de la comisión."}
            onClose={() => setModalState(null)}
            wide
          >
            <CommissionForm
              specialists={specialists}
              products={products}
              initialValues={modalState.commission}
              onSubmit={(payload) => handleUpdateCommission(payload, modalState.commission)}
              onCancel={() => setModalState(null)}
              loading={saving}
              submitLabel="Guardar cambios"
              specialistLocked={isSpecialist}
            />
          </PatientModal>
        ) : null}

        {modalState?.mode === "view" ? (
          <PatientModal
            title="Detalle de comisión"
            subtitle={modalState.commission?.specialistLabel || "Resumen de la comisión"}
            onClose={() => setModalState(null)}
          >
            <div style={styles.detailWrap}>
              <DetailRow label="Especialista" value={modalState.commission?.specialistLabel} />
              <DetailRow label="Tipo" value={modalState.commission?.type} />
              <DetailRow label="Producto" value={modalState.commission?.productLabel || "—"} />
              <DetailRow label="Venta" value={`RD$ ${Number(modalState.commission?.sale_amount || 0).toFixed(2)}`} />
              <DetailRow label="Comisión" value={`RD$ ${Number(modalState.commission?.commission_amount || 0).toFixed(2)}`} />
              <DetailRow label="Estado" value={modalState.commission?.status || "pendiente"} />
              <DetailRow label="Notas" value={modalState.commission?.notes || "Sin notas registradas."} />
            </div>
          </PatientModal>
        ) : null}
      </div>
    </AppLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value || "—"}</div>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  loadingCopy: { color: "#8A7B72", fontSize: 14, padding: "6px 0" },
  successBanner: { background: "#EAF6ED", border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  detailWrap: { display: "flex", flexDirection: "column", gap: 12 },
  detailRow: { background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 18, padding: 14 },
  detailLabel: { color: "#9C8E84", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  detailValue: { color: "#2A2522", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
};
