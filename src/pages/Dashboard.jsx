import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeDollarSign,
  CalendarDays,
  Package,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import BrandMark from "../components/ui/BrandMark";
import DashboardCard from "../components/ui/DashboardCard";
import DataTable from "../components/ui/DataTable";
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
  getAppointmentsBySpecialist,
  getTodayAppointments,
  getWeeklyIncomeSummary,
  mapSpecialistAvailability,
} from "../services/clinicData";
import { fetchFinanceDashboardMetrics } from "../services/finance";

function isSameLocalDay(timestamp, referenceDate = new Date()) {
  if (!timestamp) return false;
  const value = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(value.getTime())) return false;
  return (
    value.getFullYear() === referenceDate.getFullYear()
    && value.getMonth() === referenceDate.getMonth()
    && value.getDate() === referenceDate.getDate()
  );
}

function getLastClientActivity(client) {
  const value = client.created_at || client.createdAt || null;
  if (value) {
    const parsed = value?.toDate ? value.toDate() : new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }
  }
  return "Sin citas todavia";
}

export default function Dashboard() {
  const { user, profile, isSpecialist } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [financeMetrics, setFinanceMetrics] = useState({
    ingresosHoy: 0,
    ingresosSemana: 0,
    ingresosMes: 0,
    productosVendidos: 0,
    comisionesPendientes: 0,
    inventarioBajo: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function loadOperationalData() {
      setLoadingAppointments(true);

      const specialistId = isSpecialist ? profile?.specialist_id : null;
      const [appointmentsResult, specialistsResult, financeResult] = await Promise.all([
        fetchSupabaseAppointments({ specialistId }),
        fetchSupabaseSpecialists({ specialistId }),
        fetchFinanceDashboardMetrics({ specialistId }),
      ]);

      const visibleClientIds = [...new Set((appointmentsResult || []).map((appointment) => appointment.client_id).filter(Boolean))];
      const clientsResult = await fetchSupabaseClients({
        clientIds: isSpecialist ? visibleClientIds : null,
      });

      if (!mounted) return;

      setAppointments(appointmentsResult);
      setSpecialists(specialistsResult);
      setClients(clientsResult);
      setFinanceMetrics(financeResult);
      setLoadingAppointments(false);
    }

    loadOperationalData();

    return () => {
      mounted = false;
    };
  }, [isSpecialist, profile?.specialist_id, user?.uid]);

  const todayAppointments = useMemo(() => getTodayAppointments(appointments), [appointments]);
  const statusSummary = useMemo(() => getAppointmentStatusSummary(todayAppointments), [todayAppointments]);
  const specialistSummary = useMemo(() => getAppointmentsBySpecialist(todayAppointments), [todayAppointments]);
  const weeklyIncome = useMemo(() => getWeeklyIncomeSummary(appointments), [appointments]);
  const specialistsOverview = useMemo(() => mapSpecialistAvailability(specialists, appointments), [specialists, appointments]);
  const patientsTodayCount = useMemo(() => {
    if (isSpecialist) {
      return new Set(todayAppointments.map((appointment) => appointment.client_id).filter(Boolean)).size;
    }

    return clients.filter((client) => isSameLocalDay(client.created_at || client.createdAt)).length;
  }, [clients, isSpecialist, todayAppointments]);

  const dashboardMetrics = [
    {
      title: "Pacientes hoy",
      value: patientsTodayCount,
      description: isSpecialist
        ? "Pacientes atendidos o agendados en tu jornada."
        : "Pacientes registrados o atendidos durante la jornada.",
      icon: Users,
      accent: { background: "#EAF3EE", color: BRANDING.colors.primaryStrong },
    },
    {
      title: "Citas hoy",
      value: todayAppointments.length,
      description: isSpecialist ? "Tu agenda operativa del dia actual." : "Agenda operativa prevista para el dia actual.",
      icon: CalendarDays,
      accent: { background: "#EEF3EC", color: BRANDING.colors.secondary },
    },
    {
      title: "Ingresos hoy",
      value: `$${financeMetrics.ingresosHoy.toLocaleString()}`,
      description: `Semana: $${financeMetrics.ingresosSemana.toLocaleString()} | Mes: $${financeMetrics.ingresosMes.toLocaleString()}`,
      icon: WalletCards,
      accent: { background: "#E4F2EA", color: BRANDING.colors.secondary },
    },
    {
      title: "Productos vendidos",
      value: financeMetrics.productosVendidos,
      description: "Unidades vendidas desde las facturas registradas.",
      icon: Package,
      accent: { background: "#F3EBDD", color: "#9A774A" },
    },
    {
      title: "Comisiones pendientes",
      value: `$${financeMetrics.comisionesPendientes.toLocaleString()}`,
      description: "Monto pendiente por liquidar.",
      icon: BadgeDollarSign,
      accent: { background: "#F2E6E6", color: "#8C4F5F" },
    },
    {
      title: "Inventario bajo",
      value: financeMetrics.inventarioBajo,
      description: "Productos o insumos por debajo del minimo definido.",
      icon: AlertCircle,
      accent: { background: "#F8E6E8", color: "#B54B57" },
    },
  ];

  const appointmentColumns = [
    { key: "displayTime", label: "Hora" },
    { key: "patientLabel", label: "Paciente" },
    { key: "specialistLabel", label: "Especialista" },
    { key: "serviceLabel", label: "Servicio" },
    { key: "cabinLabel", label: "Cabina" },
    {
      key: "statusLabel",
      label: "Estado",
      render: (row) => <StatusBadge status={row.statusLabel} />,
    },
  ];

  const patientColumns = [
    {
      key: "name",
      label: "Nombre",
      render: (row) => (
        <div>
          <div style={styles.cellTitle}>{row.name}</div>
          <div style={styles.cellSub}>{row.email || "Sin correo registrado"}</div>
        </div>
      ),
    },
    { key: "phone", label: "Telefono" },
    {
      key: "lastVisit",
      label: "Ultima cita",
      render: (row) => getLastClientActivity(row),
    },
    {
      key: "status",
      label: "Estado",
      render: () => <StatusBadge status="confirmada" />,
    },
  ];

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <div style={styles.brandInline}>
              <BrandMark size={44} corner={14} />
              <div>
                <div style={styles.brandName}>{BRANDING.centerName}</div>
                <div style={styles.brandAddress}>{BRANDING.centerAddress}</div>
              </div>
            </div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>
              {isSpecialist ? "Resumen operativo de tu jornada y produccion personal." : "Vista general del centro estetico"}
            </p>
          </div>

          <div style={styles.headerActions}>
            <button type="button" onClick={() => navigate("/agenda")} style={styles.secondaryButton}>
              + Nueva cita
            </button>
            <button type="button" onClick={() => navigate("/patients")} style={styles.primaryButton}>
              + Nuevo paciente
            </button>
          </div>
        </div>

        <div style={styles.metricsGrid}>
          {dashboardMetrics.map((metric) => (
            <DashboardCard key={metric.title} {...metric} />
          ))}
        </div>

        <div style={styles.analyticsGrid}>
          <SectionCard title="Ingresos semanales" subtitle="Visualizacion rapida del comportamiento de ingresos disponibles.">
            <div style={styles.chartList}>
              {weeklyIncome.map((item) => (
                <div key={item.label} style={styles.chartRow}>
                  <div style={styles.chartLabel}>{item.label}</div>
                  <div style={styles.chartTrack}>
                    <div
                      style={{
                        ...styles.chartFill,
                        width: `${Math.max(10, Math.min(100, item.value === 0 ? 10 : item.value))}%`,
                      }}
                    />
                  </div>
                  <div style={styles.chartValue}>${item.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={isSpecialist ? "Tus citas" : "Citas por especialista"}
            subtitle={isSpecialist ? "Distribucion de tu agenda actual." : "Distribucion operativa de la agenda de hoy."}
          >
            {Object.keys(specialistSummary).length === 0 ? (
              <EmptyState
                title="Sin citas registradas"
                description="Cuando existan citas programadas, aqui veras la carga diaria disponible."
              />
            ) : (
              <div style={styles.chartList}>
                {Object.entries(specialistSummary).map(([name, total]) => (
                  <div key={name} style={styles.chartRow}>
                    <div style={styles.chartLabelWide}>{name}</div>
                    <div style={styles.chartTrack}>
                      <div style={{ ...styles.chartFill, width: `${Math.min(100, total * 18)}%`, background: `linear-gradient(135deg, ${BRANDING.colors.secondary}, ${BRANDING.colors.primaryStrong})` }} />
                    </div>
                    <div style={styles.chartValue}>{total}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Estados de citas" subtitle="Resumen visual del estado de la agenda actual.">
            {Object.keys(statusSummary).length === 0 ? (
              <EmptyState
                title="Sin estados para mostrar"
                description="Cuando la agenda tenga citas, veras la proporcion por estado en este panel."
              />
            ) : (
              <div style={styles.statusStack}>
                {Object.entries(statusSummary).map(([status, total]) => (
                  <div key={status} style={styles.statusRow}>
                    <div style={styles.statusInfo}>
                      <StatusBadge status={status} />
                    </div>
                    <div style={styles.statusCount}>{total}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div style={styles.contentGrid}>
          <SectionCard title="Proximas citas" subtitle="Seguimiento de la agenda operativa del dia.">
            {loadingAppointments ? (
              <div style={styles.loadingCopy}>Cargando citas del dia...</div>
            ) : (
              <DataTable
                columns={appointmentColumns}
                rows={todayAppointments}
                emptyState={(
                  <EmptyState
                    title="No hay citas programadas para hoy."
                    description="Cuando se registren citas en la agenda, apareceran aqui con su cabina, servicio y estado."
                  />
                )}
              />
            )}
          </SectionCard>

          <SectionCard title="Pacientes recientes" subtitle="Ultimos registros visibles para tu sesion.">
            <DataTable
              columns={patientColumns}
              rows={clients.slice(0, 6)}
              onRowClick={(row) => navigate(`/client/${row.id}`)}
              emptyState={(
                <EmptyState
                  title="No hay pacientes registrados todavia."
                  description="A medida que se registren pacientes en el sistema, los veras listados aqui."
                />
              )}
            />
          </SectionCard>
        </div>

        <SectionCard
          title={isSpecialist ? "Tu disponibilidad" : "Especialistas"}
          subtitle={isSpecialist ? "Resumen de tu horario y carga de trabajo del dia actual." : "Resumen de horarios y carga de trabajo del dia actual."}
        >
          <div style={styles.specialistsGrid}>
            {specialistsOverview.map((specialist) => (
              <div key={specialist.id || specialist.full_name} style={styles.specialistCard}>
                <div style={styles.specialistTop}>
                  <div>
                    <div style={styles.specialistName}>{specialist.full_name}</div>
                    <div style={styles.specialistSchedule}>{specialist.schedule}</div>
                  </div>
                  <div style={{ ...styles.specialistDot, background: specialist.isAvailable ? "#DFF2E5" : "#FCE5E8", color: specialist.isAvailable ? "#26714B" : "#B54B57" }}>
                    {specialist.isAvailable ? "Disponible" : "Ocupada"}
                  </div>
                </div>

                <div style={styles.specialistStats}>
                  <div>
                    <div style={styles.specialistLabel}>Citas del dia</div>
                    <div style={styles.specialistValue}>{specialist.appointmentsToday}</div>
                  </div>
                  <div>
                    <div style={styles.specialistLabel}>Modulo</div>
                    <div style={styles.specialistValueSmall}>Laser / clinica</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    flexWrap: "wrap",
  },
  brandInline: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  brandName: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 15,
    fontWeight: 700,
  },
  brandAddress: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 34,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 15,
    lineHeight: 1.6,
    margin: "8px 0 0",
  },
  headerActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`,
    color: BRANDING.colors.white,
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: BRANDING.colors.white,
    color: BRANDING.colors.primaryStrong,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
    gap: 16,
  },
  chartList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  chartRow: {
    display: "grid",
    gridTemplateColumns: "42px 1fr auto",
    gap: 12,
    alignItems: "center",
  },
  chartLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    fontWeight: 700,
  },
  chartLabelWide: {
    color: "#6E625B",
    fontSize: 13,
    fontWeight: 600,
    width: 110,
  },
  chartTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "#EFE6D9",
    overflow: "hidden",
  },
  chartFill: {
    height: "100%",
    borderRadius: 999,
    background: `linear-gradient(135deg, ${BRANDING.colors.secondary}, ${BRANDING.colors.primaryStrong})`,
  },
  chartValue: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 13,
    fontWeight: 700,
  },
  statusStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #F3ECE6",
  },
  statusInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  statusCount: {
    color: "#2A2522",
    fontSize: 18,
    fontWeight: 700,
  },
  loadingCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    padding: "6px 0",
  },
  cellTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 14,
    fontWeight: 700,
  },
  cellSub: {
    color: "#8B7E74",
    fontSize: 12,
    marginTop: 4,
  },
  specialistsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 16,
  },
  specialistCard: {
    background: "#FCFAF4",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 20,
    padding: 18,
  },
  specialistTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  specialistName: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 16,
    fontWeight: 700,
  },
  specialistSchedule: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  specialistDot: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  specialistStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 18,
  },
  specialistLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  specialistValue: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 28,
    fontWeight: 700,
    marginTop: 8,
  },
  specialistValueSmall: {
    color: BRANDING.colors.secondary,
    fontSize: 14,
    fontWeight: 600,
    marginTop: 10,
  },
};
