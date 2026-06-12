import { Search } from "lucide-react";

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
    border: "1px solid #E7DACE",
    background: "#FCFAF7",
    borderRadius: 16,
    padding: "12px 14px",
  },
  input: {
    border: "none",
    background: "transparent",
    width: "100%",
    fontSize: 14,
    color: "#2A2522",
    outline: "none",
  },
};
