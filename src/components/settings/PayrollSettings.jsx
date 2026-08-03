import { useEffect, useMemo, useState } from "react";
import PatientModal from "../patients/PatientModal";
import ActionButton from "../ui/ActionButton";
import DataTable from "../ui/DataTable";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";
import PreparedNotice from "./PreparedNotice";
import {
  annulPayrollEntry,
  createPayrollEntry,
  createPayrollPeriod,
  fetchEligiblePayrollEmployees,
  fetchPayrollEntries,
  fetchPayrollPeriods,
  fetchPayrollSettings,
  fetchPendingCommissionsForPayroll,
  fetchSystemSettingsBundle,
  markPayrollEntryAsPaid,
  updatePayrollEntry,
  updatePayrollPeriod,
} from "../../services/settings";
import { generatePayrollPdf, generatePayrollSummaryPdf } from "../../utils/payrollPdf";

const PERIOD_STATUS_OPTIONS = ["abierto", "cerrado", "pagado", "anulado"];
const ENTRY_STATUS_OPTIONS = ["borrador", "pendiente", "pagada", "anulada"];
const PAYMENT_METHOD_OPTIONS = ["transferencia", "efectivo", "cheque", "tarjeta", "otro"];

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `RD$${safeNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function sortByRecent(items = [], valueKey = "created_at") {
  return [...items].sort((a, b) => {
    const aValue = new Date(a[valueKey] || 0).getTime();
    const bValue = new Date(b[valueKey] || 0).getTime();
    return bValue - aValue;
  });
}

function getPeriodAction(period) {
  switch (period.status) {
    case "abierto":
      return { label: "Cerrar", nextStatus: "cerrado" };
    case "cerrado":
      return { label: "Abrir", nextStatus: "abierto" };
    case "pagado":
      return { label: "Reabrir", nextStatus: "cerrado" };
    default:
      return { label: "Abrir", nextStatus: "abierto" };
  }
}

export default function PayrollSettings({
  legacyRows = null,
  persistenceAvailable = null,
  companySettings = null,
  profile,
  isAdmin,
}) {
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState("");
  const [secondaryError, setSecondaryError] = useState("");
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [resolvedLegacyRows, setResolvedLegacyRows] = useState(Array.isArray(legacyRows) ? legacyRows : []);
  const [resolvedPersistenceAvailable, setResolvedPersistenceAvailable] = useState(
    typeof persistenceAvailable === "boolean" ? persistenceAvailable : true
  );
  const [resolvedCompanySettings, setResolvedCompanySettings] = useState(companySettings || {});
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [periodModal, setPeriodModal] = useState({ open: false, item: null });
  const [entryModal, setEntryModal] = useState({ open: false, item: null });
  const [detailEntry, setDetailEntry] = useState(null);
  const [savingKey, setSavingKey] = useState("");

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  const selectedEntries = useMemo(
    () => sortByRecent(entries.filter((entry) => (entry.payroll_period_id || entry.period_id) === selectedPeriodId)),
    [entries, selectedPeriodId]
  );

  const historyEntries = useMemo(
    () => sortByRecent(entries.filter((entry) => entry.status === "pagada" || entry.status === "anulada"), "paid_at"),
    [entries]
  );

  const metrics = useMemo(() => {
    const activeEntries = selectedEntries.filter((entry) => entry.status !== "anulada");
    return {
      periodLabel: selectedPeriod?.name || "Sin período",
      employeesCount: activeEntries.length,
      gross: activeEntries.reduce((acc, entry) => acc + safeNumber(entry.gross_total), 0),
      deductions: activeEntries.reduce((acc, entry) => acc + safeNumber(entry.deductions_total), 0),
      net: activeEntries.reduce((acc, entry) => acc + safeNumber(entry.net_total), 0),
      pending: activeEntries.filter((entry) => entry.status === "pendiente" || entry.status === "borrador").length,
    };
  }, [selectedEntries, selectedPeriod]);

  async function loadModule({ silent = false } = {}) {
    if (silent) {
      setReloading(true);
    } else {
      setLoading(true);
    }

    setError("");
    setSecondaryError("");

    try {
      const [periodsResult, employeesResult, entriesResult] = await Promise.all([
        fetchPayrollPeriods(),
        fetchEligiblePayrollEmployees(),
        fetchPayrollEntries(),
      ]);

      setPeriods(periodsResult || []);
      setEmployees(employeesResult.rows || []);
      setWarnings(employeesResult.warnings || []);
      setEntries(entriesResult || []);

      setSelectedPeriodId((current) => {
        if (current && (periodsResult || []).some((period) => period.id === current)) {
          return current;
        }
        return periodsResult?.[0]?.id || "";
      });

      if (detailEntry?.id) {
        setDetailEntry((entriesResult || []).find((entry) => entry.id === detailEntry.id) || null);
      }

      const supplementaryTasks = [];

      if (Array.isArray(legacyRows)) {
        setResolvedLegacyRows(legacyRows);
        if (typeof persistenceAvailable === "boolean") {
          setResolvedPersistenceAvailable(persistenceAvailable);
        }
      } else {
        supplementaryTasks.push(
          fetchPayrollSettings()
            .then((result) => {
              setResolvedLegacyRows(result.rows || []);
              setResolvedPersistenceAvailable(result.persistenceAvailable);
            })
        );
      }

      if (companySettings) {
        setResolvedCompanySettings(companySettings);
      } else {
        supplementaryTasks.push(
          fetchSystemSettingsBundle()
            .then((result) => {
              setResolvedCompanySettings(result.settings?.center_identity || {});
            })
        );
      }

      if (supplementaryTasks.length) {
        const settled = await Promise.allSettled(supplementaryTasks);
        const failed = settled.find((item) => item.status === "rejected");
        if (failed) {
          const secondaryLoadError = failed.reason;
          console.error("Payroll load error", {
            code: secondaryLoadError?.code,
            message: secondaryLoadError?.message,
            details: secondaryLoadError?.details,
            hint: secondaryLoadError?.hint,
          });
          setSecondaryError("Se cargó la nómina principal, pero faltan algunos datos complementarios.");
        }
      }
    } catch (loadError) {
      console.error("Payroll load error", {
        code: loadError?.code,
        message: loadError?.message,
        details: loadError?.details,
        hint: loadError?.hint,
      });
      setError(loadError.message || "No se pudo cargar la nómina.");
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadModule();
  }, [isAdmin]);

  async function handleCreateOrUpdatePeriod(payload, currentItem) {
    setSavingKey("period");
    try {
      if (currentItem?.id) {
        await updatePayrollPeriod(currentItem.id, payload, profile);
      } else {
        await createPayrollPeriod(payload, profile);
      }
      setPeriodModal({ open: false, item: null });
      await loadModule({ silent: true });
    } finally {
      setSavingKey("");
    }
  }

  async function handlePeriodStatus(period, nextStatus) {
    if (!window.confirm(`¿Confirmas cambiar el período a ${nextStatus}?`)) return;
    setSavingKey(period.id);
    try {
      await updatePayrollPeriod(period.id, { ...period, status: nextStatus }, profile);
      await loadModule({ silent: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No se pudo guardar el período.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateOrUpdateEntry(payload, currentItem) {
    setSavingKey("entry");
    try {
      if (currentItem?.id) {
        await updatePayrollEntry(currentItem.id, payload, profile);
      } else {
        await createPayrollEntry(payload, profile);
      }
      setEntryModal({ open: false, item: null });
      await loadModule({ silent: true });
    } finally {
      setSavingKey("");
    }
  }

  async function handleMarkPaid(entry) {
    if (!window.confirm("¿Confirmas marcar este pago de nómina como pagado?")) return;
    setSavingKey(entry.id);
    try {
      await markPayrollEntryAsPaid(entry.id, (entry.commissions || []).map((commission) => commission.id), profile);
      await loadModule({ silent: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No se pudo marcar como pagada.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleAnnul(entry) {
    if (!window.confirm("¿Confirmas anular este pago de nómina?")) return;
    setSavingKey(entry.id);
    try {
      await annulPayrollEntry(entry.id, profile);
      await loadModule({ silent: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No se pudo anular el pago.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleExportEntryPdf(entry) {
    try {
      await generatePayrollPdf({
        entry,
        employee: entry.employee,
        specialist: entry.specialist,
        period: entry.period || selectedPeriod,
        companySettings: resolvedCompanySettings,
        commissions: entry.commissions || [],
      });
    } catch (pdfError) {
      console.error(pdfError);
      setError(pdfError.message || "No se pudo generar el PDF.");
    }
  }

  async function handleExportSummaryPdf() {
    if (!selectedPeriod) return;
    try {
      await generatePayrollSummaryPdf(selectedPeriod, selectedEntries, employees, resolvedCompanySettings);
    } catch (pdfError) {
      console.error(pdfError);
      setError(pdfError.message || "No se pudo generar el PDF.");
    }
  }

  if (!isAdmin) {
    return (
      <SectionCard title="Nómina" subtitle="Acceso reservado para administración.">
        <EmptyState
          title="No tienes permisos para acceder a esta sección."
          description="La nómina solo puede ser gestionada por un perfil administrador activo."
        />
      </SectionCard>
    );
  }

  if (loading) {
    return (
      <SectionCard title="Nómina" subtitle="Períodos, pagos, comisiones y comprobantes del equipo.">
        <div style={styles.loadingCopy}>Cargando nómina...</div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Nómina" subtitle="Períodos, pagos, comisiones y comprobantes del equipo.">
        <div style={styles.errorBanner}>{error}</div>
        <div style={styles.retryWrap}>
          <ActionButton type="button" onClick={() => loadModule()}>
            Reintentar
          </ActionButton>
        </div>
      </SectionCard>
    );
  }

  return (
    <div style={styles.stack}>
      <SectionCard
        title="Nómina"
        subtitle="Períodos, pagos individuales, comisiones vinculadas y comprobantes del equipo."
        action={(
          <div style={styles.actionsRow}>
            {selectedPeriod ? (
              <ActionButton type="button" variant="secondary" onClick={handleExportSummaryPdf}>
                Exportar resumen
              </ActionButton>
            ) : null}
            <ActionButton type="button" onClick={() => setPeriodModal({ open: true, item: null })}>
              + Nuevo período
            </ActionButton>
          </div>
        )}
      >
        {!resolvedPersistenceAvailable ? (
          <PreparedNotice message="Los pagos históricos anteriores al nuevo módulo siguen visibles, pero la persistencia principal ya corre sobre payroll_periods y payroll_entries." />
        ) : null}
        {secondaryError ? <div style={styles.secondaryBanner}>{secondaryError}</div> : null}
        {reloading ? <div style={styles.loadingInline}>Actualizando datos...</div> : null}
        {warnings.length ? (
          <div style={styles.warningPanel}>
            <div style={styles.warningTitle}>Especialistas fuera de nómina</div>
            <div style={styles.warningList}>
              {warnings.map((warning) => (
                <div key={warning.specialist_id} style={styles.warningItem}>
                  <strong>{warning.full_name}</strong>: {warning.message}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={styles.metricsGrid}>
          <MetricCard label="Período actual" value={metrics.periodLabel} description="Período seleccionado" />
          <MetricCard label="Empleados incluidos" value={metrics.employeesCount} description="Pagos activos del período" />
          <MetricCard label="Total bruto" value={formatCurrency(metrics.gross)} description="Ingresos acumulados" />
          <MetricCard label="Deducciones" value={formatCurrency(metrics.deductions)} description="Descuentos del período" />
          <MetricCard label="Total neto" value={formatCurrency(metrics.net)} description="Pago neto proyectado" />
          <MetricCard label="Pagos pendientes" value={metrics.pending} description="Borrador o pendiente" />
        </div>
      </SectionCard>

      <SectionCard title="Períodos" subtitle="Crea ciclos de nómina, ajusta fechas y administra su estado.">
        <DataTable
          columns={[
            {
              key: "name",
              label: "Período",
              render: (period) => (
                <div style={styles.primaryCell}>
                  <div style={styles.primaryText}>{period.name}</div>
                  <div style={styles.secondaryText}>{formatDate(period.start_date)} al {formatDate(period.end_date)}</div>
                </div>
              ),
            },
            { key: "payment_date", label: "Pago", render: (period) => formatDate(period.payment_date) },
            { key: "employees_count", label: "Empleadas" },
            { key: "gross_total", label: "Bruto", render: (period) => formatCurrency(period.gross_total) },
            { key: "deductions_total", label: "Deducciones", render: (period) => formatCurrency(period.deductions_total) },
            { key: "net_total", label: "Neto", render: (period) => formatCurrency(period.net_total) },
            { key: "status", label: "Estado", render: (period) => <StatusBadge status={period.status} /> },
            {
              key: "actions",
              label: "Acciones",
              render: (period) => {
                const action = getPeriodAction(period);
                return (
                  <div style={styles.tableActions}>
                    <ActionButton type="button" variant="ghost" onClick={() => setSelectedPeriodId(period.id)}>Ver</ActionButton>
                    <ActionButton type="button" variant="secondary" onClick={() => setPeriodModal({ open: true, item: period })}>Editar</ActionButton>
                    {period.status !== "anulado" ? (
                      <ActionButton type="button" variant="ghost" disabled={savingKey === period.id} onClick={() => handlePeriodStatus(period, action.nextStatus)}>
                        {action.label}
                      </ActionButton>
                    ) : null}
                    {period.status !== "pagado" && period.status !== "anulado" ? (
                      <ActionButton type="button" variant="success" disabled={savingKey === period.id} onClick={() => handlePeriodStatus(period, "pagado")}>
                        Marcar pagado
                      </ActionButton>
                    ) : null}
                    {period.status !== "anulado" ? (
                      <ActionButton type="button" variant="danger" disabled={savingKey === period.id} onClick={() => handlePeriodStatus(period, "anulado")}>
                        Anular
                      </ActionButton>
                    ) : null}
                  </div>
                );
              },
            },
          ]}
          rows={periods}
          emptyState={(
            <EmptyState
              title="No hay períodos registrados todavía."
              description="Crea el primer período para comenzar a preparar la nómina."
              action={<ActionButton type="button" onClick={() => setPeriodModal({ open: true, item: null })}>Crear primer período</ActionButton>}
            />
          )}
        />
      </SectionCard>

      <SectionCard
        title="Nómina actual"
        subtitle={selectedPeriod ? `Pagos individuales del período ${selectedPeriod.name}.` : "Selecciona un período para trabajar la nómina."}
        action={selectedPeriod ? (
          <ActionButton
            type="button"
            onClick={() => setEntryModal({ open: true, item: null })}
            disabled={selectedPeriod.status === "pagado" || selectedPeriod.status === "anulado"}
          >
            + Nuevo pago
          </ActionButton>
        ) : null}
      >
        {!selectedPeriod ? (
          <EmptyState title="Selecciona un período para continuar." description="La nómina individual se gestiona dentro de un período activo." />
        ) : (
          <DataTable
            columns={[
              {
                key: "employee",
                label: "Empleada",
                render: (entry) => (
                  <div style={styles.primaryCell}>
                    <div style={styles.primaryText}>{entry.employee?.full_name || "Empleado"}</div>
                    <div style={styles.secondaryText}>{entry.employee?.position || entry.specialist?.full_name || "Sin cargo"}</div>
                  </div>
                ),
              },
              { key: "base_salary", label: "Base", render: (entry) => formatCurrency(entry.base_salary) },
              { key: "commission_amount", label: "Comisiones", render: (entry) => formatCurrency(entry.commission_amount || entry.commissions_total) },
              {
                key: "additional_income",
                label: "Ingresos adicionales",
                render: (entry) => formatCurrency(
                  safeNumber(entry.bonus_amount) + safeNumber(entry.overtime_amount) + safeNumber(entry.other_income || entry.other_income_amount)
                ),
              },
              { key: "deductions_total", label: "Deducciones", render: (entry) => formatCurrency(entry.deductions_total) },
              { key: "net_total", label: "Neto", render: (entry) => formatCurrency(entry.net_total) },
              { key: "status", label: "Estado", render: (entry) => <StatusBadge status={entry.status} /> },
              {
                key: "actions",
                label: "Acciones",
                render: (entry) => (
                  <div style={styles.tableActions}>
                    <ActionButton type="button" variant="ghost" onClick={() => setDetailEntry(entry)}>Ver</ActionButton>
                    {entry.status !== "pagada" && entry.status !== "anulada" ? (
                      <ActionButton type="button" variant="secondary" onClick={() => setEntryModal({ open: true, item: entry })}>Editar</ActionButton>
                    ) : null}
                    {entry.status === "borrador" ? (
                      <ActionButton
                        type="button"
                        variant="ghost"
                        disabled={savingKey === entry.id}
                        onClick={() => handleCreateOrUpdateEntry({ ...entry, commission_ids: (entry.commissions || []).map((commission) => commission.id), status: "pendiente" }, entry)}
                      >
                        Marcar pendiente
                      </ActionButton>
                    ) : null}
                    {entry.status !== "pagada" && entry.status !== "anulada" ? (
                      <ActionButton type="button" variant="success" disabled={savingKey === entry.id} onClick={() => handleMarkPaid(entry)}>
                        Marcar pagada
                      </ActionButton>
                    ) : null}
                    <ActionButton type="button" variant="ghost" onClick={() => handleExportEntryPdf(entry)}>Exportar PDF</ActionButton>
                    {entry.status !== "pagada" && entry.status !== "anulada" ? (
                      <ActionButton type="button" variant="danger" disabled={savingKey === entry.id} onClick={() => handleAnnul(entry)}>
                        Anular
                      </ActionButton>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={selectedEntries}
            emptyState={(
              <EmptyState
                title="No hay pagos en este período."
                description="Registra el primer pago individual para esta nómina."
                action={(
                  <ActionButton
                    type="button"
                    onClick={() => setEntryModal({ open: true, item: null })}
                    disabled={selectedPeriod.status === "pagado" || selectedPeriod.status === "anulado"}
                  >
                    Crear primer pago
                  </ActionButton>
                )}
              />
            )}
          />
        )}
      </SectionCard>

      <SectionCard title="Historial" subtitle="Pagos cerrados y registros legados del módulo anterior.">
        <div style={styles.historyGrid}>
          <div style={styles.historyColumn}>
            <div style={styles.historyTitle}>Nómina actual</div>
            <DataTable
              columns={[
                { key: "period", label: "Período", render: (entry) => entry.period?.name || "Sin período" },
                { key: "employee", label: "Empleada", render: (entry) => entry.employee?.full_name || "Empleado" },
                { key: "paid_at", label: "Pago", render: (entry) => formatDate(entry.paid_at || entry.period?.payment_date) },
                { key: "net_total", label: "Neto", render: (entry) => formatCurrency(entry.net_total) },
                { key: "status", label: "Estado", render: (entry) => <StatusBadge status={entry.status} /> },
              ]}
              rows={historyEntries}
              emptyState={<EmptyState title="Aún no hay pagos cerrados." description="Los registros pagados o anulados aparecerán aquí." />}
            />
          </div>
          <div style={styles.historyColumn}>
            <div style={styles.historyTitle}>Pagos históricos anteriores al nuevo módulo</div>
            <DataTable
              columns={[
                { key: "payment_date", label: "Fecha", render: (row) => formatDate(row.payment_date) },
                { key: "payment_type", label: "Tipo" },
                { key: "amount", label: "Monto", render: (row) => formatCurrency(row.amount) },
                { key: "period", label: "Período", render: (row) => `${formatDate(row.period_start)} al ${formatDate(row.period_end)}` },
              ]}
              rows={resolvedLegacyRows}
              emptyState={<EmptyState title="No hay pagos legados registrados." description="Este bloque conserva únicamente la información previa al nuevo módulo." />}
            />
          </div>
        </div>
      </SectionCard>

      {periodModal.open ? (
        <PatientModal
          title={periodModal.item ? "Editar período de nómina" : "Nuevo período de nómina"}
          subtitle="Define fechas, pago y notas del ciclo administrativo."
          onClose={() => setPeriodModal({ open: false, item: null })}
        >
          <PayrollPeriodForm
            item={periodModal.item}
            saving={savingKey === "period"}
            onCancel={() => setPeriodModal({ open: false, item: null })}
            onSubmit={(payload) => handleCreateOrUpdatePeriod(payload, periodModal.item)}
          />
        </PatientModal>
      ) : null}

      {entryModal.open ? (
        <PatientModal
          title={entryModal.item ? "Editar pago individual" : "Nuevo pago individual"}
          subtitle="Carga salario base, comisiones, bonos, deducciones y notas del pago."
          onClose={() => setEntryModal({ open: false, item: null })}
          wide
        >
          <PayrollEntryForm
            item={entryModal.item}
            period={selectedPeriod}
            employees={employees}
            saving={savingKey === "entry"}
            onCancel={() => setEntryModal({ open: false, item: null })}
            onSubmit={(payload) => handleCreateOrUpdateEntry(payload, entryModal.item)}
          />
        </PatientModal>
      ) : null}

      {detailEntry ? (
        <PatientModal
          title={`Pago de nómina · ${detailEntry.employee?.full_name || "Empleado"}`}
          subtitle="Detalle de ingresos, deducciones, comisiones incluidas y estado del pago."
          onClose={() => setDetailEntry(null)}
          wide
        >
          <PayrollEntryDetail
            entry={detailEntry}
            onExportPdf={() => handleExportEntryPdf(detailEntry)}
            onEdit={
              detailEntry.status !== "pagada" && detailEntry.status !== "anulada"
                ? () => {
                  setDetailEntry(null);
                  setEntryModal({ open: true, item: detailEntry });
                }
                : null
            }
            onMarkPaid={
              detailEntry.status !== "pagada" && detailEntry.status !== "anulada"
                ? () => handleMarkPaid(detailEntry)
                : null
            }
            onAnnul={
              detailEntry.status !== "pagada" && detailEntry.status !== "anulada"
                ? () => handleAnnul(detailEntry)
                : null
            }
          />
        </PatientModal>
      ) : null}
    </div>
  );
}

function PayrollPeriodForm({ item, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    start_date: item?.start_date || "",
    end_date: item?.end_date || "",
    payment_date: item?.payment_date || "",
    status: item?.status || "abierto",
    notes: item?.notes || "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formGrid}>
        <Field label="Nombre">
          <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Estado">
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} style={styles.input}>
            {PERIOD_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Fecha inicial">
          <input type="date" required value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Fecha final">
          <input type="date" required value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Fecha de pago">
          <input type="date" value={form.payment_date} onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Notas" full>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...styles.input, minHeight: 96, resize: "vertical" }} />
        </Field>
      </div>
      <div style={styles.modalFooter}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>Cancelar</ActionButton>
        <ActionButton type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar período"}</ActionButton>
      </div>
    </form>
  );
}

function PayrollEntryForm({ item, period, employees, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    payroll_period_id: item?.payroll_period_id || item?.period_id || period?.id || "",
    employee_id: item?.employee_id || "",
    specialist_id: item?.specialist_id || "",
    payment_method: item?.payment_method || "transferencia",
    status: item?.status || "borrador",
    base_salary: safeNumber(item?.base_salary),
    bonus_amount: safeNumber(item?.bonus_amount),
    overtime_amount: safeNumber(item?.overtime_amount),
    other_income: safeNumber(item?.other_income),
    advances: safeNumber(item?.advances),
    absences_deduction: safeNumber(item?.absences_deduction),
    legal_deductions: safeNumber(item?.legal_deductions),
    other_deductions: safeNumber(item?.other_deductions),
    notes: item?.notes || "",
  });
  const [commissionOptions, setCommissionOptions] = useState(item?.commissions || []);
  const [selectedCommissionIds, setSelectedCommissionIds] = useState((item?.commissions || []).map((commission) => commission.id));
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [commissionError, setCommissionError] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === form.employee_id) || null,
    [employees, form.employee_id]
  );

  const selectedCommissions = useMemo(
    () => commissionOptions.filter((commission) => selectedCommissionIds.includes(commission.id)),
    [commissionOptions, selectedCommissionIds]
  );

  const commissionsTotal = useMemo(
    () => selectedCommissions.reduce((acc, commission) => acc + safeNumber(commission.commission_amount), 0),
    [selectedCommissions]
  );

  const previewGross = safeNumber(form.base_salary)
    + commissionsTotal
    + safeNumber(form.bonus_amount)
    + safeNumber(form.overtime_amount)
    + safeNumber(form.other_income);
  const previewDeductions = safeNumber(form.advances)
    + safeNumber(form.absences_deduction)
    + safeNumber(form.legal_deductions)
    + safeNumber(form.other_deductions);
  const previewNet = previewGross - previewDeductions;

  useEffect(() => {
    if (!selectedEmployee) return;
    setForm((current) => ({
      ...current,
      specialist_id: selectedEmployee.specialist_id || "",
      base_salary: item ? current.base_salary : safeNumber(selectedEmployee.base_salary),
    }));
  }, [selectedEmployee?.id]);

  useEffect(() => {
    let active = true;

    async function loadCommissions() {
      if (!selectedEmployee?.specialist_id || !period?.start_date || !period?.end_date) {
        setCommissionOptions(item?.commissions || []);
        return;
      }

      setLoadingCommissions(true);
      setCommissionError("");

      try {
        const pending = await fetchPendingCommissionsForPayroll(
          selectedEmployee.specialist_id,
          period.start_date,
          period.end_date
        );

        if (!active) return;

        const merged = [...pending];
        (item?.commissions || []).forEach((commission) => {
          if (!merged.some((row) => row.id === commission.id)) {
            merged.push(commission);
          }
        });

        setCommissionOptions(merged);
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setCommissionError(loadError.message || "No se pudo cargar las comisiones pendientes.");
      } finally {
        if (active) {
          setLoadingCommissions(false);
        }
      }
    }

    loadCommissions();
    return () => {
      active = false;
    };
  }, [selectedEmployee?.specialist_id, period?.start_date, period?.end_date, item?.id]);

  function toggleCommission(commissionId) {
    setSelectedCommissionIds((current) => (
      current.includes(commissionId)
        ? current.filter((id) => id !== commissionId)
        : [...current, commissionId]
    ));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.employee_id || !form.payroll_period_id) return;
    onSubmit({
      ...form,
      period_id: form.payroll_period_id,
      commission_amount: commissionsTotal,
      commission_ids: selectedCommissionIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Datos</div>
        <div style={styles.formGrid}>
          <Field label="Empleada">
            <select required value={form.employee_id} onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))} style={styles.input}>
              <option value="">Seleccionar</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Especialista vinculada">
            <input value={selectedEmployee?.specialist_name || "Sin especialista"} style={styles.input} readOnly />
          </Field>
          <Field label="Período">
            <input value={period?.name || "Sin período"} style={styles.input} readOnly />
          </Field>
          <Field label="Método de pago">
            <select value={form.payment_method} onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))} style={styles.input}>
              {PAYMENT_METHOD_OPTIONS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} style={styles.input}>
              {ENTRY_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Frecuencia">
            <input value={selectedEmployee?.payment_frequency || "—"} style={styles.input} readOnly />
          </Field>
        </div>
        {selectedEmployee?.payroll_warning ? (
          <div style={styles.warningPanelInline}>
            {selectedEmployee.payroll_warning}
          </div>
        ) : null}
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Ingresos</div>
        <div style={styles.formGrid}>
          <Field label="Salario base">
            <input type="number" min="0" step="0.01" value={form.base_salary} onChange={(event) => setForm((current) => ({ ...current, base_salary: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Bonos">
            <input type="number" min="0" step="0.01" value={form.bonus_amount} onChange={(event) => setForm((current) => ({ ...current, bonus_amount: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Horas extras">
            <input type="number" min="0" step="0.01" value={form.overtime_amount} onChange={(event) => setForm((current) => ({ ...current, overtime_amount: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Otros ingresos">
            <input type="number" min="0" step="0.01" value={form.other_income} onChange={(event) => setForm((current) => ({ ...current, other_income: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Comisiones vinculadas" full>
            <div style={styles.commissionPanel}>
              {loadingCommissions ? <div style={styles.secondaryText}>Cargando comisiones...</div> : null}
              {commissionError ? <div style={styles.errorText}>{commissionError}</div> : null}
              {!loadingCommissions && !commissionOptions.length ? (
                <div style={styles.secondaryText}>No hay comisiones pendientes para este período.</div>
              ) : (
                <div style={styles.commissionList}>
                  {commissionOptions.map((commission) => (
                    <label key={commission.id} style={styles.commissionItem}>
                      <input
                        type="checkbox"
                        checked={selectedCommissionIds.includes(commission.id)}
                        onChange={() => toggleCommission(commission.id)}
                      />
                      <span style={styles.commissionText}>
                        {formatDate(commission.commission_date)} · {commission.type || "comisión"} · {formatCurrency(commission.commission_amount)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Deducciones</div>
        <div style={styles.formGrid}>
          <Field label="Adelantos">
            <input type="number" min="0" step="0.01" value={form.advances} onChange={(event) => setForm((current) => ({ ...current, advances: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Ausencias">
            <input type="number" min="0" step="0.01" value={form.absences_deduction} onChange={(event) => setForm((current) => ({ ...current, absences_deduction: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Deducciones legales">
            <input type="number" min="0" step="0.01" value={form.legal_deductions} onChange={(event) => setForm((current) => ({ ...current, legal_deductions: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Otras deducciones">
            <input type="number" min="0" step="0.01" value={form.other_deductions} onChange={(event) => setForm((current) => ({ ...current, other_deductions: event.target.value }))} style={styles.input} />
          </Field>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Bruto estimado" value={formatCurrency(previewGross)} />
        <SummaryCard label="Deducciones" value={formatCurrency(previewDeductions)} />
        <SummaryCard label="Neto estimado" value={formatCurrency(previewNet)} emphasis />
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Notas</div>
        <Field label="Observaciones" full>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...styles.input, minHeight: 96, resize: "vertical" }} />
        </Field>
      </div>

      <div style={styles.modalFooter}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>Cancelar</ActionButton>
        <ActionButton type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar pago"}</ActionButton>
      </div>
    </form>
  );
}

function PayrollEntryDetail({ entry, onExportPdf, onEdit, onMarkPaid, onAnnul }) {
  return (
    <div style={styles.detailStack}>
      <div style={styles.summaryGrid}>
        <SummaryCard label="Bruto" value={formatCurrency(entry.gross_total)} />
        <SummaryCard label="Deducciones" value={formatCurrency(entry.deductions_total)} />
        <SummaryCard label="Neto" value={formatCurrency(entry.net_total)} emphasis />
        <SummaryCard label="Estado" value={entry.status} />
      </div>

      <div style={styles.detailGrid}>
        <DetailCard title="Datos">
          <InfoRow label="Empleada" value={entry.employee?.full_name || "—"} />
          <InfoRow label="Cargo" value={entry.employee?.position || "—"} />
          <InfoRow label="Especialista" value={entry.specialist?.full_name || "—"} />
          <InfoRow label="Período" value={entry.period?.name || "—"} />
          <InfoRow label="Método" value={entry.payment_method || "—"} />
          <InfoRow label="Pagado" value={formatDate(entry.paid_at)} />
        </DetailCard>

        <DetailCard title="Ingresos y deducciones">
          <InfoRow label="Salario base" value={formatCurrency(entry.base_salary)} />
          <InfoRow label="Comisiones" value={formatCurrency(entry.commission_amount || entry.commissions_total)} />
          <InfoRow label="Bonos" value={formatCurrency(entry.bonus_amount)} />
          <InfoRow label="Horas extras" value={formatCurrency(entry.overtime_amount)} />
          <InfoRow label="Otros ingresos" value={formatCurrency(entry.other_income || entry.other_income_amount)} />
          <InfoRow label="Adelantos" value={formatCurrency(entry.advances || entry.advance_deductions)} />
          <InfoRow label="Ausencias" value={formatCurrency(entry.absences_deduction || entry.absence_deductions)} />
          <InfoRow label="Legales" value={formatCurrency(entry.legal_deductions)} />
          <InfoRow label="Otras deducciones" value={formatCurrency(entry.other_deductions)} />
        </DetailCard>
      </div>

      <DetailCard title="Comisiones incluidas">
        {!entry.commissions?.length ? (
          <div style={styles.secondaryText}>No hay comisiones vinculadas.</div>
        ) : (
          <div style={styles.commissionList}>
            {entry.commissions.map((commission) => (
              <div key={commission.id} style={styles.commissionDetailRow}>
                <div>{formatDate(commission.commission_date)} · {commission.type || "comisión"}</div>
                <strong>{formatCurrency(commission.commission_amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </DetailCard>

      <DetailCard title="Notas">
        <div style={styles.secondaryText}>{entry.notes || "Sin observaciones."}</div>
      </DetailCard>

      <div style={styles.modalFooter}>
        <ActionButton type="button" variant="secondary" onClick={onExportPdf}>Exportar PDF</ActionButton>
        {onEdit ? <ActionButton type="button" variant="ghost" onClick={onEdit}>Editar</ActionButton> : null}
        {onMarkPaid ? <ActionButton type="button" variant="success" onClick={onMarkPaid}>Marcar pagada</ActionButton> : null}
        {onAnnul ? <ActionButton type="button" variant="danger" onClick={onAnnul}>Anular</ActionButton> : null}
      </div>
    </div>
  );
}

function MetricCard({ label, value, description }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricDescription}>{description}</div>
    </div>
  );
}

function SummaryCard({ label, value, emphasis = false }) {
  return (
    <div style={{ ...styles.summaryCard, ...(emphasis ? styles.summaryCardStrong : {}) }}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

function DetailCard({ title, children }) {
  return (
    <div style={styles.detailCard}>
      <div style={styles.detailTitle}>{title}</div>
      <div style={styles.detailContent}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  stack: { display: "flex", flexDirection: "column", gap: 20 },
  actionsRow: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14 },
  loadingInline: { marginTop: 12, color: BRANDING.colors.textMuted, fontSize: 13 },
  retryWrap: { display: "flex", marginTop: 14 },
  errorBanner: {
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
  secondaryBanner: {
    marginTop: 12,
    background: "#FFF7E5",
    border: "1px solid #E7D9A8",
    color: "#7A5A06",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
  warningPanel: {
    marginTop: 16,
    background: "#FFF7E5",
    border: "1px solid #E7D9A8",
    borderRadius: 18,
    padding: 16,
  },
  warningPanelInline: {
    marginTop: 2,
    background: "#FFF7E5",
    border: "1px solid #E7D9A8",
    borderRadius: 16,
    padding: "12px 14px",
    color: "#7A5A06",
    fontSize: 13,
    fontWeight: 600,
  },
  warningTitle: { color: "#7A5A06", fontSize: 14, fontWeight: 700, marginBottom: 8 },
  warningList: { display: "flex", flexDirection: "column", gap: 6, color: "#7A5A06", fontSize: 13 },
  warningItem: { lineHeight: 1.6 },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 18 },
  metricCard: { background: "#FCFAF4", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 22, padding: 18 },
  metricLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 },
  metricValue: { color: BRANDING.colors.primaryStrong, fontSize: 22, fontWeight: 700 },
  metricDescription: { color: BRANDING.colors.textMuted, fontSize: 12, lineHeight: 1.6, marginTop: 8 },
  tableActions: { display: "flex", flexWrap: "wrap", gap: 8 },
  primaryCell: { display: "flex", flexDirection: "column", gap: 4 },
  primaryText: { color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 14 },
  secondaryText: { color: BRANDING.colors.textMuted, fontSize: 12, lineHeight: 1.6 },
  historyGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 },
  historyColumn: { minWidth: 0 },
  historyTitle: { color: BRANDING.colors.primaryStrong, fontSize: 16, fontWeight: 700, marginBottom: 12 },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  formSection: { background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 14 },
  formSectionTitle: { color: BRANDING.colors.primaryStrong, fontSize: 17, fontWeight: 700 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FFFDF8", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  commissionPanel: { border: `1px solid ${BRANDING.colors.border}`, borderRadius: 18, background: "#FFFDF8", padding: 14 },
  commissionList: { display: "flex", flexDirection: "column", gap: 10 },
  commissionItem: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: BRANDING.colors.text },
  commissionText: { lineHeight: 1.5 },
  errorText: { color: "#A44E60", fontSize: 12, fontWeight: 600 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 },
  summaryCard: { background: "#FCFAF4", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 20, padding: 16 },
  summaryCardStrong: { background: BRANDING.colors.primarySoft, borderColor: "#CFE0D7" },
  summaryLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  summaryValue: { color: BRANDING.colors.primaryStrong, fontSize: 20, fontWeight: 700 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" },
  detailStack: { display: "flex", flexDirection: "column", gap: 18 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  detailCard: { background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 22, padding: 18 },
  detailTitle: { color: BRANDING.colors.primaryStrong, fontSize: 16, fontWeight: 700, marginBottom: 12 },
  detailContent: { display: "flex", flexDirection: "column", gap: 10 },
  infoRow: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", borderBottom: "1px solid #F1EADF", paddingBottom: 8 },
  infoLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700 },
  infoValue: { color: BRANDING.colors.text, fontSize: 14, textAlign: "right" },
  commissionDetailRow: { display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #F1EADF", paddingBottom: 8, fontSize: 13, color: BRANDING.colors.text },
};
