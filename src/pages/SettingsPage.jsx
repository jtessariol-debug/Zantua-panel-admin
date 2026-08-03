import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Building2,
  CalendarCog,
  DoorOpen,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserCog,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import CabinsSettings from "../components/settings/CabinsSettings";
import EmployeesSettings from "../components/settings/EmployeesSettings";
import IdentitySettingsCard from "../components/settings/IdentitySettingsCard";
import PayrollSettings from "../components/settings/PayrollSettings";
import RulesSettings, {
  SettingsCheckbox,
  SettingsField,
  SettingsInput,
  SettingsSelect,
  SettingsTextarea,
} from "../components/settings/RulesSettings";
import SchedulesSettings from "../components/settings/SchedulesSettings";
import SecuritySettings from "../components/settings/SecuritySettings";
import ServiceOffersSettings from "../components/settings/ServiceOffersSettings";
import ServicesSettings from "../components/settings/ServicesSettings";
import SettingsTabs from "../components/settings/SettingsTabs";
import DashboardCard from "../components/ui/DashboardCard";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import {
  createCabinSettings,
  createEmployeeSettings,
  createMissingEmployeeRecords,
  createServiceOfferSettings,
  createServiceSettings,
  fetchSettingsData,
  getOperationalSpecialists,
  saveSystemSetting,
  setEmployeeInactive,
  updateCabinSettings,
  updateEmployeeSettings,
  updateServiceOfferSettings,
  updateServiceSettings,
  updateSpecialistSettings,
} from "../services/settings";

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
  const { profile, isAdmin } = useAuth();
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
    serviceOffers: [],
    employees: [],
    teamRows: [],
    teamProfiles: [],
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
      setFeedback({
        type: "error",
        message: error.message || "No fue posible cargar la configuración.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const operationalSpecialists = useMemo(
    () => getOperationalSpecialists(data.specialists),
    [data.specialists]
  );

  const metrics = useMemo(() => ([
    {
      title: "Especialistas activas",
      value: operationalSpecialists.length,
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
      title: "Equipo consolidado",
      value: data.teamRows.length,
      description: "Vista administrativa consolidada entre empleados, especialistas y accesos.",
      icon: Building2,
      accent: { background: "#E4F2EA", color: BRANDING.colors.secondary },
    },
  ]), [data, operationalSpecialists]);

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
      setFeedback({
        type: "error",
        message: error.message || "No fue posible guardar la configuración.",
      });
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateSpecialist(id, payload) {
    setSavingKey(id);
    setFeedback({ type: "", message: "" });
    try {
      const updated = await updateSpecialistSettings(id, payload, profile);
      setData((current) => ({
        ...current,
        specialists: current.specialists.map((item) => (item.id === id ? updated : item)),
      }));
      await loadSettings();
      setFeedback({ type: "success", message: "Horario actualizado correctamente." });
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
      const updated = await updateCabinSettings(id, payload, profile);
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

  async function handleCreateCabin(payload) {
    setSavingKey("cabin");
    setFeedback({ type: "", message: "" });
    try {
      const created = await createCabinSettings(payload, profile);
      setData((current) => ({
        ...current,
        cabins: [...current.cabins, created].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      }));
      setFeedback({ type: "success", message: "Cabina creada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible crear la cabina." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateService(payload) {
    setSavingKey("service");
    setFeedback({ type: "", message: "" });
    try {
      const created = await createServiceSettings(payload, profile);
      setData((current) => ({
        ...current,
        services: [...current.services, created].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      }));
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
      const updated = await updateServiceSettings(id, payload, profile);
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

  async function handleCreateServiceOffer(payload) {
    setSavingKey("service-offer");
    setFeedback({ type: "", message: "" });
    try {
      const created = await createServiceOfferSettings(payload, profile);
      setData((current) => ({
        ...current,
        serviceOffers: [created, ...current.serviceOffers],
      }));
      setFeedback({ type: "success", message: "Oferta creada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible crear la oferta." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateServiceOffer(id, payload) {
    setSavingKey("service-offer");
    setFeedback({ type: "", message: "" });
    try {
      const updated = await updateServiceOfferSettings(id, payload, profile);
      setData((current) => ({
        ...current,
        serviceOffers: current.serviceOffers.map((item) => (item.id === id ? updated : item)),
      }));
      setFeedback({ type: "success", message: "Oferta actualizada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar la oferta." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateEmployee(payload) {
    setSavingKey("employee");
    setFeedback({ type: "", message: "" });
    try {
      await createEmployeeSettings(payload, profile);
      await loadSettings();
      setFeedback({ type: "success", message: "Ficha administrativa creada correctamente." });
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
      await updateEmployeeSettings(id, payload, profile);
      await loadSettings();
      setFeedback({ type: "success", message: "Ficha administrativa actualizada correctamente." });
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
      await setEmployeeInactive(id, profile);
      await loadSettings();
      setFeedback({ type: "success", message: "Ficha administrativa dada de baja correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible dar de baja al empleado." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleReactivateEmployee(id, row) {
    setSavingKey(id);
    setFeedback({ type: "", message: "" });
    try {
      await updateEmployeeSettings(id, {
        ...row,
        status: "activo",
        termination_date: null,
      }, profile);
      await loadSettings();
      setFeedback({ type: "success", message: "Ficha administrativa reactivada correctamente." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible reactivar el empleado." });
      throw error;
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateMissingEmployees() {
    setSavingKey("employee-missing");
    setFeedback({ type: "", message: "" });
    try {
      const result = await createMissingEmployeeRecords(profile);
      await loadSettings();
      if ((result.created || []).length) {
        setFeedback({
          type: "success",
          message: `Se crearon ${result.created.length} fichas administrativas pendientes.`,
        });
      } else {
        setFeedback({
          type: "success",
          message: "No había fichas administrativas pendientes por crear.",
        });
      }
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible crear las fichas pendientes." });
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
            rows={data.teamRows}
            specialists={operationalSpecialists}
            onCreate={handleCreateEmployee}
            onSave={handleUpdateEmployee}
            onDeactivate={handleDeactivateEmployee}
            onReactivate={handleReactivateEmployee}
            onCreateMissing={handleCreateMissingEmployees}
            saving={savingKey === "employee" || savingKey === "employee-missing" || Boolean(savingKey && savingKey !== "")}
            isAdmin={isAdmin}
          />
        );
      case "schedules":
        return (
          <SchedulesSettings
            specialists={operationalSpecialists}
            rules={data.settings.scheduling_rules}
            persistenceAvailable={data.settingsPersistenceAvailable}
            onSaveRules={(value) => persistSetting("scheduling_rules", value, "Reglas generales de horarios guardadas correctamente.")}
            onSaveSpecialist={handleUpdateSpecialist}
            savingRules={savingKey === "scheduling_rules"}
            savingSpecialistId={savingKey}
          />
        );
      case "cabins":
        return (
          <CabinsSettings
            cabins={isAdmin ? data.cabins : data.cabins.filter((item) => item.active !== false)}
            onCreate={handleCreateCabin}
            onSave={handleUpdateCabin}
            saving={savingKey === "cabin" || Boolean(savingKey && savingKey !== "")}
            isAdmin={isAdmin}
          />
        );
      case "services":
        return (
          <div style={styles.stack}>
            <ServicesSettings
              services={isAdmin ? data.services : data.services.filter((item) => item.active !== false)}
              onCreate={handleCreateService}
              onSave={handleUpdateService}
              saving={savingKey === "service"}
              isAdmin={isAdmin}
            />
            <ServiceOffersSettings
              offers={isAdmin ? data.serviceOffers : data.serviceOffers.filter((item) => item.active !== false)}
              services={isAdmin ? data.services : data.services.filter((item) => item.active !== false)}
              onCreate={handleCreateServiceOffer}
              onSave={handleUpdateServiceOffer}
              saving={savingKey === "service-offer"}
              isAdmin={isAdmin}
            />
          </div>
        );
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
            legacyRows={data.payrollPayments}
            persistenceAvailable={data.payrollPersistenceAvailable}
            companySettings={data.settings.center_identity}
            profile={profile}
            isAdmin={isAdmin}
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
        <PageHeader
          eyebrow="Operación administrativa"
          title="Configuración"
          subtitle="Centro administrativo para identidad, horarios, servicios, cabinas, empleados y reglas operativas del sistema."
        />

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
          subtitle="Organiza la operación del centro con una navegación interna clara y separa parámetros operativos de ajustes administrativos."
          action={<SettingsTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />}
        >
          {loading ? (
            <div style={styles.loadingCopy}>Cargando configuración...</div>
          ) : (
            renderActiveSection()
          )}
        </SectionCard>

        <SectionCard
          title="Contexto operativo"
          subtitle="Resumen de las áreas administrativas cubiertas por esta pantalla."
        >
          <div style={styles.operationalGrid}>
            <OperationalHint title="Horarios y agenda" description="Las especialistas administran disponibilidad real desde Supabase y la agenda consume esa misma configuración." icon={<CalendarCog size={18} />} />
            <OperationalHint title="Facturación" description="Los parámetros de factura permanecen centralizados sin duplicar lógica con el módulo de ventas." icon={<ReceiptText size={18} />} />
            <OperationalHint title="Comisiones y nómina" description="Las reglas y pagos se mantienen separados del flujo de acceso al sistema por seguridad." icon={<BadgeDollarSign size={18} />} />
            <OperationalHint title="Inventario y seguridad" description="Stock, roles y permisos se presentan como configuración administrativa sin alterar la lógica sensible existente." icon={<ShieldCheck size={18} />} />
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
  stack: { display: "flex", flexDirection: "column", gap: 20 },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  successBanner: { background: "#EAF6ED", border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14, padding: "6px 0" },
  checkboxRow: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 12 },
  operationalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  hintCard: { background: "#FCFAF4", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 22, padding: 18 },
  hintIcon: { width: 40, height: 40, borderRadius: 14, background: BRANDING.colors.primarySoft, color: BRANDING.colors.primaryStrong, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  hintTitle: { color: BRANDING.colors.primaryStrong, fontSize: 16, fontWeight: 700 },
  hintDescription: { color: BRANDING.colors.textMuted, fontSize: 13, lineHeight: 1.6, marginTop: 8 },
};
