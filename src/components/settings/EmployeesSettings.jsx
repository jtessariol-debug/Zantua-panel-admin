import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientModal from "../patients/PatientModal";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import StatusBadge from "../ui/StatusBadge";
import { BRANDING } from "../../lib/branding";

const STATUS_OPTIONS = ["activo", "inactivo", "suspendido"];
const FILTER_OPTIONS = ["activos", "inactivos"];
const PAYMENT_FREQUENCY_OPTIONS = ["semanal", "quincenal", "mensual"];

export default function EmployeesSettings({
  rows = [],
  specialists = [],
  onCreate,
  onSave,
  onDeactivate,
  onReactivate,
  onCreateMissing,
  saving,
  isAdmin = false,
}) {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("activos");
  const [localError, setLocalError] = useState("");

  const activeRows = useMemo(() => rows.filter((item) => item.active), [rows]);
  const inactiveRows = useMemo(() => rows.filter((item) => !item.active), [rows]);
  const visibleRows = filter === "activos" ? activeRows : inactiveRows;

  const summary = useMemo(() => ({
    totalTeam: rows.length,
    employeeRecords: rows.filter((item) => item.employee_id).length,
    activeEmployees: rows.filter((item) => item.employee_id && item.active).length,
    pendingAdminRecords: rows.filter((item) => !item.employee_id).length,
    payrollReady: rows.filter((item) => item.employee_id && item.active && item.specialist_id).length,
  }), [rows]);

  function ensureAdmin(message) {
    if (!isAdmin) {
      setLocalError(message);
      return false;
    }

    setLocalError("");
    return true;
  }

  function handleOpenCreate(row = null) {
    if (!ensureAdmin("No tienes permisos para gestionar fichas administrativas.")) return;
    setModal({ mode: "create", row });
  }

  function handleOpenCreateMissing() {
    if (!ensureAdmin("No tienes permisos para gestionar fichas administrativas.")) return;
    setModal({ mode: "create-missing" });
  }

  function handleOpenView(row) {
    setLocalError("");
    setModal({ mode: "view", row });
  }

  function handleOpenEdit(row) {
    if (!ensureAdmin("Solo puedes editar fichas administrativas existentes.") || !row.employee_id) return;
    setModal({ mode: "edit", row });
  }

  function handleOpenDeactivate(row) {
    if (!ensureAdmin("Solo puedes desactivar fichas administrativas existentes.") || !row.employee_id) return;
    setModal({ mode: "deactivate", row });
  }

  function handleOpenReactivate(row) {
    if (!ensureAdmin("Solo puedes reactivar fichas administrativas existentes.") || !row.employee_id) return;
    setModal({ mode: "reactivate", row });
  }

  return (
    <SectionCard
      title="Fichas administrativas del equipo"
      subtitle="Gestiona la base administrativa que alimenta Nómina, sin mezclar accesos del sistema con la operación clínica."
      action={isAdmin ? (
        <div style={styles.headerActions}>
          <ActionButton type="button" variant="secondary" onClick={handleOpenCreateMissing}>
            Crear fichas pendientes
          </ActionButton>
          <ActionButton type="button" onClick={handleOpenCreate}>
            + Nueva ficha administrativa
          </ActionButton>
        </div>
      ) : null}
    >
      <div style={styles.summaryGrid}>
        <SummaryCard label="Equipo consolidado" value={summary.totalTeam} />
        <SummaryCard label="Fichas administrativas" value={summary.employeeRecords} />
        <SummaryCard label="Activas" value={summary.activeEmployees} />
        <SummaryCard label="Pendientes" value={summary.pendingAdminRecords} />
        <SummaryCard label="Listas para nómina" value={summary.payrollReady} />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              style={{
                ...styles.filterButton,
                ...(filter === option ? styles.filterButtonActive : {}),
              }}
            >
              {option === "activos" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>

        <div style={styles.toolbarHint}>
          Los accesos al sistema se siguen administrando desde Usuarios.
        </div>
      </div>

      {localError ? <div style={styles.errorBanner}>{localError}</div> : null}

      {!visibleRows.length ? (
        <EmptyState
          title={filter === "activos" ? "No hay fichas activas visibles." : "No hay fichas inactivas visibles."}
          description={filter === "activos"
            ? "Las especialistas operativas y los perfiles administrativos pendientes aparecerán aquí para completar su ficha."
            : "Cuando una ficha administrativa se desactive, seguirá disponible en este listado sin borrar el historial."}
          action={isAdmin && filter === "activos" ? (
            <div style={styles.emptyActions}>
              <ActionButton type="button" variant="secondary" onClick={handleOpenCreateMissing}>
                Crear fichas pendientes
              </ActionButton>
              <ActionButton type="button" onClick={handleOpenCreate}>
                Crear primera ficha administrativa
              </ActionButton>
            </div>
          ) : null}
        />
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.head}>Empleada</th>
                <th style={styles.head}>Cargo</th>
                <th style={styles.head}>Especialista</th>
                <th style={styles.head}>Nómina</th>
                <th style={styles.head}>Acceso</th>
                <th style={styles.head}>Estado</th>
                <th style={styles.head}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} style={styles.row}>
                  <td style={styles.cell}>
                    <div style={styles.primaryCell}>{row.full_name}</div>
                    <div style={styles.secondaryCell}>
                      {row.email || row.phone || "Sin contacto registrado"}
                    </div>
                    <div style={styles.badgeRow}>
                      <SourceBadge sourceStatus={row.source_status} />
                      {row.hire_date ? <MetaBadge label={`Ingreso ${row.hire_date}`} /> : null}
                    </div>
                  </td>
                  <td style={styles.cell}>{row.position || "Sin cargo"}</td>
                  <td style={styles.cell}>
                    <div style={styles.columnStack}>
                      <span>{row.specialist_name || "Sin vincular"}</span>
                      <span style={styles.microCopy}>{row.schedule_label || "Sin horario"}</span>
                    </div>
                  </td>
                  <td style={styles.cell}>
                    {row.employee_id ? (
                      <div style={styles.columnStack}>
                        <span style={styles.primaryCell}>RD$ {formatCurrencyValue(row.base_salary)}</span>
                        <span style={styles.microCopy}>{getPaymentFrequencyLabel(row.payment_frequency)}</span>
                      </div>
                    ) : (
                      <span style={styles.microCopy}>Ficha pendiente</span>
                    )}
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.columnStack}>
                      <MetaBadge label={row.has_system_access ? "Con acceso" : "Sin acceso"} tone={row.has_system_access ? "success" : "neutral"} />
                      <div style={styles.microCopy}>{getSystemRoleLabel(row.system_role)}</div>
                      {!row.has_system_access ? (
                        <button type="button" onClick={() => navigate("/users")} style={styles.linkButton}>
                          Gestionar acceso
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.columnStack}>
                      <StatusBadge status={mapStatusToBadge(row.status)} />
                      {row.termination_date ? (
                        <div style={styles.microCopy}>Salida: {row.termination_date}</div>
                      ) : null}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.actionGroup}>
                      <ActionButton type="button" variant="ghost" onClick={() => handleOpenView(row)} style={styles.actionButton}>
                        Ver
                      </ActionButton>
                      {row.employee_id ? (
                        <>
                          {isAdmin ? (
                            <ActionButton type="button" variant="secondary" onClick={() => handleOpenEdit(row)} style={styles.actionButton}>
                              Editar
                            </ActionButton>
                          ) : null}
                          {isAdmin && row.active ? (
                            <ActionButton type="button" variant="danger" onClick={() => handleOpenDeactivate(row)} style={styles.actionButton}>
                              Desactivar
                            </ActionButton>
                          ) : null}
                          {isAdmin && !row.active ? (
                            <ActionButton type="button" variant="success" onClick={() => handleOpenReactivate(row)} style={styles.actionButton}>
                              Activar
                            </ActionButton>
                          ) : null}
                        </>
                      ) : (
                        isAdmin ? (
                            <ActionButton type="button" variant="secondary" onClick={() => handleOpenCreate(row)} style={styles.actionButton}>
                              Crear ficha
                            </ActionButton>
                        ) : null
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.mode === "view" ? (
        <PatientModal
          title="Ficha administrativa"
          subtitle="Resumen administrativo y de nómina de la persona seleccionada."
          onClose={() => setModal(null)}
          wide
        >
          <EmployeeDetail row={modal.row} onClose={() => setModal(null)} />
        </PatientModal>
      ) : null}

      {modal?.mode === "create" ? (
        <PatientModal
          title="Nueva ficha administrativa"
          subtitle="Este registro se guarda en public.employees y alimenta el módulo de Nómina."
          onClose={() => setModal(null)}
          wide
        >
          <EmployeeForm
            initialValues={modal.row}
            rows={rows}
            specialists={specialists}
            loading={saving}
            onCancel={() => setModal(null)}
            onSubmit={async (payload) => {
              await onCreate(payload);
              setModal(null);
            }}
          />
        </PatientModal>
      ) : null}

      {modal?.mode === "edit" ? (
        <PatientModal
          title="Editar ficha administrativa"
          subtitle="Actualiza datos internos, salario base y frecuencia de pago sin alterar accesos del sistema."
          onClose={() => setModal(null)}
          wide
        >
          <EmployeeForm
            initialValues={modal.row}
            rows={rows}
            specialists={specialists}
            loading={saving}
            onCancel={() => setModal(null)}
            onSubmit={async (payload) => {
              await onSave(modal.row.employee_id, payload);
              setModal(null);
            }}
          />
        </PatientModal>
      ) : null}

      {modal?.mode === "create-missing" ? (
        <PatientModal
          title="Crear fichas pendientes"
          subtitle="Se completarán únicamente las especialistas operativas oficiales que todavía no tienen ficha administrativa."
          onClose={() => setModal(null)}
        >
          <div style={styles.confirmCard}>
            <div style={styles.confirmTitle}>Confirmación requerida</div>
            <div style={styles.confirmCopy}>
              Se crearán las fichas administrativas faltantes con salario RD$0.00 y frecuencia quincenal. Luego podrás completar los datos reales.
            </div>
            <div style={styles.actions}>
              <ActionButton type="button" variant="secondary" onClick={() => setModal(null)}>
                Cancelar
              </ActionButton>
              <ActionButton
                type="button"
                onClick={async () => {
                  await onCreateMissing();
                  setModal(null);
                }}
                disabled={saving}
              >
                {saving ? "Creando..." : "Crear fichas pendientes"}
              </ActionButton>
            </div>
          </div>
        </PatientModal>
      ) : null}

      {modal?.mode === "deactivate" ? (
        <PatientModal
          title="Desactivar ficha administrativa"
          subtitle="La ficha dejará de estar activa para nómina, pero no se borrará su historial."
          onClose={() => setModal(null)}
        >
          <StatusConfirmCard
            row={modal.row}
            loading={saving}
            actionLabel="Confirmar desactivación"
            description="Esta acción cambiará el estado a inactivo y conservará el historial administrativo."
            warning={modal.row.warning_access_separate ? "Esta persona todavía tiene acceso activo o una especialista operativa vinculada." : ""}
            onCancel={() => setModal(null)}
            onConfirm={async () => {
              await onDeactivate(modal.row.employee_id);
              setModal(null);
            }}
          />
        </PatientModal>
      ) : null}

      {modal?.mode === "reactivate" ? (
        <PatientModal
          title="Activar ficha administrativa"
          subtitle="La ficha volverá a estar disponible para Nómina y para la operación administrativa."
          onClose={() => setModal(null)}
        >
          <StatusConfirmCard
            row={modal.row}
            loading={saving}
            actionLabel="Confirmar activación"
            description="Esta acción reactivará la ficha administrativa y limpiará la fecha de salida."
            onCancel={() => setModal(null)}
            onConfirm={async () => {
              await onReactivate(modal.row.employee_id, modal.row);
              setModal(null);
            }}
          />
        </PatientModal>
      ) : null}
    </SectionCard>
  );
}

function EmployeeForm({ initialValues, rows, specialists, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || "",
    phone: initialValues?.phone || "",
    email: initialValues?.email || "",
    position: initialValues?.position || "",
    role: initialValues?.employee_role || initialValues?.role || "",
    specialist_id: initialValues?.specialist_id || "",
    hire_date: initialValues?.hire_date || "",
    termination_date: initialValues?.termination_date || "",
    status: initialValues?.status || "activo",
    notes: initialValues?.notes || "",
    base_salary: initialValues?.base_salary ?? 0,
    payment_frequency: initialValues?.payment_frequency || "quincenal",
  });
  const [error, setError] = useState("");

  const linkedSpecialistIds = useMemo(
    () => new Set(
      rows
        .filter((row) => row.employee_id && row.specialist_id && row.employee_id !== initialValues?.employee_id)
        .map((row) => row.specialist_id)
    ),
    [rows, initialValues?.employee_id]
  );

  const selectableSpecialists = useMemo(
    () => specialists.filter((specialist) => (
      !linkedSpecialistIds.has(specialist.id)
      || specialist.id === initialValues?.specialist_id
    )),
    [specialists, linkedSpecialistIds, initialValues?.specialist_id]
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }

    if (Number(form.base_salary || 0) < 0) {
      setError("El salario base no puede ser negativo.");
      return;
    }

    setError("");

    try {
      await onSubmit({
        ...form,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        position: form.position.trim(),
        role: form.role.trim(),
        specialist_id: form.specialist_id || null,
        hire_date: form.hire_date || null,
        termination_date: form.termination_date || null,
        notes: form.notes.trim() || null,
        base_salary: Number(form.base_salary || 0),
      });
    } catch (submitError) {
      setError(submitError.message || "No fue posible guardar la ficha administrativa.");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Datos generales</div>
        <Field label="Nombre completo *">
          <input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Cargo">
          <input value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Teléfono">
          <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Correo">
          <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Fecha de ingreso">
          <input type="date" value={form.hire_date} onChange={(event) => setForm((current) => ({ ...current, hire_date: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Fecha de salida">
          <input type="date" value={form.termination_date} onChange={(event) => setForm((current) => ({ ...current, termination_date: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Notas internas" full>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...styles.input, minHeight: 92, resize: "vertical" }} />
        </Field>
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Relación operativa</div>
        <Field label="Rol operativo">
          <input value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Especialista vinculada">
          <select value={form.specialist_id} onChange={(event) => setForm((current) => ({ ...current, specialist_id: event.target.value }))} style={styles.input}>
            <option value="">Sin vincular</option>
            {selectableSpecialists.map((specialist) => (
              <option key={specialist.id} value={specialist.id}>{specialist.full_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} style={styles.input}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </Field>
      </div>

      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Nómina</div>
        <Field label="Salario base">
          <input type="number" min="0" step="0.01" value={form.base_salary} onChange={(event) => setForm((current) => ({ ...current, base_salary: event.target.value }))} style={styles.input} />
        </Field>
        <Field label="Frecuencia de pago">
          <select value={form.payment_frequency} onChange={(event) => setForm((current) => ({ ...current, payment_frequency: event.target.value }))} style={styles.input}>
            {PAYMENT_FREQUENCY_OPTIONS.map((frequency) => (
              <option key={frequency} value={frequency}>{getPaymentFrequencyLabel(frequency)}</option>
            ))}
          </select>
        </Field>
      </div>

      <div style={styles.infoBox}>
        El acceso al sistema, el rol de autenticación y la creación de usuarias siguen gestionándose desde el módulo Usuarios.
      </div>

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar ficha"}
        </ActionButton>
      </div>
    </form>
  );
}

function EmployeeDetail({ row, onClose }) {
  return (
    <div style={styles.detailStack}>
      <div style={styles.summaryGrid}>
        <SummaryCard label="Estado" value={row.active ? "Activa" : "Inactiva"} />
        <SummaryCard label="Salario base" value={`RD$ ${formatCurrencyValue(row.base_salary)}`} />
        <SummaryCard label="Frecuencia" value={getPaymentFrequencyLabel(row.payment_frequency)} />
      </div>

      <div style={styles.detailGrid}>
        <DetailCard title="Datos generales">
          <InfoRow label="Nombre" value={row.full_name} />
          <InfoRow label="Cargo" value={row.position || "Sin cargo"} />
          <InfoRow label="Teléfono" value={row.phone || "Sin teléfono"} />
          <InfoRow label="Correo" value={row.email || "Sin correo"} />
          <InfoRow label="Ingreso" value={row.hire_date || "Sin fecha"} />
          <InfoRow label="Salida" value={row.termination_date || "Activa"} />
        </DetailCard>

        <DetailCard title="Operación y nómina">
          <InfoRow label="Especialista vinculada" value={row.specialist_name || "Sin vincular"} />
          <InfoRow label="Horario" value={row.schedule_label || "Sin horario"} />
          <InfoRow label="Rol del sistema" value={getSystemRoleLabel(row.system_role)} />
          <InfoRow label="Acceso" value={row.has_system_access ? "Con acceso" : "Sin acceso"} />
          <InfoRow label="Frecuencia" value={getPaymentFrequencyLabel(row.payment_frequency)} />
          <InfoRow label="Salario base" value={`RD$ ${formatCurrencyValue(row.base_salary)}`} />
        </DetailCard>
      </div>

      <DetailCard title="Notas">
        <div style={styles.secondaryCell}>{row.notes || "Sin observaciones internas."}</div>
      </DetailCard>

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </ActionButton>
      </div>
    </div>
  );
}

function StatusConfirmCard({ row, description, warning = "", actionLabel, onCancel, onConfirm, loading }) {
  return (
    <div style={styles.confirmCard}>
      <div style={styles.confirmTitle}>{row.full_name}</div>
      <div style={styles.confirmCopy}>{description}</div>
      {warning ? <div style={styles.warningBox}>{warning}</div> : null}
      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton type="button" onClick={onConfirm} disabled={loading}>
          {loading ? "Guardando..." : actionLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.summaryCard}>
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

function SourceBadge({ sourceStatus }) {
  const config = {
    ficha_completa: { label: "Ficha completa", tone: "success" },
    especialista_sin_ficha: { label: "Ficha pendiente", tone: "warning" },
    usuario_sin_ficha: { label: "Usuario sin ficha", tone: "warning" },
    administrativo: { label: "Administración", tone: "neutral" },
  }[sourceStatus] || { label: "Equipo", tone: "neutral" };

  return <MetaBadge label={config.label} tone={config.tone} />;
}

function MetaBadge({ label, tone = "neutral" }) {
  return (
    <span
      style={{
        ...styles.metaBadge,
        ...(tone === "success" ? styles.metaBadgeSuccess : {}),
        ...(tone === "warning" ? styles.metaBadgeWarning : {}),
      }}
    >
      {label}
    </span>
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

function mapStatusToBadge(status) {
  if (status === "activo") return "confirmada";
  if (status === "suspendido") return "pendiente";
  return "cancelada";
}

function getSystemRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "recepcion") return "Recepción";
  if (role === "especialista") return "Especialista";
  return "Sin acceso";
}

function getPaymentFrequencyLabel(value) {
  if (value === "semanal") return "Semanal";
  if (value === "quincenal") return "Quincenal";
  if (value === "mensual") return "Mensual";
  return "Sin definir";
}

function formatCurrencyValue(value) {
  return new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const styles = {
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 16,
  },
  summaryCard: {
    background: "#FCFAF6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 20,
    padding: 16,
  },
  summaryLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  summaryValue: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 26,
    fontWeight: 700,
    marginTop: 10,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  filterGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: 4,
    background: "#F7F1E8",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 999,
  },
  filterButton: {
    border: "none",
    background: "transparent",
    color: BRANDING.colors.textMuted,
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  filterButtonActive: {
    background: BRANDING.colors.primaryStrong,
    color: "#FFFFFF",
  },
  toolbarHint: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1180 },
  head: {
    textAlign: "left",
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    padding: "0 0 14px",
    borderBottom: "1px solid #F0E8E1",
    fontWeight: 700,
  },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 8px 16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "top" },
  primaryCell: { fontWeight: 700, color: BRANDING.colors.primaryStrong },
  secondaryCell: { fontSize: 12, color: BRANDING.colors.textMuted, marginTop: 4, lineHeight: 1.6 },
  badgeRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  metaBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#F3ECE1",
    color: BRANDING.colors.primaryStrong,
    fontSize: 11,
    fontWeight: 700,
  },
  metaBadgeSuccess: {
    background: "#EAF4EE",
    color: "#256347",
  },
  metaBadgeWarning: {
    background: "#FBF1DC",
    color: "#8A6844",
  },
  columnStack: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  microCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
  },
  linkButton: {
    background: "transparent",
    border: "none",
    color: BRANDING.colors.secondary,
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  actionGroup: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionButton: { padding: "10px 12px", borderRadius: 14 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    background: "#FCFAF6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    padding: 18,
  },
  formSectionTitle: { gridColumn: "1 / -1", color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 17 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#FCFAF7",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 14,
    padding: "14px 15px",
    color: BRANDING.colors.text,
    fontSize: 14,
    outline: "none",
  },
  infoBox: {
    background: "#F7F0E3",
    border: `1px solid ${BRANDING.colors.border}`,
    color: BRANDING.colors.textMuted,
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.6,
  },
  warningBox: {
    background: "#FFF4DA",
    border: "1px solid #F0DEC0",
    color: "#8A6844",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.6,
  },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" },
  emptyActions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  errorBanner: {
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
  confirmCard: { display: "flex", flexDirection: "column", gap: 14 },
  confirmTitle: { color: BRANDING.colors.primaryStrong, fontSize: 20, fontWeight: 700 },
  confirmCopy: { color: BRANDING.colors.textMuted, fontSize: 14, lineHeight: 1.7 },
  detailStack: { display: "flex", flexDirection: "column", gap: 16 },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  detailCard: {
    background: "#FCFAF6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 22,
    padding: 18,
  },
  detailTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
  },
  detailContent: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    borderBottom: "1px solid #F3EADF",
    paddingBottom: 10,
  },
  infoLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    fontWeight: 600,
  },
  infoValue: {
    color: BRANDING.colors.text,
    fontSize: 14,
    fontWeight: 600,
    textAlign: "right",
  },
};
