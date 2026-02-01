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

interface LaneData {
  id: number;
  junction: string;
  lane: string;
  vehicles: number;
  density: number;
  status: string;
}

export const exportLaneAnalyticsToExcel = async (laneData: LaneData[]) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lane Analytics');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Junction', key: 'junction', width: 25 },
      { header: 'Lane Name', key: 'lane', width: 25 },
      { header: 'Vehicle Count', key: 'vehicles', width: 15 },
      { header: 'Density (%)', key: 'density', width: 15 },
      { header: 'Congestion Status', key: 'status', width: 20 },
    ];

    // Header Style
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // dark blue
    };
    worksheet.getRow(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Data Rows
    laneData.forEach((item, index) => {
      const row = worksheet.addRow({
        id: item.id,
        junction: item.junction,
        lane: item.lane,
        vehicles: item.vehicles,
        density: item.density,
        status: item.status.toUpperCase(),
      });

      // Conditional Formatting for Status
      const statusCell = row.getCell('status');
      if (item.status === 'high') {
        statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
      } else if (item.status === 'medium') {
        statusCell.font = { color: { argb: 'FFF59E0B' }, bold: true }; // Orange
      } else {
        statusCell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Green
      }

      // Zebra striping
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }

      row.getCell('vehicles').numFmt = '#,##0';
      row.getCell('density').numFmt = '0"%"';
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('density').alignment = { horizontal: 'center' };
      row.getCell('vehicles').alignment = { horizontal: 'center' };
      row.getCell('id').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };
      row.getCell('junction').alignment = { horizontal: 'left' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lane_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      fileName: `Lane_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`,
      fileType: 'Excel',
    };

  } catch (error) {
    console.error('Error exporting Lane Analytics to Excel:', error);
    throw error;
  }
};
