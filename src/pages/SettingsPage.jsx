import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import DashboardCard from "../components/ui/DashboardCard";
import SectionCard from "../components/ui/SectionCard";
import SettingsTabs from "../components/settings/SettingsTabs";
import IdentitySettingsCard from "../components/settings/IdentitySettingsCard";
import SchedulesSettings from "../components/settings/SchedulesSettings";
import CabinsSettings from "../components/settings/CabinsSettings";
import ServicesSettings from "../components/settings/ServicesSettings";
import EmployeesSettings from "../components/settings/EmployeesSettings";
import PayrollSettings from "../components/settings/PayrollSettings";
import SecuritySettings from "../components/settings/SecuritySettings";
import RulesSettings, {
  SettingsCheckbox,
  SettingsField,
  SettingsInput,
  SettingsSelect,
  SettingsTextarea,
} from "../components/settings/RulesSettings";
import {
  createEmployeeSettings,
  createPayrollPayment,
  createServiceSettings,
  fetchSettingsData,
  saveSystemSetting,
  setEmployeeInactive,
  updateCabinSettings,
  updateEmployeeSettings,
  updateServiceSettings,
  updateSpecialistSettings,
} from "../services/settings";
import { BRANDING } from "../lib/branding";
import { BadgeDollarSign, Building2, CalendarCog, DoorOpen, ReceiptText, ShieldCheck, Sparkles, UserCog, WalletCards, Warehouse } from "lucide-react";

