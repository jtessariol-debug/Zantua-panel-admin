import AppLayout from "../components/layout/AppLayout";
import PayrollSettings from "../components/settings/PayrollSettings";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../hooks/useAuth";

export default function PayrollPage() {
  const { profile, isAdmin } = useAuth();

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Control financiero"
          title="Nómina"
          subtitle="Períodos, pagos individuales, comisiones vinculadas y comprobantes del equipo."
        />
        <PayrollSettings
          profile={profile}
          isAdmin={isAdmin}
        />
      </div>
    </AppLayout>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
};
