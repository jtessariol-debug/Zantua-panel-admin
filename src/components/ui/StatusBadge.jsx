const STATUS_STYLES = {
  pendiente: { background: "#FFF5D8", color: "#8B6A08" },
  confirmada: { background: "#E4F2EA", color: "#1E5A49" },
  confirmed: { background: "#E4F2EA", color: "#1E5A49" },
  completada: { background: "#E8EFF7", color: "#295B84" },
  completed: { background: "#E8EFF7", color: "#295B84" },
  pagada: { background: "#E4F2EA", color: "#1E5A49" },
  paid: { background: "#E4F2EA", color: "#1E5A49" },
  cancelada: { background: "#FBE5E8", color: "#A83A4B" },
  cancelled: { background: "#FBE5E8", color: "#A83A4B" },
  canceled: { background: "#FBE5E8", color: "#A83A4B" },
  no_asistio: { background: "#ECECF1", color: "#5E6270" },
  no_show: { background: "#ECECF1", color: "#5E6270" },
  otro: { background: "#F3EAF8", color: "#7A4B92" },
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
      return "No asistio";
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
        whiteSpace: "nowrap",
      }}
    >
      {humanizeStatus(normalizedStatus)}
    </span>
  );
}
