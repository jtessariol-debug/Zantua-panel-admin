import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Package, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import MainRevenueCard from "../components/dashboard/MainRevenueCard";
import MetricMiniCard from "../components/dashboard/MetricMiniCard";
import OperationsSummary from "../components/dashboard/OperationsSummary";
import UpcomingAppointmentsPanel from "../components/dashboard/UpcomingAppointmentsPanel";
import AppLayout from "../components/layout/AppLayout";
import EmptyState from "../components/ui/EmptyState";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import {
  fetchSupabaseAppointments,
  fetchSupabaseClients,
  fetchSupabaseSpecialists,
  getAppointmentStatusSummary,
  getTodayAppointments,
} from "../services/clinicData";
import { fetchFinanceDashboardMetrics, fetchInvoices } from "../services/finance";
import { fetchPatientGrowthOpportunities } from "../services/patientGrowth";

function formatCurrency(value) {
  return `RD$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildWeeklyIncome(invoices) {
  const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];
  const result = dayLabels.map((label) => ({ label, value: 0 }));
  const now = new Date();
  const startOfWindow = new Date(now);
  startOfWindow.setDate(now.getDate() - 6);
  startOfWindow.setHours(0, 0, 0, 0);

  (invoices || [])
    .filter((invoice) => invoice.payment_status === "pagada")
    .forEach((invoice) => {
      const invoiceDate = new Date(invoice.invoice_date || invoice.created_at || 0);
      if (Number.isNaN(invoiceDate.getTime()) || invoiceDate < startOfWindow) return;
      const dayIndex = invoiceDate.getDay();
      result[dayIndex === 0 ? 6 : dayIndex - 1].value += Number(invoice.total || 0);
    });

  return result;
}

function buildSpecialistPerformance({ appointments, invoices, specialists, isSpecialistView }) {
  const completedAppointments = (appointments || []).filter((item) => item.statusLabel === "completada");
  const paidInvoices = (invoices || []).filter((item) => item.payment_status === "pagada");
  const specialistNames = new Map((specialists || []).map((item) => [item.id, item.full_name]));
  const summaryMap = new Map();

  completedAppointments.forEach((appointment) => {
    const key = appointment.specialist_id || "unknown";
    const current = summaryMap.get(key) || {
      name: appointment.specialistLabel || specialistNames.get(key) || "Especialista",
      completedAppointments: 0,
      paidRevenue: 0,
    };
    current.completedAppointments += 1;
    summaryMap.set(key, current);
  });

  paidInvoices.forEach((invoice) => {
    const key = invoice.specialist_id || "unknown";
    const current = summaryMap.get(key) || {
      name: invoice.specialistLabel || specialistNames.get(key) || "Especialista",
      completedAppointments: 0,
      paidRevenue: 0,
    };
    current.paidRevenue += Number(invoice.total || 0);
    summaryMap.set(key, current);
  });

  const rows = Array.from(summaryMap.values()).sort((a, b) => {
    if (b.completedAppointments !== a.completedAppointments) {
      return b.completedAppointments - a.completedAppointments;
    }
    return b.paidRevenue - a.paidRevenue;
  });

  return isSpecialistView ? rows.slice(0, 1) : rows;
}

function getFirstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function getDashboardColumns(width) {
  if (width <= 768) {
    return {
      gridTemplateColumns: "1fr",
      span12: { gridColumn: "1 / -1" },
      span8: { gridColumn: "1 / -1" },
      span5: { gridColumn: "1 / -1" },
      span4: { gridColumn: "1 / -1" },
      span3: { gridColumn: "1 / -1" },
    };
  }

  if (width <= 1024) {
    return {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      span12: { gridColumn: "1 / -1" },
      span8: { gridColumn: "1 / -1" },
      span5: { gridColumn: "span 1" },
      span4: { gridColumn: "span 1" },
      span3: { gridColumn: "span 1" },
    };
  }

  return {
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    span12: { gridColumn: "span 12" },
    span8: { gridColumn: "span 8" },
    span5: { gridColumn: "span 5" },
    span4: { gridColumn: "span 4" },
    span3: { gridColumn: "span 3" },
  };
}

export default function Dashboard() {
  const { user, profile, isSpecialist } = useAuth();
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [financeMetrics, setFinanceMetrics] = useState({
    ingresosHoy: 0,
    ingresosSemana: 0,
    ingresosMes: 0,
    productosVendidos: 0,
    comisionesPendientes: 0,
    inventarioBajo: 0,
  });
  const [growthOpportunities, setGrowthOpportunities] = useState({});

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOperationalData() {
      const specialistId = isSpecialist ? profile?.specialist_id : null;
      const [appointmentsResult, specialistsResult, financeResult, invoicesResult] = await Promise.all([
        fetchSupabaseAppointments({ specialistId }),
        fetchSupabaseSpecialists({ specialistId }),
        fetchFinanceDashboardMetrics({ specialistId }),
        fetchInvoices({ specialistId }),
      ]);

      const visibleClientIds = [
        ...new Set((appointmentsResult || []).map((appointment) => appointment.client_id).filter(Boolean)),
      ];

      const clientsResult = await fetchSupabaseClients({
        clientIds: isSpecialist ? visibleClientIds : null,
      });

      if (!mounted) return;

      setAppointments(appointmentsResult || []);
      setSpecialists(specialistsResult || []);
      setInvoices(invoicesResult.invoices || []);
      setClients(clientsResult || []);
      setFinanceMetrics(financeResult);
    }

    loadOperationalData();

    return () => {
      mounted = false;
    };
  }, [isSpecialist, profile?.specialist_id, user?.uid]);

  useEffect(() => {
    let mounted = true;
    fetchPatientGrowthOpportunities()
      .then((data) => { if (mounted) setGrowthOpportunities(data || {}); })
      .catch((error) => console.error("No fue posible cargar oportunidades de pacientes", error));
    return () => { mounted = false; };
  }, [user?.uid]);

  const todayAppointments = useMemo(() => getTodayAppointments(appointments), [appointments]);
  const statusSummary = useMemo(() => getAppointmentStatusSummary(todayAppointments), [todayAppointments]);
  const weeklyIncome = useMemo(() => buildWeeklyIncome(invoices), [invoices]);
  const specialistPerformance = useMemo(
    () =>
      buildSpecialistPerformance({
        appointments,
        invoices,
        specialists,
        isSpecialistView: isSpecialist,
      }),
    [appointments, invoices, specialists, isSpecialist]
  );

  const patientsTodayCount = useMemo(() => {
    return new Set(
      todayAppointments
        .filter((appointment) => appointment.statusLabel === "completada")
        .map((appointment) => appointment.client_id)
        .filter(Boolean)
    ).size;
  }, [todayAppointments]);

  const sortedUpcomingAppointments = useMemo(() => {
    return [...todayAppointments]
      .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")))
      .slice(0, 5);
  }, [todayAppointments]);

  const appointmentsToConfirm = useMemo(() => {
    return todayAppointments.filter((appointment) => appointment.statusLabel === "pendiente").length;
  }, [todayAppointments]);

  const compactMetrics = [
    {
      title: "Citas de hoy",
      value: todayAppointments.length,
      description: `${statusSummary.confirmada || 0} confirmadas · ${statusSummary.pendiente || 0} pendientes`,
      icon: CalendarDays,
      accent: { background: "#EBF2EE", color: BRANDING.colors.primaryStrong },
    },
    {
      title: "Pacientes atendidos",
      value: patientsTodayCount,
      description: `${statusSummary.completada || 0} citas completadas hoy`,
      icon: Users,
      accent: { background: "#F1F4EF", color: BRANDING.colors.secondary },
    },
    {
      title: "Ingresos de hoy",
      value: formatCurrency(financeMetrics.ingresosHoy),
      description: "Facturas pagadas registradas en el día",
      icon: Sparkles,
      accent: { background: "#EEF3EF", color: BRANDING.colors.primaryStrong },
    },
    {
      title: "Productos vendidos",
      value: financeMetrics.productosVendidos,
      description: "Unidades facturadas en la jornada",
      icon: Package,
      accent: { background: "#F3F5F2", color: BRANDING.colors.secondary },
    },
  ];

  const maxStatusCount = Math.max(...Object.values(statusSummary || {}), 1);
  const maxSpecialistRevenue = Math.max(...specialistPerformance.map((item) => Number(item.paidRevenue || 0)), 1);
  const layout = getDashboardColumns(viewportWidth);

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={{ ...styles.dashboardGrid, gridTemplateColumns: layout.gridTemplateColumns }}>
          <div style={layout.span12}>
            <DashboardHeader
              firstName={getFirstName(profile?.name || profile?.full_name || user?.email)}
              onNewAppointment={() => navigate("/agenda")}
              onNewPatient={() => navigate("/patients")}
            />
          </div>

          <div style={layout.span12}>
            <SectionCard
              title="Oportunidades de seguimiento"
              subtitle="Pacientes y tareas identificados por la información disponible en el sistema."
              action={<button type="button" style={styles.linkButton} onClick={() => navigate("/patients/reactivation")}>Ver reactivación</button>}
            >
              <div style={styles.opportunityGrid}>
                <button type="button" style={styles.opportunityCard} onClick={() => navigate("/patients/reactivation")}>
                  <strong>{growthOpportunities.inactive_90_plus ?? 0}</strong><span>Pacientes con 90+ días sin visita</span>
                </button>
                <button type="button" style={styles.opportunityCard} onClick={() => navigate("/patients/followups")}>
                  <strong>{growthOpportunities.followups_due ?? 0}</strong><span>Seguimientos pendientes</span>
                </button>
              </div>
            </SectionCard>
          </div>

          {compactMetrics.map((metric) => (
            <div key={metric.title} style={layout.span3}>
              <MetricMiniCard {...metric} />
            </div>
          ))}

          <div style={layout.span8}>
            <MainRevenueCard
              todayValue={formatCurrency(financeMetrics.ingresosHoy)}
              weekValue={formatCurrency(financeMetrics.ingresosSemana)}
              monthValue={formatCurrency(financeMetrics.ingresosMes)}
              bars={weeklyIncome}
            />
          </div>

          <div style={layout.span4}>
            <UpcomingAppointmentsPanel
              appointments={sortedUpcomingAppointments}
              onOpenAgenda={() => navigate("/agenda")}
            />
          </div>

          <div style={layout.span5}>
            <SectionCard
              title={isSpecialist ? "Tu rendimiento" : "Citas por especialista"}
              subtitle={
                isSpecialist
                  ? "Citas completadas e ingresos cobrados."
                  : "Actividad consolidada por especialista."
              }
            >
              {specialistPerformance.length === 0 ? (
                <EmptyState
                  title="Sin rendimiento registrado"
                  description="Se mostrará cuando existan citas completadas y facturas pagadas."
                />
              ) : (
                <div style={styles.performanceTable}>
                  {specialistPerformance.map((item) => (
                    <div key={item.name} style={styles.performanceRow}>
                      <div style={styles.performanceName}>{item.name}</div>
                      <div style={styles.performanceMetric}>{item.completedAppointments} citas</div>
                      <div style={styles.performanceRevenueWrap}>
                        <span style={styles.performanceRevenue}>{formatCurrency(item.paidRevenue)}</span>
                        <div style={styles.progressTrack}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${Math.max(8, Math.min(100, (Number(item.paidRevenue || 0) / maxSpecialistRevenue) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div style={layout.span4}>
            <SectionCard title="Estados de citas" subtitle="Distribución actual de la agenda de hoy.">
              {Object.keys(statusSummary).length === 0 ? (
                <EmptyState
                  title="Sin estados para mostrar"
                  description="Cuando la agenda tenga citas, aparecerá su distribución por estado."
                />
              ) : (
                <div style={styles.statusStack}>
                  {Object.entries(statusSummary).map(([status, total]) => (
                    <div key={status} style={styles.statusRow}>
                      <div style={styles.statusHeader}>
                        <StatusBadge status={status} />
                        <span style={styles.statusCount}>{total}</span>
                      </div>
                      <div style={styles.statusTrack}>
                        <div
                          style={{
                            ...styles.statusFill,
                            width: `${Math.max(8, Math.min(100, (total / maxStatusCount) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div style={layout.span3}>
            <OperationsSummary
              inventoryLow={financeMetrics.inventarioBajo}
              appointmentsToConfirm={appointmentsToConfirm}
              pendingCommissions={financeMetrics.comisionesPendientes}
              onOpenInventory={() => navigate("/inventory")}
              onOpenAgenda={() => navigate("/agenda")}
              onOpenCommissions={() => navigate("/commissions")}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    maxWidth: 1440,
    margin: "0 auto",
  },
  opportunityGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  opportunityCard: { textAlign: "left", border: "1px solid #E7DCCB", borderRadius: 12, background: "#FFFDF8", padding: 16, display: "grid", gap: 5, cursor: "pointer", color: "#12382F" },
  linkButton: { border: 0, background: "transparent", color: "#12382F", fontWeight: 700, cursor: "pointer" },
  dashboardGrid: {
    display: "grid",
    gap: 18,
    alignItems: "start",
  },
  performanceTable: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  performanceRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) 90px minmax(140px, 1fr)",
    gap: 14,
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1px solid #EBEEEA",
  },
  performanceName: {
    color: BRANDING.colors.text,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.35,
  },
  performanceMetric: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    textAlign: "right",
  },
  performanceRevenueWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "flex-end",
  },
  performanceRevenue: {
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    fontSize: 14,
    fontVariantNumeric: "tabular-nums",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    background: "#E9EEEA",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: BRANDING.colors.primaryStrong,
  },
  statusStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  statusRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statusHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusCount: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 14,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  statusTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    background: "#E9EEEA",
    overflow: "hidden",
  },
  statusFill: {
    height: "100%",
    borderRadius: 999,
    background: BRANDING.colors.primaryStrong,
  },
};
