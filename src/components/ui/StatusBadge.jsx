const STATUS_STYLES = {
  pendiente: { background: "#FBF0D3", color: "#8B6A08", borderColor: "#E9D59B" },
  confirmada: { background: "#E9F4EE", color: "#1E5A49", borderColor: "#CCE1D7" },
  confirmed: { background: "#E9F4EE", color: "#1E5A49", borderColor: "#CCE1D7" },
  completada: { background: "#EAF0F8", color: "#295B84", borderColor: "#D0DCEE" },
  completed: { background: "#EAF0F8", color: "#295B84", borderColor: "#D0DCEE" },
  pagada: { background: "#E9F4EE", color: "#1E5A49", borderColor: "#CCE1D7" },
  paid: { background: "#E9F4EE", color: "#1E5A49", borderColor: "#CCE1D7" },
  cancelada: { background: "#FBEBED", color: "#A83A4B", borderColor: "#E9C8D0" },
  cancelled: { background: "#FBEBED", color: "#A83A4B", borderColor: "#E9C8D0" },
  canceled: { background: "#FBEBED", color: "#A83A4B", borderColor: "#E9C8D0" },
  no_asistio: { background: "#F0EFEE", color: "#5E6270", borderColor: "#DFDCD9" },
  no_show: { background: "#F0EFEE", color: "#5E6270", borderColor: "#DFDCD9" },
  otro: { background: "#F3EAF8", color: "#7A4B92", borderColor: "#E2D4EA" },
};

function humanizeStatus(status) {
  switch (status) {
    case "confirmed":
    case "confirmada":
      return "Confirmada";
    case "completed":
    case "completada":
      return "Completada";
    case "paid":
    case "pagada":
      return "Pagada";
    case "cancelled":
    case "canceled":
    case "cancelada":
      return "Cancelada";
    case "no_show":
    case "no_asistio":
      return "No asistió";
    case "otro":
      return "Otro";
    case "pendiente":
    default:
      return status || "Pendiente";
  }
}

export default function StatusBadge({ status }) {
  const normalizedStatus = String(status || "pendiente").trim().toLowerCase();
  const style = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.pendiente;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0,
        background: style.background,
        color: style.color,
        border: `1px solid ${style.borderColor}`,
        whiteSpace: "nowrap",
      }}
    >
      {humanizeStatus(normalizedStatus)}
    </span>
  );
}
