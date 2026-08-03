import { BRANDING } from "../../lib/branding";

export default function ActionButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  as = "button",
  href,
  target,
  rel,
  style,
}) {
  const computedStyle = {
    ...styles.base,
    ...(variant === "primary"
      ? styles.primary
      : variant === "secondary"
        ? styles.secondary
        : variant === "ghost"
          ? styles.ghost
          : variant === "danger"
            ? styles.danger
            : variant === "success"
              ? styles.success
              : styles.secondary),
    ...(disabled ? styles.disabled : {}),
    ...style,
  };

  if (as === "a") {
    return (
      <a href={href} target={target} rel={rel} style={computedStyle}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={computedStyle}>
      {children}
    </button>
  );
}

const styles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.2,
    border: "1px solid transparent",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 160ms ease",
    whiteSpace: "nowrap",
  },
  primary: {
    background: BRANDING.colors.primary,
    color: "#fff",
    boxShadow: "0 14px 26px rgba(18, 56, 47, 0.12)",
  },
  secondary: {
    background: "#FFFDF8",
    color: BRANDING.colors.primaryStrong,
    borderColor: BRANDING.colors.border,
  },
  ghost: {
    background: "#F3ECE3",
    color: BRANDING.colors.textMuted,
    borderColor: "#EBDDCE",
  },
  danger: {
    background: "#FBEBED",
    color: "#9B4252",
    borderColor: "#E9C8D0",
  },
  success: {
    background: "#E9F4EE",
    color: BRANDING.colors.secondary,
    borderColor: "#CCE1D7",
  },
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    boxShadow: "none",
  },
};
