import React, { useEffect, useState } from 'react';
import { markReportAsHandled } from '@/services/reportApi';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Clock,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserReport {
  id: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  status: string;
  created_at: string;
}

export const Reports: React.FC = () => {
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handlingReportId, setHandlingReportId] = useState<number | null>(null); 
  const { toast } = useToast();

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

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('traffic_token');

        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch('http://localhost:3000/api/admin/reports', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized - Please login again');
            localStorage.removeItem('traffic_token');
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Handle both array (legacy) and object with reports property (new)
        if (Array.isArray(data)) {
          setUserReports(data);
        } else if (data && Array.isArray(data.reports)) {
          setUserReports(data.reports);
        } else {
          console.warn('API response is not an array or object with reports:', data);
          setUserReports([]);
        }
      } catch (err) {
        console.error('Failed to load user reports', err);
        setError(err instanceof Error ? err.message : 'Failed to load reports');
        setUserReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  const sortedReports = [...userReports].sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  const severityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-500/10';
      case 'high': return 'text-orange-600 bg-orange-500/10';
      case 'medium': return 'text-yellow-600 bg-yellow-500/10';
      default: return 'text-green-600 bg-green-500/10';
    }
  };

  const handleMarkAsHandling = async (reportId: number, currentStatus: string) => {
    if (currentStatus !== 'pending') {
      toast({
        title: 'Info',
        description: 'This report is already being handled',
        variant: 'default',
      });
      return;
    }

    setHandlingReportId(reportId);
    try {
      await markReportAsHandled(reportId);
      
      // Update local state
      setUserReports(prev =>
        prev.map(r =>
          r.id === reportId ? { ...r, status: 'in_progress' } : r
        )
      );

      toast({
        title: 'Success',
        description: 'Report marked as handling',
        variant: 'default',
      });
      } catch (err) {
      console.error('Failed to update report:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update report',
        variant: 'destructive',
      });
    } finally {
      setHandlingReportId(null);
    }
  };




  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generated reports and user-submitted issues
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glow-card p-4 bg-destructive/10 border border-destructive text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glow-card p-6 text-center">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glow-card p-6">
              <p className="text-sm text-muted-foreground">Reports Generated</p>
              <p className="text-2xl font-bold">156</p>
            </div>
            <div className="glow-card p-6">
              <p className="text-sm text-muted-foreground">User Reports</p>
              <p className="text-2xl font-bold">{userReports.length}</p>
            </div>
            <div className="glow-card p-6">
              <p className="text-sm text-muted-foreground">Critical Issues</p>
              <p className="text-2xl font-bold text-red-600">
                {userReports.filter(r => r.severity === 'critical').length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generate Reports */}
            <div className="glow-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Generate Reports
              </h3>
              {reportTypes.map(r => (
                <div key={r.id} className="flex justify-between p-4 rounded-lg bg-muted/30 mb-2">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    {r.type}
                  </Button>
                </div>
              ))}
            </div>

            {/* Recent Downloads */}
            <div className="glow-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Downloads
              </h3>
              {recentReports.map((r, i) => (
                <div key={i} className="flex justify-between p-4 rounded-lg bg-muted/30 mb-2">
                  <p className="text-sm">{r.name}</p>
                  <Button size="icon" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* USER REPORTED ISSUES */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              User Reported Issues ({userReports.length})
            </h3>

            {userReports.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reports yet</p>
            ) : (
              <div className="space-y-3">
                {sortedReports.map(report => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg border bg-muted/20"
                  >
                    <div className="flex justify-between mb-2">
                      <p className="font-medium">{report.type}</p>
                      <span className={`text-xs px-2 py-1 rounded ${severityStyle(report.severity)}`}>
                        {report.severity.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {report.description}
                    </p>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {report.location}
                      </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' : 
                      report.status === 'in_progress' ? 'bg-blue-500/20 text-blue-700' :
                      'bg-green-500/20 text-green-700'
                    }`}>
                      {report.status.toUpperCase().replace('_', ' ')}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsHandling(report.id, report.status)}
                      disabled={report.status !== 'pending' || handlingReportId === report.id}
                      className="gap-2"
                    >
                      {handlingReportId === report.id ? 'Updating...' : 'Mark as Handling'}
                    </Button>
                  </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};