import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRANDING } from "../lib/branding";

const CENTER_ADDRESS = "C. Florence Terry Griswuld 16, Santo Domingo, República Dominicana 10119";

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `RD$${safeNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeFileName(value) {
  return String(value || "factura")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizePaymentStatus(status) {
  const value = String(status || "pendiente").trim().toLowerCase();
  if (value === "pagada") return "Pagada";
  if (value === "cancelada") return "Cancelada";
  return "Pendiente";
}

function normalizePaymentMethod(method) {
  return String(method || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveItemType(item) {
  const description = String(item?.description || item?.service_name || item?.product_name || "").toLowerCase();

  if (item?.item_type === "producto") {
    return "Producto";
  }

  if (/paquete/.test(description)) {
    return "Paquete";
  }

  return "Servicio";
}

function resolveItemDescription(item) {
  return item?.description || item?.product_name || item?.service_name || "Item";
}

function resolveItemTotal(item) {
  if (item?.line_total != null) {
    return safeNumber(item.line_total);
  }

  if (item?.total != null) {
    return safeNumber(item.total);
  }

  return safeNumber(item?.quantity) * safeNumber(item?.unit_price);
}

async function loadImageAsDataUrl(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Logo unavailable: ${response.status}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Logo read failed"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading invoice logo", error?.message || error);
    return null;
  }
}

function drawHeader(doc, invoice, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(248, 243, 234);
  doc.rect(0, 0, pageWidth, 42, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", 14, 8, 24, 24);
    } catch (error) {
      console.error("Error rendering invoice logo", error?.message || error);
    }
  }

  doc.setTextColor(18, 56, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(BRANDING.centerName, pageWidth / 2, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(CENTER_ADDRESS, pageWidth / 2, 21, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Factura / Comprobante de pago", pageWidth / 2, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Factura: ${invoice?.invoice_number || "Sin número"}`, pageWidth - 14, 14, { align: "right" });
  doc.text(`Fecha de emisión: ${formatDate(invoice?.invoice_date || invoice?.created_at)}`, pageWidth - 14, 21, { align: "right" });
}

function drawFooter(doc, invoice) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(231, 220, 203);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(111, 98, 88);
    doc.text("Gracias por preferir Zantua Aesthetic Wellness", 14, pageHeight - 11);
    doc.text(CENTER_ADDRESS, 14, pageHeight - 7);
    doc.text(
      `Factura ${invoice?.invoice_number || "—"} · PDF generado ${formatDateTime(new Date())} · Página ${page} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 7,
      { align: "right" }
    );
  }
}

export async function generateInvoicePdf(invoice) {
  if (!invoice?.id) {
    throw new Error("No se encontró una factura válida para exportar.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = await loadImageAsDataUrl(BRANDING.logoPath);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const client = invoice.client || {};
  const invoiceDate = invoice.invoice_date || invoice.created_at;
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  drawHeader(doc, invoice, logoDataUrl);

  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(18, 56, 47);
  doc.text("Datos del cliente", 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Campo", "Valor"]],
    body: [
      ["Nombre completo", client.full_name || invoice.clientLabel || "Cliente"],
      ["Teléfono", client.phone || "—"],
      ["Correo", client.email || "—"],
      ["Cédula", client.national_id || "—"],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [18, 56, 47], textColor: [255, 255, 255] },
    theme: "grid",
  });

  y = doc.lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(18, 56, 47);
  doc.text("Datos de la factura", 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Campo", "Valor"]],
    body: [
      ["Especialista", invoice.specialistLabel || "Sin especialista"],
      ["Método de pago", normalizePaymentMethod(invoice.payment_method)],
      ["Estado", normalizePaymentStatus(invoice.payment_status || invoice.status)],
      ["Fecha", formatDate(invoiceDate)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 90, 73], textColor: [255, 255, 255] },
    theme: "grid",
  });

  y = doc.lastAutoTable.finalY + 10;

  const tableBody = items.map((item) => [
    resolveItemDescription(item),
    resolveItemType(item),
    safeNumber(item.quantity || 0).toLocaleString("en-US"),
    formatCurrency(item.unit_price),
    formatCurrency(resolveItemTotal(item)),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Descripción", "Tipo", "Cantidad", "Precio unitario", "Total"]],
    body: tableBody.length ? tableBody : [["Sin items", "—", "0", formatCurrency(0), formatCurrency(0)]],
    styles: { fontSize: 9, cellPadding: 3, textColor: [27, 27, 27] },
    headStyles: { fillColor: [18, 56, 47], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 250, 247] },
    theme: "grid",
    columnStyles: {
      0: { cellWidth: 74 },
      1: { cellWidth: 28 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  if (y > pageHeight - 55) {
    doc.addPage();
    drawHeader(doc, invoice, logoDataUrl);
    y = 52;
  }

  const totalsX = pageWidth - 80;
  const lineHeight = 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(27, 27, 27);
  doc.text("Subtotal", totalsX, y);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - 14, y, { align: "right" });
  y += lineHeight;
  doc.text("Descuento", totalsX, y);
  doc.text(formatCurrency(invoice.discount), pageWidth - 14, y, { align: "right" });
  y += lineHeight + 1;

  doc.setDrawColor(18, 56, 47);
  doc.line(totalsX, y - 3, pageWidth - 14, y - 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total final", totalsX, y + 2);
  doc.text(formatCurrency(invoice.total), pageWidth - 14, y + 2, { align: "right" });

  drawFooter(doc, invoice);

  const fileName = `Factura-Zantua-${sanitizeFileName(invoice.invoice_number || invoice.id)}.pdf`;
  doc.save(fileName);
}
