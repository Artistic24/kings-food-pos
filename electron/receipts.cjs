const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");

function textValue(value) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function dateParts(timestamp) {
  const date = new Date(timestamp);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return { date, yyyy, mm, dd, day: `${yyyy}-${mm}-${dd}` };
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 22;
}

function configureSheet(sheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount || 1 },
  };
}

function createReceiptsSheet(workbook) {
  const sheet = workbook.addWorksheet("Receipts");
  sheet.columns = [
    { header: "Receipt Ref", key: "ref", width: 20 },
    { header: "Reference / Note", key: "reference", width: 28 },
    { header: "Receipt Type", key: "receiptKind", width: 15 },
    { header: "Patient Code", key: "patientCode", width: 18 },
    { header: "Service", key: "service", width: 20 },
    { header: "Practitioner", key: "practitioner", width: 24 },
    { header: "Created At", key: "createdAt", width: 21 },
    { header: "Mode", key: "mode", width: 13 },
    { header: "Table", key: "table", width: 10 },
    { header: "Patient Name", key: "customer", width: 24 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Zone", key: "zone", width: 18 },
    { header: "Payment", key: "payment", width: 22 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Discount", key: "discount", width: 14 },
    { header: "Tax", key: "tax", width: 14 },
    { header: "Delivery", key: "delivery", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Amount Paid", key: "amountPaid", width: 16 },
    { header: "Remaining", key: "remaining", width: 16 },
    { header: "Deposit Balance", key: "depositBalance", width: 18 },
    { header: "Tendered", key: "tendered", width: 14 },
    { header: "Change", key: "change", width: 14 },
    { header: "Paid", key: "paid", width: 10 },
    { header: "Status", key: "status", width: 14 },
    { header: "Printed At", key: "printedAt", width: 21 },
  ];
  styleHeader(sheet.getRow(1));
  configureSheet(sheet);
  return sheet;
}

function createItemsSheet(workbook) {
  const sheet = workbook.addWorksheet("Items");
  sheet.columns = [
    { header: "Receipt Ref", key: "ref", width: 20 },
    { header: "Item", key: "item", width: 32 },
    { header: "Quantity", key: "qty", width: 12 },
    { header: "Unit Price", key: "unitPrice", width: 16 },
    { header: "Line Total", key: "lineTotal", width: 16 },
  ];
  styleHeader(sheet.getRow(1));
  configureSheet(sheet);
  return sheet;
}

function formatMoney(sheet, keys) {
  for (const key of keys) {
    const column = sheet.getColumn(key);
    column.numFmt = '#,##0';
  }
}

async function archivePrintedReceipt({ order, settings }) {
  if (!order || !order.ref || !Array.isArray(order.items)) {
    throw new Error("Invalid receipt data.");
  }

  const { date, yyyy, mm, dd } = dateParts(order.createdAt);
  const root = path.join(require("electron").app.getPath("documents"), "Medical Centre POS", "Receipts", yyyy, mm);
  await fs.promises.mkdir(root, { recursive: true });

  const filePath = path.join(root, `Medical-Centre-Receipts-${yyyy}-${mm}-${dd}.xlsx`);
  // Also create a standalone workbook for this patient/receipt, while retaining the daily archive.
  const safePart = (value, fallback) => String(value || fallback)
    .normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || fallback;
  const patientFile = path.join(root, `${safePart(order.customer, "Patient")}_${safePart(order.ref, "Receipt")}.xlsx`);
  const tempPath = filePath + ".tmp";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Medical Centre POS";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.title = `Medical Centre receipts — ${yyyy}-${mm}-${dd}`;
  workbook.properties.subject = "Automatically archived printed receipts";

  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
  }

  const receipts = workbook.getWorksheet("Receipts") || createReceiptsSheet(workbook);
  const items = workbook.getWorksheet("Items") || createItemsSheet(workbook);
  ensureReferenceColumn(receipts, "Reference", "reference", 32);

  const alreadyArchived = receipts.getColumn(1).values.some((value) => String(value || "") === order.ref);
  if (alreadyArchived) {
    return {
      success: true,
      alreadyArchived: true,
      filePath,
      relativePath: path.relative(require("electron").app.getPath("documents"), filePath),
    };
  }

  const printedAt = new Date();

  const method = Array.isArray(settings?.payments)
    ? settings.payments.find((payment) => payment.id === order.paymentMethod)
    : undefined;

  const tendered = Number.isFinite(order.tendered) ? order.tendered : null;
  const amountPaid = Math.min(Math.max(0, Number(order.amountPaid ?? (order.paid ? order.total : 0))), Number(order.total || 0));
  const remaining = Math.max(0, Number(order.total || 0) - amountPaid);
  const change = tendered == null ? 0 : Math.max(0, tendered - order.total);

  const row = receipts.addRow({
    ref: textValue(order.ref),
    reference: textValue(order.reference),
    receiptKind: order.receiptKind === "pharmacy" ? "Pharmacy" : "Cashier",
    patientCode: textValue(order.patientCode),
    service: textValue(order.service),
    practitioner: textValue(order.practitioner),
    createdAt: date,
    mode: order.mode === "medical" ? "Medical" : order.mode === "table" ? "Dine-in" : "Delivery",
    table: textValue(order.table),
    customer: textValue(order.customer),
    phone: textValue(order.phone),
    zone: textValue(order.zone),
    payment: textValue(method?.name || order.paymentMethod || ""),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    tax: Number(order.tax || 0),
    delivery: Number(order.deliveryFee || 0),
    total: Number(order.total || 0),
    amountPaid,
    remaining,
    depositBalance: Number(order.depositBalance || 0),
    tendered,
    change,
    paid: amountPaid >= Number(order.total || 0) ? "Yes" : "No",
    status: textValue(order.status),
    printedAt,
  });

  row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  row.getCell("printedAt").numFmt = "dd/mm/yyyy hh:mm";
  row.getCell("ref").alignment = { vertical: "top" };

  for (const item of order.items) {
    items.addRow({
      ref: textValue(order.ref),
      item: textValue(item.name),
      qty: Number(item.qty || 0),
      unitPrice: Number(item.price || 0),
      lineTotal: Number(item.price || 0) * Number(item.qty || 0),
    });
  }

  formatMoney(receipts, ["subtotal", "discount", "tax", "delivery", "total", "amountPaid", "remaining", "depositBalance", "tendered", "change"]);
  formatMoney(items, ["unitPrice", "lineTotal"]);

  try {
    await workbook.xlsx.writeFile(tempPath);
    await fs.promises.rm(filePath, { force: true });
    await fs.promises.rename(tempPath, filePath);

    // Keep a patient-named copy of the full receipt archive workbook for easy retrieval.
    const patientTemp = patientFile + ".tmp";
    await workbook.xlsx.writeFile(patientTemp);
    await fs.promises.rm(patientFile, { force: true });
    await fs.promises.rename(patientTemp, patientFile);

    return {
      success: true,
      alreadyArchived: false,
      filePath: patientFile,
      dailyArchivePath: filePath,
      relativePath: path.relative(require("electron").app.getPath("documents"), patientFile),
    };
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});

    const fallbackPath = path.join(root, `Medical-Centre-Receipt-${textValue(order.ref).replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`);
    await workbook.xlsx.writeFile(fallbackPath);

    return {
      success: true,
      alreadyArchived: false,
      fallback: true,
      filePath: fallbackPath,
      relativePath: path.relative(require("electron").app.getPath("documents"), fallbackPath),
      warning: "The daily Excel workbook was locked, so this receipt was saved to its own Excel file instead.",
      originalError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function openReceiptsFolder() {
  const { shell } = require("electron");
  const root = path.join(require("electron").app.getPath("documents"), "Medical Centre POS", "Receipts");
  await fs.promises.mkdir(root, { recursive: true });
  await shell.openPath(root);
  return { success: true, path: root };
}



function ensureReferenceColumn(sheet, header, key, width) {
  if (sheet.columns.some((column) => column.key === key)) return;
  const column = sheet.getColumn(sheet.columnCount + 1);
  column.header = header;
  column.key = key;
  column.width = width;
  styleHeader(sheet.getRow(1));
}

async function archivePrintedSpending({ spending, settings }) {
  if (!spending || !spending.ref) throw new Error("Invalid spending receipt data.");

  const { date, yyyy, mm, dd } = dateParts(spending.createdAt);
  const root = path.join(require("electron").app.getPath("documents"), "Medical Centre POS", "Receipts", yyyy, mm);
  await fs.promises.mkdir(root, { recursive: true });

  const filePath = path.join(root, `Medical-Centre-Spending-${yyyy}-${mm}-${dd}.xlsx`);
  const tempPath = filePath + ".tmp";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Medical Centre POS";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.title = `Medical Centre spending — ${yyyy}-${mm}-${dd}`;

  if (fs.existsSync(filePath)) await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet("Spending") || workbook.addWorksheet("Spending");
  if (sheet.rowCount === 0) {
    sheet.columns = [
      { header: "Spending Ref", key: "ref", width: 20 },
      { header: "Reference", key: "reference", width: 32 },
      { header: "Created At", key: "createdAt", width: 21 },
      { header: "Description", key: "description", width: 32 },
      { header: "Category", key: "category", width: 18 },
      { header: "Supplier / Recipient", key: "vendor", width: 26 },
      { header: "Payment", key: "payment", width: 22 },
      { header: "Amount", key: "amount", width: 16 },
      { header: "Notes", key: "notes", width: 40 },
      { header: "Printed At", key: "printedAt", width: 21 },
    ];
    styleHeader(sheet.getRow(1));
    configureSheet(sheet);
  }
  ensureReferenceColumn(sheet, "Reference", "reference", 32);

  const alreadyArchived = sheet.getColumn(1).values.some((value) => String(value || "") === String(spending.ref));
  if (alreadyArchived) {
    return { success: true, alreadyArchived: true, filePath, relativePath: path.relative(require("electron").app.getPath("documents"), filePath) };
  }

  const method = Array.isArray(settings?.payments)
    ? settings.payments.find((payment) => payment.id === spending.paymentMethod)
    : undefined;

  const row = sheet.addRow({
    ref: textValue(spending.ref),
    reference: textValue(spending.reference),
    createdAt: date,
    description: textValue(spending.description),
    category: textValue(spending.category),
    vendor: textValue(spending.vendor),
    payment: textValue(method?.name || spending.paymentMethod || ""),
    amount: Number(spending.amount || 0),
    notes: textValue(spending.notes),
    printedAt: new Date(),
  });
  row.getCell("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  row.getCell("printedAt").numFmt = "dd/mm/yyyy hh:mm";
  sheet.getColumn("amount").numFmt = "#,##0";

  try {
    await workbook.xlsx.writeFile(tempPath);
    await fs.promises.rm(filePath, { force: true });
    await fs.promises.rename(tempPath, filePath);
    return { success: true, alreadyArchived: false, filePath, relativePath: path.relative(require("electron").app.getPath("documents"), filePath) };
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    const fallbackPath = path.join(root, `Medical-Centre-Spending-${textValue(spending.ref).replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`);
    await workbook.xlsx.writeFile(fallbackPath);
    return {
      success: true,
      alreadyArchived: false,
      fallback: true,
      filePath: fallbackPath,
      relativePath: path.relative(require("electron").app.getPath("documents"), fallbackPath),
      warning: "The daily spending workbook was locked, so this spending receipt was saved to its own Excel file instead.",
    };
  }
}

module.exports = { archivePrintedReceipt, archivePrintedSpending, openReceiptsFolder };
