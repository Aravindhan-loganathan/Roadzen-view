import React from 'react';
import {
  Car,
  Camera,
  AlertTriangle,
  Radio,
  Activity,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { StatusCard } from '@/components/ui/StatusCard';
import { trafficSummary, hourlyTrafficData, signalPerformance } from '@/data/mockData';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time traffic management overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-success/10 text-success">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            System Online
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Total Vehicles Today"
          value={trafficSummary.totalVehicles}
          icon={Car}
          trend={{ value: 12, isPositive: true }}
        />
        <StatusCard
          title="Active Cameras"
          value={trafficSummary.activeCameras}
          icon={Camera}
          variant="success"
        />
        <StatusCard
          title="Congested Lanes"
          value={trafficSummary.congestedLanes}
          icon={TrendingUp}
          variant="warning"
          trend={{ value: 3, isPositive: false }}
        />
        <StatusCard
          title="Emergency Events"
          value={trafficSummary.emergencyEvents}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Density Chart */}
        <div className="glow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-lg">Traffic Density</h3>
              <p className="text-sm text-muted-foreground">Vehicles per hour</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyTrafficData}>
              <defs>
                <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="hour"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="vehicles"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorDensity)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Signal Performance Chart */}
        <div className="glow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-lg">Signal Performance</h3>
              <p className="text-sm text-muted-foreground">Efficiency by junction</p>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Optimized</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={signalPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                domain={[0, 100]}
              />
              <YAxis
                type="category"
                dataKey="junction"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${value}%`, 'Efficiency']}
              />
              <Bar
                dataKey="efficiency"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Health */}
      <div className="glow-card p-6">
        <h3 className="font-display font-semibold text-lg mb-4">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">AI Engine</span>
            </div>
            <p className="text-xl font-semibold">Operational</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Camera Feed</span>
            </div>
            <p className="text-xl font-semibold">48/48 Active</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Signal Network</span>
            </div>
            <p className="text-xl font-semibold">99.9% Uptime</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">Processing</span>
            </div>
            <p className="text-xl font-semibold">24 FPS</p>
          </div>
        </div>
      </div>

      {/* Real-time Animation Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Data updating in real-time</span>
      </div>
    </div>
  );
};
