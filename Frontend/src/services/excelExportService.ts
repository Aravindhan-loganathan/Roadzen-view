import ExcelJS from 'exceljs';

interface Violation {
  id: number;
  type: string;
  vehicle_number: string;
  location: string;
  fine_amount: number | string;
  status: string;
  timestamp: string;
}

export const exportViolationsToExcel = async (violations: Violation[]) => {
  try {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Violations');

    // Set column widths
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Type', key: 'type', width: 18 },
      { header: 'Vehicle Number', key: 'vehicle_number', width: 18 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Fine Amount (₹)', key: 'fine_amount', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date/Time', key: 'timestamp', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }, // dark gray
    };
    worksheet.getRow(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }, // white
      size: 11,
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    violations.forEach((violation, index) => {
      const rowData = {
        id: violation.id,
        type: violation.type,
        vehicle_number: violation.vehicle_number,
        location: violation.location,
        fine_amount: typeof violation.fine_amount === 'string' 
          ? parseFloat(violation.fine_amount) 
          : violation.fine_amount,
        status: violation.status,
        timestamp: new Date(violation.timestamp).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const row = worksheet.addRow(rowData);

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }, // light gray
        };
      }

      // Format fine_amount as currency
      row.getCell('fine_amount').numFmt = '₹#,##0.00';

      // Center align ID and Status
      row.getCell('id').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };

      // Wrap description text if needed
      row.getCell('type').alignment = { horizontal: 'left', wrapText: true };
    });

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Violation_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      fileName: `Violation_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
      fileType: 'Excel',
    };
  } catch (error) {
    console.error('Error exporting violations to Excel:', error);
    throw error;
  }
};
