import React, { useEffect, useState } from 'react';
import { fetchAdminReports, markReportAsHandled, markReportAsCompleted, deleteReport } from '@/services/reportApi';
import { getViolations } from '@/services/violationApi';
import { exportViolationsToExcel, exportLaneAnalyticsToExcel } from '@/services/excelExportService';
import { exportDashboardToPdf, exportSignalPerformanceToPdf } from '@/services/dashboardPdfExportService';
import { laneData } from '@/data/mockData';

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
  Trash2,
  Loader
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DownloadedReport {
  name: string;
  date: string;
  size?: string;
  type: string;
}

interface UserReport {
  id: number;
  name?: string;
  username?: string;
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
  const [isDownloadingViolations, setIsDownloadingViolations] = useState(false);
  const [isDownloadingDashboard, setIsDownloadingDashboard] = useState(false);
  const [isDownloadingSignals, setIsDownloadingSignals] = useState(false);
  const [recentDownloads, setRecentDownloads] = useState<DownloadedReport[]>([]);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const { toast } = useToast();

  // Load recent downloads and total count from localStorage on mount
  useEffect(() => {
    const savedDownloads = localStorage.getItem('recentDownloads');
    if (savedDownloads) {
      try {
        setRecentDownloads(JSON.parse(savedDownloads));
      } catch (err) {
        console.error('Error loading recent downloads:', err);
      }
    }

    const savedTotalDownloads = localStorage.getItem('totalDownloads');
    if (savedTotalDownloads) {
      try {
        setTotalDownloads(parseInt(savedTotalDownloads, 10));
      } catch (err) {
        console.error('Error loading total downloads:', err);
      }
    }
  }, []);

  const reportTypes = [
    { id: 1, name: 'Daily Traffic Summary', description: 'Complete traffic analysis for the day', type: 'PDF' },
    { id: 2, name: 'Violation Report', description: 'All traffic violations with details', type: 'Excel' },
    { id: 3, name: 'Signal Performance', description: 'Junction-wise signal efficiency report', type: 'PDF' },
    { id: 4, name: 'Emergency Response', description: 'Emergency vehicle response times', type: 'PDF' },
    { id: 5, name: 'Lane Analytics', description: 'Lane-wise traffic density analysis', type: 'Excel' },
  ];

