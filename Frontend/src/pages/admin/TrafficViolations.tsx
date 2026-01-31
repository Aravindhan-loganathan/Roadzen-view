import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Calendar,
  Filter,
  Ban,
  Gauge,
  ArrowRightLeft,
  Plus,
  Loader,
  ParkingCircle,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { CreateViolationDialog } from '@/components/violations/CreateViolationDialog';
import { getViolations, getLocations, Violation, ViolationFilters } from '@/services/violationApi';

export const TrafficViolations: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('today');
  const [junctionFilter, setJunctionFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch locations from API
  const fetchLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const response = await getLocations();
      setLocations(response.locations || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Fetch violations from API with filters
  const fetchViolations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: ViolationFilters = {};
      
      // Add date range filter
      if (dateFilter !== 'all') {
        filters.dateRange = dateFilter;
      }
      
      // Add location filter
      if (junctionFilter !== 'all') {
        filters.location = junctionFilter;
      }

      const response = await getViolations(filters);
      setViolations(response.violations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch violations');
      console.error('Error fetching violations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch locations on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch violations when filters change
  useEffect(() => {
    fetchViolations();
  }, [dateFilter, junctionFilter]);

  const handleViolationClick = (violation: Violation) => {
    setSelectedViolation(violation);
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedViolation(null);
    setDialogOpen(true);
  };

  // Helper function to safely convert fine_amount to number
  const getFineAmount = (amount: any): number => {
    const parsed = parseFloat(String(amount || 0));
    return isNaN(parsed) ? 0 : parsed;
  };

  const violationTypes = [
    { type: 'Signal Jump', icon: Ban, color: 'text-destructive' },
    { type: 'Over Speeding', icon: Gauge, color: 'text-warning' },
    { type: 'Lane Violation', icon: ArrowRightLeft, color: 'text-primary' },
    { type: 'Illegal Parking', icon: ParkingCircle, color: 'text-orange-500' },
    { type: 'No Helmet', icon: AlertCircle, color: 'text-red-500' },
    { type: 'Wrong Side', icon: TrendingDown, color: 'text-indigo-500' },
  ];

  // Calculate counts from database
  const getViolationCount = (type: string) => {
    return violations.filter((v) => v.type === type).length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'issued':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'paid':
        return 'bg-success/10 text-success border-success/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Signal Jump':
        return <Ban className="w-5 h-5 text-destructive" />;
      case 'Over Speeding':
        return <Gauge className="w-5 h-5 text-warning" />;
      case 'Lane Violation':
        return <ArrowRightLeft className="w-5 h-5 text-primary" />;
      case 'Illegal Parking':
        return <ParkingCircle className="w-5 h-5 text-orange-500" />;
      case 'No Helmet':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Wrong Side':
        return <TrendingDown className="w-5 h-5 text-indigo-500" />;
      default:
        return <AlertOctagon className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Traffic Violations</h1>
          <p className="text-muted-foreground mt-1">Violations and enforcement</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={junctionFilter} onValueChange={setJunctionFilter} disabled={isLoadingLocations}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Junctions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Junctions</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleCreateNew}
            className="gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Violation
          </Button>
        </div>
      </div>

      {/* Violation Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {violationTypes.map(({ type, icon: Icon, color }, index) => (
          <div
            key={type}
            className="glow-card p-6 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{type}</p>
                <AnimatedCounter end={getViolationCount(type)} className="text-3xl font-bold mt-1" />
                <p className="text-xs text-muted-foreground mt-1">violations detected</p>
              </div>
              <div className={`p-3 rounded-xl bg-muted/30 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glow-card overflow-hidden">
        {/* Violations List */}
        <div className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Recent Violations</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchViolations}
              disabled={isLoading}
            >
              {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              Loading violations...
            </div>
          ) : violations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No violations found
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {violations.map((violation) => (
                <div
                  key={violation.id}
                  onClick={() => handleViolationClick(violation)}
                  className="p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(violation.type)}
                      <div>
                        <p className="font-medium">{violation.type}</p>
                        <p className="text-sm text-muted-foreground">{violation.vehicle_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">{violation.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(violation.status)}`}>
                        {violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                      </span>
                      <p className="text-lg font-bold mt-2">₹{violation.fine_amount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="glow-card p-6">
        <h3 className="font-semibold mb-4">Violation Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Total Violations</p>
            <p className="text-2xl font-display font-bold mt-1">{violations.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Fines Issued</p>
            <p className="text-2xl font-display font-bold mt-1">
              ₹{violations.reduce((sum, v) => sum + getFineAmount(v.fine_amount), 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Fines Collected</p>
            <p className="text-2xl font-display font-bold mt-1 text-success">
              ₹{violations.filter(v => v.status === 'paid').reduce((sum, v) => sum + getFineAmount(v.fine_amount), 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-display font-bold mt-1 text-warning">
              {violations.filter(v => v.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      {/* Create Violation Dialog */}
      <CreateViolationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedViolation(null);
          }
        }}
        violation={selectedViolation}
        onSuccess={() => {
          fetchViolations();
          setSelectedViolation(null);
        }}
      />
    </div>
  );
};
