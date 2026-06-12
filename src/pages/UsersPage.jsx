import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import PatientModal from "../components/patients/PatientModal";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import { BRANDING } from "../lib/branding";
import { getRoleLabel, USER_ROLES } from "../lib/roles";
import { fetchUserProfiles, updateUserProfile } from "../services/userManagement";

export default function UsersPage() {
  const [profiles, setProfiles] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [modalState, setModalState] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const result = await fetchUserProfiles();
      setProfiles(result.profiles);
      setSpecialists(result.specialists);
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible cargar los usuarios del panel." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(payload, currentProfile) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await updateUserProfile(currentProfile.id, payload);
      setModalState(null);
      setFeedback({ type: "success", message: "Perfil actualizado correctamente." });
      await loadUsers();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar el perfil." });
    } finally {
      setSaving(false);
    }
  }

  const metrics = useMemo(() => ([
    {
      title: "Total usuarios",
      value: profiles.length,
      description: "Perfiles registrados en el panel.",
    },
    {
      title: "Administradores",
      value: profiles.filter((profile) => profile.role === USER_ROLES.ADMIN || profile.role === USER_ROLES.OWNER).length,
      description: "Acceso total al sistema.",
    },
    {
      title: "Recepcion",
      value: profiles.filter((profile) => profile.role === USER_ROLES.RECEPTION).length,
      description: "Agenda y facturacion basica.",
    },
    {
      title: "Especialistas",
      value: profiles.filter((profile) => profile.role === USER_ROLES.SPECIALIST).length,
      description: "Perfiles clinicos vinculados.",
    },
    {
      title: "Usuarios activos",
      value: profiles.filter((profile) => profile.active !== false).length,
      description: "Accesos disponibles para iniciar sesion.",
    },
  ]), [profiles]);

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Usuarios</h1>
            <p style={styles.subtitle}>Gestion de accesos, roles y seguridad del equipo.</p>
          </div>
          <button type="button" onClick={() => setModalState({ mode: "create" })} style={styles.primaryButton}>
            + Nuevo usuario
          </button>
        </div>

        <div style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <DashboardCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              description={metric.description}
              accent={{ background: BRANDING.colors.primarySoft, color: BRANDING.colors.primaryStrong }}
            />
          ))}
        </div>

        {feedback.message ? (
          <div style={feedback.type === "error" ? styles.errorBanner : styles.successBanner}>
            {feedback.message}
          </div>
        ) : null}

        <SectionCard title="Listado de perfiles" subtitle="Perfiles leidos desde public.profiles y vinculados a public.specialists cuando aplica.">
          {loading ? (
            <div style={styles.loadingCopy}>Cargando usuarios...</div>
          ) : profiles.length === 0 ? (
            <EmptyState
              title="No hay usuarios registrados en el panel."
              description="Cuando existan perfiles en public.profiles, los veras listados aqui con su rol, estado y especialista vinculada."
              action={(
                <button type="button" onClick={() => setModalState({ mode: "create" })} style={styles.primaryButton}>
                  Crear primer usuario
                </button>
              )}
            />
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.head}>Nombre</th>
                    <th style={styles.head}>Correo</th>
                    <th style={styles.head}>Rol</th>
                    <th style={styles.head}>Especialista vinculada</th>
                    <th style={styles.head}>Estado</th>
                    <th style={styles.head}>Creacion</th>
                    <th style={styles.head}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} style={styles.row}>
                      <td style={styles.cell}>
                        <div style={styles.name}>{profile.full_name || "Sin nombre"}</div>
                        <div style={styles.meta}>{profile.id}</div>
                      </td>
                      <td style={styles.cell}>Gestionado en Supabase Auth</td>
                      <td style={styles.cell}>{getRoleLabel(profile.role)}</td>
                      <td style={styles.cell}>{profile.specialistLabel}</td>
                      <td style={styles.cell}>
                        <StatusBadge status={profile.active === false ? "cancelada" : "confirmada"} />
                      </td>
                      <td style={styles.cell}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</td>
                      <td style={styles.cell}>
                        <div style={styles.actions}>
                          <button type="button" onClick={() => setModalState({ mode: "view", profile })} style={styles.actionButton}>
                            Ver
                          </button>
                          <button type="button" onClick={() => setModalState({ mode: "edit", profile })} style={styles.actionButtonPrimary}>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Permisos por rol" subtitle="Referencia visual de los accesos previstos para cada tipo de usuario.">
          <div style={styles.permissionsGrid}>
            <RoleCard
              title="Admin"
              items={[
                "Acceso total al sistema",
                "Usuarios y configuracion",
                "Reportes globales",
                "Facturacion, inventario y comisiones",
              ]}
            />
            <RoleCard
              title="Recepcion"
              items={[
                "Pacientes",
                "Agenda",
                "Facturacion basica",
              ]}
            />
            <RoleCard
              title="Especialista"
              items={[
                "Agenda asignada",
                "Sesiones laser",
                "Historial de pacientes relacionados",
              ]}
            />
          </div>
        </SectionCard>
      </div>

      {modalState?.mode === "edit" ? (
        <PatientModal
          title="Editar usuario"
          subtitle="Actualiza nombre, rol, estado y especialista vinculada."
          onClose={() => setModalState(null)}
        >
          <UserProfileForm
            initialValues={modalState.profile}
            specialists={specialists}
            submitLabel="Guardar cambios"
            onSubmit={(payload) => handleSaveProfile(payload, modalState.profile)}
            onCancel={() => setModalState(null)}
            loading={saving}
          />
        </PatientModal>
      ) : null}

      {modalState?.mode === "view" ? (
        <PatientModal
          title="Detalle de usuario"
          subtitle="Resumen del perfil y accesos asociados."
          onClose={() => setModalState(null)}
        >
          <div style={styles.detailWrap}>
            <DetailRow label="Nombre" value={modalState.profile?.full_name} />
            <DetailRow label="Rol" value={getRoleLabel(modalState.profile?.role)} />
            <DetailRow label="Estado" value={modalState.profile?.active === false ? "Inactivo" : "Activo"} />
            <DetailRow label="Especialista vinculada" value={modalState.profile?.specialistLabel} />
            <DetailRow label="UID" value={modalState.profile?.id} />
            <DetailRow label="Creado" value={modalState.profile?.created_at ? new Date(modalState.profile.created_at).toLocaleString() : "-"} />
          </div>
        </PatientModal>
      ) : null}

      {modalState?.mode === "create" ? (
        <PatientModal
          title="Nuevo usuario"
          subtitle="Formulario preparado para alta de accesos del equipo."
          onClose={() => setModalState(null)}
        >
          <PreparedUserCreationForm specialists={specialists} onCancel={() => setModalState(null)} />
        </PatientModal>
      ) : null}
    </AppLayout>
  );
}

