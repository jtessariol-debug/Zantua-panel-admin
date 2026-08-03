import { BRANDING } from "../../lib/branding";

export default function MainRevenueCard({ todayValue, weekValue, monthValue, bars = [] }) {
  const maxBar = bars.reduce((max, item) => Math.max(max, Number(item.value || 0)), 0);

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Ingresos</div>
          <div style={styles.mainValue}>{weekValue}</div>
          <div style={styles.caption}>Lectura consolidada con base en facturas pagadas.</div>
        </div>
        <div style={styles.totals}>
          <div style={styles.totalBlock}>
            <span style={styles.totalLabel}>Hoy</span>
            <span style={styles.totalValue}>{todayValue}</span>
          </div>
          <div style={styles.totalBlock}>
            <span style={styles.totalLabel}>Mes</span>
            <span style={styles.totalValue}>{monthValue}</span>
          </div>
        </div>
      </div>

      <div style={styles.chartShell}>
        <div style={styles.chartHeader}>
          <span style={styles.chartTitle}>Ingresos semanales</span>
          <span style={styles.chartMeta}>Últimos 7 días</span>
        </div>

        <div style={styles.chartArea}>
          {bars.map((item) => (
            <div key={item.label} style={styles.column}>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    height: `${maxBar > 0 ? Math.max(6, Math.min(100, (Number(item.value || 0) / maxBar) * 100)) : 6}%`,
                  }}
                />
              </div>
              <div style={styles.columnFooter}>
                <span style={styles.dayLabel}>{item.label}</span>
                <span style={styles.dayValue}>{Number(item.value || 0).toLocaleString("en-US")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 12,
    padding: 22,
    minHeight: 360,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
  },
  label: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    fontWeight: 600,
  },
  mainValue: {
    marginTop: 10,
    color: BRANDING.colors.primaryStrong,
    fontSize: "clamp(2.3rem, 3.2vw, 3.5rem)",
    lineHeight: 1,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  caption: {
    marginTop: 10,
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.45,
  },
  totals: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
    gap: 12,
  },
  totalBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 14px",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 10,
    background: "#FAFBF8",
    minWidth: 0,
  },
  totalLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    fontWeight: 600,
  },
  totalValue: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    lineHeight: 1.2,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  chartShell: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  chartHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  chartTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    fontWeight: 700,
  },
  chartMeta: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    fontWeight: 600,
  },
  chartArea: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 14,
    alignItems: "end",
    minHeight: 220,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  },
  barTrack: {
    height: 158,
    display: "flex",
    alignItems: "flex-end",
    borderLeft: "1px solid #E9ECE8",
    borderBottom: "1px solid #E9ECE8",
    padding: "0 10px 0 12px",
  },
  barFill: {
    width: "100%",
    background: BRANDING.colors.primaryStrong,
    borderRadius: "6px 6px 0 0",
  },
  columnFooter: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  dayLabel: {
    color: BRANDING.colors.text,
    fontSize: 12,
    fontWeight: 600,
  },
  dayValue: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    lineHeight: 1.3,
  },
};
