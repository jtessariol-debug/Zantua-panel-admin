import EmptyState from "./EmptyState";
import SectionCard from "./SectionCard";

export default function ModulePlaceholder({ title, description }) {
  return (
    <SectionCard title={title} subtitle="Módulo en desarrollo">
      <EmptyState
        title="Módulo en desarrollo"
        description={description}
      />
    </SectionCard>
  );
}
