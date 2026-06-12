import SectionCard from "../ui/SectionCard";
import { BRANDING } from "../../lib/branding";

export default function SecuritySettings({ roles }) {
  const entries = [
    { key: "admin", title: "Admin" },
    { key: "recepcion", title: "Recepción" },
    { key: "especialista", title: "Especialista" },
  ];

  return (
    <SectionCard title="Seguridad y permisos" subtitle="Vista visual de permisos por rol, sin lógica sensible en frontend.">
      <div style={styles.grid}>
        {entries.map((entry) => (
          <div key={entry.key} style={styles.card}>
            <div style={styles.cardTitle}>{entry.title}</div>
            <ul style={styles.list}>
              {(roles?.[entry.key] || []).map((permission) => (
                <li key={permission} style={styles.item}>{permission}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#FCFAF4",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 20,
    padding: 20,
  },
  cardTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    color: BRANDING.colors.textMuted,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  item: {
    lineHeight: 1.5,
    fontSize: 14,
  },
};
