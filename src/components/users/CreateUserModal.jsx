import { useState } from "react";
import { USER_ROLES } from "../../lib/roles";
import ActionButton from "../ui/ActionButton";
import { BRANDING } from "../../lib/branding";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function CreateUserModal({ specialists, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: USER_ROLES.SPECIALIST,
    specialist_id: "",
    position: "",
    active: true,
  });
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.full_name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Debes indicar un correo electrónico válido.");
      return;
    }

    if (!form.password || form.password.length < 8) {
      setError("La contraseña temporal debe tener al menos 8 caracteres.");
      return;
    }

    if (form.role === USER_ROLES.SPECIALIST && !form.specialist_id) {
      setError("Debes vincular una especialista para este usuario.");
      return;
    }

    onSubmit({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      position: form.position.trim(),
      specialist_id: form.role === USER_ROLES.RECEPTION ? null : form.specialist_id || null,
      active: form.active,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.infoBanner}>
        La creación se realiza mediante una Edge Function segura. La contraseña no se guarda en perfiles y solo se usa para crear el acceso en Supabase Auth.
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Acceso principal</div>
        <div>
          <label style={styles.label}>Nombre completo *</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            style={styles.input}
          />
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Correo electrónico *</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Contraseña temporal *</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Permisos y vínculo</div>
        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Rol *</label>
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({
                ...current,
                role: event.target.value,
                specialist_id: event.target.value === USER_ROLES.RECEPTION ? "" : current.specialist_id,
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
              placeholder="Ej. Cosmetóloga"
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

        {(form.role === USER_ROLES.SPECIALIST || form.role === USER_ROLES.ADMIN) ? (
          <div>
            <label style={styles.label}>
              Especialista vinculada {form.role === USER_ROLES.SPECIALIST ? "*" : "(opcional)"}
            </label>
            <select
              value={form.specialist_id}
              onChange={(event) => setForm((current) => ({ ...current, specialist_id: event.target.value }))}
              style={styles.input}
            >
              <option value="">Sin vincular</option>
              {specialists.map((specialist) => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.full_name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.helperCopy}>
        Roles válidos actualmente: admin, recepción y especialista. La función segura de creación no acepta otros valores todavía.
      </div>

      <div style={styles.actions}>
        <ActionButton type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </ActionButton>
        <ActionButton type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear usuario"}
        </ActionButton>
      </div>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  section: { display: "flex", flexDirection: "column", gap: 16, background: "#FCFAF6", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 24, padding: 18 },
  sectionTitle: { color: BRANDING.colors.primaryStrong, fontSize: 17, fontWeight: 700 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: BRANDING.colors.card, border: `1px solid ${BRANDING.colors.border}`, borderRadius: 16, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" },
  infoBanner: { background: "#EEF5F1", border: "1px solid #D8E7DF", color: "#12382F", borderRadius: 18, padding: "14px 16px", fontSize: 14, lineHeight: 1.6 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  helperCopy: { color: "#6F6258", fontSize: 13, lineHeight: 1.6 },
};
