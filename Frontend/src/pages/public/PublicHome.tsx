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
}

export const PublicHome: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const [summaryRes, hourlyRes] = await Promise.all([
          fetch('http://localhost:3000/api/dashboard/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3000/api/dashboard/hourly', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (summaryRes.ok && hourlyRes.ok) {
          const summary = await summaryRes.json();
          const hourly = await hourlyRes.json();
          setData(summary);
          setHourlyData(hourly);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

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
      {/* Emergency Banner */}
      {data.hasHighPriorityAlert && (
        <div className="gradient-bg rounded-xl p-4 flex items-center justify-between animate-pulse-glow">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-primary-foreground" />
            <div>
              <p className="font-semibold text-primary-foreground">Emergency Alert Active</p>
              <p className="text-sm text-primary-foreground/80">
                Priority route active for emergency vehicles
              </p>
            </div>
          </div>
          <Link to="/public/alerts">
            <Button variant="secondary" size="sm" className="gap-1">
              View Details <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}

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
            value={data.totalVehicles}
            icon={Car}
            trend={{ value: 12, isPositive: true }}
          />
          <StatusCard
            title="Congested Lanes"
            value={data.congestedLanes}
            icon={TrendingUp}
            variant="warning"
            trend={{ value: 5, isPositive: false }}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Peak Hour</p>
            <p className="text-xl font-semibold mt-1">6:00 PM - 7:00 PM</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Most Congested</p>
            <p className="text-xl font-semibold mt-1">Outer Ring Road</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Avg. Wait Time</p>
            <p className="text-xl font-semibold mt-1">3.5 minutes</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Road Closures</p>
            <p className="text-xl font-semibold mt-1">2 Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};
