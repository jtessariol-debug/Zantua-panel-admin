import { useEffect, useState } from "react";
import BrandMark from "../ui/BrandMark";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";
import PreparedNotice from "./PreparedNotice";

export default function IdentitySettingsCard({ value, persistenceAvailable, onSave, saving }) {
  const [form, setForm] = useState(value);

  useEffect(() => {
    setForm(value);
  }, [value]);

  function updateField(field, nextValue) {
    setForm((current) => ({ ...current, [field]: nextValue }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <SectionCard title="Identidad del centro" subtitle="Datos institucionales, imagen de marca y referencia del panel.">
      {!persistenceAvailable ? <PreparedNotice /> : null}

      <form onSubmit={handleSubmit} style={styles.grid}>
        <div style={styles.previewCard}>
          <div style={styles.previewLabel}>Logo actual</div>
          <BrandMark size={96} corner={24} />
          <div style={styles.previewName}>{form.center_name || BRANDING.centerName}</div>
          <div style={styles.previewAddress}>{form.address || BRANDING.centerAddress}</div>
        </div>

        <div style={styles.formGrid}>
          <Field label="Ruta del logo">
            <input value={form.logo_path || ""} onChange={(event) => updateField("logo_path", event.target.value)} style={styles.input} />
          </Field>

          <Field label="Nombre del centro">
            <input value={form.center_name || ""} onChange={(event) => updateField("center_name", event.target.value)} style={styles.input} />
          </Field>

          <Field label="Dirección" full>
            <textarea value={form.address || ""} onChange={(event) => updateField("address", event.target.value)} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />
          </Field>

          <Field label="Teléfono">
            <input value={form.phone || ""} onChange={(event) => updateField("phone", event.target.value)} style={styles.input} />
          </Field>

          <Field label="Correo">
            <input value={form.email || ""} onChange={(event) => updateField("email", event.target.value)} style={styles.input} />
          </Field>

          <Field label="Moneda">
            <input value={form.currency || "RD$"} onChange={(event) => updateField("currency", event.target.value)} style={styles.input} />
          </Field>

          <div style={styles.paletteWrap}>
            <div style={styles.fieldLabel}>Paleta activa</div>
            <div style={styles.paletteRow}>
              {[BRANDING.colors.primary, BRANDING.colors.secondary, BRANDING.colors.background, BRANDING.colors.card].map((color) => (
                <div key={color} style={styles.swatchBlock}>
                  <div style={{ ...styles.swatch, background: color }} />
                  <span style={styles.swatchText}>{color}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? "Guardando..." : "Guardar identidad"}
            </button>
          </div>
        </div>
      </form>
    </SectionCard>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 18,
  },
  previewCard: {
    background: "#FCFAF4",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 22,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "flex-start",
  },
  previewLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  previewName: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    fontWeight: 700,
  },
  previewAddress: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    alignContent: "start",
  },
  fieldLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 6,
  },
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
  paletteWrap: {
    gridColumn: "1 / -1",
  },
  paletteRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  swatchBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 14,
    border: `1px solid ${BRANDING.colors.border}`,
  },
  swatchText: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    fontWeight: 600,
  },
  actions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
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
};
