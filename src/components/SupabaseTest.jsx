import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SupabaseTest() {
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSpecialists() {
      setLoading(true);
      setError("");

      try {
        const { data, error: queryError } = await supabase
          .from("specialists")
          .select("*")
          .order("full_name", { ascending: true });

        if (queryError) {
          throw queryError;
        }

        if (mounted) {
          setSpecialists(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Supabase specialists query failed", err);
        if (mounted) {
          setError(err.message || "No fue posible consultar la tabla specialists.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSpecialists();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Supabase Test</h2>
          <p style={styles.subtitle}>Lectura de la tabla `specialists` para validar la conexión.</p>
        </div>
      </div>

      {loading && <div style={styles.state}>Cargando especialistas...</div>}
      {!loading && error && <div style={styles.error}>{error}</div>}
      {!loading && !error && specialists.length === 0 && (
        <div style={styles.state}>La tabla specialists no devolvió registros.</div>
      )}

      {!loading && !error && specialists.length > 0 && (
        <div style={styles.list}>
          {specialists.map((specialist) => (
            <div key={specialist.id || specialist.full_name} style={styles.row}>
              <div>
                <div style={styles.name}>
                  {specialist.full_name || specialist.name || "Especialista sin nombre"}
                </div>
                <div style={styles.meta}>
                  {specialist.role || specialist.specialty || specialist.email || "Sin detalle adicional"}
                </div>
              </div>
              <div style={styles.badge}>
                {specialist.is_active === false ? "Inactiva" : "Activa"}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  panel: {
    background: "#13131f",
    border: "1px solid #1e1e2e",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#666",
    fontSize: 13,
    margin: "6px 0 0",
    lineHeight: 1.5,
  },
  state: {
    color: "#888",
    fontSize: 14,
    padding: "10px 0",
  },
  error: {
    background: "rgba(255,107,107,0.1)",
    border: "1px solid rgba(255,107,107,0.25)",
    color: "#ff8a8a",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    padding: "14px 16px",
    background: "#0f0f1a",
    border: "1px solid #1e1e2e",
    borderRadius: 12,
  },
  name: {
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
  },
  meta: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    background: "rgba(80,200,120,0.12)",
    color: "#76d992",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
};