const TABS = [
  { key: "identity", label: "Identidad del centro" },
  { key: "employees", label: "Empleados" },
  { key: "schedules", label: "Horarios" },
  { key: "cabins", label: "Cabinas" },
  { key: "services", label: "Servicios y precios" },
  { key: "billing", label: "Facturación" },
  { key: "commissions", label: "Comisiones" },
  { key: "inventory", label: "Inventario" },
  { key: "consent", label: "Consentimiento informado" },
  { key: "payroll", label: "Nómina" },
  { key: "security", label: "Seguridad y permisos" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("identity");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [data, setData] = useState({
    settings: {
      center_identity: {},
      scheduling_rules: {},
      billing_rules: {},
      commission_rules: {},
      inventory_rules: {},
      consent_rules: {},
      security_roles: {},
    },
    settingsPersistenceAvailable: false,
    specialists: [],
    cabins: [],
    services: [],
    employees: [],
    employeesPersistenceAvailable: false,
    payrollPayments: [],
    payrollPersistenceAvailable: false,
  });

  async function loadSettings() {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const result = await fetchSettingsData();
      setData(result);
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible cargar la configuración." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const metrics = useMemo(() => ([
    {
      title: "Especialistas activas",
      value: data.specialists.filter((item) => item.active !== false).length,
      description: "Disponibilidad operativa visible para agenda y seguimiento clínico.",
      icon: UserCog,
      accent: { background: "#EAF3EE", color: BRANDING.colors.primaryStrong },
    },
    {
      title: "Cabinas activas",
      value: data.cabins.filter((item) => item.active !== false).length,
      description: "Cabinas listas para agenda diaria y asignación de servicios.",
      icon: DoorOpen,
      accent: { background: "#EEF3EC", color: BRANDING.colors.secondary },
    },
    {
      title: "Servicios activos",
      value: data.services.filter((item) => item.active !== false).length,
      description: "Servicios disponibles para facturación y programación.",
      icon: Sparkles,
      accent: { background: "#F3EBDD", color: "#9A774A" },
    },
    {
      title: "Empleados registrados",
      value: data.employees.length,
      description: "Registro interno para altas, bajas y seguimiento administrativo.",
      icon: Building2,
      accent: { background: "#E4F2EA", color: BRANDING.colors.secondary },
    },
  ]), [data]);

  async function persistSetting(settingKey, value, successMessage) {
    setSavingKey(settingKey);
    setFeedback({ type: "", message: "" });
    try {
      await saveSystemSetting(settingKey, value);
      setData((current) => ({
        ...current,
        settings: {
          ...current.settings,
          [settingKey]: value,
        },
      }));
      setFeedback({ type: "success", message: successMessage });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible guardar la configuración." });
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateSpecialist(id, payload) {
    setSavingKey(id);
    setFeedback({ type: "", message: "" });
    try {
      const updated = await updateSpecialistSettings(id, payload);
      setData((current) => ({
        ...current,
        specialists: current.specialists.map((item) => (item.id === id ? updated : item)),
      }));
      setFeedback({ type: "success", message: "Especialista actualizada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar la especialista." });
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateCabin(id, payload) {
    setSavingKey(id);
    setFeedback({ type: "", message: "" });
    try {
      const updated = await updateCabinSettings(id, payload);
      setData((current) => ({
        ...current,
        cabins: current.cabins.map((item) => (item.id === id ? updated : item)),
      }));
      setFeedback({ type: "success", message: "Cabina actualizada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar la cabina." });
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateService(payload) {
    setSavingKey("service");
    setFeedback({ type: "", message: "" });
    try {
      const created = await createServiceSettings(payload);
      setData((current) => ({ ...current, services: [...current.services, created].sort((a, b) => (a.name || "").localeCompare(b.name || "")) }));
      setFeedback({ type: "success", message: "Servicio creado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible crear el servicio." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateService(id, payload) {
    setSavingKey("service");
    setFeedback({ type: "", message: "" });
    try {
      const updated = await updateServiceSettings(id, payload);
      setData((current) => ({
        ...current,
        services: current.services.map((item) => (item.id === id ? updated : item)),
      }));
      setFeedback({ type: "success", message: "Servicio actualizado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar el servicio." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateEmployee(payload) {
    setSavingKey("employee");
    setFeedback({ type: "", message: "" });
    try {
      const created = await createEmployeeSettings(payload);
      setData((current) => ({ ...current, employees: [...current.employees, created].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")) }));
      setFeedback({ type: "success", message: "Empleado creado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible crear el empleado." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateEmployee(id, payload) {
    setSavingKey("employee");
    setFeedback({ type: "", message: "" });
    try {
      const updated = await updateEmployeeSettings(id, payload);
      setData((current) => ({
        ...current,
        employees: current.employees.map((item) => (item.id === id ? updated : item)),
      }));
      setFeedback({ type: "success", message: "Empleado actualizado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar el empleado." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleDeactivateEmployee(id) {
    setSavingKey(id);
    setFeedback({ type: "", message: "" });
    try {
      const updated = await setEmployeeInactive(id);
      setData((current) => ({
        ...current,
        employees: current.employees.map((item) => (item.id === id ? updated : item)),
      }));
      setFeedback({ type: "success", message: "Empleado dado de baja correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible dar de baja al empleado." });
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreatePayroll(payload) {
    setSavingKey("payroll");
    setFeedback({ type: "", message: "" });
    try {
      const created = await createPayrollPayment(payload);
      setData((current) => ({ ...current, payrollPayments: [created, ...current.payrollPayments] }));
      setFeedback({ type: "success", message: "Pago de nómina registrado correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible registrar el pago." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  function renderActiveSection() {
    switch (activeTab) {
      case "identity":
        return (
          <IdentitySettingsCard
            value={data.settings.center_identity}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSave={(value) => persistSetting("center_identity", value, "Identidad del centro guardada correctamente.")}
            saving={savingKey === "center_identity"}
          />
        );
      case "employees":
        return (
          <EmployeesSettings
            employees={data.employees}
            specialists={data.specialists.filter((item) => item.active !== false)}
            persistenceAvailable={data.employeesPersistenceAvailable}
            onCreate={handleCreateEmployee}
            onSave={handleUpdateEmployee}
            onDeactivate={handleDeactivateEmployee}
            saving={savingKey === "employee"}
          />
        );
      case "schedules":
        return (
          <SchedulesSettings
            specialists={data.specialists}
            rules={data.settings.scheduling_rules}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSaveRules={(value) => persistSetting("scheduling_rules", value, "Reglas generales de horarios guardadas correctamente.")}
            onSaveSpecialist={handleUpdateSpecialist}
            savingRules={savingKey === "scheduling_rules"}
            savingSpecialistId={savingKey}
          />
        );
      case "cabins":
        return <CabinsSettings cabins={data.cabins} onSave={handleUpdateCabin} saving={Boolean(savingKey && savingKey !== "")} />;
      case "services":
        return <ServicesSettings services={data.services} onCreate={handleCreateService} onSave={handleUpdateService} saving={savingKey === "service"} />;
      case "billing":
        return (
          <RulesSettings
            title="Facturación"
            subtitle="Moneda, métodos de pago, estado inicial y parámetros de comprobantes."
            value={data.settings.billing_rules}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSave={(value) => persistSetting("billing_rules", value, "Configuración de facturación guardada correctamente.")}
            saving={savingKey === "billing_rules"}
            renderFields={(form, setForm) => (
              <>
                <SettingsField label="Moneda"><SettingsInput value={form.currency || "RD$"} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} /></SettingsField>
                <SettingsField label="Estado inicial">
                  <SettingsSelect value={form.default_invoice_status || "pagada"} onChange={(event) => setForm((current) => ({ ...current, default_invoice_status: event.target.value }))}>
                    <option value="pagada">Pagada</option>
                    <option value="pendiente">Pendiente</option>
                  </SettingsSelect>
                </SettingsField>
                <SettingsField label="Prefijo de factura"><SettingsInput value={form.invoice_prefix || "ZAN-"} onChange={(event) => setForm((current) => ({ ...current, invoice_prefix: event.target.value }))} /></SettingsField>
                <SettingsField label="Descuento máximo (%)"><SettingsInput type="number" min="0" max="100" value={form.max_discount_percentage || 0} onChange={(event) => setForm((current) => ({ ...current, max_discount_percentage: Number(event.target.value || 0) }))} /></SettingsField>
                <SettingsField label="Métodos de pago" full>
                  <SettingsTextarea value={(form.payment_methods || []).join(", ")} onChange={(event) => setForm((current) => ({ ...current, payment_methods: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
                </SettingsField>
                <div style={styles.checkboxRow}>
                  <SettingsCheckbox checked={Boolean(form.show_logo_on_receipts)} onChange={(event) => setForm((current) => ({ ...current, show_logo_on_receipts: event.target.checked }))} label="Mostrar logo en recibos y PDF" />
                </div>
              </>
            )}
          />
        );
      case "commissions":
        return (
          <RulesSettings
            title="Comisiones"
            subtitle="Reglas por defecto para productos, servicios y control manual."
            value={data.settings.commission_rules}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSave={(value) => persistSetting("commission_rules", value, "Reglas de comisiones guardadas correctamente.")}
            saving={savingKey === "commission_rules"}
            renderFields={(form, setForm) => (
              <>
                <SettingsField label="Comisión productos (%)"><SettingsInput type="number" min="0" max="100" value={form.product_default_percentage || 0} onChange={(event) => setForm((current) => ({ ...current, product_default_percentage: Number(event.target.value || 0) }))} /></SettingsField>
                <SettingsField label="Comisión servicios (%)"><SettingsInput type="number" min="0" max="100" value={form.service_default_percentage || 0} onChange={(event) => setForm((current) => ({ ...current, service_default_percentage: Number(event.target.value || 0) }))} /></SettingsField>
                <SettingsField label="Estado inicial">
                  <SettingsSelect value={form.default_status || "pendiente"} onChange={(event) => setForm((current) => ({ ...current, default_status: event.target.value }))}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagada">Pagada</option>
                    <option value="cancelada">Cancelada</option>
                  </SettingsSelect>
                </SettingsField>
                <div style={styles.checkboxRow}>
                  <SettingsCheckbox checked={Boolean(form.automatic_commissions)} onChange={(event) => setForm((current) => ({ ...current, automatic_commissions: event.target.checked }))} label="Activar comisión automática" />
                  <SettingsCheckbox checked={Boolean(form.manual_commissions)} onChange={(event) => setForm((current) => ({ ...current, manual_commissions: event.target.checked }))} label="Permitir comisión manual" />
                </div>
              </>
            )}
          />
        );
      case "inventory":
        return (
          <RulesSettings
            title="Inventario"
            subtitle="Alertas, unidades de medida y reglas operativas del stock."
            value={data.settings.inventory_rules}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSave={(value) => persistSetting("inventory_rules", value, "Configuración de inventario guardada correctamente.")}
            saving={savingKey === "inventory_rules"}
            renderFields={(form, setForm) => (
              <>
                <SettingsField label="Stock mínimo global"><SettingsInput type="number" min="0" value={form.global_min_stock || 0} onChange={(event) => setForm((current) => ({ ...current, global_min_stock: Number(event.target.value || 0) }))} /></SettingsField>
                <SettingsField label="Categorías de productos" full><SettingsTextarea value={(form.product_categories || []).join(", ")} onChange={(event) => setForm((current) => ({ ...current, product_categories: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></SettingsField>
                <SettingsField label="Categorías de insumos" full><SettingsTextarea value={(form.supply_categories || []).join(", ")} onChange={(event) => setForm((current) => ({ ...current, supply_categories: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></SettingsField>
                <SettingsField label="Unidades de medida" full><SettingsTextarea value={(form.units || []).join(", ")} onChange={(event) => setForm((current) => ({ ...current, units: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></SettingsField>
                <div style={styles.checkboxRow}>
                  <SettingsCheckbox checked={Boolean(form.low_stock_alert_enabled)} onChange={(event) => setForm((current) => ({ ...current, low_stock_alert_enabled: event.target.checked }))} label="Activar alerta de stock bajo" />
                  <SettingsCheckbox checked={Boolean(form.allow_negative_stock)} onChange={(event) => setForm((current) => ({ ...current, allow_negative_stock: event.target.checked }))} label="Permitir stock negativo" />
                </div>
              </>
            )}
          />
        );
      case "consent":
        return (
          <RulesSettings
            title="Consentimiento informado"
            subtitle="Controla versión, texto base y requisitos previos al firmado."
            value={data.settings.consent_rules}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSave={(value) => persistSetting("consent_rules", value, "Configuración de consentimiento guardada correctamente.")}
            saving={savingKey === "consent_rules"}
            renderFields={(form, setForm) => (
              <>
                <SettingsField label="Versión"><SettingsInput value={form.version || "v1"} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /></SettingsField>
                <SettingsField label="Texto base" full><SettingsTextarea value={form.base_text || ""} onChange={(event) => setForm((current) => ({ ...current, base_text: event.target.value }))} /></SettingsField>
                <div style={styles.checkboxRow}>
                  <SettingsCheckbox checked={Boolean(form.requires_signature)} onChange={(event) => setForm((current) => ({ ...current, requires_signature: event.target.checked }))} label="Requiere firma" />
                  <SettingsCheckbox checked={Boolean(form.requires_national_id)} onChange={(event) => setForm((current) => ({ ...current, requires_national_id: event.target.checked }))} label="Requiere cédula" />
                  <SettingsCheckbox checked={Boolean(form.requires_clinical_history_before_signing)} onChange={(event) => setForm((current) => ({ ...current, requires_clinical_history_before_signing: event.target.checked }))} label="Requiere historial clínico previo" />
                  <SettingsCheckbox checked={Boolean(form.show_logo_in_pdf)} onChange={(event) => setForm((current) => ({ ...current, show_logo_in_pdf: event.target.checked }))} label="Mostrar logo en PDF" />
                  <SettingsCheckbox checked={Boolean(form.show_address_in_pdf)} onChange={(event) => setForm((current) => ({ ...current, show_address_in_pdf: event.target.checked }))} label="Mostrar dirección en PDF" />
                </div>
              </>
            )}
          />
        );
      case "payroll":
        return (
          <PayrollSettings
            rows={data.payrollPayments}
            employees={data.employees}
            specialists={data.specialists}
            persistenceAvailable={data.payrollPersistenceAvailable}
            onCreate={handleCreatePayroll}
            saving={savingKey === "payroll"}
          />
        );
      case "security":
        return <SecuritySettings roles={data.settings.security_roles} />;
      default:
        return null;
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Configuración</h1>
            <p style={styles.subtitle}>Centro administrativo del negocio para identidad, operación clínica, reglas financieras y seguridad visual.</p>
          </div>
        </div>

        <div style={styles.metricsGrid}>
          {metrics.map((metric) => <DashboardCard key={metric.title} {...metric} />)}
        </div>

        {feedback.message ? (
          <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
            {feedback.message}
          </div>
        ) : null}

        <SectionCard
          title="Panel de configuración"
          subtitle="Gestiona los parámetros operativos del centro sin afectar la experiencia principal del sistema."
          action={<SettingsTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />}
        >
          {loading ? (
            <div style={styles.loadingCopy}>Cargando configuración...</div>
          ) : (
            renderActiveSection()
          )}
        </SectionCard>

        <SectionCard title="Contexto operativo" subtitle="Resumen de las áreas administrativas cubiertas por esta pantalla.">
          <div style={styles.operationalGrid}>
            <OperationalHint title="Horarios y agenda" description="Las especialistas ahora pueden administrar disponibilidad real desde Supabase y la agenda consumirá esa configuración." icon={<CalendarCog size={18} />} />
            <OperationalHint title="Facturación" description="Los parámetros de factura se dejan listos para persistencia sin tocar el módulo de ventas actual." icon={<ReceiptText size={18} />} />
            <OperationalHint title="Comisiones y nómina" description="La pantalla ya prepara reglas y pagos, pero la creación de usuarios de acceso sigue separada por seguridad." icon={<BadgeDollarSign size={18} />} />
            <OperationalHint title="Inventario y seguridad" description="Las reglas globales de stock y permisos quedan centralizadas, sin duplicar lógica sensible en frontend." icon={<ShieldCheck size={18} />} />
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}

function OperationalHint({ icon, title, description }) {
  return (
    <div style={styles.hintCard}>
      <div style={styles.hintIcon}>{icon}</div>
      <div style={styles.hintTitle}>{title}</div>
      <div style={styles.hintDescription}>{description}</div>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" },
  title: { color: BRANDING.colors.primaryStrong, fontSize: 34, fontWeight: 700, margin: 0 },
  subtitle: { color: BRANDING.colors.textMuted, fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  successBanner: { background: "#EAF6ED", border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14, padding: "6px 0" },
  checkboxRow: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 12 },
  operationalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  hintCard: { background: "#FCFAF4", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 20, padding: 18 },
  hintIcon: { width: 40, height: 40, borderRadius: 14, background: BRANDING.colors.primarySoft, color: BRANDING.colors.primaryStrong, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  hintTitle: { color: BRANDING.colors.primaryStrong, fontSize: 16, fontWeight: 700 },
  hintDescription: { color: BRANDING.colors.textMuted, fontSize: 13, lineHeight: 1.6, marginTop: 8 },
};
