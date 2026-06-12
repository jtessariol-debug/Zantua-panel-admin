export default function PatientModal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: wide ? 860 : 560 }}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{title}</h2>
            {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(35, 27, 23, 0.24)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 80,
  },
  modal: {
    width: "100%",
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    border: "1px solid #EFE4DB",
    boxShadow: "0 28px 54px rgba(78, 53, 37, 0.14)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 22,
  },
  title: {
    color: "#241F1D",
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#8B7E74",
    fontSize: 14,
    margin: "6px 0 0",
    lineHeight: 1.5,
  },
  closeButton: {
    background: "transparent",
    border: "none",
    fontSize: 20,
    color: "#7B6B62",
    cursor: "pointer",
  },
};
