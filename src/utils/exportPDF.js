// src/utils/exportPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BRANDING } from "../lib/branding";

function safeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizeFileName(value) {
  return String(value || "paciente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadBrandLogo() {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = BRANDING.logoPath;
  });
}

export async function buildConsentPdf(client, consent) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const signedAt = safeDate(consent?.signed_at) || new Date();
  const logo = await loadBrandLogo();

  doc.setFillColor(248, 243, 234);
  doc.rect(0, 0, pageWidth, 38, "F");

  if (logo) {
    doc.addImage(logo, "JPEG", 14, 8, 20, 20);
  } else {
    doc.setFillColor(18, 56, 47);
    doc.roundedRect(14, 8, 20, 20, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Z", 24, 21, { align: "center" });
  }

  doc.setTextColor(18, 56, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(BRANDING.centerName, pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(BRANDING.centerAddress, pageWidth / 2, 21, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Consentimiento Informado", pageWidth / 2, 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fecha de firma: ${format(signedAt, "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, 34, { align: "center" });

  let y = 46;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Datos del paciente", 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Nombre completo", client?.full_name || consent?.patient_name || "-"],
      ["Cédula", consent?.national_id || client?.national_id || "-"],
      ["Teléfono", client?.phone || "-"],
      ["Fecha de nacimiento", client?.birth_date || "-"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [18, 56, 47] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Texto del consentimiento", 14, y);
  y += 8;

  const splitText = doc.splitTextToSize(consent?.consent_text || "Sin consentimiento registrado.", pageWidth - 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(splitText, 14, y);
  y += splitText.length * 5 + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Nombre del paciente: ${consent?.patient_name || client?.full_name || "-"}`, 14, y);
  y += 7;
  doc.text(`Cédula: ${consent?.national_id || client?.national_id || "-"}`, 14, y);
  y += 12;

  if (consent?.signature_data) {
    doc.setFontSize(12);
    doc.text("Firma del paciente", 14, y);
    y += 6;
    doc.addImage(consent.signature_data, "PNG", 14, y, 80, 28);
    y += 36;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} - Pag. ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc;
}

export async function exportConsentPDF(client, consent) {
  const doc = await buildConsentPdf(client, consent);
  const signedAt = safeDate(consent?.signed_at) || new Date();
  const fileName = `consentimiento-${sanitizeFileName(client?.full_name || consent?.patient_name)}-${format(signedAt, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

export function exportClientPDF(client, consent, sessions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- ENCABEZADO ----
  doc.setFillColor(30, 30, 45);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Centro de Depilación Láser", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Resumen de Cliente", pageWidth / 2, 25, { align: "center" });

  // ---- DATOS DEL CLIENTE ----
  doc.setTextColor(30, 30, 45);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Cliente", 14, 48);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const col1 = 14, col2 = 110;
  let y = 56;

  doc.text(`Nombre: ${client.name}`, col1, y);
  doc.text(`Teléfono: ${client.phone}`, col2, y); y += 7;
  doc.text(`Email: ${client.email || "—"}`, col1, y);
  doc.text(`Fecha de nacimiento: ${client.birthdate || "—"}`, col2, y); y += 7;
  doc.text(
    `Registrado: ${client.createdAt ? format(client.createdAt.toDate(), "dd/MM/yyyy", { locale: es }) : "—"}`,
    col1, y
  );

  // ---- CONSENTIMIENTO ----
  y += 14;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Consentimiento Informado", 14, y); y += 8;

  if (consent) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Firmado el: ${consent.signedAt ? format(consent.signedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: es }) : "—"}`, 14, y); y += 6;
    doc.text(`Nombre firmante: ${consent.signerName || "—"}`, 14, y); y += 6;

    const fields = [
      ["Tipo de piel", consent.skinType],
      ["Enfermedades", consent.diseases || "Ninguna"],
      ["Medicamentos", consent.medications || "Ninguno"],
      ["Embarazo", consent.pregnant ? "Sí" : "No"],
      ["Exposición solar reciente", consent.sunExposure ? "Sí" : "No"],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Campo", "Respuesta"]],
      body: fields,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 45] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Sin consentimiento registrado.", 14, y); y += 10;
  }

  // ---- SESIONES ----
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Historial de Sesiones", 14, y); y += 5;

  if (sessions && sessions.length > 0) {
    const rows = sessions.map((s, i) => [
      i + 1,
      s.date ? format(s.date.toDate(), "dd/MM/yyyy", { locale: es }) : "—",
      s.zone || "—",
      s.intensity || "—",
      s.frequency || "—",
      s.notes || "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Fecha", "Zona", "Intensidad", "Frecuencia", "Notas"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 30, 45] },
      columnStyles: { 5: { cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Sin sesiones registradas.", 14, y + 5);
  }

  // ---- PIE ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} — Pág. ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`${client.name.replace(/\s+/g, "_")}_resumen.pdf`);
}
