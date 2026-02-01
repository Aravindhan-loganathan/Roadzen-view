import React, { useEffect, useState } from 'react';
import {
  Car,
  AlertTriangle,
  Radio,
  Activity,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { StatusCard } from '@/components/ui/StatusCard';
import { trafficSummary } from '@/data/mockData';
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
  Cell,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [summaryData, setSummaryData] = useState<any>(trafficSummary);
  /* State for Real-time Traffic Data */
  const [vehiclesCount, setVehiclesCount] = useState<number>(0);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  useEffect(() => {
    // Helper to format hourly data for Recharts
    const formatHourlyData = (hourlyMap: Record<string, number>) => {
      // Create array for hours 0-23
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return hours.map(h => {
        // Format label (e.g., 6 AM, 12 PM)
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const label = `${h12} ${ampm}`;
        // Filter to show range only (e.g. 6AM to 9PM) or all
        // For now, mapping all or matching mock data range
        return {
          hour: label,
          vehicles: hourlyMap[h] || 0
        };
      });
      // Optionally filter to match the mock data range (6 AM - 9 PM) if desired, 
      // but showing all active hours is better.
      // let's stick to 24h or filter for display
    };

    const updateFromStorage = () => {
      try {
        const stored = localStorage.getItem('traffic_stats');
        if (stored) {
          const stats = JSON.parse(stored);
          const now = new Date();
          const todayKey = now.toISOString().split('T')[0];

          if (stats.date === todayKey) {
            setVehiclesCount(stats.total || 0);
            if (stats.hourly) {
              const formatted = formatHourlyData(stats.hourly);
              // Filter to reasonable hours (e.g. 6 AM to 10 PM) for better chart vis similar to mock
              const filtered = formatted.filter((_, i) => i >= 6 && i <= 22);
              setHourlyData(filtered);
            }
          } else {
            setVehiclesCount(0);
            setHourlyData(formatHourlyData({}));
          }
        }
      } catch (e) {
        console.error('Failed to parse traffic stats', e);
      }
    };

    // Initial Load
    updateFromStorage();

    // Listeners
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'traffic_stats') {
        updateFromStorage();
      }
    };

    const onCustom = (e: CustomEvent) => {
      if (e.detail) {
        setVehiclesCount(e.detail.total || 0);
        if (e.detail.hourly) {
          const formatted = formatHourlyData(e.detail.hourly);
          const filtered = formatted.filter((_, i) => i >= 6 && i <= 22);
          setHourlyData(filtered);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('trafficStatsUpdate', onCustom as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('trafficStatsUpdate', onCustom as EventListener);
    };
  }, []);

  useEffect(() => {
    // fetch total count of all user reported issues from reports DB
    const fetchSummaryData = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        if (!token) {
          console.error('No auth token found');
          return;
        }

        const response = await fetch('http://localhost:3000/api/dashboard/summary', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setSummaryData((prev: any) => ({
          ...prev,
          ...data
        }));
      } catch (error) {
        console.error('Failed to fetch summary data:', error);
      }
    };
    fetchSummaryData();
  }, []);

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
          value={vehiclesCount}
          icon={Car}
        />
        <StatusCard
          title="User Reported Issues"
          value={summaryData.totalReports || 0}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatusCard
          title="Congested Lanes"
          value={summaryData.congestedLanes}
          icon={TrendingUp}
          variant="warning"
          trend={{ value: 3, isPositive: false }}
        />
        <StatusCard
          title="Emergency Events"
          value={summaryData.emergencyEvents}
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
            <AreaChart data={hourlyData}>
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

        {/* Congestion Level Chart */}
        <div className="glow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-lg">Congestion Levels</h3>
              <p className="text-sm text-muted-foreground">Congestion levels by traffic status</p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Real-time</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                { name: 'High', count: summaryData.heavyTraffic || 0, color: '#ef4444' },
                { name: 'Medium', count: summaryData.moderateTraffic || 0, color: '#eab308' },
                { name: 'Low', count: summaryData.smoothRoads || 0, color: '#22c55e' }
              ]}
              layout="vertical"
              margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={60}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                {
                  [
                    { name: 'High', count: summaryData.heavyTraffic || 0, color: '#ef4444' },
                    { name: 'Medium', count: summaryData.moderateTraffic || 0, color: '#eab308' },
                    { name: 'Low', count: summaryData.smoothRoads || 0, color: '#22c55e' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))
                }
              </Bar>
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
            <p className="text-xl font-semibold">1/1 Active</p>
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
