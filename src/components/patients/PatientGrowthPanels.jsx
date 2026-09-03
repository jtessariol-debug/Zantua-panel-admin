import { useState } from "react";
import { CheckCircle2, ImagePlus, Plus } from "lucide-react";
import ActionButton from "../ui/ActionButton";
import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { savePatientFollowup, updateFollowupStatus, uploadPatientEvolutionPhoto } from "../../services/patientGrowth";

const EMPTY_FOLLOWUP = { title: "", scheduled_for: "", notes: "", status: "pendiente" };
const inputStyle = { width: "100%", boxSizing: "border-box", minHeight: 40, border: "1px solid #DCE3E8", borderRadius: 8, padding: "9px 11px", color: "#17212B", background: "#FFF", font: "inherit" };

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-DO") : "Sin dato registrado";
}

function statusStyle(status) {
  if (status === "realizado") return { background: "#EAF5ED", color: "#256347" };
  if (status === "cancelado") return { background: "#FCECEF", color: "#A54E60" };
  return { background: "#FFF6DF", color: "#8A6200" };
}

export function PatientRelationshipOverview({ patient, appointments = [], packages = [], laserSessions = [] }) {
  const completed = appointments.filter((item) => item.status === "completada");
  const upcoming = appointments.filter((item) => item.appointment_date >= new Date().toISOString().slice(0, 10) && ["pendiente", "confirmada"].includes(item.status)).sort((a, b) => `${a.appointment_date}${a.start_time}`.localeCompare(`${b.appointment_date}${b.start_time}`))[0];
  const lastVisit = [...completed].sort((a, b) => `${b.appointment_date}${b.start_time}`.localeCompare(`${a.appointment_date}${a.start_time}`))[0];
  const values = [
    ["Última visita", lastVisit ? `${formatDate(lastVisit.appointment_date)} · ${lastVisit.serviceLabel || "Servicio"}` : "Sin visitas completadas"],
    ["Próxima cita", upcoming ? `${formatDate(upcoming.appointment_date)} · ${String(upcoming.start_time || "").slice(0, 5)}` : "Sin próxima cita"],
    ["Paquetes activos", String(packages.length)],
    ["Sesiones pendientes", String(packages.reduce((total, item) => total + Number(item.remaining_sessions || 0), 0))],
    ["Última especialista", lastVisit?.specialistLabel || laserSessions[0]?.specialistLabel || "Sin dato registrado"],
    ["Paciente desde", formatDate(patient.created_at)],
  ];
  return <SectionCard title="Resumen de relación" subtitle="Información útil para la continuidad de atención."><div style={styles.summary}>{values.map(([label, value]) => <div key={label} style={styles.summaryItem}><span>{label}</span><strong>{value}</strong></div>)}</div></SectionCard>;
}

export function PatientFollowupsPanel({ patient, appointments = [], laserSessions = [], followups = [], profile, onChanged }) {
  const [form, setForm] = useState(EMPTY_FOLLOWUP); const [editing, setEditing] = useState(null); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const start = (item = null) => { setEditing(item); setForm(item ? { title: item.title, scheduled_for: item.scheduled_for, notes: item.notes || "", status: item.status } : EMPTY_FOLLOWUP); setError(""); };
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); try { await savePatientFollowup({ ...form, client_id: patient.id, appointment_id: appointments[0]?.id || null, laser_session_id: laserSessions[0]?.id || null }, profile, editing?.id); start(); await onChanged?.(); } catch (saveError) { setError(saveError.message || "No fue posible guardar el seguimiento."); } finally { setSaving(false); } };
  return <SectionCard title="Seguimientos" subtitle="Recordatorios operativos definidos por el equipo."><form onSubmit={submit} style={styles.form}><input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Revisar evolución en 7 días" style={inputStyle} /><input required type="date" value={form.scheduled_for} onChange={(event) => setForm((current) => ({ ...current, scheduled_for: event.target.value }))} style={inputStyle} /><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Observación operativa (opcional)" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} /><ActionButton type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : editing ? "Guardar" : "Crear seguimiento"}</ActionButton>{editing ? <ActionButton variant="ghost" type="button" onClick={() => start()}>Cancelar</ActionButton> : null}</form>{error ? <p style={styles.error}>{error}</p> : null}{followups.length === 0 ? <EmptyState title="No hay seguimientos programados." description="Crea uno cuando el paciente requiera contacto posterior." /> : <div style={styles.rows}>{followups.map((item) => <article key={item.id} style={styles.row}><div><strong>{item.title}</strong><span>{formatDate(item.scheduled_for)} · {item.specialistLabel}</span>{item.notes ? <p>{item.notes}</p> : null}</div><div style={styles.actions}><span style={{ ...styles.status, ...statusStyle(item.status) }}>{item.status}</span>{item.status === "pendiente" ? <><ActionButton variant="ghost" onClick={async () => { await updateFollowupStatus(item.id, "realizado"); await onChanged?.(); }}><CheckCircle2 size={14} /> Realizado</ActionButton><ActionButton variant="ghost" onClick={async () => { await updateFollowupStatus(item.id, "cancelado"); await onChanged?.(); }}>Cancelar</ActionButton></> : null}<ActionButton variant="ghost" onClick={() => start(item)}>Editar</ActionButton></div></article>)}</div>}</SectionCard>;
}

