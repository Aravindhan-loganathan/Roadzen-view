import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ambulance,
  Flame,
  Construction,
  MapPin,
  Loader2,
  ArrowLeft,
  Clock,
  Route,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMapContext } from '@/contexts/MapContext';

// Logic to check if a point is near a path (lat/lng array)
const isPointNearPath = (pLat: number, pLng: number, path: [number, number][], threshold = 0.005) => {
  if (!path || path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    
    // Distance from point to line segment
    const dist = getDistanceToSegment(pLat, pLng, a[0], a[1], b[0], b[1]);
    if (dist <= threshold) return true;
  }
  return false;
};

const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt(Math.pow(px - projX, 2) + Math.pow(py - projY, 2));
};

interface Alert {
  id: string | number;
  type: string;
  title: string;
  location: string;
  eta: string | null;
  priority: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  impact?: string;
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { suggestedRoutes, setMapCenter, setMapZoom } = useMapContext();

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ambulance':
        return <Ambulance className="w-6 h-6" />;
      case 'firetruck':
        return <Flame className="w-6 h-6" />;
      case 'closure':
        return <Construction className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getIconBgStyle = (type: string) => {
    switch (type) {
      case 'ambulance':
        return 'bg-destructive/10 text-destructive';
      case 'firetruck':
        return 'bg-warning/10 text-warning';
      case 'closure':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleCardClick = (lat?: number, lng?: number) => {
    if (lat && lng) {
      setMapCenter([lat, lng]);
      // Removed setMapZoom to prevent automatic zooming
      navigate('/public/map');
    }
  };

  const hasActiveView = suggestedRoutes && suggestedRoutes.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Traffic Alerts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {hasActiveView ? 'Live emergency and roadblock status for your routes' : 'Real-time emergency vehicles and road updates'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {hasActiveView && (
            <Button variant="outline" size="sm" onClick={() => navigate('/public/map')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Map
            </Button>
          )}
        </div>
      </div>

      {!hasActiveView ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-2xl bg-card/50 p-12 backdrop-blur-sm border-white/10">
          <div className="p-4 bg-primary/10 rounded-full mb-6">
            <ShieldAlert className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3">No Route Selected</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Select a route on the Live Map to view specific emergency vehicles and roadblocks along your path.
          </p>
          <Button onClick={() => navigate('/public/map')} className="gap-2 px-6 h-12 text-base gradient-bg">
            <Route className="w-5 h-5" />
            Find a Route
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {suggestedRoutes.slice(0, 2).map((route, rIndex) => {
            const routeAlerts = alerts.filter(a => {
                if (!a.latitude || !a.longitude) return false;
                return isPointNearPath(a.latitude, a.longitude, route.path, 0.005);
            });
            const emergencyVehicles = routeAlerts.filter(a => ['ambulance', 'firetruck', 'police'].includes(a.type));
            const roadblocks = routeAlerts.filter(a => a.type === 'closure');

            return (
              <div key={route.id} className="border rounded-2xl p-6 bg-card/40 backdrop-blur-md shadow-xl border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-2 rounded-xl text-primary font-bold text-lg shadow-inner">
                      R{rIndex + 1}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{route.name}</h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {route.time}</span>
                        <span className="flex items-center gap-1.5"><Route className="w-4 h-4" /> {route.distance}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${
                    route.traffic === 'heavy' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                    route.traffic === 'moderate' ? 'bg-warning/10 border-warning/30 text-warning' :
                    'bg-green-500/10 border-green-500/30 text-green-500'
                  }`}>
                    {route.traffic} Traffic
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  {/* Emergency Vehicles Section */}
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4 shrink-0">
                      <Ambulance className="w-5 h-5 text-destructive animate-pulse" />
                      Emergency Vehicles
                    </h3>
                    <div className="flex-1 space-y-4">
                      {emergencyVehicles.length > 0 ? (
                        emergencyVehicles.map((alert) => (
                          <div 
                            key={alert.id} 
                            onClick={() => handleCardClick(alert.latitude, alert.longitude)}
                            className="glow-card p-4 border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors h-[100px] flex items-center"
                          >
                            <div className="flex items-center gap-4 w-full">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getIconBgStyle(alert.type)}`}>
                                {getAlertIcon(alert.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1 gap-2">
                                  <h4 className="font-bold truncate">{alert.title}</h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    alert.priority === 'high' ? 'bg-destructive text-white' : 'bg-warning text-black'
                                  }`}>
                                    {alert.priority}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{alert.location}</span>
                                </div>
                                {alert.eta && (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mt-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    ETA: {alert.eta}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full min-h-[100px] flex items-center justify-center text-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10 p-6">
                          No active emergency vehicles on this route.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Roadblocks Section */}
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4 shrink-0">
                      <Construction className="w-5 h-5 text-warning" />
                      Roadblocks
                    </h3>
                    <div className="flex-1 space-y-4">
                      {roadblocks.length > 0 ? (
                        roadblocks.map((alert) => (
                          <div 
                            key={alert.id} 
                            onClick={() => handleCardClick(alert.latitude, alert.longitude)}
                            className="glow-card p-4 border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors h-[100px] flex items-center"
                          >
                            <div className="flex items-center gap-4 w-full">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-muted text-foreground">
                                <Construction className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold mb-1 truncate">{alert.title}</h4>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{alert.location}</span>
                                </div>
                                {alert.impact && (
                                  <div className="inline-block px-2 py-1 rounded bg-muted/50 text-[10px] font-medium border border-white/5 mt-1">
                                    Impact: {alert.impact}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full min-h-[100px] flex items-center justify-center text-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10 p-6">
                          No active roadblocks on this route.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
