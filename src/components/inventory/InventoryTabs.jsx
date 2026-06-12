export default function InventoryTabs({ activeTab, onChange }) {
  const tabs = [
    { key: "products", label: "Productos de venta" },
    { key: "supplies", label: "Insumos del centro" },
    { key: "movements", label: "Movimientos" },
  ];

  return (
    <div style={styles.wrap}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          style={{
            ...styles.tab,
            ...(activeTab === tab.key ? styles.tabActive : {}),
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    background: "#F5EFE8",
    borderRadius: 18,
    padding: 6,
  },
  tab: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 14,
    padding: "12px 14px",
    color: "#7A6E67",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  tabActive: {
    background: "#FFFFFF",
    borderColor: "#E8DBCF",
    color: "#A15A58",
    boxShadow: "0 8px 18px rgba(75, 52, 35, 0.06)",
  },
};
