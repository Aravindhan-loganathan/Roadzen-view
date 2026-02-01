import React, { useState } from 'react';
import { Download, Filter, Clock, MapPin } from 'lucide-react';
import { exportLaneAnalyticsToPdf } from '@/services/dashboardPdfExportService';
import { laneData } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const LaneAnalytics: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState('today');

  // Get unique junctions
  const uniqueJunctions = Array.from(new Set(laneData.map(item => item.junction)));
  const [selectedJunction, setSelectedJunction] = useState(uniqueJunctions[0]);

  const filteredLanes = laneData.filter(l => l.junction === selectedJunction);

  // Calculate stats for filtered data
  const totalVehicles = filteredLanes.reduce((sum, lane) => sum + lane.vehicles, 0);
  const avgDensity = Math.round(filteredLanes.reduce((sum, lane) => sum + lane.density, 0) / (filteredLanes.length || 1));

  const mostCongested = [...filteredLanes].sort((a, b) => b.density - a.density)[0];
  const leastTraffic = [...filteredLanes].sort((a, b) => a.vehicles - b.vehicles)[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'hsl(var(--traffic-green))';
      case 'medium':
        return 'hsl(var(--traffic-yellow))';
      case 'high':
        return 'hsl(var(--traffic-red))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      low: 'bg-success/10 text-success border-success/30',
      medium: 'bg-warning/10 text-warning border-warning/30',
      high: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return styles[status as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Lane Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed lane-wise traffic analysis</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={selectedJunction} onValueChange={setSelectedJunction}>
            <SelectTrigger className="w-[180px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select Junction" />
            </SelectTrigger>
            <SelectContent>
              {uniqueJunctions.map(junction => (
                <SelectItem key={junction} value={junction}>{junction}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[140px]">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => exportLaneAnalyticsToPdf(filteredLanes)}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lane Table */}
        <div className="glow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Lane-wise Vehicle Count
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Lane</th>
                  <th className="text-right p-4 font-medium text-sm">Vehicles</th>
                  <th className="text-right p-4 font-medium text-sm">Density</th>
                  <th className="text-center p-4 font-medium text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLanes.map((lane) => (
                  <tr key={lane.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">{lane.lane}</td>
                    <td className="p-4 text-right font-mono">{lane.vehicles.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${lane.density}%`,
                              backgroundColor: getStatusColor(lane.status),
                            }}
                          />
                        </div>
                        <span className="font-mono text-sm">{lane.density}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(lane.status)}`}>
                        {lane.status.charAt(0).toUpperCase() + lane.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Density Bar Chart */}
        <div className="glow-card p-6">
          <h3 className="font-semibold mb-6">Density Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredLanes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="lane"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(value) => value}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${value}%`, 'Density']}
              />
              <Bar dataKey="density" radius={[4, 4, 0, 0]}>
                {filteredLanes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glow-card p-4">
          <p className="text-sm text-muted-foreground">Total Vehicles</p>
          <p className="text-2xl font-display font-bold mt-1">
            {totalVehicles.toLocaleString()}
          </p>
        </div>
        <div className="glow-card p-4">
          <p className="text-sm text-muted-foreground">Avg. Density</p>
          <p className="text-2xl font-display font-bold mt-1">
            {avgDensity}%
          </p>
        </div>
        <div className="glow-card p-4">
          <p className="text-sm text-muted-foreground">Most Congested</p>
          <p className="text-2xl font-display font-bold mt-1 text-destructive">
            {mostCongested?.lane || '-'}
          </p>
        </div>
        <div className="glow-card p-4">
          <p className="text-sm text-muted-foreground">Least Traffic</p>
          <p className="text-2xl font-display font-bold mt-1 text-success">
            {leastTraffic?.lane || '-'}
          </p>
        </div>
      </div>
    </div >
  );
};
