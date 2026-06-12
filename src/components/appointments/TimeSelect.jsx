export default function TimeSelect({ value, onChange, min = "07:00", max = "20:00", step = 20 }) {
  const options = [];

  const [startHour, startMinute] = min.split(":").map(Number);
  const [endHour, endMinute] = max.split(":").map(Number);
  const startMinutes = (startHour * 60) + startMinute;
  const endMinutes = (endHour * 60) + endMinute;

  for (let total = startMinutes; total <= endMinutes; total += step) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    options.push(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  }

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={styles.select}>
      <option value="">Seleccionar</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const styles = {
  select: {
    width: "100%",
    background: "#FCFAF7",
    border: "1px solid #E7DACE",
    borderRadius: 14,
    padding: "14px 15px",
    color: "#2A2522",
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  },
};
