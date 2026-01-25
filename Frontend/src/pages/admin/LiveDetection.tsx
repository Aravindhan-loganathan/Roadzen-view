import React, { useState, useEffect } from 'react';
import {
  Video,
  Camera,
  Car,
  Bike,
  Bus,
  Truck,
  Ambulance,
  Activity,
  Maximize2,
} from 'lucide-react';
import { vehicleDetection } from '@/data/mockData';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/button';

export const LiveDetection: React.FC = () => {
  const [fps, setFps] = useState(vehicleDetection.fps);
  const [confidence, setConfidence] = useState(vehicleDetection.confidence);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(Math.random() * 6) + 22);
      setConfidence(+(Math.random() * 5 + 92).toFixed(1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const vehicleTypes = [
    { type: 'Car', count: vehicleDetection.car, icon: Car, color: 'text-primary' },
    { type: 'Bike', count: vehicleDetection.bike, icon: Bike, color: 'text-success' },
    { type: 'Bus', count: vehicleDetection.bus, icon: Bus, color: 'text-warning' },
    { type: 'Truck', count: vehicleDetection.truck, icon: Truck, color: 'text-muted-foreground' },
    { type: 'Ambulance', count: vehicleDetection.ambulance, icon: Ambulance, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Live Detection</h1>
          <p className="text-muted-foreground mt-1">AI-powered vehicle detection and counting</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            LIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2 glow-card overflow-hidden">
          <div className="relative aspect-video bg-muted/30">
            {/* Simulated Camera Feed */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20">
              <div className="text-center">
                <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Camera Feed Placeholder</p>
                <p className="text-sm text-muted-foreground">Junction: MG Road</p>
              </div>
            </div>

            {/* Bounding Box Overlays Simulation */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Simulated detection boxes */}
              <div className="absolute top-[20%] left-[15%] w-16 h-12 border-2 border-success rounded animate-pulse">
                <span className="absolute -top-5 left-0 text-xs bg-success text-success-foreground px-1 rounded">
                  Car 94%
                </span>
              </div>
              <div className="absolute top-[40%] left-[45%] w-20 h-14 border-2 border-warning rounded animate-pulse">
                <span className="absolute -top-5 left-0 text-xs bg-warning text-warning-foreground px-1 rounded">
                  Bus 89%
                </span>
              </div>
              <div className="absolute top-[60%] right-[25%] w-12 h-8 border-2 border-primary rounded animate-pulse">
                <span className="absolute -top-5 left-0 text-xs bg-primary text-primary-foreground px-1 rounded">
                  Bike 96%
                </span>
              </div>
              <div className="absolute bottom-[20%] left-[30%] w-14 h-10 border-2 border-destructive rounded animate-pulse">
                <span className="absolute -top-5 left-0 text-xs bg-destructive text-destructive-foreground px-1 rounded">
                  Ambulance 98%
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button size="icon" variant="secondary" className="bg-background/80 backdrop-blur">
                <Camera className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="secondary" className="bg-background/80 backdrop-blur">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            {/* FPS & Confidence Overlay */}
            <div className="absolute bottom-4 left-4 flex gap-3">
              <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-mono">
                <span className="text-muted-foreground">FPS:</span>{' '}
                <span className="text-success font-bold">{fps}</span>
              </div>
              <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-mono">
                <span className="text-muted-foreground">Conf:</span>{' '}
                <span className="text-primary font-bold">{confidence}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detection Stats */}
        <div className="space-y-4">
          {/* Total Count */}
          <div className="glow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Total Detected</h3>
            </div>
            <AnimatedCounter
              end={vehicleDetection.total}
              className="text-4xl font-bold gradient-text"
            />
            <p className="text-sm text-muted-foreground mt-1">vehicles this hour</p>
          </div>

          {/* Vehicle Breakdown */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-4">Vehicle Count by Category</h3>
            <div className="space-y-3">
              {vehicleTypes.map(({ type, count, icon: Icon, color }) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="font-medium">{type}</span>
                  </div>
                  <AnimatedCounter end={count} className="font-mono font-bold" />
                </div>
              ))}
            </div>
          </div>

          {/* Detection Model Info */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-3">Detection Model</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">YOLOv8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input Size</span>
                <span className="font-medium">640×640</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inference</span>
                <span className="font-medium">GPU Accelerated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