  // Helper function to add a download to recent downloads
  const addRecentDownload = (fileName: string, fileType: string) => {
    const newDownload: DownloadedReport = {
      name: fileName,
      date: new Date().toISOString().split('T')[0],
      type: fileType,
    };

    // Add to beginning of array and keep only last 5
    const updated = [newDownload, ...recentDownloads].slice(0, 5);
    setRecentDownloads(updated);

    // Increment total downloads
    const newTotal = totalDownloads + 1;
    setTotalDownloads(newTotal);

    // Save to localStorage
    localStorage.setItem('recentDownloads', JSON.stringify(updated));
    localStorage.setItem('totalDownloads', newTotal.toString());
  };

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
    setPage(1); // Reset to page 1 when search changes
  }, [search]);

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

  const handleDownloadViolationReport = async () => {
    setIsDownloadingViolations(true);
    try {
      const response = await getViolations();
      const violations = response.violations || [];

      if (violations.length === 0) {
        toast({
          title: 'Info',
          description: 'No violations found to download',
          variant: 'default',
        });
        return;
      }

      const result = await exportViolationsToExcel(violations);

      // Track the download
      addRecentDownload(result.fileName, result.fileType);

      toast({
        title: 'Success',
        description: `Downloaded ${violations.length} violations to Excel`,
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to download violations report',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingViolations(false);
    }
  };

  const handleDownloadDashboardPdf = async () => {
    setIsDownloadingDashboard(true);
    try {
      // Calculate real stats from userReports
      const stats = {
        totalReports: userReports.length || 0,
        criticalIssues: userReports.filter(r => r.severity === 'critical').length || 0,
        pendingReports: userReports.filter(r => r.status === 'pending').length || 0,
        completedReports: userReports.filter(r => r.status === 'completed').length || 0
      };

      const result = await exportDashboardToPdf(stats);

      // Track the download
      addRecentDownload(result.fileName, result.fileType);

      toast({
        title: 'Success',
        description: 'Dashboard downloaded as PDF successfully',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to download dashboard PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingDashboard(false);
    }
  };

  const downloadTestFile = (fileName: string, fileType: 'pdf' | 'excel') => {
    if (fileType === 'pdf') {
      // Create a simple PDF using data URL
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(${fileName} - Test Report) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000301 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
395
%%EOF`;

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      // Create a simple Excel file
      const csvContent = `Report,Date,Value
${fileName},${new Date().toISOString().split('T')[0]},Sample Data`;

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleSignalPerformanceDownload = async () => {
    setIsDownloadingSignals(true);
    try {
      const result = await exportSignalPerformanceToPdf();

      // Track the download
      addRecentDownload(result.fileName, result.fileType);

      toast({
        title: 'Success',
        description: 'Signal Performance report downloaded',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to download signal report',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingSignals(false);
    }
  };

  const handleEmergencyResponseDownload = () => {
    const fileName = `Emergency_Response_${new Date().toISOString().split('T')[0]}.pdf`;
    downloadTestFile(fileName, 'pdf');
    addRecentDownload(fileName, 'PDF');
    toast({
      title: 'Success',
      description: 'Emergency Response report downloaded',
      variant: 'default',
    });
  };

  const handleLaneAnalyticsDownload = async () => {
    try {
      // Import laneData dynamically or ensure it is available
      // Using the imported service now
      const result = await exportLaneAnalyticsToExcel(laneData);

      // Track the download
      addRecentDownload(result.fileName, result.fileType);

      toast({
        title: 'Success',
        description: 'Lane Analytics report downloaded as Excel',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to download Lane Analytics',
        variant: 'destructive',
      });
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
              <p className="text-2xl font-bold">{totalDownloads}</p>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      if (r.id === 1) {
                        // Daily Traffic Summary
                        handleDownloadDashboardPdf();
                      } else if (r.id === 2) {
                        // Violation Report
                        handleDownloadViolationReport();
                      } else if (r.id === 3) {
                        // Signal Performance
                        handleSignalPerformanceDownload();
                      } else if (r.id === 4) {
                        // Emergency Response
                        handleEmergencyResponseDownload();
                      } else if (r.id === 5) {
                        // Lane Analytics
                        handleLaneAnalyticsDownload();
                      }
                    }}
                    disabled={
                      (r.id === 1 && isDownloadingDashboard) ||
                      (r.id === 2 && isDownloadingViolations) ||
                      (r.id === 3 && isDownloadingSignals)
                    }
                  >
                    {r.id === 1 && isDownloadingDashboard ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : r.id === 2 && isDownloadingViolations ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : r.id === 3 && isDownloadingSignals ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {r.type}
                  </Button>
                </div>
              ))}
            </div>

            {/* Recent Downloads */}
            <div className="glow-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Downloads (Last 5)
              </h3>
              {recentDownloads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground rounded-lg bg-muted/30">
                  <p className="text-sm">No downloads yet</p>
                </div>
              ) : (
                recentDownloads.map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-lg bg-muted/30 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {r.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* USER REPORTED ISSUES with Table */}
          <div className={`glow-card p-6 ${loading ? 'opacity-70' : ''} transition-opacity duration-200`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="bg-muted/50">Username</TableHead>
                        <TableHead className="bg-muted/50">Type</TableHead>
                        <TableHead className="bg-muted/50">Severity</TableHead>
                        <TableHead className="bg-muted/50">Description</TableHead>
                        <TableHead className="bg-muted/50">Location</TableHead>
                        <TableHead className="bg-muted/50">Status</TableHead>
                        <TableHead className="bg-muted/50">Date/Time</TableHead>
                        <TableHead className="bg-muted/50 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userReports.map(report => (
                        <TableRow key={report.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {report.username || report.name || 'Unknown'}
                          </TableCell>
                          <TableCell>{report.type}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${severityStyle(report.severity)}`}>
                              {report.severity.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            <span title={report.description}>{report.description}</span>
                          </TableCell>
                          <TableCell className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {report.location}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                              report.status === 'in_progress' ? 'bg-blue-500/20 text-blue-700' :
                                report.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                                  'bg-gray-500/20 text-gray-700'
                              }`}>
                              {report.status.toUpperCase().replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {report.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsHandling(report.id, report.status)}
                                disabled={handlingReportId === report.id}
                                className="text-xs"
                              >
                                {handlingReportId === report.id ? 'Updating...' : 'Handle'}
                              </Button>
                            )}

                            {report.status === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-green-200 hover:bg-green-50 text-green-700"
                                onClick={() => handleMarkAsCompleted(report.id)}
                                disabled={handlingReportId === report.id}
                              >
                                {handlingReportId === report.id ? 'Updating...' : 'Complete'}
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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

      {/* Hidden Dashboard Snapshot For PDF Export */}
      <div
        id="dashboard-content"
        style={{
          position: 'fixed',
          opacity: 0,
          zIndex: -1,
          pointerEvents: 'none',
          fontFamily: 'Arial, sans-serif',
          background: '#ffffff',
          padding: '20px',
          width: '210mm'
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold' }}>Smart Traffic Monitoring System</h2>
          <p style={{ color: '#555', margin: '0 0 5px 0', fontSize: '14px' }}>Daily Traffic Summary Report</p>
          <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>Date: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <hr style={{ margin: '10px 0', borderColor: '#ddd' }} />
        </div>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <p style={{ color: '#555', fontSize: '12px', margin: '0 0 8px 0' }}>Total Reports</p>
            <h2 style={{ margin: '5px 0', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>{userReports.length}</h2>
            <p style={{ color: '#666', fontSize: '11px', margin: '0' }}>User reported issues</p>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <p style={{ color: '#555', fontSize: '12px', margin: '0 0 8px 0' }}>Critical Issues</p>
            <h2 style={{ margin: '5px 0', fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
              {userReports.filter(r => r.severity === 'critical').length}
            </h2>
            <p style={{ color: '#dc3545', fontSize: '11px', margin: '0' }}>Require immediate attention</p>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <p style={{ color: '#555', fontSize: '12px', margin: '0 0 8px 0' }}>Pending</p>
            <h2 style={{ margin: '5px 0', fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              {userReports.filter(r => r.status === 'pending').length}
            </h2>
            <p style={{ color: '#ffc107', fontSize: '11px', margin: '0' }}>Awaiting action</p>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <p style={{ color: '#555', fontSize: '12px', margin: '0 0 8px 0' }}>Completed</p>
            <h2 style={{ margin: '5px 0', fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {userReports.filter(r => r.status === 'completed').length}
            </h2>
            <p style={{ color: '#28a745', fontSize: '11px', margin: '0' }}>Successfully resolved</p>
          </div>
        </div>

        {/* REPORT STATUS SUMMARY */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Report Status Summary</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Status</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Count</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>Pending</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.status === 'pending').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.status === 'pending').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>In Progress</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.status === 'in_progress').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.status === 'in_progress').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>Completed</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.status === 'completed').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.status === 'completed').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SEVERITY DISTRIBUTION */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Issue Severity Distribution</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Severity Level</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Count</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', color: '#dc3545', fontWeight: '600' }}>Critical</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.severity === 'critical').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.severity === 'critical').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', color: '#fd7e14', fontWeight: '600' }}>High</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.severity === 'high').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.severity === 'high').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', color: '#ffc107', fontWeight: '600' }}>Medium</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.severity === 'medium').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.severity === 'medium').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', color: '#28a745', fontWeight: '600' }}>Low</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                  {userReports.filter(r => r.severity === 'low').length}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}>
                  {userReports.length > 0 ? ((userReports.filter(r => r.severity === 'low').length / userReports.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '11px', color: '#999', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
          <p style={{ margin: '0' }}>Generated by Smart Traffic Monitoring System</p>
          <p style={{ margin: '3px 0 0 0' }}>© 2026 RoadZen. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
