import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRANDING } from "../lib/branding";

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
  return String(value || "nomina")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pagada") return "Pagada";
  if (value === "pendiente") return "Pendiente";
  if (value === "anulada") return "Anulada";
  return "Borrador";
}

function loadImageAsDataUrl(path) {
  return fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Logo unavailable: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Logo read failed"));
      reader.readAsDataURL(blob);
    }))
    .catch((error) => {
      console.error("Error loading payroll logo", error?.message || error);
      return null;
    });
}

function drawHeader(doc, title, subtitle, logoDataUrl, companySettings = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerName = companySettings.center_name || BRANDING.centerName;
  const centerAddress = companySettings.address || BRANDING.centerAddress;

  doc.setFillColor(248, 243, 234);
  doc.rect(0, 0, pageWidth, 40, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", 14, 8, 24, 24);
    } catch (error) {
      console.error("Error rendering payroll logo", error?.message || error);
    }
  }

  doc.setTextColor(18, 56, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(centerName, pageWidth / 2, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(centerAddress, pageWidth / 2, 20, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, 29, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, pageWidth / 2, 35, { align: "center" });
}

function drawFooter(doc) {
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
    doc.text("Zantua Aesthetic Wellness", 14, pageHeight - 10);
    doc.text(`Generado: ${formatDateTime(new Date())} · Página ${page} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" });
  }
}

function getEntryShortNumber(entry) {
  return String(entry?.id || "NOMINA").slice(0, 8).toUpperCase();
}

export async function generatePayrollPdf({
  entry,
  employee,
  specialist,
  period,
  companySettings,
  commissions = [],
}) {
  if (!entry?.id) {
    throw new Error("No se encontró un pago de nómina válido para exportar.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = await loadImageAsDataUrl(BRANDING.logoPath);
  const employeeName = employee?.full_name || "Empleado";
  const periodLabel = period?.name || `${period?.start_date || ""}-${period?.end_date || ""}`;

  drawHeader(
    doc,
    "Comprobante de nómina",
    `N.º ${getEntryShortNumber(entry)} · Período ${periodLabel || "sin período"}`,
    logoDataUrl,
    companySettings
  );

  autoTable(doc, {
    startY: 48,
    margin: { left: 14, right: 14 },
    head: [["Campo", "Valor"]],
    body: [
      ["Empleada", employeeName],
      ["Cargo", employee?.position || "—"],
      ["Especialista vinculada", specialist?.full_name || "—"],
      ["Cédula", employee?.national_id || "—"],
      ["Frecuencia de pago", employee?.payment_frequency || "—"],
      ["Método de pago", entry.payment_method || "—"],
      ["Estado", normalizeStatus(entry.status)],
      ["Fecha de pago", formatDate(entry.paid_at || period?.payment_date)],
      ["Período", `${formatDate(period?.start_date)} al ${formatDate(period?.end_date)}`],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [18, 56, 47], textColor: [255, 255, 255] },
    theme: "grid",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: 14, right: 14 },
    head: [["Ingreso", "Monto"]],
    body: [
      ["Salario base", formatCurrency(entry.base_salary)],
      ["Comisiones", formatCurrency(entry.commissions_total)],
      ["Bonos", formatCurrency(entry.bonus_amount)],
      ["Horas extras", formatCurrency(entry.overtime_amount)],
      ["Otros ingresos", formatCurrency(entry.other_income_amount)],
      ["Total bruto", formatCurrency(entry.gross_total)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 90, 73], textColor: [255, 255, 255] },
    theme: "grid",
    columnStyles: { 1: { halign: "right" } },
  });

  if (commissions.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      margin: { left: 14, right: 14 },
      head: [["Fecha", "Tipo", "Venta", "%", "Comisión"]],
      body: commissions.map((commission) => [
        formatDate(commission.commission_date),
        commission.type || "comisión",
        formatCurrency(commission.sale_amount),
        `${safeNumber(commission.commission_percentage)}%`,
        formatCurrency(commission.commission_amount),
      ]),
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [18, 56, 47], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [252, 250, 247] },
      theme: "grid",
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: 14, right: 14 },
    head: [["Deducción", "Monto"]],
    body: [
      ["Adelantos", formatCurrency(entry.advance_deductions)],
      ["Ausencias", formatCurrency(entry.absence_deductions)],
      ["Deducciones legales", formatCurrency(entry.legal_deductions)],
      ["Otras deducciones", formatCurrency(entry.other_deductions)],
      ["Total deducciones", formatCurrency(entry.deductions_total)],
      ["Total neto", formatCurrency(entry.net_total)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [18, 56, 47], textColor: [255, 255, 255] },
    theme: "grid",
    columnStyles: { 1: { halign: "right" } },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(27, 27, 27);
  doc.text(`Notas: ${entry.notes || "—"}`, 14, finalY);
  doc.text("Firma de empleada: ____________________", 14, finalY + 16);
  doc.text("Firma de administración: ____________________", 110, finalY + 16);

  drawFooter(doc);

  doc.save(`Nomina-Zantua-${sanitizeFileName(employeeName)}-${sanitizeFileName(periodLabel)}.pdf`);
}

export async function generatePayrollSummaryPdf(period, entries = [], employees = [], companySettings = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = await loadImageAsDataUrl(BRANDING.logoPath);
  const periodLabel = period?.name || `${period?.start_date || ""}-${period?.end_date || ""}`;

  drawHeader(
    doc,
    "Resumen de nómina",
    `${formatDate(period?.start_date)} al ${formatDate(period?.end_date)} · Pago ${formatDate(period?.payment_date)}`,
    logoDataUrl,
    companySettings
  );

  const employeeMap = new Map((employees || []).map((employee) => [employee.id, employee]));
  const rows = (entries || [])
    .filter((entry) => entry.status !== "anulada")
    .map((entry) => {
      const employee = entry.employee || employeeMap.get(entry.employee_id) || {};
      return [
        employee.full_name || "Empleado",
        formatCurrency(entry.base_salary),
        formatCurrency(entry.commissions_total),
        formatCurrency(
          safeNumber(entry.bonus_amount) + safeNumber(entry.overtime_amount) + safeNumber(entry.other_income_amount)
        ),
        formatCurrency(entry.deductions_total),
        formatCurrency(entry.net_total),
        normalizeStatus(entry.status),
      ];
    });

  autoTable(doc, {
    startY: 48,
    margin: { left: 14, right: 14 },
    head: [["Empleada", "Base", "Comisiones", "Ingresos extra", "Deducciones", "Neto", "Estado"]],
    body: rows.length ? rows : [["Sin registros", "RD$0.00", "RD$0.00", "RD$0.00", "RD$0.00", "RD$0.00", "—"]],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [18, 56, 47], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 250, 247] },
    theme: "grid",
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  const totals = (entries || [])
    .filter((entry) => entry.status !== "anulada")
    .reduce((acc, entry) => {
      acc.gross += safeNumber(entry.gross_total);
      acc.deductions += safeNumber(entry.deductions_total);
      acc.net += safeNumber(entry.net_total);
      return acc;
    }, { gross: 0, deductions: 0, net: 0 });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: 90, right: 14 },
    head: [["Resumen", "Monto"]],
    body: [
      ["Total bruto", formatCurrency(totals.gross)],
      ["Total deducciones", formatCurrency(totals.deductions)],
      ["Total neto", formatCurrency(totals.net)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 90, 73], textColor: [255, 255, 255] },
    theme: "grid",
    columnStyles: { 1: { halign: "right" } },
  });

  drawFooter(doc);

  doc.save(`Resumen-Nomina-Zantua-${sanitizeFileName(periodLabel)}.pdf`);
}
