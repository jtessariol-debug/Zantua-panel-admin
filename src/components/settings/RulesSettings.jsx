import { useEffect, useState } from "react";
import ActionButton from "../ui/ActionButton";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";
import PreparedNotice from "./PreparedNotice";

export default function RulesSettings({
  title,
  subtitle,
  value,
  persistenceAvailable,
  onSave,
  saving,
  renderFields,
}) {
  const [form, setForm] = useState(value);

  useEffect(() => {
    setForm(value);
  }, [value]);

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {!persistenceAvailable ? <PreparedNotice /> : null}
      <form onSubmit={handleSubmit} style={styles.form}>
        {renderFields(form, setForm)}
        <div style={styles.actions}>
          <ActionButton type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </ActionButton>
        </div>
      </form>
    </SectionCard>
  );
}

export function SettingsField({ label, children, full = false }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

export function SettingsInput(props) {
  return <input {...props} style={{ ...styles.input, ...(props.style || {}) }} />;
}

export function SettingsTextarea(props) {
  return <textarea {...props} style={{ ...styles.input, minHeight: 110, resize: "vertical", ...(props.style || {}) }} />;
}

export function SettingsSelect(props) {
  return <select {...props} style={{ ...styles.input, ...(props.style || {}) }} />;
}

export function SettingsCheckbox({ checked, onChange, label }) {
  return (
    <label style={styles.toggleRow}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

const styles = {
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  fieldLabel: { color: BRANDING.colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 14, padding: "14px 15px", color: BRANDING.colors.text, fontSize: 14, outline: "none" },
  toggleRow: { display: "inline-flex", alignItems: "center", gap: 8, color: BRANDING.colors.textMuted, fontSize: 13, fontWeight: 600 },
  actions: { gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" },
};
