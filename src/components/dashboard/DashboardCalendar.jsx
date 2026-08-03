import { ChevronLeft, ChevronRight } from "lucide-react";
import { BRANDING } from "../../lib/branding";

function buildCalendarMatrix(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const cells = [];

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

export default function DashboardCalendar({ appointmentsCount = 0 }) {
  const now = new Date();
  const weeks = buildCalendarMatrix(now);
  const today = now.getDate();

  return (
    <article style={styles.card}>
      <div style={styles.topRow}>
        <div>
          <div style={styles.monthLabel}>
            {now.toLocaleDateString("es-DO", { month: "long", year: "numeric" })}
          </div>
          <div style={styles.todayLabel}>Hoy {today}</div>
        </div>
        <div style={styles.iconCluster}>
          <span style={styles.iconShell}><ChevronLeft size={14} /></span>
          <span style={styles.iconShell}><ChevronRight size={14} /></span>
        </div>
      </div>

      <div style={styles.weekHeader}>
        {["L", "M", "M", "J", "V", "S", "D"].map((day) => (
          <span key={day} style={styles.weekDay}>{day}</span>
        ))}
      </div>

      <div style={styles.grid}>
        {weeks.flat().map((cell, index) => {
          const day = cell?.getDate?.();
          const isToday = day === today;

          return (
            <div
              key={`${day || "empty"}-${index}`}
              style={{
                ...styles.dayCell,
                ...(cell ? styles.dayVisible : styles.dayMuted),
                ...(isToday ? styles.dayActive : {}),
              }}
            >
              {day || ""}
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerMetric}>{appointmentsCount}</div>
        <div style={styles.footerCopy}>citas visibles en la jornada</div>
      </div>
    </article>
  );
}

const styles = {
  card: {
    background: "linear-gradient(180deg, #FFFDF8 0%, #FBF7F0 100%)",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 24px 46px rgba(18, 56, 47, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: 260,
  },
  topRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  monthLabel: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 18,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  todayLabel: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  iconCluster: {
    display: "flex",
    gap: 6,
  },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    border: `1px solid ${BRANDING.colors.border}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: BRANDING.colors.textMuted,
    background: "#FFFCF8",
  },
  weekHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 6,
  },
  weekDay: {
    color: BRANDING.colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 6,
  },
  dayCell: {
    aspectRatio: "1 / 1",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
  },
  dayVisible: {
    background: "#F7F1E8",
    color: BRANDING.colors.primaryStrong,
  },
  dayMuted: {
    background: "transparent",
    color: "transparent",
  },
  dayActive: {
    background: BRANDING.colors.primary,
    color: "#FFFFFF",
    boxShadow: "0 12px 22px rgba(18, 56, 47, 0.18)",
  },
  footer: {
    marginTop: "auto",
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  footerMetric: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 24,
    fontWeight: 700,
  },
  footerCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
  },
};
