import EmptyState from "../ui/EmptyState";
import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";

function formatDate(value) {
  if (!value) return "No registrada";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "No registrada";
  }
}

export default function ClientPackagesCard({ packages = [] }) {
  return (
    <SectionCard title="Paquetes activos" subtitle="Seguimiento de sesiones compradas, usadas y disponibles del paciente.">
      {packages.length === 0 ? (
        <EmptyState
          title="No hay paquetes activos para este paciente."
          description="Cuando se facture un paquete de depilación láser, aparecerá aquí con su progreso y sesiones restantes."
        />
      ) : (
        <div style={styles.list}>
          {packages.map((pkg) => {
            const progress = pkg.total_sessions > 0
              ? Math.min(100, Math.round((pkg.used_sessions / pkg.total_sessions) * 100))
              : 0;

            return (
              <div key={pkg.id} style={styles.card}>
                <div style={styles.header}>
                  <div>
                    <div style={styles.name}>{pkg.serviceLabel}</div>
                    <div style={styles.meta}>
                      Compra: {formatDate(pkg.purchase_date)}
                      {pkg.invoiceLabel ? ` · Factura: ${pkg.invoiceLabel}` : ""}
                    </div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    ...(pkg.status === "completado" ? styles.statusCompleted : styles.statusActive),
                  }}
                  >
                    {pkg.status}
                  </span>
                </div>

                <div style={styles.progressCopy}>{pkg.progressLabel}</div>
                <div style={styles.remainingCopy}>{pkg.remainingLabel}</div>

                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                </div>

                {pkg.notes ? <div style={styles.notes}>{pkg.notes}</div> : null}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

const styles = {
  list: { display: "flex", flexDirection: "column", gap: 14 },
  card: { background: "#FCFAF7", border: `1px solid ${BRANDING.colors.border}`, borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 10 },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" },
  name: { color: BRANDING.colors.primaryStrong, fontSize: 17, fontWeight: 700 },
  meta: { color: BRANDING.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 1.5 },
  progressCopy: { color: "#2A2522", fontSize: 14, fontWeight: 700 },
  remainingCopy: { color: BRANDING.colors.textMuted, fontSize: 13 },
  progressTrack: { width: "100%", height: 10, background: "#EAE1D6", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`, borderRadius: 999 },
  notes: { color: "#5B514C", fontSize: 13, lineHeight: 1.6, borderTop: "1px solid #F0E6DD", paddingTop: 10 },
  statusBadge: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, border: "1px solid transparent", textTransform: "capitalize" },
  statusActive: { background: "#EAF4EE", color: "#256347", borderColor: "#CFE3D8" },
  statusCompleted: { background: "#EEF1F7", color: "#49658E", borderColor: "#D6DFEF" },
};
