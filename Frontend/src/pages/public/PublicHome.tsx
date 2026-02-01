import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle,
  Minus,
  XCircle,
  Loader2,
} from 'lucide-react';
import { StatusCard } from '@/components/ui/StatusCard';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  totalVehicles: number;
  activeCameras: number;
  heavyTraffic: number;
  moderateTraffic: number;
  smoothRoads: number;
  totalViolations: number;
  emergencyEvents: number;
  congestedLanes: number;
  hasHighPriorityAlert: boolean;
}

interface HourlyData {
  hour: string;
  vehicles: number;
  rawHour?: number;
}

export const PublicHome: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [vehiclesCount, setVehiclesCount] = useState<number>(0);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [userReportCount, setUserReportCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Live Traffic Stats (LocalStorage)
  useEffect(() => {
    // Helper to format hourly data
    const formatHourlyData = (hourlyMap: Record<string, number>) => {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return hours.map(h => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const label = `${h12} ${ampm}`;
        return {
          hour: label,
          vehicles: hourlyMap[h] || 0,
          rawHour: h
        };
      }).filter((_, i) => i >= 6 && i <= 22); // Filter for display relevance
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
              setHourlyData(formatHourlyData(stats.hourly));
            }
          } else {
            setVehiclesCount(0);
            setHourlyData(formatHourlyData({}));
          }
        } else {
          setHourlyData(formatHourlyData({}));
        }
      } catch (e) {
        console.error('Failed to parse traffic stats', e);
      }
    };

    updateFromStorage();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'traffic_stats') updateFromStorage();
    };

    const onCustom = (e: CustomEvent) => {
      if (e.detail) {
        setVehiclesCount(e.detail.total || 0);
        if (e.detail.hourly) {
          setHourlyData(formatHourlyData(e.detail.hourly));
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

  // Dashboard Data & User Reports
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const [summaryRes, reportsRes] = await Promise.all([
          fetch('http://localhost:3000/api/dashboard/summary', { headers }),
          fetch('http://localhost:3000/api/reports/my?limit=1', { headers })
        ]);

        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          setData(summary);
        }

        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setUserReportCount(reportsData.pagination.total || 0);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPeakHourDisplay = () => {
    if (!hourlyData.length) return "00:00 - 00:00";
    const allZero = hourlyData.every(d => d.vehicles === 0);
    if (allZero) return "00:00 - 00:00";

    const maxEntry = hourlyData.reduce((prev, curr) => prev.vehicles > curr.vehicles ? prev : curr);
    // maxEntry.hour is "6 PM"
    const [time, period] = maxEntry.hour.split(' ');
    let nextTime = parseInt(time) + 1;
    if (nextTime === 13) nextTime = 1;

    return `${maxEntry.hour} - ${nextTime} ${period}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">


      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Traffic Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time traffic conditions in your area</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Traffic Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glow-card p-6 flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Smooth Roads</p>
            <p className="text-3xl font-display font-bold">{data.smoothRoads}</p>
          </div>
        </div>
        <div className="glow-card p-6 flex items-center gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
            <Minus className="w-7 h-7 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Moderate Traffic</p>
            <p className="text-3xl font-display font-bold">{data.moderateTraffic}</p>
          </div>
        </div>
        <div className="glow-card p-6 flex items-center gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Heavy Traffic</p>
            <p className="text-3xl font-display font-bold">{data.heavyTraffic}</p>
          </div>
        </div>
      </div>

      {/* Main Stats & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Column */}
        <div className="space-y-4">
          <StatusCard
            title="Total Vehicles Today"
            value={vehiclesCount}
            icon={Car}
          />
          <StatusCard
            title="Congested Lanes"
            value={data.congestedLanes}
            icon={TrendingUp}
            variant="warning"
          />
          <StatusCard
            title="Emergency Events"
            value={data.emergencyEvents}
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Traffic Trend Chart */}
        <div className="lg:col-span-2 glow-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-lg">Traffic Trend</h3>
              <p className="text-sm text-muted-foreground">Vehicles per hour today</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Live Traffic</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="hour"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="vehicles"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVehicles)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's Highlights */}
      <div className="glow-card p-6 animate-fade-in">
        <h3 className="font-display font-semibold text-lg mb-4">Today's Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Peak Hour</p>
            <p className="text-xl font-semibold mt-1">{getPeakHourDisplay()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">User Reported Issues</p>
            <p className="text-xl font-semibold mt-1">{userReportCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Roadblocks</p>
            <p className="text-xl font-semibold mt-1">2 Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};
