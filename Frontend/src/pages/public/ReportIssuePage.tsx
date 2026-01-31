import { useEffect, useState } from 'react';
import { ReportForm } from '@/components/reports/ReportForm';
import { fetchMyReports, deleteReport } from '@/services/reportApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const { toast } = useToast();


  const loadReports = async () => {
    try {
      const data = await fetchMyReports(page, 5, search, sortBy, order);
      if (Array.isArray(data)) {
        setReports(data);
        setTotalPages(1);
      } else if (data && Array.isArray(data.reports)) {
        setReports(data.reports);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setReports([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to load reports", error);
      setReports([]); // Ensure reports is not undefined on error
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteReport(id);
      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      loadReports();
    } catch (error) {
      console.error("Failed to delete report", error);
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        variant: 'destructive',
      });
    }
  };


  useEffect(() => {
    loadReports();
  }, [page, search, sortBy, order]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Report Form */}
      <ReportForm onSuccess={loadReports} />

      {/* My Reports */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold">My Reported Issues</h2>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9 w-[130px]">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue placeholder="Sort" />
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
                className="h-9 w-9"
                onClick={() => setOrder(order === 'ASC' ? 'DESC' : 'ASC')}
                title={order === 'ASC' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className={`h-4 w-4 transition-transform ${order === 'ASC' ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {reports.length === 0 && (
          <p className="text-muted-foreground">
            You haven’t reported any issues yet.
          </p>
        )}

        {reports.map(r => (
          <div key={r.id} className="glow-card p-4 border relative group">
            <div className="flex justify-between items-start mb-2">
               <div>
                  <p className="font-medium text-lg">{r.type}</p>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>📍 {r.location}</span>
                    <span>•</span>
                    <span className={`font-semibold ${
                      r.severity === 'critical' || r.severity === 'high' ? 'text-red-500' : 
                      r.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {r.severity.toUpperCase()}
                    </span>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 <span className={`text-xs px-2 py-1 rounded-full border ${
                    r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                    r.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                    r.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    'bg-green-500/10 text-green-600 border-green-500/20'
                 }`}>
                   {r.status.replace('_', ' ').toUpperCase()}
                 </span>
                 
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
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
                        <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>
               </div>
            </div>

            <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-3 rounded-md">
              {r.description}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="py-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
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
  );
};
