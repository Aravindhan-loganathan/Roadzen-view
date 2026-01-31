import { useEffect, useState } from 'react';
import { ReportForm } from '@/components/reports/ReportForm';
import { fetchMyReports } from '@/services/reportApi';

interface Report {
  id: number;
  type: string;
  severity: string;
  description: string;
  location: string;
  status: string;
}

export const ReportIssuePage = () => {
  const [reports, setReports] = useState<Report[]>([]);

  const loadReports = async () => {
    const data = await fetchMyReports();
    setReports(data);
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Report Form */}
      <ReportForm />

      {/* My Reports */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Reported Issues</h2>

        {reports.length === 0 && (
          <p className="text-muted-foreground">
            You haven’t reported any issues yet.
          </p>
        )}

        {reports.map(r => (
          <div key={r.id} className="glow-card p-4 border">
            <div className="flex justify-between mb-1">
              <p className="font-medium">{r.type}</p>
              <span className="text-xs px-2 py-1 rounded bg-muted">
                {r.status}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">{r.description}</p>

            <div className="text-xs text-muted-foreground mt-2">
              📍 {r.location} • {r.severity.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
