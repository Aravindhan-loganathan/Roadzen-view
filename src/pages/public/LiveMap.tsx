import React, { useState } from 'react';
import { Search, Navigation, Clock, MapPin, Route } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mapMarkers } from '@/data/mockData';

export const LiveMap: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);

  const suggestedRoutes = [
    { id: 1, name: 'Via Ring Road', time: '25 min', distance: '12.5 km', traffic: 'light' },
    { id: 2, name: 'Via Old Airport Road', time: '35 min', distance: '10.2 km', traffic: 'moderate' },
    { id: 3, name: 'Via Koramangala', time: '45 min', distance: '9.8 km', traffic: 'heavy' },
  ];

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'low':
      case 'light':
        return 'bg-success';
      case 'medium':
      case 'moderate':
        return 'bg-warning';
      default:
        return 'bg-destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Live Traffic Map</h1>
        <p className="text-muted-foreground mt-1">View real-time traffic conditions and find optimal routes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <div className="space-y-4">
          {/* Search */}
          <div className="glow-card p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button className="w-full gap-2 gradient-bg">
              <Navigation className="w-4 h-4" />
              Find Route
            </Button>
          </div>

          {/* Traffic Legend */}
          <div className="glow-card p-4">
            <h3 className="font-semibold mb-3">Traffic Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-success" />
                <span className="text-sm">Low Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-warning" />
                <span className="text-sm">Medium Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-destructive" />
                <span className="text-sm">Heavy Traffic</span>
              </div>
            </div>
          </div>

          {/* Suggested Routes */}
          <div className="glow-card p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Route className="w-4 h-4" />
              Suggested Routes
            </h3>
            <div className="space-y-2">
              {suggestedRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedRoute === route.id
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{route.name}</span>
                    <div className={`w-2 h-2 rounded-full ${getTrafficColor(route.traffic)}`} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {route.time}
                    </span>
                    <span>{route.distance}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 glow-card overflow-hidden min-h-[500px] lg:min-h-[600px]">
          {/* Map Placeholder with simulated visualization */}
          <div className="relative w-full h-full min-h-[500px] lg:min-h-[600px] bg-muted/30">
            {/* Simulated Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20">
              {/* Grid Pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Roads Simulation */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal Roads */}
                <line x1="0" y1="30" x2="100" y2="30" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.3" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.4" />
                <line x1="0" y1="70" x2="100" y2="70" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.3" />
                
                {/* Vertical Roads */}
                <line x1="25" y1="0" x2="25" y2="100" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.3" />
                <line x1="50" y1="0" x2="50" y2="100" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.4" />
                <line x1="75" y1="0" x2="75" y2="100" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.3" />
                
                {/* Traffic Heatmap Areas */}
                <ellipse cx="35" cy="45" rx="15" ry="10" fill="hsl(var(--traffic-green))" opacity="0.2" />
                <ellipse cx="65" cy="55" rx="12" ry="8" fill="hsl(var(--traffic-yellow))" opacity="0.25" />
                <ellipse cx="50" cy="30" rx="10" ry="6" fill="hsl(var(--traffic-red))" opacity="0.3" />
              </svg>
            </div>

            {/* Traffic Signal Markers */}
            {mapMarkers.map((marker, index) => (
              <div
                key={marker.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-fade-in"
                style={{
                  left: `${15 + (index * 12)}%`,
                  top: `${25 + (index % 3) * 25}%`,
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="relative group cursor-pointer">
                  <div className={`w-4 h-4 rounded-full ${getTrafficColor(marker.traffic)} animate-pulse`} />
                  <div className={`absolute inset-0 w-4 h-4 rounded-full ${getTrafficColor(marker.traffic)} animate-ping opacity-50`} />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg whitespace-nowrap">
                      <p className="font-medium text-sm">{marker.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{marker.traffic} traffic</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button size="icon" variant="secondary" className="shadow-lg">
                <span className="text-lg font-bold">+</span>
              </Button>
              <Button size="icon" variant="secondary" className="shadow-lg">
                <span className="text-lg font-bold">−</span>
              </Button>
            </div>

            {/* Current Location Indicator */}
            <div className="absolute bottom-4 left-4 glow-card p-3 flex items-center gap-2 bg-background/80 backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">MG Road, Bangalore</span>
            </div>

            {/* Map Attribution */}
            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded">
              OpenStreetMap Integration Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
