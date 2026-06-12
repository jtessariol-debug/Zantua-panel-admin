import { useMemo, useState } from "react";
import { BRANDING } from "../../lib/branding";

export default function BrandMark({
  size = 48,
  corner = 16,
  showWordmark = false,
  titleSize = 22,
  subtitleSize = 13,
  compact = false,
}) {
  const [hasError, setHasError] = useState(false);
  const wrapSize = useMemo(() => ({ width: size, height: size, borderRadius: corner }), [corner, size]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14 }}>
      <div style={{ ...styles.logoWrap, ...wrapSize }}>
        {!hasError ? (
          <img
            src={BRANDING.logoPath}
            alt={BRANDING.centerName}
            style={styles.logoImage}
            onError={() => setHasError(true)}
          />
        ) : (
          <div style={styles.fallback}>Z</div>
        )}
      </div>

      {showWordmark ? (
        <div>
          <div style={{ ...styles.title, fontSize: titleSize }}>{compact ? "Zantua" : BRANDING.centerName}</div>
          <div style={{ ...styles.subtitle, fontSize: subtitleSize }}>
            {compact ? "Aesthetic Wellness" : BRANDING.centerAddress}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  logoWrap: {
    overflow: "hidden",
    border: `1px solid ${BRANDING.colors.border}`,
    background: BRANDING.colors.card,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 30px rgba(18, 56, 47, 0.08)",
    flexShrink: 0,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },
  fallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`,
    color: BRANDING.colors.white,
    fontWeight: 700,
    fontSize: 20,
  },
  title: {
    color: BRANDING.colors.primaryStrong,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  subtitle: {
    color: BRANDING.colors.textMuted,
    marginTop: 4,
    lineHeight: 1.4,
    maxWidth: 320,
  },
};
