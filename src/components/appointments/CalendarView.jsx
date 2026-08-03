import { useEffect, useMemo, useState } from "react";
import CalendarAppointmentCard from "./CalendarAppointmentCard";
import { formatLocalDateForInput } from "../../services/appointments";
import ActionButton from "../ui/ActionButton";
import { BRANDING } from "../../lib/branding";

const TIME_START = 7;
const TIME_END = 20;

function formatDateLabel(date) {
  return date.toLocaleDateString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function toDateKey(date) {
  return formatLocalDateForInput(date);
}

function buildWeekDays(dateString) {
  const base = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  const day = base.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + offset);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return next;
  });
}

function groupByDateAndHour(appointments) {
  return appointments.reduce((acc, appointment) => {
    const dateKey = appointment.appointment_date;
    const hourKey = appointment.start_time?.slice(0, 2) || "00";
    acc[dateKey] = acc[dateKey] || {};
    acc[dateKey][hourKey] = acc[dateKey][hourKey] || [];
    acc[dateKey][hourKey].push(appointment);
    return acc;
  }, {});
}

function getMobileDefault() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 920;
}

export default function CalendarView({
  appointments,
  selectedDate,
  calendarMode,
  onModeChange,
  onAppointmentClick,
  onCreateAppointment,
}) {
  const [isMobile, setIsMobile] = useState(getMobileDefault);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 920);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hours = useMemo(
    () => Array.from({ length: TIME_END - TIME_START + 1 }, (_, index) => TIME_START + index),
    []
  );

  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);
  const grouped = useMemo(() => groupByDateAndHour(appointments), [appointments]);

  if (calendarMode === "day") {
    return (
      <div style={styles.wrapper}>
        <CalendarHeader mode={calendarMode} onModeChange={onModeChange} onCreateAppointment={onCreateAppointment} />
        <div style={styles.dayGrid}>
          {hours.map((hour) => {
            const hourKey = String(hour).padStart(2, "0");
            const hourAppointments = grouped[selectedDate]?.[hourKey] || [];

            return (
              <div key={hourKey} style={styles.timeRow}>
                <div style={styles.timeColumn}>{formatHour(hour)}</div>
                <div style={styles.slotColumn}>
                  {hourAppointments.length ? (
                    <div style={styles.cardsColumn}>
                      {hourAppointments.map((appointment) => (
                        <CalendarAppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onClick={onAppointmentClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <button type="button" onClick={onCreateAppointment} style={styles.emptySlotButton}>
                      Hora disponible
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <CalendarHeader mode={calendarMode} onModeChange={onModeChange} onCreateAppointment={onCreateAppointment} />

      {isMobile ? (
        <div style={styles.mobileWeek}>
          {weekDays.map((day) => {
            const dayKey = toDateKey(day);
            const dayAppointments = appointments.filter((appointment) => appointment.appointment_date === dayKey);

            return (
              <div key={dayKey} style={styles.mobileDayCard}>
                <div style={styles.mobileDayTitle}>{formatDateLabel(day)}</div>
                {dayAppointments.length ? (
                  <div style={styles.cardsColumn}>
                    {dayAppointments.map((appointment) => (
                      <CalendarAppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onClick={onAppointmentClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyDayCopy}>Sin citas programadas.</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.weekGridWrap}>
          <div style={styles.weekGrid}>
            <div style={styles.weekHeaderSpacer} />
            {weekDays.map((day) => (
              <div key={toDateKey(day)} style={styles.weekHeaderDay}>
                {formatDateLabel(day)}
              </div>
            ))}

            {hours.map((hour) => {
              const hourKey = String(hour).padStart(2, "0");

              return (
                <div key={hourKey} style={styles.weekRow}>
                  <div style={styles.weekTimeCell}>{formatHour(hour)}</div>
                  {weekDays.map((day) => {
                    const dateKey = toDateKey(day);
                    const slotAppointments = grouped[dateKey]?.[hourKey] || [];

                    return (
                      <div key={`${dateKey}-${hourKey}`} style={styles.weekSlotCell}>
                        {slotAppointments.length ? (
                          <div style={styles.cardsColumn}>
                            {slotAppointments.map((appointment) => (
                              <CalendarAppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                compact
                                onClick={onAppointmentClick}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarHeader({ mode, onModeChange, onCreateAppointment }) {
  return (
    <div style={styles.header}>
      <div style={styles.modeGroup}>
        <button type="button" onClick={() => onModeChange("day")} style={{ ...styles.modeButton, ...(mode === "day" ? styles.modeButtonActive : {}) }}>
          Día
        </button>
        <button type="button" onClick={() => onModeChange("week")} style={{ ...styles.modeButton, ...(mode === "week" ? styles.modeButtonActive : {}) }}>
          Semana
        </button>
      </div>

      <ActionButton onClick={onCreateAppointment}>Nueva cita</ActionButton>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  modeGroup: {
    display: "inline-flex",
    background: "#F5EFE6",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    border: "none",
    background: "transparent",
    color: BRANDING.colors.textMuted,
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  modeButtonActive: {
    background: BRANDING.colors.primary,
    color: "#FFFDF8",
  },
  dayGrid: {
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    overflow: "hidden",
    background: "#FFFDF8",
    boxShadow: "0 18px 34px rgba(18, 56, 47, 0.04)",
  },
  timeRow: {
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    borderBottom: "1px solid #F0E7DB",
  },
  timeColumn: {
    padding: "18px 16px",
    color: BRANDING.colors.primaryStrong,
    fontSize: 13,
    fontWeight: 700,
    background: "#FBF6EE",
    borderRight: "1px solid #F0E7DB",
  },
  slotColumn: {
    padding: 12,
    minHeight: 98,
    display: "flex",
    alignItems: "stretch",
  },
  emptySlotButton: {
    width: "100%",
    background: "#FCFAF7",
    border: "1px dashed #D8CABA",
    borderRadius: 18,
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    cursor: "pointer",
  },
  cardsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  weekGridWrap: {
    overflowX: "auto",
  },
  weekGrid: {
    minWidth: 1080,
    display: "grid",
    gridTemplateColumns: "96px repeat(7, minmax(140px, 1fr))",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 24,
    overflow: "hidden",
    background: "#FFFDF8",
    boxShadow: "0 18px 34px rgba(18, 56, 47, 0.04)",
  },
  weekHeaderSpacer: {
    background: "#FBF6EE",
    borderBottom: "1px solid #F0E7DB",
  },
  weekHeaderDay: {
    padding: "14px 10px",
    textAlign: "center",
    color: BRANDING.colors.primaryStrong,
    fontSize: 13,
    fontWeight: 700,
    background: "#FBF6EE",
    borderBottom: "1px solid #F0E7DB",
    borderLeft: "1px solid #F0E7DB",
  },
  weekRow: {
    display: "contents",
  },
  weekTimeCell: {
    padding: "16px 12px",
    color: BRANDING.colors.primaryStrong,
    fontSize: 12,
    fontWeight: 700,
    background: "#FBF6EE",
    borderTop: "1px solid #F0E7DB",
  },
  weekSlotCell: {
    padding: 8,
    minHeight: 98,
    borderTop: "1px solid #F0E7DB",
    borderLeft: "1px solid #F0E7DB",
    background: "#FFFDF8",
  },
  mobileWeek: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  mobileDayCard: {
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 22,
    background: "#FFFDF8",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "0 14px 28px rgba(18, 56, 47, 0.035)",
  },
  mobileDayTitle: {
    color: BRANDING.colors.primaryStrong,
    fontSize: 14,
    fontWeight: 700,
  },
  emptyDayCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 13,
  },
};
