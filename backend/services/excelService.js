import ExcelJS from "exceljs";

export const generateAttendanceExcel = async (records) => {
  const workbook = new ExcelJS.Workbook();

  // ─── Workbook Metadata ─────────────────────────────────────────────────────
  workbook.creator = "VisionAttend";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Attendance");

  // ─── Column Definitions ────────────────────────────────────────────────────
  worksheet.columns = [
    { header: "Name",        key: "name",       width: 22 },
    { header: "Email",       key: "email",      width: 28 },
    { header: "Roll Number", key: "rollNumber", width: 15 },
    { header: "Subject",     key: "subject",    width: 15 },
    { header: "Date",        key: "date",       width: 15 },
    { header: "Status",      key: "status",     width: 12 },
  ];

  // ─── Style Header Row ──────────────────────────────────────────────────────
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }, // indigo
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });
  headerRow.height = 22;

  // ─── Add Data Rows ─────────────────────────────────────────────────────────
  records.forEach((record, index) => {
    const row = worksheet.addRow({
      name:       record.User?.name       || "N/A",
      email:      record.User?.email      || "N/A",
      rollNumber: record.User?.rollNumber || "N/A",
      subject:    record.subject,
      date:       record.date,
      status:     record.status,
    });

    // Zebra striping
    const bgColor = index % 2 === 0 ? "FFF5F5FF" : "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Color-code status cell
    const statusCell = row.getCell("status");
    if (record.status === "Present") {
      statusCell.font = { bold: true, color: { argb: "FF16A34A" } }; // green
    } else {
      statusCell.font = { bold: true, color: { argb: "FFDC2626" } }; // red
    }

    row.height = 18;
  });

  // ─── Summary Row ───────────────────────────────────────────────────────────
  worksheet.addRow([]); // blank row
  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount  = records.filter((r) => r.status === "Absent").length;

  const summaryRow = worksheet.addRow({
    name:    `Total: ${records.length}`,
    subject: `Present: ${presentCount}`,
    status:  `Absent: ${absentCount}`,
  });
  summaryRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF3CD" }, // light yellow
    };
  });

  return workbook;
};