import { BRANDING } from "../../lib/branding";

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
    background: "#F6F0E7",
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 20,
    padding: 6,
  },
  tab: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 14,
    padding: "11px 14px",
    color: BRANDING.colors.textMuted,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  tabActive: {
    background: BRANDING.colors.card,
    borderColor: "#D8E7E0",
    color: BRANDING.colors.primaryStrong,
    boxShadow: "0 8px 18px rgba(18, 56, 47, 0.06)",
  },
};