function UserProfileForm({ initialValues, specialists, submitLabel, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || "",
    role: initialValues?.role || USER_ROLES.SPECIALIST,
    active: initialValues?.active !== false,
    specialist_id: initialValues?.specialist_id || "",
  });
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.full_name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }

    if (form.role === USER_ROLES.SPECIALIST && !form.specialist_id) {
      setError("Debes vincular una especialista para este perfil.");
      return;
    }

    onSubmit({
      full_name: form.full_name.trim(),
      role: form.role,
      active: form.active,
      specialist_id: form.role === USER_ROLES.SPECIALIST || form.role === USER_ROLES.ADMIN
        ? form.specialist_id || null
        : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div>
        <label style={styles.label}>Nombre completo</label>
        <input
          type="text"
          value={form.full_name}
          onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
          style={styles.input}
        />
      </div>

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>Rol</label>
          <select
            value={form.role}
            onChange={(event) => setForm((current) => ({
              ...current,
              role: event.target.value,
              specialist_id: event.target.value === USER_ROLES.SPECIALIST || event.target.value === USER_ROLES.ADMIN
                ? current.specialist_id
                : "",
            }))}
            style={styles.input}
          >
            <option value={USER_ROLES.ADMIN}>Admin</option>
            <option value={USER_ROLES.RECEPTION}>Recepcion</option>
            <option value={USER_ROLES.SPECIALIST}>Especialista</option>
          </select>
        </div>

        <div>
          <label style={styles.label}>Estado</label>
          <select
            value={form.active ? "true" : "false"}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === "true" }))}
            style={styles.input}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      <div>
        <label style={styles.label}>Especialista vinculada</label>
        <select
          value={form.specialist_id}
          onChange={(event) => setForm((current) => ({ ...current, specialist_id: event.target.value }))}
          disabled={form.role !== USER_ROLES.SPECIALIST && form.role !== USER_ROLES.ADMIN}
          style={{
            ...styles.input,
            ...((form.role !== USER_ROLES.SPECIALIST && form.role !== USER_ROLES.ADMIN) ? styles.inputDisabled : {}),
          }}
        >
          <option value="">Sin vincular</option>
          {specialists.map((specialist) => (
            <option key={specialist.id} value={specialist.id}>
              {specialist.full_name}
            </option>
          ))}
        </select>
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>
          {loading ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function PreparedUserCreationForm({ specialists, onCancel }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    temporaryPassword: "",
    role: USER_ROLES.SPECIALIST,
    specialist_id: "",
  });

  return (
    <div style={styles.form}>
      <div style={styles.infoBanner}>
        La creacion automatica de usuarios requiere configuracion segura del backend.
      </div>

      <div>
        <label style={styles.label}>Nombre completo</label>
        <input type="text" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} style={styles.input} />
      </div>

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>Correo electronico</label>
          <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Contrasena temporal</label>
          <input type="text" value={form.temporaryPassword} onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))} style={styles.input} />
        </div>
      </div>

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>Rol</label>
          <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} style={styles.input}>
            <option value={USER_ROLES.ADMIN}>Admin</option>
            <option value={USER_ROLES.RECEPTION}>Recepcion</option>
            <option value={USER_ROLES.SPECIALIST}>Especialista</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Especialista vinculada</label>
          <select value={form.specialist_id} onChange={(event) => setForm((current) => ({ ...current, specialist_id: event.target.value }))} style={styles.input}>
            <option value="">Sin vincular</option>
            {specialists.map((specialist) => (
              <option key={specialist.id} value={specialist.id}>
                {specialist.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cerrar</button>
        <button type="button" style={{ ...styles.primaryButton, opacity: 0.6, cursor: "not-allowed" }} disabled>
          Creacion pendiente
        </button>
      </div>
    </div>
  );
}

function RoleCard({ title, items }) {
  return (
    <div style={styles.permissionCard}>
      <div style={styles.permissionTitle}>{title}</div>
      <div style={styles.permissionList}>
        {items.map((item) => (
          <div key={item} style={styles.permissionItem}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value || "-"}</div>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" },
  title: { color: BRANDING.colors.primaryStrong, fontSize: 34, fontWeight: 700, margin: 0 },
  subtitle: { color: BRANDING.colors.textMuted, fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 },
  primaryButton: { background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`, color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: BRANDING.colors.primaryStrong, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  successBanner: { background: BRANDING.colors.successSoft, border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  infoBanner: { background: "#EEF5F1", border: `1px solid ${BRANDING.colors.border}`, color: BRANDING.colors.primaryStrong, borderRadius: 16, padding: "14px 16px", fontSize: 14, lineHeight: 1.6 },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14, padding: "6px 0" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  head: { textAlign: "left", color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: `1px solid ${BRANDING.colors.border}`, fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: BRANDING.colors.text, fontSize: 14, verticalAlign: "middle" },
  name: { color: BRANDING.colors.primaryStrong, fontWeight: 700 },
  meta: { color: BRANDING.colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 1.5, wordBreak: "break-all" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  actionButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  actionButtonPrimary: { background: BRANDING.colors.primarySoft, color: BRANDING.colors.primaryStrong, border: "1px solid #D3E7DE", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  permissionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  permissionCard: { background: "#FCFAF4", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  permissionTitle: { color: BRANDING.colors.primaryStrong, fontSize: 16, fontWeight: 700 },
  permissionList: { display: "flex", flexDirection: "column", gap: 8 },
  permissionItem: { color: BRANDING.colors.textMuted, fontSize: 14, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#FCFAF7", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  inputDisabled: { background: "#F1EFEA", color: "#7A716A" },
  detailWrap: { display: "flex", flexDirection: "column", gap: 12 },
  detailRow: { borderBottom: "1px solid #F3ECE6", paddingBottom: 10 },
  detailLabel: { color: "#9C8E84", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  detailValue: { color: "#2A2522", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
};
