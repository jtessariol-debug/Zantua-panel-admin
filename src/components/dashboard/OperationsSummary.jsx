import { AlertTriangle, ArrowRight, Boxes, CalendarClock, Wallet } from "lucide-react";
import { BRANDING } from "../../lib/branding";

function AlertRow({ icon: Icon, label, value, onClick }) {
  return (
    <button type="button" onClick={onClick} style={styles.alertRow}>
      <span style={styles.alertIcon}>
        <Icon size={15} />
      </span>
      <span style={styles.alertLabel}>{label}</span>
      <span style={styles.alertValue}>{value}</span>
      <ArrowRight size={14} color={BRANDING.colors.textMuted} />
    </button>
  );
}

export default function OperationsSummary({
  inventoryLow,
  appointmentsToConfirm = 0,
  pendingCommissions = 0,
  onOpenInventory,
  onOpenAgenda,
  onOpenCommissions,
}) {
  return (
    <section style={styles.card}>
      <div>
        <div style={styles.title}>Alertas operativas</div>
        <div style={styles.subtitle}>Acciones que requieren revisión rápida.</div>
      </div>

      <div style={styles.list}>
        <AlertRow
          icon={Boxes}
          label="Inventario bajo"
          value={inventoryLow}
          onClick={onOpenInventory}
        />
        <AlertRow
          icon={CalendarClock}
          label="Citas por confirmar"
          value={appointmentsToConfirm}
          onClick={onOpenAgenda}
        />
        <AlertRow
          icon={Wallet}
          label="Comisiones pendientes"
          value={pendingCommissions}
          onClick={onOpenCommissions}
        />
      </div>

      <div style={styles.note}>
        <AlertTriangle size={14} />
        <span>Las alertas usan datos operativos reales del panel.</span>
      </div>
    </section>
  );
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 12,
    padding: 20,
    minHeight: 360,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.45,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  alertRow: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: 10,
    padding: "12px 0",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #EBEEEA",
    cursor: "pointer",
    textAlign: "left",
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "#EEF3F0",
    color: BRANDING.colors.primaryStrong,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  alertLabel: {
    color: BRANDING.colors.text,
    fontSize: 13,
    fontWeight: 600,
  },
  alertValue: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 14,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  note: {
    marginTop: "auto",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: BRANDING.colors.textMuted,
    fontSize: 12,
  },
};
