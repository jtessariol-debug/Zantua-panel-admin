import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CONSENT_TEMPLATE = `Yo, [nombre del paciente], identificado/a con cédula [cédula], declaro que he sido informado/a sobre el procedimiento estético que se me realizará en Zantua Aesthetic Wellness. Entiendo que todo procedimiento puede implicar posibles molestias, sensibilidad, enrojecimiento, irritación temporal, cambios en la piel u otras reacciones propias del tratamiento.

Confirmo que he informado de forma veraz mis antecedentes médicos, alergias, medicamentos actuales, condiciones de piel y cualquier contraindicación relevante. Entiendo que ocultar información médica puede afectar la seguridad y los resultados del procedimiento.

Autorizo al personal de Zantua Aesthetic Wellness a realizar el procedimiento indicado, siguiendo los protocolos correspondientes. También autorizo el registro de mis datos clínicos dentro del sistema interno del centro, exclusivamente para fines de seguimiento, control y atención del servicio.

Declaro que he leído, comprendido y aceptado la información anterior, y firmo este consentimiento de manera libre y voluntaria.`;

export default function InformedConsentForm({ patient, lookups, onSubmit, onCancel, loading }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    consent_text: DEFAULT_CONSENT_TEMPLATE,
    patient_name: patient?.full_name || "",
    national_id: patient?.national_id || "",
    signed_at: new Date().toISOString().slice(0, 16),
    service_label: "",
    specialist_label: "",
    accepted: false,
  });

  const previewConsentText = useMemo(() => (
    form.consent_text
      .replaceAll("[nombre del paciente]", form.patient_name || "________________")
      .replaceAll("[cédula]", form.national_id || "________________")
  ), [form.consent_text, form.patient_name, form.national_id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.strokeStyle = "#A15A58";
  }, []);

  function getCoordinates(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = event.touches?.[0] || event;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
  }

  function handleStart(event) {
    const context = canvasRef.current.getContext("2d");
    const { x, y } = getCoordinates(event);
    context.beginPath();
    context.moveTo(x, y);
    setDrawing(true);
  }

  function handleMove(event) {
    if (!drawing) return;
    const context = canvasRef.current.getContext("2d");
    const { x, y } = getCoordinates(event);
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  }

  function handleEnd() {
    setDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.patient_name.trim()) {
      setError("El nombre del paciente es obligatorio.");
      return;
    }

    if (!form.national_id.trim()) {
      setError("La cédula es obligatoria.");
      return;
    }

    if (!form.accepted) {
      setError("Debe aceptar el consentimiento informado.");
      return;
    }

    if (!hasSignature) {
      setError("Debe registrar la firma del paciente.");
      return;
    }

    onSubmit({
      consent_text: previewConsentText,
      patient_name: form.patient_name,
      national_id: form.national_id,
      signed_at: new Date(form.signed_at).toISOString(),
      signature_data: canvasRef.current.toDataURL("image/png"),
    });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.gridTwo}>
        <Field label="Nombre del paciente *" value={form.patient_name} onChange={(value) => setForm((current) => ({ ...current, patient_name: value }))} />
        <Field label="Cédula *" value={form.national_id} onChange={(value) => setForm((current) => ({ ...current, national_id: value }))} />
      </div>

      <div style={styles.gridTwo}>
        <Field label="Fecha y hora de firma" type="datetime-local" value={form.signed_at} onChange={(value) => setForm((current) => ({ ...current, signed_at: value }))} />
        <SelectField
          label="Especialista responsable"
          value={form.specialist_label}
          onChange={(value) => setForm((current) => ({ ...current, specialist_label: value }))}
          options={(lookups?.specialists || []).map((item) => ({ value: item.full_name, label: item.full_name }))}
        />
      </div>

      <div style={styles.gridTwo}>
        <SelectField
          label="Servicio o procedimiento"
          value={form.service_label}
          onChange={(value) => setForm((current) => ({ ...current, service_label: value }))}
          options={(lookups?.services || []).map((item) => ({ value: item.name, label: item.name }))}
        />
        <div style={styles.helperCard}>
          <div style={styles.helperTitle}>Estado del consentimiento</div>
          <div style={styles.helperCopy}>Se guardará como un registro firmado e inmutable. Si necesitas corregirlo, crea uno nuevo.</div>
        </div>
      </div>

      <div>
        <label style={styles.label}>Consentimiento informado</label>
        <div style={styles.documentCard}>
          <div style={styles.documentText}>{previewConsentText}</div>
        </div>
      </div>

      <label style={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={form.accepted}
          onChange={(event) => setForm((current) => ({ ...current, accepted: event.target.checked }))}
        />
        He leído y acepto el consentimiento informado.
      </label>

      <div>
        <div style={styles.label}>Firma digital *</div>
        <div style={styles.signatureHint}>Firme dentro del recuadro.</div>
        <canvas
          ref={canvasRef}
          width={620}
          height={180}
          style={styles.canvas}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        <button type="button" onClick={clearSignature} style={styles.secondaryInlineButton}>Limpiar firma</button>
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancelar</button>
        <button type="submit" style={styles.primaryButton} disabled={loading}>
          {loading ? "Guardando..." : "Guardar consentimiento"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={styles.input} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={styles.input}>
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  gridTwo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 },
  label: { color: "#7E726B", fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#FCFAF7", border: "1px solid #E7DACE", borderRadius: 14, padding: "14px 15px", color: "#2A2522", fontSize: 15, boxSizing: "border-box", outline: "none" },
  helperCard: { background: "#FCFAF7", border: "1px solid #EFE2D7", borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" },
  helperTitle: { color: "#241F1D", fontSize: 15, fontWeight: 700 },
  helperCopy: { color: "#8B7E74", fontSize: 13, lineHeight: 1.6, marginTop: 8 },
  documentCard: { background: "#FFFFFF", border: "1px solid #E7DACE", borderRadius: 18, padding: 18, maxHeight: 280, overflowY: "auto" },
  documentText: { color: "#4A403B", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" },
  checkboxRow: { display: "flex", gap: 10, alignItems: "flex-start", color: "#5F5752", fontSize: 14, lineHeight: 1.5 },
  signatureHint: { color: "#8B7E74", fontSize: 12, marginBottom: 10 },
  canvas: { width: "100%", background: "#FFFFFF", border: "1px solid #E7DACE", borderRadius: 16, touchAction: "none", cursor: "crosshair" },
  secondaryInlineButton: { alignSelf: "flex-start", marginTop: 10, background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 14, padding: "12px 14px", fontSize: 13 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
