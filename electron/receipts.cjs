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
    { header: "Created At", key: "createdAt", width: 21 },
    { header: "Mode", key: "mode", width: 13 },
    { header: "Table", key: "table", width: 10 },
    { header: "Customer", key: "customer", width: 24 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Zone", key: "zone", width: 18 },
    { header: "Payment", key: "payment", width: 22 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Discount", key: "discount", width: 14 },
    { header: "Tax", key: "tax", width: 14 },
    { header: "Delivery", key: "delivery", width: 14 },
    { header: "Total", key: "total", width: 14 },
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
  const root = path.join(require("electron").app.getPath("documents"), "Kings Food POS", "Receipts", yyyy, mm);
  await fs.promises.mkdir(root, { recursive: true });

  const filePath = path.join(root, `Kings-Food-Receipts-${yyyy}-${mm}-${dd}.xlsx`);
  const tempPath = filePath + ".tmp";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kings Food POS";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.title = `Kings Food receipts — ${yyyy}-${mm}-${dd}`;
  workbook.properties.subject = "Automatically archived printed receipts";

  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
  }

  const receipts = workbook.getWorksheet("Receipts") || createReceiptsSheet(workbook);
  const items = workbook.getWorksheet("Items") || createItemsSheet(workbook);

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
  const change = tendered == null ? null : Math.max(0, tendered - order.total);

  const row = receipts.addRow({
    ref: textValue(order.ref),
    createdAt: date,
    mode: order.mode === "table" ? "Dine-in" : "Delivery",
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
    tendered,
    change,
    paid: order.paid ? "Yes" : "No",
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

  formatMoney(receipts, ["subtotal", "discount", "tax", "delivery", "total", "tendered", "change"]);
  formatMoney(items, ["unitPrice", "lineTotal"]);

  await workbook.xlsx.writeFile(tempPath);
  await fs.promises.rm(filePath, { force: true });
  await fs.promises.rename(tempPath, filePath);

  return {
    success: true,
    alreadyArchived: false,
    filePath,
    relativePath: path.relative(require("electron").app.getPath("documents"), filePath),
  };
}

async function openReceiptsFolder() {
  const { shell } = require("electron");
  const root = path.join(require("electron").app.getPath("documents"), "Kings Food POS", "Receipts");
  await fs.promises.mkdir(root, { recursive: true });
  await shell.openPath(root);
  return { success: true, path: root };
}

module.exports = { archivePrintedReceipt, openReceiptsFolder };
