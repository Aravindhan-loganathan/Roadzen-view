import React, { useState } from 'react';
import {
  AlertOctagon,
  Camera,
  Calendar,
  Filter,
  Ban,
  Gauge,
  ArrowRightLeft,
} from 'lucide-react';
import { violations } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

export const TrafficViolations: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('today');
  const [junctionFilter, setJunctionFilter] = useState('all');

  const violationTypes = [
    { type: 'Signal Jump', count: 156, icon: Ban, color: 'text-destructive' },
    { type: 'Over Speeding', count: 89, icon: Gauge, color: 'text-warning' },
    { type: 'Lane Violation', count: 45, icon: ArrowRightLeft, color: 'text-primary' },
  ];

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
          <p className="text-muted-foreground mt-1">AI-detected violations and enforcement</p>
        </div>
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
          <Select value={junctionFilter} onValueChange={setJunctionFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Junctions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Junctions</SelectItem>
              <SelectItem value="mg">MG Road</SelectItem>
              <SelectItem value="brigade">Brigade Road</SelectItem>
              <SelectItem value="outer">Outer Ring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Violation Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {violationTypes.map(({ type, count, icon: Icon, color }, index) => (
          <div
            key={type}
            className="glow-card p-6 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{type}</p>
                <AnimatedCounter end={count} className="text-3xl font-bold mt-1" />
                <p className="text-xs text-muted-foreground mt-1">violations detected</p>
              </div>
              <div className={`p-3 rounded-xl bg-muted/30 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Violations List */}
        <div className="lg:col-span-2 glow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Recent Violations</h3>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="divide-y divide-border">
            {violations.map((violation) => (
              <div key={violation.id} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(violation.type)}
                    <div>
                      <p className="font-medium">{violation.type}</p>
                      <p className="text-sm text-muted-foreground">{violation.vehicleNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{violation.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(violation.status)}`}>
                      {violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                    </span>
                    <p className="text-lg font-bold mt-2">₹{violation.fine}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Snapshot Placeholder */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Captured Snapshot
          </h3>
          <div className="aspect-video rounded-lg bg-muted/30 flex items-center justify-center mb-4">
            <div className="text-center">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a violation to view snapshot</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Camera ID</span>
              <span className="font-mono">CAM-MG-01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timestamp</span>
              <span className="font-mono">14:32:45</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-mono text-success">98.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="glow-card p-6">
        <h3 className="font-semibold mb-4">Violation Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Total Violations</p>
            <p className="text-2xl font-display font-bold mt-1">290</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Fines Issued</p>
            <p className="text-2xl font-display font-bold mt-1">₹1.45L</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Fines Collected</p>
            <p className="text-2xl font-display font-bold mt-1 text-success">₹89K</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-display font-bold mt-1 text-warning">156</p>
          </div>
        </div>
      </div>
    </div>
  );
};
