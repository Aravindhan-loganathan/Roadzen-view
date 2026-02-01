import React, { useState, useEffect } from 'react';
import { TrafficSignal } from '@/components/ui/TrafficSignal';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, X, AlertTriangle, ArrowLeft, Clock, Route, Radio } from 'lucide-react';
import { useMapContext } from '@/contexts/MapContext';

interface JunctionData {
  id: number;
  name: string;
  currentGreen: string;
  countdown: number;
  congestionLevel: string;
}

interface RouteSignalData {
    id: number;
    name: string;
    time: string;
    distance: string;
    traffic: string;
    penalty: number;
    signalIds: number[];
}

export const SignalStatus: React.FC = () => {
  const [signalData, setSignalData] = useState<JunctionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const { suggestedRoutes } = useMapContext();
  
  // Two modes: 
  // 1. Direct from manual "View Route Signals" (Legacy or specific single route) -> filterIds
  // 2. From "View All Routes" -> routeData (array of routes)
  // Use context routes if available, otherwise fallback to navigation state (though context is preferred now)
  const routeData = suggestedRoutes.length > 0 ? suggestedRoutes : (location.state?.routeData as any[] | undefined);
  const filterIds = location.state?.filterIds as number[] | undefined;

  const fetchSignals = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/signals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSignalData(data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSignals();

    // Local countdown simulation (smooth UI)
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

    // Sync with backend every 10 seconds
    const syncInterval = setInterval(fetchSignals, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, []);

  const clearFilter = () => {
    navigate('/public/map');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Helper to get needed signals for a route
  const getSignalsForRoute = (ids: number[]) => {
      return signalData.filter(s => ids.includes(s.id));
  };


  const hasActiveView = (routeData && routeData.length > 0) || (filterIds && filterIds.length > 0);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Signal Status</h1>
          <p className="text-muted-foreground mt-1">
            {hasActiveView ? 'Route specific signal information' : 'Real-time Traffic Signal Monitor'}
          </p>
        </div>
        <div className="flex items-center gap-4">
           {hasActiveView && (
             <Button variant="outline" size="sm" onClick={clearFilter} className="gap-2">
               <ArrowLeft className="w-4 h-4" />
               Back to Map
             </Button>
           )}
           {hasActiveView && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Live Sync
            </div>
           )}
        </div>
      </div>

      {/* Content */}
      {!hasActiveView ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg bg-card/50 p-8">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Route className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Route Selected</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                  Please go to the Live Map to search for a route. Once found, this page will automatically update with detailed signal information.
              </p>
              <Button onClick={() => navigate('/public/map')} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Go to Live Map
              </Button>
          </div>
      ) : (
        <div className="space-y-8">
            {/* If we have multiple routes data */}
            {routeData && routeData.map((route, rIndex) => {
                const routeSignals = getSignalsForRoute(route.signalIds);
                return (
                    <div key={route.id} className="border rounded-xl p-6 bg-card/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b">
                           <div>
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <div className="bg-primary/10 p-1 rounded text-primary text-sm font-bold">
                                        Route {rIndex + 1}
                                    </div>
                                    {route.name}
                                </h2>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {route.time}
                                    </span>
                                    <span>{route.distance}</span>
                                    <span className={`capitalize px-2 py-0.5 rounded-full text-xs border ${
                                        route.traffic === 'heavy' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                                        route.traffic === 'moderate' ? 'bg-warning/10 border-warning/20 text-warning' :
                                        'bg-success/10 border-success/20 text-success'
                                    }`}>
                                        {route.traffic} Traffic
                                    </span>
                                </div>
                           </div>
                           {route.penalty !== undefined && route.penalty > 0 && (
                               <div className="px-3 py-1 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                                   <AlertTriangle className="w-4 h-4" />
                                   +{route.penalty} min due to congestion
                               </div>
                           )}
                        </div>
                        
                        {routeSignals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {routeSignals.map(junction => (
                                    <div key={junction.id} className="glow-card p-5">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Radio className="w-4 h-4 text-primary" />
                                            <h3 className="font-semibold">{junction.name}</h3>
                                          </div>
                                          
                                          <div className="mb-4">
                                            <p className="text-xs text-muted-foreground mb-1">Current Green Signal</p>
                                            <p className="font-medium text-lg text-primary">{junction.currentGreen}</p>
                                          </div>

                                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCongestionStyle(junction.congestionLevel)}`}>
                                            {junction.congestionLevel} Congestion
                                          </div>
                                        </div>
                                        <TrafficSignal countdown={junction.countdown} />
                                      </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm italic">No monitored signals on this route segment.</p>
                        )}
                    </div>
                );
            })}

            {/* Legacy Single Selection Fallback */}
            {!routeData && filterIds && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {getSignalsForRoute(filterIds).map((junction) => (
                   <div
                     key={junction.id}
                     className="glow-card p-5 animate-fade-in"
                   >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Radio className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">{junction.name}</h3>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Current Green Signal</p>
                            <p className="font-medium text-lg text-primary">{junction.currentGreen}</p>
                          </div>

                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCongestionStyle(junction.congestionLevel)}`}>
                            {junction.congestionLevel} Congestion
                          </div>
                        </div>
                        <TrafficSignal countdown={junction.countdown} />
                      </div>
                   </div>
                 ))}
               </div>
            )}
        </div>
      )}
    </div>
  );
};
