import { Search } from "lucide-react";
import { BRANDING } from "../../lib/branding";

export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={styles.wrap}>
      <Search size={18} color="#9D8C82" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 280,
    border: `1px solid ${BRANDING.colors.border}`,
    background: "#FFFDF8",
    borderRadius: 18,
    padding: "13px 14px",
    boxShadow: "0 10px 22px rgba(18, 56, 47, 0.035)",
  },
  input: {
    border: "none",
    background: "transparent",
    width: "100%",
    fontSize: 14,
    color: BRANDING.colors.text,
    outline: "none",
  },
};
