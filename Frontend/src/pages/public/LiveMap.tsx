import React, { useState, useEffect } from 'react';
import { Search, Navigation, Clock, MapPin, Route, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useLocation } from 'react-router-dom';

interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  traffic: string;
}

interface RouteInfo {
  id: number;
  name: string;
  time: string;
  distance: string;
  traffic: string;
  path: [number, number][];
  penalty?: number;
}

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export const LiveMap: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [suggestedRoutes, setSuggestedRoutes] = useState<RouteInfo[]>([]);
  const [source, setSource] = useState('Anna Salai Junction');
  const [destination, setDestination] = useState('Tidel Park Signal');
  const [activeInput, setActiveInput] = useState<'source' | 'destination'>('source');
  const [sourceSuggestions, setSourceSuggestions] = useState<MapMarker[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<MapMarker[]>([]);
  const location = useLocation();

  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/signals');
        if (response.ok) {
          const data = await response.json();
          // Map backend data to frontend marker format, filtering out signals without coordinates
          const mappedMarkers = data
            .filter((signal: any) => signal.lat && signal.lng)
            .map((signal: any) => ({
              id: signal.id,
              lat: signal.lat,
              lng: signal.lng,
              name: signal.name,
              traffic: signal.congestionLevel
            }));
          setMarkers(mappedMarkers);
        }
      } catch (error) {
        console.error('Error fetching map markers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
    const interval = setInterval(fetchMarkers, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

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

  const getTrafficHexColor = (traffic: string) => {
    switch (traffic) {
      case 'low':
      case 'light':
        return '#22c55e';
      case 'medium':
      case 'moderate':
        return '#eab308';
      default:
        return '#ef4444';
    }
  };

  const handleSearch = async () => {
    if (!source.trim() || !destination.trim()) return;
    setIsSearching(true);
    setShowRoutes(false);
    setSelectedRoute(null);
    setSuggestedRoutes([]);
    
    const getCoords = (query: string) => {
      const marker = markers.find(m => m.name.toLowerCase() === query.toLowerCase());
      if (marker) return { lat: marker.lat, lng: marker.lng };
      
      const parts = query.split(',').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
      }
      return null;
    };

    const sourceCoords = getCoords(source);
    const destCoords = getCoords(destination);

    if (!sourceCoords || !destCoords) {
      console.error("Could not find source or destination coordinates");
      setIsSearching(false);
      return;
    }

    // OSRM API expects {longitude},{latitude}
    const url = `http://router.project-osrm.org/route/v1/driving/${sourceCoords.lng},${sourceCoords.lat};${destCoords.lng},${destCoords.lat}?alternatives=true&overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes) {
        const routesWithAnalysis = data.routes.map((route: any) => {
          // OSRM returns coordinates as [longitude, latitude], Leaflet needs [latitude, longitude]
          const path = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
          
          // Congestion Analysis (Smart Penalty System)
          let congestionPenalty = 0;
          let congestionLevel = 'light';

          // Check for high congestion signals along the route
          markers.forEach(marker => {
             // Check if route passes near this marker (within ~300m)
             const isNear = path.some((point: [number, number]) => {
                return getDistance(point[0], point[1], marker.lat, marker.lng) < 0.3;
             });

             if (isNear) {
                const traffic = marker.traffic ? marker.traffic.toLowerCase() : 'low';
                if (traffic === 'high' || traffic === 'heavy') {
                   congestionPenalty += 10; // 10 min penalty for high congestion
                } else if (traffic === 'medium' || traffic === 'moderate') {
                   congestionPenalty += 5; // 5 min penalty for medium congestion
                }
             }
          });

          // Determine overall route traffic status
          if (congestionPenalty >= 15) congestionLevel = 'heavy';
          else if (congestionPenalty >= 5) congestionLevel = 'moderate';

          // Calculate adjusted duration
          const baseDurationMins = Math.round(route.duration / 60);
          const totalDurationMins = baseDurationMins + congestionPenalty;

          return {
            time: `${totalDurationMins} min`,
            distance: `${(route.distance / 1000).toFixed(1)} km`,
            traffic: congestionLevel,
            path: path,
            penalty: congestionPenalty
          };
        });

        // Sort by time (smart routing prefers lowest adjusted time)
        routesWithAnalysis.sort((a: any, b: any) => parseInt(a.time) - parseInt(b.time));

        // Assign names based on rank
        const finalRoutes: RouteInfo[] = routesWithAnalysis.map((r: any, i: number) => ({
            ...r,
            id: i + 1,
            name: i === 0 ? (r.penalty === 0 ? 'Fastest Route' : 'Best Available') : `Alternative ${i}`,
        }));

        setSuggestedRoutes(finalRoutes);
        setShowRoutes(true);
      } else {
        console.error("Error fetching routes from OSRM:", data.message);
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Custom icon function to create dynamic pulsing markers
  const createTrafficIcon = (traffic: string) => {
    const colorClass = getTrafficColor(traffic);
    const html = `
      <div class="relative flex items-center justify-center w-6 h-6">
        <div class="w-3 h-3 rounded-full ${colorClass} animate-pulse"></div>
        <div class="absolute w-3 h-3 rounded-full ${colorClass} animate-ping opacity-75"></div>
      </div>`;

    return divIcon({
      className: 'bg-transparent border-0',
      html: html,
      iconSize: [24, 24],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Component to auto-fit the map to the selected route
  const FitBoundsToRoute = () => {
    const map = useMap();
    useEffect(() => {
      const selected = suggestedRoutes.find(r => r.id === selectedRoute);
      if (selected && selected.path.length > 0) {
        map.fitBounds(selected.path);
      }
    }, [selectedRoute]);
    return null;
  };

  const handleInputChange = (value: string, type: 'source' | 'destination') => {
    if (type === 'source') {
      setSource(value);
      if (value.trim()) {
        setSourceSuggestions(markers.filter(m => m.name.toLowerCase().includes(value.toLowerCase())));
      } else {
        setSourceSuggestions([]);
      }
    } else {
      setDestination(value);
      if (value.trim()) {
        setDestinationSuggestions(markers.filter(m => m.name.toLowerCase().includes(value.toLowerCase())));
      } else {
        setDestinationSuggestions([]);
      }
    }
  };

  const selectSuggestion = (marker: MapMarker, type: 'source' | 'destination') => {
    if (type === 'source') {
      setSource(marker.name);
      setSourceSuggestions([]);
    } else {
      setDestination(marker.name);
      setDestinationSuggestions([]);
    }
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        const coordString = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        if (activeInput === 'source') {
          setSource(coordString);
          setActiveInput('destination');
        } else {
          setDestination(coordString);
        }
      },
    });
    return null;
  };

  // Component to handle recentering from navigation state (e.g. from Alerts page)
  const RecenterMap = ({ center, zoom }: { center?: [number, number]; zoom?: number }) => {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.setView(center, zoom || 15);
      }
    }, [center, zoom, map]);
    return null;
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
                placeholder="Source" 
                value={source}
                onChange={(e) => handleInputChange(e.target.value, 'source')}
                onFocus={() => setActiveInput('source')}
                className={`pl-10 ${activeInput === 'source' ? 'ring-2 ring-primary' : ''}`} />
              {sourceSuggestions.length > 0 && activeInput === 'source' && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {sourceSuggestions.map(marker => (
                    <div key={marker.id} onClick={() => selectSuggestion(marker, 'source')} className="p-2 hover:bg-muted cursor-pointer text-sm">
                      {marker.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Destination" 
                value={destination}
                onChange={(e) => handleInputChange(e.target.value, 'destination')}
                onFocus={() => setActiveInput('destination')}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={`pl-10 ${activeInput === 'destination' ? 'ring-2 ring-primary' : ''}`} />
              {destinationSuggestions.length > 0 && activeInput === 'destination' && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {destinationSuggestions.map(marker => (
                    <div key={marker.id} onClick={() => selectSuggestion(marker, 'destination')} className="p-2 hover:bg-muted cursor-pointer text-sm">
                      {marker.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button 
              className="w-full gap-2 gradient-bg" 
              onClick={handleSearch}
              disabled={isSearching || !source.trim() || !destination.trim()}
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {isSearching ? 'Finding Routes...' : 'Find Route'}
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
          {showRoutes && (
          <div className="glow-card p-4 animate-fade-in">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Route className="w-4 h-4" />
              Suggested Routes
            </h3>
            {suggestedRoutes.every(r => r.traffic === 'heavy') && (
               <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive flex items-center gap-2">
                 <AlertTriangle className="w-3 h-3" />
                 High congestion on all routes.
               </div>
            )}
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
                      {route.penalty !== undefined && route.penalty > 0 && (
                        <span className="text-destructive font-medium ml-1">
                          (+{route.penalty}m delay)
                        </span>
                      )}
                    </span>
                    <span>{route.distance}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 glow-card overflow-hidden min-h-[500px] lg:min-h-[600px] z-0">
          <MapContainer center={[13.03, 80.24]} zoom={12} scrollWheelZoom={true} className="w-full h-full">
            <RecenterMap center={location.state?.center} zoom={location.state?.zoom} />
            <MapClickHandler />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBoundsToRoute />
            {selectedRoute && (
              <Polyline 
                positions={suggestedRoutes.find(r => r.id === selectedRoute)?.path || []}
                color={getTrafficHexColor(suggestedRoutes.find(r => r.id === selectedRoute)?.traffic || 'low')}
                weight={5}
                opacity={0.7}
              />
            )}
            {markers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={createTrafficIcon(marker.traffic)}>
                <Popup>
                  <div className="font-sans">
                    <p className="font-semibold">{marker.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{marker.traffic} traffic</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
