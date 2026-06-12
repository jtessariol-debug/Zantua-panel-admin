import { useEffect, useState } from "react";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";
import PreparedNotice from "./PreparedNotice";

export default function SchedulesSettings({
  specialists,
  rules,
  persistenceAvailable,
  onSaveRules,
  onSaveSpecialist,
  savingRules,
  savingSpecialistId,
}) {
  const [form, setForm] = useState(rules);

  useEffect(() => {
    setForm(rules);
  }, [rules]);

  function handleRulesSubmit(event) {
    event.preventDefault();
    onSaveRules({
      ...form,
      default_duration_minutes: Number(form.default_duration_minutes || 40),
      min_patients_per_specialist: Number(form.min_patients_per_specialist || 7),
      max_patients_per_specialist: Number(form.max_patients_per_specialist || 9),
    });
  }

  return (
    <div style={styles.stack}>
      <SectionCard title="Horarios generales" subtitle="Parámetros operativos del centro y capacidad base de agenda.">
        {!persistenceAvailable ? <PreparedNotice /> : null}
        <form onSubmit={handleRulesSubmit} style={styles.rulesGrid}>
          <Field label="Apertura">
            <input type="time" value={form.center_open || ""} onChange={(event) => setForm((current) => ({ ...current, center_open: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Cierre">
            <input type="time" value={form.center_close || ""} onChange={(event) => setForm((current) => ({ ...current, center_close: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Duración estándar (minutos)">
            <input type="number" min="10" value={form.default_duration_minutes || 40} onChange={(event) => setForm((current) => ({ ...current, default_duration_minutes: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Mínimo de pacientes por especialista">
            <input type="number" min="1" value={form.min_patients_per_specialist || 7} onChange={(event) => setForm((current) => ({ ...current, min_patients_per_specialist: event.target.value }))} style={styles.input} />
          </Field>
          <Field label="Máximo de pacientes por especialista">
            <input type="number" min="1" value={form.max_patients_per_specialist || 9} onChange={(event) => setForm((current) => ({ ...current, max_patients_per_specialist: event.target.value }))} style={styles.input} />
          </Field>
          <div style={styles.rulesAction}>
            <button type="submit" style={styles.primaryButton} disabled={savingRules}>
              {savingRules ? "Guardando..." : "Guardar reglas"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Horarios por especialista" subtitle="Edita disponibilidad, agenda abierta y estado operativo de cada especialista.">
        <div style={styles.specialistList}>
          {specialists.map((specialist) => (
            <SpecialistCard
              key={specialist.id}
              specialist={specialist}
              saving={savingSpecialistId === specialist.id}
              onSave={onSaveSpecialist}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function SpecialistCard({ specialist, onSave, saving }) {
  const [form, setForm] = useState({
    full_name: specialist.full_name || "",
    start_time: specialist.start_time || "",
    end_time: specialist.end_time || "",
    has_open_schedule: Boolean(specialist.has_open_schedule),
    active: specialist.active !== false,
  });

  useEffect(() => {
    setForm({
      full_name: specialist.full_name || "",
      start_time: specialist.start_time || "",
      end_time: specialist.end_time || "",
      has_open_schedule: Boolean(specialist.has_open_schedule),
      active: specialist.active !== false,
    });
  }, [specialist]);

  function handleSubmit(event) {
    event.preventDefault();
    onSave(specialist.id, {
      full_name: form.full_name,
      start_time: form.has_open_schedule ? null : form.start_time || null,
      end_time: form.has_open_schedule ? null : form.end_time || null,
      has_open_schedule: form.has_open_schedule,
      active: form.active,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.specialistCard}>
      <div style={styles.specialistHeader}>
        <div style={styles.specialistName}>{specialist.full_name}</div>
        <label style={styles.toggleRow}>
          <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
          Activa
        </label>
      </div>

      <div style={styles.specialistFields}>
        <Field label="Inicio">
          <input type="time" value={form.start_time || ""} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} disabled={form.has_open_schedule} style={styles.input} />
        </Field>
        <Field label="Fin">
          <input type="time" value={form.end_time || ""} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} disabled={form.has_open_schedule} style={styles.input} />
        </Field>
      </div>

      <label style={styles.toggleRow}>
        <input type="checkbox" checked={form.has_open_schedule} onChange={(event) => setForm((current) => ({ ...current, has_open_schedule: event.target.checked }))} />
        Agenda abierta
      </label>

      <div style={styles.specialistAction}>
        <button type="submit" style={styles.secondaryButton} disabled={saving}>
          {saving ? "Guardando..." : "Guardar especialista"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  rulesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  rulesAction: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
  },
  specialistList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  specialistCard: {
    background: "#FCFAF4",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 20,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  specialistHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  specialistName: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 16,
    fontWeight: 700,
  },
  specialistFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  toggleRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    fontWeight: 600,
  },
  specialistAction: {
    display: "flex",
    justifyContent: "flex-end",
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
    background: "#F1F6F3",
    color: BRANDING.colors.primaryStrong,
    border: "1px solid #D4E4DD",
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};
