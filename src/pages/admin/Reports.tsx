import React from 'react';
import { FileText, Download, Calendar, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Reports: React.FC = () => {
  const reportTypes = [
    { id: 1, name: 'Daily Traffic Summary', description: 'Complete traffic analysis for the day', type: 'PDF' },
    { id: 2, name: 'Violation Report', description: 'All traffic violations with details', type: 'Excel' },
    { id: 3, name: 'Signal Performance', description: 'Junction-wise signal efficiency report', type: 'PDF' },
    { id: 4, name: 'Emergency Response', description: 'Emergency vehicle response times', type: 'PDF' },
    { id: 5, name: 'Lane Analytics', description: 'Lane-wise traffic density analysis', type: 'Excel' },
  ];

  const recentReports = [
    { name: 'Traffic_Summary_2024-01-24.pdf', date: '2024-01-24', size: '2.4 MB' },
    { name: 'Violations_Weekly_W4.xlsx', date: '2024-01-23', size: '1.8 MB' },
    { name: 'Signal_Performance_Q1.pdf', date: '2024-01-22', size: '3.1 MB' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and download traffic management reports</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glow-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reports Generated</p>
              <p className="text-2xl font-display font-bold">156</p>
            </div>
          </div>
        </div>
        <div className="glow-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-display font-bold">24</p>
            </div>
          </div>
        </div>
        <div className="glow-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/10">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-display font-bold">3</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Reports */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Generate New Report
          </h3>
          <div className="space-y-3">
            {reportTypes.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  {report.type}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Downloads
          </h3>
          <div className="space-y-3">
            {recentReports.map((report, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.date} • {report.size}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            View All Reports
          </Button>
        </div>
      </div>
    </div>
  );
};
