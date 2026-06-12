export default function StockBadge({ currentStock, minStock, active = true }) {
  if (!active) {
    return <span style={{ ...styles.badge, background: "#ECECF1", color: "#5E6270" }}>Inactivo</span>;
  }

  const isLow = Number(currentStock || 0) <= Number(minStock || 0);
  return (
    <span
      style={{
        ...styles.badge,
        background: isLow ? "#FBE5E8" : "#E4F7EA",
        color: isLow ? "#A83A4B" : "#20734B",
      }}
    >
      {isLow ? "Stock bajo" : "Stock correcto"}
    </span>
  );
}

const styles = {
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};
