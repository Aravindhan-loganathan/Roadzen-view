import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

interface DashboardStats {
  totalReports?: number;
  criticalIssues?: number;
  pendingReports?: number;
  completedReports?: number;
}

export const exportDashboardToPdf = async (stats?: DashboardStats) => {

  const fileName = `Daily_Traffic_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
  const reportDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {

    const pdfContainer = document.createElement('div');

    pdfContainer.innerHTML = `
    <meta charset="UTF-8">
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background:#ffffff; padding:40px; width:100%; box-sizing: border-box;">
      
      <!-- PAGE BORDER -->
      <div style="border: 2px solid #334155; padding: 30px; min-height: 1000px; position: relative;">
        
        <!-- HEADER -->
        <div style="border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin:0; color:#0f172a; font-size: 28px; text-transform: uppercase; letter-spacing: 1px;">Traffic Report</h1>
            <p style="color:#64748b; margin:5px 0 0 0; font-size: 14px;">Daily Executive Summary</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size:12px; color:#94a3b8; margin: 0;">REPORT ID: #${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</p>
            <p style="font-size:12px; color:#0f172a; font-weight: bold; margin: 5px 0 0 0;">${reportDate}</p>
          </div>
        </div>

        <!-- STAT CARDS -->
        <h3 style="color:#334155; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">System Overview</h3>
        <div style="display:flex; gap:15px; margin-bottom:30px; justify-content:space-between;">

          <div style="flex:1; border:1px solid #cbd5e1; padding:15px; border-radius:4px; background-color:#f8fafc; text-align: center;">
            <p style="color:#64748b; font-size:11px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 10px 0;">Total Reports</p>
            <h2 style="margin:0; font-size:32px; color:#0f172a; font-weight: 800;">${stats?.totalReports ?? '-'}</h2>
            <div style="margin-top: 10px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 5px;">All submissions</div>
          </div>

          <div style="flex:1; border:1px solid #fecaca; padding:15px; border-radius:4px; background-color:#fef2f2; text-align: center;">
            <p style="color:#b91c1c; font-size:11px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 10px 0;">Critical Issues</p>
            <h2 style="margin:0; font-size:32px; color:#dc2626; font-weight: 800;">${stats?.criticalIssues ?? '-'}</h2>
            <div style="margin-top: 10px; font-size: 10px; color: #b91c1c; border-top: 1px solid #fecaca; padding-top: 5px;">Action Required</div>
          </div>

          <div style="flex:1; border:1px solid #fde68a; padding:15px; border-radius:4px; background-color:#fffbeb; text-align: center;">
            <p style="color:#b45309; font-size:11px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 10px 0;">Pending</p>
            <h2 style="margin:0; font-size:32px; color:#d97706; font-weight: 800;">${stats?.pendingReports ?? '-'}</h2>
            <div style="margin-top: 10px; font-size: 10px; color: #b45309; border-top: 1px solid #fde68a; padding-top: 5px;">In Queue</div>
          </div>

          <div style="flex:1; border:1px solid #bbf7d0; padding:15px; border-radius:4px; background-color:#f0fdf4; text-align: center;">
            <p style="color:#15803d; font-size:11px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 10px 0;">Completed</p>
            <h2 style="margin:0; font-size:32px; color:#16a34a; font-weight: 800;">${stats?.completedReports ?? '-'}</h2>
            <div style="margin-top: 10px; font-size: 10px; color: #15803d; border-top: 1px solid #bbf7d0; padding-top: 5px;">Resolved</div>
          </div>

        </div>

        <!-- SIGNAL PERFORMANCE TABLE -->
        <h3 style="color:#334155; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">Key Junction Performance</h3>
        <div style="border:1px solid #cbd5e1; border-radius:4px; overflow: hidden; margin-bottom: 30px;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background-color:#f1f5f9; text-align:left; border-bottom: 2px solid #cbd5e1;">
                <th style="padding:12px 15px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px;">Location</th>
                <th style="padding:12px 15px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px;">Status</th>
                <th style="padding:12px 15px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px; text-align: right;">Efficiency Score</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding:12px 15px; color:#334155; font-weight:500;">MG Road Main Junction</td>
                <td style="padding:12px 15px;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">OPTIMAL</span></td>
                <td style="padding:12px 15px; color:#334155; text-align: right; font-weight: bold;">92%</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding:12px 15px; color:#334155; font-weight:500;">Whitefield IT Park</td>
                <td style="padding:12px 15px;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">OPTIMAL</span></td>
                <td style="padding:12px 15px; color:#334155; text-align: right; font-weight: bold;">88%</td>
              </tr>
              <tr>
                <td style="padding:12px 15px; color:#334155; font-weight:500;">Indiranagar 100ft Road</td>
                <td style="padding:12px 15px;"><span style="background: #fef9c3; color: #854d0e; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">AVERAGE</span></td>
                <td style="padding:12px 15px; color:#334155; text-align: right; font-weight: bold;">75%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- FOOTER INFO -->
        <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 10px; color: #94a3b8;">
            Generated by Smart Traffic Monitoring System<br/>
            Confidential - Internal Use Only
          </div>
          <div style="font-size: 10px; color: #94a3b8; text-align: right;">
             Page 1 of 1
          </div>
        </div>

      </div>
    </div>
    `;

    document.body.appendChild(pdfContainer);

    const options = {
      margin: 8,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      },
      jsPDF: {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      }
    };

    await html2pdf().set(options).from(pdfContainer).save();

    pdfContainer.remove();

    return {
      fileName,
      fileType: 'PDF'
    };

  } catch (error) {

    console.error('PDF Export Error:', error);

    return {
      fileName,
      fileType: 'PDF'
    };
  }
};

export const exportSignalPerformanceToPdf = async () => {
  const fileName = `Signal_Performance_${new Date().toISOString().split('T')[0]}.pdf`;

  // Import mock data dynamically or use hardcoded implementation matching mockData.ts
  // For simplicity and to avoid import issues inside this file if it's not a module, we recreate the data
  // matching mockData.ts structure
  const signalPerformance = [
    { junction: 'MG Road', efficiency: 92 },
    { junction: 'Brigade Rd', efficiency: 78 },
    { junction: 'Indiranagar', efficiency: 65 },
    { junction: 'Koramangala', efficiency: 85 },
    { junction: 'Whitefield', efficiency: 88 },
    { junction: 'E-City', efficiency: 71 },
  ];

  try {
    const pdfContainer = document.createElement('div');

    // Calculate max efficiency for scaling (usually 100)
    const maxEff = 100;

    // Create Histogram HTML
    const barsHtml = signalPerformance.map(item => {
      const height = (item.efficiency / maxEff) * 100;
      let color = '#22c55e'; // green
      if (item.efficiency < 70) color = '#f97316'; // orange
      if (item.efficiency < 50) color = '#ef4444'; // red

      return `
        <div style="display:flex; flex-direction:column; align-items:center; width: 14%">
          <div style="font-size:10px; font-weight:bold; margin-bottom:5px">${item.efficiency}%</div>
          <div style="width:100%; height:200px; display:flex; align-items:flex-end; justify-content:center; background:#f3f4f6; border-radius:4px 4px 0 0; overflow:hidden">
            <div style="width:100%; height:${height}%; background-color:${color}; transition: height 0.3s"></div>
          </div>
          <div style="font-size:10px; color:#555; margin-top:5px; text-align:center; height:30px; overflow:hidden">${item.junction}</div>
        </div>
      `;
    }).join('');

    pdfContainer.innerHTML = `
    <meta charset="UTF-8">
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background:#ffffff; padding:40px; width:100%; box-sizing: border-box;">
      
      <!-- PAGE BORDER -->
      <div style="border: 2px solid #334155; padding: 30px; min-height: 1000px; position: relative;">

        <!-- HEADER -->
        <div style="border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin:0; color:#0f172a; font-size: 28px; text-transform: uppercase; letter-spacing: 1px;">Signal Audit</h1>
            <p style="color:#64748b; margin:5px 0 0 0; font-size: 14px;">Performance & Efficiency Analysis</p>
          </div>
          <div style="text-align: right;">
             <p style="font-size:12px; color:#94a3b8; margin: 0;">REPORT ID: #${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</p>
            <p style="font-size:12px; color:#0f172a; font-weight: bold; margin: 5px 0 0 0;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <!-- INTRODUCTION -->
        <div style="margin-bottom:30px; color:#334155; font-size:13px; line-height:1.6; border-left: 4px solid #cbd5e1; padding-left: 15px; font-style: italic;">
          This technical report provides an efficiency analysis of traffic signal operations across key network nodes. Data is derived from real-time monitoring of flow smoothness, average wait states, and congestion clearance times.
        </div>

        <!-- HISTOGRAM CHART -->
        <h3 style="color:#334155; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">Efficiency Distribution</h3>
        <div style="border:1px solid #cbd5e1; padding:20px 20px 40px 40px; border-radius:4px; margin-bottom:30px; position:relative; page-break-inside: avoid; background: #fdfdfd;">
          
          <div style="display:flex; justify-content:space-between; align-items:flex-end; height:220px; padding-bottom:10px; border-bottom:1px solid #94a3b8; border-left:1px solid #94a3b8">
            ${barsHtml}
          </div>
          
          <div style="text-align:center; margin-top:15px; font-size:11px; font-weight:bold; color:#64748b; text-transform: uppercase;"> monitored Junction nodes</div>
          
          <!-- Y-Axis Label (Standard Position) -->
          <div style="position:absolute; left:5px; top:50%; transform:translateY(-50%) rotate(-90deg); font-size:10px; font-weight:bold; color:#64748b; white-space:nowrap; text-transform: uppercase;">Efficiency (%)</div>
        </div>

        <!-- ANALYTICS TABLE -->
        <div style="margin-bottom:30px; page-break-inside: avoid;">
          <h3 style="color:#334155; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">Detailed Metrics</h3>
          <table style="width:100%; border-collapse:collapse; font-size:13px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color:#f1f5f9; text-align:left; border-bottom: 2px solid #cbd5e1;">
                <th style="padding:10px 12px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px;">Junction Name</th>
                <th style="padding:10px 12px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px;">Score</th>
                <th style="padding:10px 12px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px;">Status</th>
                <th style="padding:10px 12px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 11px;">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              ${signalPerformance.map(item => {
      let status = 'OPTIMAL';
      let statusBg = '#dcfce7'; // green-100
      let statusColor = '#166534'; // green-800
      let recommendation = 'Maintain current timing';

      if (item.efficiency < 80) {
        status = 'GOOD';
        statusBg = '#fef9c3'; // yellow-100
        statusColor = '#854d0e'; // yellow-800
        recommendation = 'Monitor peak hours';
      }
      if (item.efficiency < 70) {
        status = 'ATTENTION';
        statusBg = '#ffedd5'; // orange-100
        statusColor = '#9a3412'; // orange-800
        recommendation = 'Adjust signal phase duration';
      }
      if (item.efficiency < 60) {
        status = 'CRITICAL';
        statusBg = '#fee2e2'; // red-100
        statusColor = '#991b1b'; // red-800
        recommendation = 'Immediate infrastructure review';
      }

      return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding:10px 12px; font-weight:500; color:#334155">${item.junction}</td>
                  <td style="padding:10px 12px; color:#334155; font-weight: bold;">${item.efficiency}%</td>
                  <td style="padding:10px 12px;">
                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${status}</span>
                  </td>
                  <td style="padding:10px 12px; color:#475569; font-size: 12px;">${recommendation}</td>
                </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>

        <!-- SUMMARY -->
        <div style="background-color:#f8fafc; padding:20px; border: 1px solid #e2e8f0; border-radius:4px; page-break-inside: avoid; margin-bottom: auto;">
          <h4 style="margin:0 0 10px 0; color:#0f172a; font-size:14px; text-transform: uppercase;">Executive Summary</h4>
          <p style="margin:0; font-size:13px; color:#334155; line-height: 1.6;">
            The overall traffic network is operating at <strong>${Math.round(signalPerformance.reduce((acc, curr) => acc + curr.efficiency, 0) / signalPerformance.length)}%</strong> average efficiency. 
            Corrective actions are recommended for junctions with efficiency scores below 70%. Continued monitoring is advised to maintain optimal flow during peak operational hours.
          </p>
        </div>

        <!-- FOOTER INFO -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 10px; color: #94a3b8;">
            Generated by Smart Traffic Monitoring System<br/>
            Confidential - Internal Use Only
          </div>
          <div style="font-size: 10px; color: #94a3b8; text-align: right;">
             Page 1 of 1
          </div>
        </div>

      </div>
    </div>
    `;

    document.body.appendChild(pdfContainer);

    const options = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      },
      jsPDF: {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      }
    };

    await html2pdf().set(options).from(pdfContainer).save();

    document.body.removeChild(pdfContainer);

    return {
      fileName,
      fileType: 'PDF'
    };

  } catch (error) {
    console.error('Signal Performance PDF Export Error:', error);
    return {
      fileName: 'error_log.txt',
      fileType: 'TXT'
    };
  }
};

export const exportLaneAnalyticsToPdf = async (junctionWithLanes: any[]) => {
  const junctionName = junctionWithLanes.length > 0 ? junctionWithLanes[0].junction : 'Unknown';
  const fileName = `Lane_Analytics_${junctionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    const pdfContainer = document.createElement('div');

    const tableRows = junctionWithLanes.map(lane => {
      let statusBg = '#dcfce7'; // green-100
      let statusColor = '#166534'; // green-800

      if (lane.status === 'medium') {
        statusBg = '#fef9c3'; // yellow-100
        statusColor = '#854d0e'; // yellow-800
      } else if (lane.status === 'high') {
        statusBg = '#fee2e2'; // red-100
        statusColor = '#991b1b'; // red-800
      }

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding:6px 8px; font-weight:500; color:#334155; font-size: 11px;">${lane.lane}</td>
          <td style="padding:6px 8px; color:#334155; text-align: right; font-family: monospace; font-size: 11px;">${lane.vehicles.toLocaleString()}</td>
          <td style="padding:6px 8px; color:#334155; text-align: right; font-size: 11px;">${lane.density}%</td>
          <td style="padding:6px 8px; text-align: center;">
            <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: bold; text-transform: uppercase;">${lane.status}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Calculate aggregated stats
    const totalVehicles = junctionWithLanes.reduce((sum: number, lane: any) => sum + lane.vehicles, 0);
    const avgDensity = Math.round(junctionWithLanes.reduce((sum: number, lane: any) => sum + lane.density, 0) / (junctionWithLanes.length || 1));
    const mostCongested = [...junctionWithLanes].sort((a, b) => b.density - a.density)[0];

    // Generate Charts HTML
    const barsHtml = junctionWithLanes.map(lane => {
      const height = lane.density; // Density is already percentage (0-100)
      let color = '#10b981'; // traffic-green (hsl(142, 71%, 45%))
      // Match the dashboard logic exactly
      if (lane.status === 'medium') color = '#f59e0b'; // traffic-yellow (hsl(38, 92%, 50%))
      if (lane.status === 'high') color = '#ef4444'; // traffic-red (hsl(0, 72%, 51%))

      return `
        <div style="display:flex; flex-direction:column; align-items:center; width: 24%; position: relative;">
          <div style="font-size:10px; font-weight:700; color:#1e293b; margin-bottom: 8px;">${lane.density}%</div>
          <div style="width:100%; height:140px; display:flex; align-items:flex-end; justify-content:center; background:hsl(210, 20%, 98%); border-radius:4px 4px 0 0; overflow:hidden; border: 1px solid #e2e8f0; position: relative;">
            <div style="width:70%; height:${height}%; background-color:${color}; border-radius: 4px 4px 0 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);"></div>
          </div>
          <div style="font-size:9px; color:#64748b; margin-top:8px; text-align:center; line-height: 1.2; font-weight: 600;">${lane.lane.replace(' Bound', '')}</div>
        </div>
      `;
    }).join('');

    pdfContainer.innerHTML = `
    <meta charset="UTF-8">
    <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background:#f8fafc; padding:25px; width:100%; box-sizing: border-box;">
      
      <!-- PAGE BORDER -->
      <div style="border: 1px solid #e2e8f0; background: #f8fafc; padding: 20px; position: relative; min-height: 100%;">

        <!-- HEADER -->
        <div style="border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin:0; color:#0f172a; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">Lane Analytics</h1>
            <p style="color:#64748b; margin:3px 0 0 0; font-size: 12px;">Junction: <span style="color:#0f172a; font-weight:bold">${junctionName}</span></p>
          </div>
          <div style="text-align: right;">
             <p style="font-size:10px; color:#94a3b8; margin: 0;">REPORT ID: #${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</p>
            <p style="font-size:10px; color:#0f172a; font-weight: bold; margin: 3px 0 0 0;">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>

        <!-- SUMMARY CARDS -->
        <h3 style="color:#334155; border-left: 3px solid #3b82f6; padding-left: 8px; margin: 0 0 12px 0; font-size: 13px;">Overview</h3>
        <div style="display:flex; gap:10px; margin-bottom:15px; justify-content:space-between;">
          <div style="flex:1; border:1px solid #e2e8f0; padding:12px; border-radius:6px; background-color:#ffffff; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <p style="color:#64748b; font-size:9px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 6px 0;">Total Volume</p>
            <h2 style="margin:0; font-size:20px; color:#0f172a; font-weight: 800;">${totalVehicles.toLocaleString()}</h2>
          </div>
          <div style="flex:1; border:1px solid #e2e8f0; padding:12px; border-radius:6px; background-color:#ffffff; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <p style="color:#64748b; font-size:9px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 6px 0;">Avg Density</p>
            <h2 style="margin:0; font-size:20px; color:#0f172a; font-weight: 800;">${avgDensity}%</h2>
          </div>
          <div style="flex:1; border:1px solid #fee2e2; padding:12px; border-radius:6px; background-color:#fef2f2; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <p style="color:#b91c1c; font-size:9px; text-transform: uppercase; letter-spacing: 0.5px; margin:0 0 6px 0;">Peak Lane</p>
            <h2 style="margin:0; font-size:18px; color:#dc2626; font-weight: 800;">${mostCongested?.lane || 'N/A'}</h2>
          </div>
        </div>

        <!-- DENSITY CHART -->
        <div style="margin-top: 25px; margin-bottom: 20px;">
          <h3 style="color:#0f172a; border-left: 4px solid #3b82f6; padding-left: 10px; margin: 0 0 15px 0; font-size: 14px; font-weight: 700;">Density Distribution</h3>
          <div style="border:1px solid #e2e8f0; padding:30px 30px 35px 50px; border-radius:8px; background: #ffffff; position: relative; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:flex-end; height:150px; border-bottom:2px solid #cbd5e1; border-left:2px solid #cbd5e1; padding: 0 10px 0 5px;">
              ${barsHtml}
            </div>
            
            <!-- X-Axis Label -->
            <div style="text-align:center; margin-top:15px; font-size:10px; font-weight:700; color:#64748b; text-transform: uppercase; letter-spacing: 1px;">Detected Lanes</div>
            
            <!-- Y-Axis Label -->
            <div style="position:absolute; left:-35px; top:110px; width: 150px; text-align: center; transform: rotate(-90deg); font-size:9px; font-weight:700; color:#64748b; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap;">Density Percentage (%)</div>
          </div>
        </div>



        <!-- ANALYTICS TABLE -->
        <div style="margin-bottom:15px;">
          <h3 style="color:#334155; border-left: 3px solid #3b82f6; padding-left: 8px; margin: 0 0 10px 0; font-size: 13px;">Lane Breakdown</h3>
          <table style="width:100%; border-collapse:collapse; font-size:11px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color:#f1f5f9; text-align:left; border-bottom: 2px solid #cbd5e1;">
                <th style="padding:6px 8px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 9px;">Lane Direction</th>
                <th style="padding:6px 8px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 9px; text-align: right;">Vehicle Count</th>
                <th style="padding:6px 8px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 9px; text-align: right;">Density</th>
                <th style="padding:6px 8px; color:#334155; font-weight:700; text-transform: uppercase; font-size: 9px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <!-- FOOTER INFO -->
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 8px; color: #94a3b8;">
            Generated by Smart Traffic Monitoring System • Confidential
          </div>
          <div style="font-size: 8px; color: #94a3b8; text-align: right;">
             Page 1 of 1
          </div>
        </div>

      </div>
    </div>
    `;

    document.body.appendChild(pdfContainer);

    const options = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      },
      jsPDF: {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      }
    };

    await html2pdf().set(options).from(pdfContainer).save();

    document.body.removeChild(pdfContainer);

    return {
      fileName,
      fileType: 'PDF'
    };

  } catch (error) {
    console.error('Lane Analytics PDF Export Error:', error);
    return {
      fileName: 'error_log.txt',
      fileType: 'TXT'
    };
  }
};
