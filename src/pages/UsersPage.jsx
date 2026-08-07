import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import PatientModal from "../components/patients/PatientModal";
import CreateUserModal from "../components/users/CreateUserModal";
import ActionButton from "../components/ui/ActionButton";
import DashboardCard from "../components/ui/DashboardCard";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";
import { getRoleLabel, USER_ROLES } from "../lib/roles";
import { createUserAccount, fetchUserProfiles, updateUserProfile } from "../services/userManagement";

export default function UsersPage() {
  const { profile: currentProfile, isAdmin } = useAuth();
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
    setFeedback((current) => (current.type === "error" ? current : { type: "", message: "" }));

    try {
      const result = await fetchUserProfiles();
      setProfiles(result?.profiles || []);
      setSpecialists(result?.specialists || []);
    } catch (error) {
      console.error("Users page load error", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      setFeedback({
        type: "error",
        message: error.message || "No fue posible cargar los usuarios del panel.",
      });
      setProfiles([]);
      setSpecialists([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(payload, selectedProfile) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await updateUserProfile(selectedProfile.id, payload, currentProfile);
      setModalState(null);
      setFeedback({ type: "success", message: "Perfil actualizado correctamente." });
      await loadUsers();
    } catch (error) {
      console.error("Users page save error", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      setFeedback({ type: "error", message: error.message || "No fue posible actualizar el perfil." });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(payload) {
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await createUserAccount(payload, currentProfile);
      setModalState(null);
      setFeedback({ type: "success", message: "Usuario creado correctamente." });
      await loadUsers();
    } catch (error) {
      console.error("Users page create error", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      setFeedback({ type: "error", message: error.message || "No fue posible crear el usuario." });
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
      title: "Recepción",
      value: profiles.filter((profile) => profile.role === USER_ROLES.RECEPTION).length,
      description: "Agenda y facturación básica.",
    },
    {
      title: "Especialistas",
      value: profiles.filter((profile) => profile.role === USER_ROLES.SPECIALIST).length,
      description: "Perfiles clínicos vinculados.",
    },
    {
      title: "Usuarios activos",
      value: profiles.filter((profile) => profile.active !== false).length,
      description: "Accesos disponibles para iniciar sesión.",
    },
  ]), [profiles]);

  const columns = [
    {
      key: "full_name",
      label: "Nombre",
      render: (profile) => (
        <div>
          <div style={styles.name}>{profile.full_name || "Sin nombre"}</div>
          <div style={styles.meta}>{profile.id}</div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Correo",
      render: () => <span style={styles.mutedCopy}>Gestionado en Supabase Auth</span>,
    },
    {
      key: "role",
      label: "Rol",
      render: (profile) => <span style={styles.roleBadge}>{getRoleLabel(profile.role)}</span>,
    },
    {
      key: "position",
      label: "Cargo",
      render: (profile) => profile.position || "Sin cargo",
    },
    {
      key: "specialist",
      label: "Especialista vinculada",
      render: (profile) => profile.specialistLabel,
    },
    {
      key: "status",
      label: "Estado",
      render: (profile) => (
        <StatusBadge status={profile.active === false ? "cancelada" : "confirmada"} />
      ),
    },
    {
      key: "created_at",
      label: "Creación",
      render: (profile) => profile.created_at ? new Date(profile.created_at).toLocaleDateString("es-DO") : "—",
    },
    {
      key: "actions",
      label: "Acciones",
      render: (profile) => (
        <div style={styles.actions}>
          <ActionButton variant="secondary" onClick={() => setModalState({ mode: "view", profile })} style={styles.smallButton}>
            Ver
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => setModalState({ mode: "edit", profile })} style={styles.smallButton}>
            Editar
          </ActionButton>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Accesos y perfiles"
          title="Usuarios"
          subtitle="Gestión de accesos, roles, estados y vínculo con especialistas desde una vista administrativa clara y consistente."
          actions={isAdmin ? (
            <ActionButton onClick={() => setModalState({ mode: "create" })}>
              + Nuevo usuario
            </ActionButton>
          ) : null}
        />

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

        <SectionCard
          title="Listado de perfiles"
          subtitle="Perfiles leídos desde public.profiles y vinculados a public.specialists cuando aplica."
        >
          {loading ? (
            <div style={styles.loadingCopy}>Cargando usuarios...</div>
          ) : feedback.type === "error" && !profiles.length ? (
            <EmptyState
              title="No se pudo cargar Usuarios."
              description={feedback.message || "Ocurrió un error al consultar los perfiles del panel."}
              action={<ActionButton onClick={loadUsers}>Reintentar</ActionButton>}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={profiles}
              emptyState={(
                <EmptyState
                  title="No hay usuarios registrados en el panel."
                  description="Cuando existan perfiles en public.profiles, los verás aquí con su rol, estado y especialista vinculada."
                  action={isAdmin ? (
                    <ActionButton onClick={() => setModalState({ mode: "create" })}>
                      Crear primer usuario
                    </ActionButton>
                  ) : null}
                />
              )}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Permisos por rol"
          subtitle="Referencia visual de los accesos previstos para cada tipo de usuario."
        >
          <div style={styles.permissionsGrid}>
            <RoleCard
              title="Admin"
              items={[
                "Acceso total al sistema",
                "Usuarios y configuración",
                "Reportes globales",
                "Facturación, inventario y comisiones",
              ]}
            />
            <RoleCard
              title="Recepción"
              items={[
                "Pacientes",
                "Agenda",
                "Facturación básica",
              ]}
            />
            <RoleCard
              title="Especialista"
              items={[
                "Agenda asignada",
                "Sesiones láser",
                "Historial de pacientes relacionados",
              ]}
            />
          </div>
        </SectionCard>
      </div>

      {modalState?.mode === "edit" ? (
        <PatientModal
          title="Editar usuario"
          subtitle="Actualiza nombre, rol, estado, cargo visible y especialista vinculada."
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
            <DetailRow label="Cargo" value={modalState.profile?.position || "Sin cargo"} />
            <DetailRow label="Estado" value={modalState.profile?.active === false ? "Inactivo" : "Activo"} />
            <DetailRow label="Especialista vinculada" value={modalState.profile?.specialistLabel} />
            <DetailRow label="UID" value={modalState.profile?.id} />
            <DetailRow label="Creado" value={modalState.profile?.created_at ? new Date(modalState.profile.created_at).toLocaleString("es-DO") : "—"} />
          </div>
        </PatientModal>
      ) : null}

      {modalState?.mode === "create" ? (
        <PatientModal
          title="Nuevo usuario"
          subtitle="Crea el acceso en Supabase Auth y el perfil interno del panel."
          onClose={() => setModalState(null)}
        >
          <CreateUserModal
            specialists={specialists}
            onCancel={() => setModalState(null)}
            onSubmit={handleCreateUser}
            loading={saving}
          />
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
    position: initialValues?.position || "",
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
      position: form.position.trim(),
      specialist_id: form.role === USER_ROLES.SPECIALIST || form.role === USER_ROLES.ADMIN
        ? form.specialist_id || null
        : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.formSection}>
        <div style={styles.formSectionTitle}>Datos del perfil</div>
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
              <option value={USER_ROLES.RECEPTION}>Recepción</option>
              <option value={USER_ROLES.SPECIALIST}>Especialista</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Cargo visible</label>
            <input
              type="text"
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
              style={styles.input}
            />
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
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Guardando..." : submitLabel}
        </ActionButton>
      </div>
    </form>
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
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 },
  successBanner: { background: BRANDING.colors.successSoft, border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 18, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  loadingCopy: { color: BRANDING.colors.textMuted, fontSize: 14, padding: "6px 0" },
  name: { color: BRANDING.colors.primaryStrong, fontWeight: 700 },
  meta: { color: BRANDING.colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 1.5, wordBreak: "break-all" },
  mutedCopy: { color: BRANDING.colors.textMuted, fontSize: 13 },
  roleBadge: { display: "inline-flex", padding: "6px 10px", borderRadius: 999, border: "1px solid #D8E7DF", background: "#EEF5F1", color: BRANDING.colors.primaryStrong, fontSize: 12, fontWeight: 700 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  smallButton: { padding: "10px 12px", borderRadius: 14 },
  permissionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  permissionCard: { background: "#FCFAF4", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  permissionTitle: { color: BRANDING.colors.primaryStrong, fontSize: 16, fontWeight: 700 },
  permissionList: { display: "flex", flexDirection: "column", gap: 8 },
  permissionItem: { color: BRANDING.colors.textMuted, fontSize: 14, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formSection: { display: "flex", flexDirection: "column", gap: 16, background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 24, padding: 18 },
  formSectionTitle: { color: BRANDING.colors.primaryStrong, fontWeight: 700, fontSize: 17 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: BRANDING.colors.card, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  inputDisabled: { background: "#F1EFEA", color: "#7A716A" },
  detailWrap: { display: "flex", flexDirection: "column", gap: 12 },
  detailRow: { background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 18, padding: 14 },
  detailLabel: { color: "#9C8E84", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  detailValue: { color: "#2A2522", fontSize: 15, marginTop: 6, lineHeight: 1.5 },
};
