import PatientModal from "../patients/PatientModal";

export default function InvoiceModal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <PatientModal title={title} subtitle={subtitle} onClose={onClose} wide={wide}>
      {children}
    </PatientModal>
  );
}
