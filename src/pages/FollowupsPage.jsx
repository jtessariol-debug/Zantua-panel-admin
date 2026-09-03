import { useEffect, useState } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ActionButton from "../components/ui/ActionButton";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import FeedbackToast from "../components/ui/FeedbackToast";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import { fetchFollowupQueue, updateFollowupStatus } from "../services/patientGrowth";

function formatDate(value) { return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-DO") : "Sin fecha"; }

export default function FollowupsPage() {
  const navigate = useNavigate(); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [feedback, setFeedback] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setRows(await fetchFollowupQueue({ dueOnly: false })); } catch (loadError) { setError(loadError.message || "No fue posible cargar los seguimientos."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const updateStatus = async (id, status) => { try { await updateFollowupStatus(id, status); setFeedback(status === "realizado" ? "Seguimiento marcado como realizado." : "Seguimiento cancelado."); load(); } catch (actionError) { setError(actionError.message || "No fue posible actualizar el seguimiento."); } };
  const columns = [{ key: "patient", label: "Paciente", render: (row) => <button type="button" style={styles.link} onClick={() => navigate(`/client/${row.client_id}`)}>{row.clients?.full_name || "Paciente"}</button> }, { key: "title", label: "Seguimiento" }, { key: "date", label: "Fecha prevista", render: (row) => formatDate(row.scheduled_for) }, { key: "responsible", label: "Responsable", render: (row) => row.specialists?.full_name || "Equipo Zantua" }, { key: "status", label: "Estado", render: (row) => <span style={styles.status}>{row.status}</span> }, { key: "actions", label: "Acciones", render: (row) => row.status === "pendiente" ? <div style={{ display: "flex", gap: 8 }}><ActionButton variant="secondary" onClick={() => updateStatus(row.id, "realizado")}>Marcar realizado</ActionButton><ActionButton variant="ghost" onClick={() => updateStatus(row.id, "cancelado")}>Cancelar</ActionButton></div> : null }];
  return <AppLayout><div style={styles.page}><PageHeader eyebrow="Seguimiento" title="Seguimientos pendientes" subtitle="Recordatorios operativos definidos por el equipo." actions={<ActionButton variant="secondary" onClick={load}><RefreshCw size={15} /> Actualizar</ActionButton>} />{feedback ? <FeedbackToast type="success" message={feedback} onClose={() => setFeedback("")} /> : null}{error ? <FeedbackToast type="error" message={error} /> : null}<SectionCard title="Lista de seguimiento" subtitle="Consulta las tareas de pacientes y registra su realización.">{loading ? <p>Cargando seguimientos...</p> : <DataTable columns={columns} rows={rows} emptyState={<EmptyState title="No hay seguimientos registrados." description="Los seguimientos creados desde la ficha del paciente aparecerán aquí." />} />}</SectionCard></div></AppLayout>;
}

const styles = { page: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 1440, margin: "0 auto" }, link: { border: 0, background: "transparent", color: "#12382F", fontWeight: 700, cursor: "pointer", padding: 0 }, status: { display: "inline-flex", padding: "5px 8px", borderRadius: 999, color: "#8A6200", background: "#FFF6DF", fontSize: 12, fontWeight: 700 } };