export function EvolutionPhotosPanel({ patient, appointments = [], laserSessions = [], photos = [], profile, onChanged }) {
  const [file, setFile] = useState(null); const [stage, setStage] = useState("antes"); const [bodyArea, setBodyArea] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); try { await uploadPatientEvolutionPhoto({ clientId: patient.id, file, stage, bodyArea, notes, appointmentId: appointments[0]?.id, laserSessionId: laserSessions[0]?.id, profile }); setFile(null); setBodyArea(""); setNotes(""); await onChanged?.(); } catch (uploadError) { setError(uploadError.message || "No fue posible subir la fotografía."); } finally { setSaving(false); } };
  return <SectionCard title="Evolución" subtitle="Fotografías privadas asociadas a este paciente."><form onSubmit={submit} style={styles.form}><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} style={inputStyle} /><select value={stage} onChange={(event) => setStage(event.target.value)} style={inputStyle}><option value="antes">Antes</option><option value="durante">Durante</option><option value="despues">Después</option></select><input value={bodyArea} onChange={(event) => setBodyArea(event.target.value)} placeholder="Zona corporal (opcional)" style={inputStyle} /><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas (opcional)" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} /><ActionButton type="submit" disabled={saving || !file}><ImagePlus size={14} /> {saving ? "Subiendo..." : "Agregar fotografía"}</ActionButton></form>{error ? <p style={styles.error}>{error}</p> : null}{photos.length === 0 ? <EmptyState title="No hay fotografías de evolución." description="Puedes añadir una foto antes, durante o después del tratamiento." /> : <div style={styles.photos}>{photos.map((photo) => <article key={photo.id} style={styles.photoCard}>{photo.signedUrl ? <img src={photo.signedUrl} alt={`Evolución ${photo.stage}`} style={styles.image} /> : null}<strong>{photo.stage}</strong><span>{formatDate(photo.captured_at)} · {photo.body_area || "Sin zona"}</span>{photo.notes ? <p>{photo.notes}</p> : null}</article>)}</div>}</SectionCard>;
}

const styles = {
  summary: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }, summaryItem: { border: "1px solid #E2E7EB", background: "#F8FAFB", borderRadius: 10, padding: 13, display: "grid", gap: 5 }, form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, alignItems: "start", marginBottom: 18 }, error: { color: "#A54E60", fontSize: 13 }, rows: { display: "grid", gap: 10 }, row: { borderTop: "1px solid #EDF1F3", paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }, actions: { display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }, status: { borderRadius: 999, padding: "5px 8px", fontSize: 12, fontWeight: 700 }, photos: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }, photoCard: { border: "1px solid #E2E7EB", borderRadius: 10, padding: 10, display: "grid", gap: 7, overflow: "hidden", color: "#53616D", fontSize: 13 }, image: { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 7, background: "#F2F4F5" },
};
