import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandMark from "../components/ui/BrandMark";
import { useAuth } from "../hooks/useAuth";
import { BRANDING } from "../lib/branding";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.authError) {
      setError(location.state.authError);
    }
  }, [location.state]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err?.code === "profile/not-found") {
        setError("La cuenta aún no ha sido inicializada.");
      } else {
        setError(err?.message || "No fue posible iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <BrandMark size={86} corner={24} />
          <h1 style={styles.title}>{BRANDING.centerName}</h1>
          <p style={styles.subtitle}>{BRANDING_PREVIEW_SUBTITLE}</p>
          <p style={styles.address}>{BRANDING.centerAddress}</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={styles.input}
            placeholder="admin@zantua.com"
            required
          />

          <label style={styles.label}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={styles.input}
            placeholder="••••••••"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8f3ea 0%, #f5efe3 48%, #edf4ef 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    background: BRANDING.colors.card,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 28,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 28px 60px rgba(18, 56, 47, 0.12)",
  },
  logoWrap: { textAlign: "center", marginBottom: 36, display: "flex", flexDirection: "column", alignItems: "center" },
  title: { color: BRANDING.colors.primaryStrong, fontSize: 28, fontWeight: 700, margin: "18px 0 0" },
  subtitle: { color: BRANDING.colors.secondary, fontSize: 13, marginTop: 8, fontWeight: 700, textTransform: "uppercase" },
  address: { color: BRANDING.colors.textMuted, fontSize: 13, marginTop: 10, maxWidth: 280, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: {
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    background: BRANDING.colors.white,
    border: `1px solid ${BRANDING.colors.border}`,
    borderRadius: 14,
    padding: "14px 16px",
    color: BRANDING.colors.text,
    fontSize: 16,
    outline: "none",
    marginBottom: 8,
  },
  error: { color: "#B54B57", fontSize: 13, margin: 0 },
  btn: {
    background: `linear-gradient(135deg, ${BRANDING.colors.primary}, ${BRANDING.colors.secondary})`,
    color: BRANDING.colors.white,
    border: "none",
    borderRadius: 14,
    padding: "16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
  },
};

const BRANDING_PREVIEW_SUBTITLE = "Acceso al panel clínico";
