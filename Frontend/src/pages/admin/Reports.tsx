import React, { useEffect, useState } from 'react';
import { fetchAdminReports, markReportAsHandled, markReportAsCompleted, deleteReport } from '@/services/reportApi';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('DESC');
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

  const fetchReports = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const data = await fetchAdminReports(page, 5, search, sortBy, order);
      
      if (Array.isArray(data)) {
        setUserReports(data);
        setTotalPages(1);
      } else if (data && Array.isArray(data.reports)) {
        setUserReports(data.reports);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setUserReports([]);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      // Keep existing reports on error if possible, or clear them? 
      // Better to not clear if just a refresh failed. But here we might be searching.
      if (!userReports.length) setUserReports([]);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, search, sortBy, order]);

  const severityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-500/10';
      case 'high': return 'text-orange-600 bg-orange-500/10';
      case 'medium': return 'text-yellow-600 bg-yellow-500/10';
      default: return 'text-green-600 bg-green-500/10';
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteReport(id);
      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      fetchReports(true); // Background refresh
    } catch (error) {
      console.error("Failed to delete report", error);
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        variant: 'destructive',
      });
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
      fetchReports(true);
      toast({
        title: 'Success',
        description: 'Report marked as handling',
        variant: 'default',
      });
      } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update report',
        variant: 'destructive',
      });
    } finally {
      setHandlingReportId(null);
    }
  };

  const handleMarkAsCompleted = async (reportId: number) => {
    setHandlingReportId(reportId);
    try {
      await markReportAsCompleted(reportId);
      fetchReports(true);
      toast({
        title: 'Success',
        description: 'Report marked as completed',
        variant: 'default',
      });
      } catch (err) {
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

      {/* Loading State - Only show on initial load when we have no data */}
      {loading && userReports.length === 0 && (
        <div className="glow-card p-6 text-center">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      )}
      
      {/* Main Content - Show if we have data or if loading is finished (allowing for empty state) */}
      {(userReports.length > 0 || !loading) && (
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

          {/* USER REPORTED ISSUES with Search and Sort */}
          <div className={`glow-card p-6 ${loading ? 'opacity-70' : ''} transition-opacity duration-200`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                User Reported Issues
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      <SelectValue placeholder="Sort by" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date</SelectItem>
                    <SelectItem value="severity">Severity</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setOrder(order === 'ASC' ? 'DESC' : 'ASC')}
                  title={order === 'ASC' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown className={`h-4 w-4 transition-transform ${order === 'ASC' ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>

            {userReports.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reports found</p>
            ) : (
              <div className="space-y-3">
                {userReports.map(report => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg border bg-muted/20"
                  >
                    <div className="flex justify-between mb-2">
                      <p className="font-medium">{report.type}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${severityStyle(report.severity)}`}>
                            {report.severity.toUpperCase()}
                        </span>
                        
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this report? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(report.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>
                      </div>
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
                      report.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                      'bg-gray-500/20 text-gray-700'
                    }`}>
                      {report.status.toUpperCase().replace('_', ' ')}
                    </span>
                    
                    {report.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsHandling(report.id, report.status)}
                        disabled={handlingReportId === report.id}
                        className="gap-2"
                      >
                        {handlingReportId === report.id ? 'Updating...' : 'Mark as Handling'}
                      </Button>
                    )}

                    {report.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 border-green-200 hover:bg-green-50 text-green-700"
                        onClick={() => handleMarkAsCompleted(report.id)}
                        disabled={handlingReportId === report.id}
                      >
                        {handlingReportId === report.id ? 'Updating...' : 'Mark as Completed'}
                      </Button>
                    )}
                  </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
          </div>
        </>
      )}
    </div>
  );
};

