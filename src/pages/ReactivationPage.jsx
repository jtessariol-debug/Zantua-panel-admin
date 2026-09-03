import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Copy, MessageCircle, RefreshCw, UserRoundSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ActionButton from "../components/ui/ActionButton";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import FeedbackToast from "../components/ui/FeedbackToast";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import { fetchClientReactivation } from "../services/patientGrowth";
import { normalizeDominicanPhone } from "../utils/whatsapp";

const FILTERS = [["30", "30+ días", 30], ["60", "60+ días", 60], ["90", "90+ días", 90], ["120", "120+ días", 120]];
const today = () => new Date().toISOString().slice(0, 10);

function formatDate(value) { return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-DO") : "Sin dato"; }
function messageFor(row) { return `Hola ${row.full_name || ""}, te escribimos de Zantua Aesthetic Wellness. Hace un tiempo que no te vemos y nos gustaría acompañarte en tu próximo cuidado. ¿Deseas agendar una cita?`; }

export default function ReactivationPage() {
  const navigate = useNavigate(); const [key, setKey] = useState("60"); const [result, setResult] = useState({ summary: {}, rows: [], total: 0 }); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [feedback, setFeedback] = useState("");
  const selected = useMemo(() => FILTERS.find(([value]) => value === key) || FILTERS[1], [key]);
  const load = async () => { setLoading(true); setError(""); try { setResult(await fetchClientReactivation({ minimumDays: selected[2] })); } catch (loadError) { setError(loadError.message || "No fue posible cargar los pacientes por reactivar."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [key]);
  const columns = [
    { key: "patient", label: "Paciente", render: (row) => <button type="button" onClick={() => navigate(`/client/${row.client_id}`)} style={styles.link}>{row.full_name}</button> },
    { key: "last", label: "Última visita", render: (row) => `${formatDate(row.last_visit)} · ${row.last_service || "Sin servicio"}` },
    { key: "specialist", label: "Especialista", render: (row) => row.last_specialist || "Equipo Zantua" },
    { key: "days", label: "Días sin visita", render: (row) => row.inactive_days ?? "-" },
    { key: "actions", label: "Acciones", render: (row) => <div style={styles.actions}><ActionButton variant="ghost" onClick={() => navigate("/agenda", { state: { clientId: row.client_id, appointmentDate: today() } })}><CalendarPlus size={14} /> Agendar</ActionButton><ActionButton variant="ghost" disabled={!normalizeDominicanPhone(row.phone)} onClick={() => { const phone = normalizeDominicanPhone(row.phone); if (!phone) return setFeedback("Este paciente no tiene teléfono registrado."); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageFor(row))}`, "_blank", "noopener,noreferrer"); }}><MessageCircle size={14} /> WhatsApp</ActionButton><ActionButton variant="ghost" onClick={async () => { await navigator.clipboard?.writeText(messageFor(row)); setFeedback("Mensaje copiado."); }}><Copy size={14} /> Copiar</ActionButton></div> },
  ];
  return <AppLayout><div style={styles.page}><PageHeader eyebrow="Pacientes" title="Reactivación" subtitle="Pacientes sin una cita reciente, ordenados para seguimiento operativo." actions={<ActionButton variant="secondary" onClick={load}><RefreshCw size={15} /> Actualizar</ActionButton>} />{feedback ? <FeedbackToast type="success" message={feedback} onClose={() => setFeedback("")} /> : null}{error ? <FeedbackToast type="error" message={error} /> : null}<SectionCard title="Filtro de inactividad" subtitle={`${result.total || 0} paciente(s) encontrados.`}><div style={styles.filters}>{FILTERS.map(([value, label]) => <ActionButton key={value} variant={value === key ? "primary" : "ghost"} onClick={() => setKey(value)}>{label}</ActionButton>)}</div>{loading ? <p>Cargando pacientes...</p> : <DataTable columns={columns} rows={result.rows || []} emptyState={<EmptyState title="No hay pacientes para reactivar en este rango." description="Ajusta el período cuando necesites revisar otra ventana de atención." />} />}</SectionCard></div></AppLayout>;
}

const styles = { page: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 1440, margin: "0 auto" }, filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }, link: { border: 0, background: "transparent", color: "#12382F", fontWeight: 700, cursor: "pointer", padding: 0 }, actions: { display: "flex", gap: 6, flexWrap: "wrap" } };
