import { BRANDING } from "../../lib/branding";

export default function SettingsTabs({ tabs, activeTab, onChange }) {
  return (
    <div style={styles.wrap}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    background: "#F3EDE3",
    borderRadius: 18,
    padding: 6,
  },
  tab: {
    background: "transparent",
    border: "1px solid transparent",
    color: BRANDING.colors.textMuted,
    borderRadius: 14,
    padding: "11px 14px",
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
