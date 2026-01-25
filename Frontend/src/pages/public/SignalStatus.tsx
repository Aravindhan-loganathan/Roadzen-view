import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { junctions } from '@/data/mockData';
import { TrafficSignal } from '@/components/ui/TrafficSignal';

interface JunctionData {
  id: number;
  name: string;
  currentGreen: string;
  countdown: number;
  congestionLevel: string;
}

export const SignalStatus: React.FC = () => {
  const [signalData, setSignalData] = useState<JunctionData[]>(junctions);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalData(prev =>
        prev.map(junction => ({
          ...junction,
          countdown: junction.countdown > 1 ? junction.countdown - 1 : 30,
          currentGreen: junction.countdown <= 1 
            ? ['North', 'East', 'South', 'West'][Math.floor(Math.random() * 4)]
            : junction.currentGreen,
        }))
      );
    }, 1000);

    const refreshInterval = setInterval(() => {
      setLastRefresh(new Date());
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(refreshInterval);
    };
  }, []);

  const getCongestionStyle = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-success/10 text-success border-success/30';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getNextQueue = (current: string) => {
    const directions = ['North', 'East', 'South', 'West'];
    const currentIndex = directions.indexOf(current);
    return directions[(currentIndex + 1) % 4];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Signal Status</h1>
          <p className="text-muted-foreground mt-1">Live traffic signal information at all junctions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Auto-refresh: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Signal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {signalData.map((junction, index) => (
          <div
            key={junction.id}
            className="glow-card p-5 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">{junction.name}</h3>
                </div>

                {/* Current Green */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Current Green Signal</p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                    <span className="font-medium text-lg">{junction.currentGreen}</span>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
                  <div className="flex items-center gap-2">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="hsl(var(--muted))"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="hsl(var(--primary))"
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={175.9}
                          strokeDashoffset={175.9 - (junction.countdown / 30) * 175.9}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl">
                        {junction.countdown}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Signal */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Next in Queue</p>
                  <span className="text-sm font-medium">{getNextQueue(junction.currentGreen)} Lane</span>
                </div>

                {/* Congestion Priority */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Congestion Priority</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCongestionStyle(
                      junction.congestionLevel
                    )}`}
                  >
                    {junction.congestionLevel.charAt(0).toUpperCase() + junction.congestionLevel.slice(1)}
                  </span>
                </div>
              </div>

              {/* Traffic Signal Visual */}
              <TrafficSignal
                initialState={junction.countdown < 5 ? 'yellow' : 'green'}
                countdown={junction.countdown}
                size="lg"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="glow-card p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          Signal timings are optimized by AI based on real-time traffic density analysis
        </p>
      </div>
    </div>
  );
};
