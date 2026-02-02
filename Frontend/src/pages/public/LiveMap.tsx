import React, { useState, useEffect, useCallback } from 'react';
import { Search, Navigation, Clock, MapPin, Route, Loader2, AlertTriangle, ArrowRight, Locate, Share2, Save, Star, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useMapContext } from '@/contexts/MapContext';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { VoiceSettings } from '@/components/VoiceSettings';
import { startVoiceNavigation } from '@/utils/voiceNavigation';
import { startFullNavigation } from '@/utils/navigationSteps';
import { RouteInfo } from '@/contexts/MapContext';




interface SavedLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
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

// Distance in meters using haversine
const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  return getDistance(lat1, lon1, lat2, lon2) * 1000;
};

// Calculate distance from point P to segment AB (meters) using equirectangular approx
const pointToSegmentDistanceMeters = (p: [number, number], a: [number, number], b: [number, number]) => {
  const refLat = (a[0] + b[0]) / 2;
  const toXY = (lat: number, lng: number) => {
    const R = 6371000; // meters
    const x = deg2rad(lng) * R * Math.cos(deg2rad(refLat));
    const y = deg2rad(lat) * R;
    return { x, y };
  };

  const P = toXY(p[0], p[1]);
  const A = toXY(a[0], a[1]);
  const B = toXY(b[0], b[1]);

  const vx = B.x - A.x;
  const vy = B.y - A.y;
  const wx = P.x - A.x;
  const wy = P.y - A.y;

  const vLen2 = vx * vx + vy * vy;
  let t = 0;
  if (vLen2 > 0) t = (wx * vx + wy * vy) / vLen2;
  t = Math.max(0, Math.min(1, t));

  const cx = A.x + t * vx;
  const cy = A.y + t * vy;

  const dx = P.x - cx;
  const dy = P.y - cy;
  return Math.sqrt(dx * dx + dy * dy);
};

const isPointNearPath = (p: [number, number], path: [number, number][], thresholdMeters = 100) => {
  if (!path || path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const d = pointToSegmentDistanceMeters(p, a, b);
    if (d <= thresholdMeters) return true;
  }
  return false;
};

export const LiveMap: React.FC = () => {
  const {
    source, setSource,
    destination, setDestination,
    suggestedRoutes, setSuggestedRoutes,
    selectedRoute, setSelectedRoute,
    showRoutes, setShowRoutes,
    markers, setMarkers,
    mapCenter, setMapCenter,
    mapZoom, setMapZoom
  } = useMapContext();

  const {
    isVoiceEnabled,
    isSpeaking,
    voiceSettings,
    availableVoices,
    toggleVoice,
    speak,
    updateVoiceSettings,
    announceRoute,
    announceTrafficWarning,
    announceEmergencyVehicle,
    announceRoadblock,
    updateUserPosition,
    stopNavigation,
  } = useVoiceNavigation();

  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeInput, setActiveInput] = useState<'source' | 'destination'>('source');
  const [sourceSuggestions, setSourceSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [tempLocation, setTempLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastAnnouncedAlert, setLastAnnouncedAlert] = useState<Set<string>>(new Set());

  // Emergency vehicles & roadblocks for public map
  const [emergencyVehicles, setEmergencyVehicles] = useState<any[]>([]);
  const [roadblocks, setRoadblocks] = useState<any[]>([]);
  const navigate = useNavigate();

  // 15s polling for map data
  useEffect(() => {
    if (markers.length > 0) setLoading(false);

    const fetchMarkers = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const response = await fetch('http://localhost:3000/api/signals', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
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
      } catch (error) { console.error('Error fetching map markers:', error); }
      finally { setLoading(false); }
    };

    const fetchEmergencyVehicles = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const res = await fetch('http://localhost:3000/api/emergency-vehicles', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = Array.isArray(data) ? data.map((row: any) => ({
            id: row.id,
            type: row.type,
            identifier: row.identifier,
            priority: row.priority,
            lat: parseFloat(row.latitude ?? row.lat ?? 0),
            lng: parseFloat(row.longitude ?? row.lng ?? 0),
          })).filter((v: any) => !Number.isNaN(v.lat) && !Number.isNaN(v.lng)) : [];
          setEmergencyVehicles(mapped);
        }
      } catch (e) { console.error('Error loading emergency vehicles', e); }
    };

    const fetchRoadblocks = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const res = await fetch('http://localhost:3000/api/roadblocks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = Array.isArray(data) ? data.map((row: any) => ({
            id: row.id,
            reason: row.reason,
            lat: parseFloat(row.latitude ?? row.lat ?? 0),
            lng: parseFloat(row.longitude ?? row.lng ?? 0),
          })).filter((v: any) => !Number.isNaN(v.lat) && !Number.isNaN(v.lng)) : [];
          setRoadblocks(mapped);
        }
      } catch (e) { console.error('Error loading roadblocks', e); }
    };

    if (markers.length === 0) fetchMarkers();
    //fetchEmergencyVehicles();
    //fetchRoadblocks();

    const interval = setInterval(() => {
      fetchMarkers();
      //fetchEmergencyVehicles();
      //fetchRoadblocks();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchSavedLocations = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/saved-locations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setSavedLocations(await response.json());
    } catch (error) { console.error('Error fetching saved locations:', error); }
  };

  useEffect(() => { fetchSavedLocations(); }, []);

  // Shared routes/locations
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    const destinationParam = params.get('destination');
    const locationParam = params.get('location');
    const latParam = params.get('lat');
    const lngParam = params.get('lng');

    if (sourceParam && destinationParam) {
      setSource(decodeURIComponent(sourceParam));
      setDestination(decodeURIComponent(destinationParam));
      setTimeout(() => { if (markers.length > 0) handleSearch(); }, 1000);
    } else if (locationParam && latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      setMapCenter([lat, lng]);
      setSource(decodeURIComponent(locationParam));
    }
  }, [markers.length]);

  // Track user position in real-time when navigating
  useEffect(() => {
    if (!isNavigating || !selectedRoute) return;
    let watchId: number;
    const startPositionTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          updateUserPosition([latitude, longitude]);
          checkNearbyAlerts([latitude, longitude]);
        },
        (error) => { console.error('Position tracking error:', error); },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    };
    startPositionTracking();
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isNavigating, selectedRoute]);

  const displayedAlertMarkers = React.useMemo(() => {
    if (!suggestedRoutes?.length) return { evs: [], rbs: [] };
    const routes = selectedRoute ? [suggestedRoutes.find(r => r.id === selectedRoute)!] : suggestedRoutes.slice(0, 2);
    return {
      evs: emergencyVehicles.filter(ev => routes.some(r => isPointNearPath([ev.lat, ev.lng], r.path, 150))),
      rbs: roadblocks.filter(rb => routes.some(r => isPointNearPath([rb.lat, rb.lng], r.path, 150)))
    };
  }, [emergencyVehicles, roadblocks, suggestedRoutes, selectedRoute]);

  const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => { map.setView(center, map.getZoom()); }, [center]);
    return null;
  };
  const checkNearbyAlerts = useCallback((position: [number, number]) => {
    const alertThreshold = 500; // 500 meters
    displayedAlertMarkers.evs.forEach((ev) => {
      const distance = haversineMeters(position[0], position[1], ev.lat, ev.lng);
      const alertKey = `ev-${ev.id}`;
      if (distance < alertThreshold && !lastAnnouncedAlert.has(alertKey)) {
        announceEmergencyVehicle(ev.type, distance);
        setLastAnnouncedAlert(prev => new Set(prev).add(alertKey));
        setTimeout(() => setLastAnnouncedAlert(prev => {
          const newSet = new Set(prev);
          newSet.delete(alertKey);
          return newSet;
        }), 120000);
      }
    });
    displayedAlertMarkers.rbs.forEach((rb) => {
      const distance = haversineMeters(position[0], position[1], rb.lat, rb.lng);
      const alertKey = `rb-${rb.id}`;
      if (distance < alertThreshold && !lastAnnouncedAlert.has(alertKey)) {
        announceRoadblock(rb.reason, distance);
        setLastAnnouncedAlert(prev => new Set(prev).add(alertKey));
        setTimeout(() => setLastAnnouncedAlert(prev => {
          const newSet = new Set(prev);
          newSet.delete(alertKey);
          return newSet;
        }), 120000);
      }
    });
    displayedMarkers.forEach((marker) => {
      const distance = haversineMeters(position[0], position[1], marker.lat, marker.lng);
      const alertKey = `signal-${marker.id}`;
      if (distance < 300 && (marker.traffic === 'heavy' || marker.traffic === 'moderate') && !lastAnnouncedAlert.has(alertKey)) {
        announceTrafficWarning(marker.name, marker.traffic);
        setLastAnnouncedAlert(prev => new Set(prev).add(alertKey));
        setTimeout(() => setLastAnnouncedAlert(prev => {
          const newSet = new Set(prev);
          newSet.delete(alertKey);
          return newSet;
        }), 120000);
      }
    });
  }, [markers, emergencyVehicles, roadblocks, lastAnnouncedAlert]);

  const getTrafficColor = (traffic: string) => {
    switch (traffic?.toLowerCase()) {
      case 'low': case 'light': return 'bg-success';
      case 'medium': case 'moderate': return 'bg-warning';
      default: return 'bg-destructive';
    }
  };

  const getTrafficHexColor = (traffic: string) => {
    switch (traffic?.toLowerCase()) {
      case 'low': case 'light': return '#22c55e';
      case 'medium': case 'moderate': return '#eab308';
      default: return '#ef4444';
    }
  };

  // Fixed handleSearch function for LiveMap.tsx
  // Replace your existing handleSearch function with this

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
      speak("Could not find the source or destination location. Please try again.");
      setIsSearching(false);
      return;
    }

    // OSRM API expects {longitude},{latitude}
    const url = `http://router.project-osrm.org/route/v1/driving/${sourceCoords.lng},${sourceCoords.lat};${destCoords.lng},${destCoords.lat}?alternatives=true&overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes) {

        const steps = data.routes[0].legs[0].steps;
        startFullNavigation(steps);


        const routesWithAnalysis = data.routes.map((route: any) => {
          // OSRM returns coordinates as [longitude, latitude], Leaflet needs [latitude, longitude]
          const path = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);

          // Extract turn-by-turn instructions properly
          let instructions: string[] = [];

          if (route.legs && route.legs.length > 0) {
            route.legs.forEach((leg: any) => {
              if (leg.steps && Array.isArray(leg.steps)) {
                leg.steps.forEach((step: any) => {
                  if (step.maneuver && step.maneuver.instruction) {
                    instructions.push(step.maneuver.instruction);
                  }
                });
              }
            });
          }

          // If no instructions found, create basic ones based on coordinates
          if (instructions.length === 0) {
            instructions = [
              `Head towards ${destination}`,
              `Continue on your route`,
              `You will arrive at your destination`
            ];
          }

          console.log('Route instructions:', instructions); // Debug log

          // Congestion Analysis (Smart Penalty System)
          let congestionPenalty = 0;
          let congestionLevel = 'light';
          const routeSignalIds: number[] = [];

          // Identify and Order Signals
          const matchedSignals = markers
            .map(marker => {
              const matchIndex = path.findIndex((point: [number, number]) =>
                getDistance(point[0], point[1], marker.lat, marker.lng) < 0.2
              );

              if (matchIndex !== -1) {
                const traffic = marker.traffic ? marker.traffic.toLowerCase() : 'low';
                let penalty = 0;
                if (traffic === 'high' || traffic === 'heavy') penalty = 10;
                else if (traffic === 'medium' || traffic === 'moderate') penalty = 5;

                return { id: marker.id, index: matchIndex, penalty };
              }
              return null;
            })
            .filter((item): item is { id: number; index: number; penalty: number } => item !== null)
            .sort((a, b) => a.index - b.index);

          // Extract IDs and calculate total penalty
          matchedSignals.forEach(item => {
            routeSignalIds.push(item.id);
            congestionPenalty += item.penalty;
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
            penalty: congestionPenalty,
            signalIds: routeSignalIds,
            instructions: instructions
          };
        });

        // Sort by time
        routesWithAnalysis.sort((a: any, b: any) => parseInt(a.time) - parseInt(b.time));

        // Assign names based on rank
        const finalRoutes: RouteInfo[] = routesWithAnalysis.map((r: any, i: number) => ({
          ...r,
          id: i + 1,
          name: i === 0 ? (r.penalty === 0 ? 'Fastest Route' : 'Best Available') : `Alternative ${i}`,
        }));

        setSuggestedRoutes(finalRoutes);
        setShowRoutes(true);

        // Voice announcement for the best route
        if (finalRoutes.length > 0 && isVoiceEnabled) {
          announceRoute(finalRoutes[0]);
        }
      } else {
        console.error("Error fetching routes from OSRM:", data.message);
        speak("Could not calculate routes. Please check your internet connection and try again.");
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
      speak("Network error. Unable to fetch routes. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRouteSelect = useCallback((routeId: number) => {
    setSelectedRoute(routeId);
    const route = suggestedRoutes.find(r => r.id === routeId);
    if (route && isVoiceEnabled) announceRoute(route);
  }, [suggestedRoutes, isVoiceEnabled, announceRoute]);

  const startNavigation = useCallback(() => {
    if (!selectedRoute || !userLocation) {
      speak('Please select a route and enable location services to start navigation.');
      return;
    }
    setIsNavigating(true);
    setLastAnnouncedAlert(new Set());
    speak('Navigation started. Follow the route guidance.', true);
  }, [selectedRoute, userLocation, speak]);

  const handleStopNavigation = useCallback(() => {
    setIsNavigating(false);
    stopNavigation();
  }, [stopNavigation]);

  const handleTestVoice = useCallback(() => {
    speak('This is a test of the voice navigation system. You are all set!');
  }, [speak]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setUserLocation([latitude, longitude]);
      setMapCenter([latitude, longitude]);
      setSource(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }, (err) => console.error(err), { enableHighAccuracy: true });
  };

  const handleShareRoute = async () => {
    const shareUrl = `${window.location.origin}/public/map?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareSuccess('Route link copied!');
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const confirmSaveLocation = async () => {
    if (!newLocationName.trim() || !tempLocation) return;
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/saved-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newLocationName, latitude: tempLocation.lat, longitude: tempLocation.lng }),
      });
      if (res.ok) { fetchSavedLocations(); setShareSuccess('Location saved!'); }
    } catch (e) { console.error(e); }
    finally { setShowNameDialog(false); setNewLocationName(''); setTempLocation(null); }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm("Delete this location?")) return;
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch(`http://localhost:3000/api/saved-locations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { fetchSavedLocations(); setShareSuccess('Location deleted'); }
    } catch (e) { console.error(e); }
  };

  const handleViewAllRouteSignals = () => navigate('/public/signals', { state: { routeData: suggestedRoutes } });

  const trafficIcons = React.useMemo(() => {
    const createIcon = (traffic: string) => {
      const colorClass = getTrafficColor(traffic);
      return divIcon({
        className: 'bg-transparent border-0',
        html: `<div class="relative flex items-center justify-center w-6 h-6"><div class="w-3 h-3 rounded-full ${colorClass} animate-pulse"></div><div class="absolute w-3 h-3 rounded-full ${colorClass} animate-ping opacity-75"></div></div>`,
        iconSize: [24, 24],
      });
    };
    return { low: createIcon('low'), medium: createIcon('medium'), high: createIcon('high'), light: createIcon('low'), moderate: createIcon('medium'), heavy: createIcon('high') } as Record<string, any>;
  }, []);

  const userLocationIcon = divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-8 h-8"><div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div><div class="absolute w-8 h-8 rounded-full bg-blue-500 animate-ping opacity-30"></div></div>`,
    iconSize: [32, 32],
  });

  const savedLocationIcon = divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-8 h-8"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eab308" stroke="white" stroke-width="2" class="w-8 h-8 drop-shadow-md"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16], popupAnchor: [0, -16]
  });

  const displayedMarkers = React.useMemo(() => {
    if (!suggestedRoutes?.length) return [];
    if (selectedRoute) {
      const route = suggestedRoutes.find(r => r.id === selectedRoute);
      return markers.filter(m => route?.signalIds.includes(m.id));
    }
    const ids = new Set<number>();
    suggestedRoutes.slice(0, 2).forEach(r => r.signalIds.forEach(id => ids.add(id)));
    return markers.filter(m => ids.has(m.id));
  }, [selectedRoute, markers, suggestedRoutes]);



  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        if (isSavingLocation) { setTempLocation({ lat, lng }); setShowNameDialog(true); return; }
        const s = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (activeInput === 'source') { setSource(s); setActiveInput('destination'); }
        else setDestination(s);
      }
    });
    return null;
  };

  const handleInputChange = (v: string, type: 'source' | 'destination') => {
    if (type === 'source') {
      setSource(v);
      setSourceSuggestions(v.trim() ? markers.filter(m => m.name.toLowerCase().includes(v.toLowerCase())) : []);
    } else {
      setDestination(v);
      setDestinationSuggestions(v.trim() ? markers.filter(m => m.name.toLowerCase().includes(v.toLowerCase())) : []);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[600px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Live Traffic Map</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time alerts, routing and congestion monitoring
            {isNavigating && <span className="text-primary ml-2 font-bold">• Navigating</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <div className="glow-card p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Source" value={source} onChange={(e) => handleInputChange(e.target.value, 'source')} onFocus={() => setActiveInput('source')} className={activeInput === 'source' ? 'ring-2 ring-primary pl-10' : 'pl-10'} />
              {sourceSuggestions.length > 0 && activeInput === 'source' && (
                <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {sourceSuggestions.map(m => <div key={m.id} onClick={() => { setSource(m.name); setSourceSuggestions([]); }} className="p-2 hover:bg-muted cursor-pointer text-sm">{m.name}</div>)}
                </div>
              )}
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Destination" value={destination} onChange={(e) => handleInputChange(e.target.value, 'destination')} onFocus={() => setActiveInput('destination')} className={activeInput === 'destination' ? 'ring-2 ring-primary pl-10' : 'pl-10'} />
              {destinationSuggestions.length > 0 && activeInput === 'destination' && (
                <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {destinationSuggestions.map(m => <div key={m.id} onClick={() => { setDestination(m.name); setDestinationSuggestions([]); }} className="p-2 hover:bg-muted cursor-pointer text-sm">{m.name}</div>)}
                </div>
              )}
            </div>
            <Button className="w-full gap-2 gradient-bg" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {isSearching ? 'Calculating...' : 'Find Best Route'}
            </Button>

            <div className="flex gap-2">
              <VoiceSettings isVoiceEnabled={isVoiceEnabled} voiceSettings={voiceSettings} availableVoices={availableVoices} onToggle={toggleVoice} onUpdateSettings={updateVoiceSettings} onTestVoice={handleTestVoice} />
              <Button variant="outline" className="flex-1 gap-2" onClick={handleLocateMe}><Locate className="w-4 h-4" /> Locate</Button>
            </div>

            {selectedRoute && (
              <div className="flex gap-2">
                {!isNavigating ? (
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={startNavigation} disabled={!userLocation}><Navigation className="w-4 h-4" /> Start Navigation</Button>
                ) : (
                  <Button variant="destructive" className="w-full gap-2" onClick={handleStopNavigation}><X className="w-4 h-4" /> Stop Navigation</Button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleShareRoute}><Share2 className="w-4 h-4" /> Share</Button>
              <Button variant="outline" size="sm" className={`flex-1 gap-2 ${isSavingLocation ? 'ring-2 ring-primary' : ''}`} onClick={() => setIsSavingLocation(!isSavingLocation)}><Save className="w-4 h-4" /> Save</Button>
            </div>
          </div>

          {showRoutes && suggestedRoutes.length > 0 && (
            <div className="glow-card p-4 animate-fade-in max-h-[400px] overflow-y-auto">
              <h3 className="font-semibold flex items-center gap-2 mb-3"><Route className="w-4 h-4" /> Suggested Routes</h3>
              <div className="space-y-2">
                {suggestedRoutes.map((route) => (
                  <button key={route.id} onClick={() => handleRouteSelect(route.id)} className={`w-full p-3 rounded-lg text-left transition-all ${selectedRoute === route.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50 border border-transparent hover:bg-muted'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{route.name}</span>
                      <div className={`w-2 h-2 rounded-full ${getTrafficColor(route.traffic)}`} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {route.time}</span>
                      <span>{route.distance}</span>
                    </div>
                    {route.instructions && route.instructions.length > 0 && <p className="text-[10px] text-muted-foreground mt-2 truncate">{route.instructions[0]}</p>}
                  </button>
                ))}
              </div>
              <Button variant="link" className="w-full mt-2 text-xs" onClick={handleViewAllRouteSignals}>Detailed Status <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          )}

          {isSpeaking && (
            <div className="glow-card p-3 bg-primary/5 border-primary/20 animate-pulse">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="text-primary font-medium">Voice guidance active...</span>
              </div>
            </div>
          )}

          <div className="glow-card p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Map Legend</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Active Alerts</p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-sm">🚑</div><span className="text-xs font-medium">Emergency Vehicle</span></div>
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-white flex items-center justify-center text-sm">🚧</div><span className="text-xs font-medium">Roadblock</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Signal Traffic</p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 flex items-center justify-center"><div className="relative w-3 h-3 rounded-full bg-success"><div className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" /></div></div><span className="text-xs font-medium">Low Traffic</span></div>
                  <div className="flex items-center gap-3"><div className="w-8 h-8 flex items-center justify-center"><div className="relative w-3 h-3 rounded-full bg-warning"><div className="absolute inset-0 rounded-full bg-warning animate-ping opacity-75" /></div></div><span className="text-xs font-medium">Moderate Traffic</span></div>
                  <div className="flex items-center gap-3"><div className="w-8 h-8 flex items-center justify-center"><div className="relative w-3 h-3 rounded-full bg-destructive"><div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" /></div></div><span className="text-xs font-medium">Heavy Traffic</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 glow-card overflow-hidden min-h-[500px] lg:min-h-[650px] relative">
          <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full z-0">
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <MapClickHandler />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {(selectedRoute ? suggestedRoutes.filter(r => r.id === selectedRoute) : suggestedRoutes.slice(0, 2)).map(route => (
              <Polyline key={`route-${route.id}`} positions={route.path} color={getTrafficHexColor(route.traffic)} weight={selectedRoute === route.id ? 8 : 4} opacity={selectedRoute === route.id ? 0.9 : 0.4} />
            ))}

            {displayedMarkers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={trafficIcons[marker.traffic.toLowerCase()] || trafficIcons.low}><Popup><div className="p-1"><p className="font-bold">{marker.name}</p><p className="text-xs capitalize">{marker.traffic} Traffic</p></div></Popup></Marker>
            ))}

            {displayedAlertMarkers.evs.map(ev => (
              <Marker key={`ev-${ev.id}`} position={[ev.lat, ev.lng]} icon={divIcon({ className: 'bg-transparent', html: `<div class="w-8 h-8 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-lg animate-bounce-subtle">${ev.type === 'firetruck' ? '🚒' : '🚑'}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] })}><Popup><div className="font-bold">{(ev.type || '').toUpperCase()}</div><div className="text-xs">{ev.identifier}</div></Popup></Marker>
            ))}
            {displayedAlertMarkers.rbs.map(rb => (
              <Marker key={`rb-${rb.id}`} position={[rb.lat, rb.lng]} icon={divIcon({ className: 'bg-transparent', html: `<div class="w-8 h-8 rounded-full bg-yellow-500 border-2 border-white shadow-lg flex items-center justify-center text-lg">🚧</div>`, iconSize: [32, 32], iconAnchor: [16, 16] })}><Popup><div className="font-bold">Roadblock</div><div className="text-xs">{rb.reason}</div></Popup></Marker>
            ))}

            {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}
            {savedLocations.map(loc => (
              <Marker key={`saved-${loc.id}`} position={[loc.latitude, loc.longitude]} icon={savedLocationIcon}><Popup><div className="p-2"><p className="font-bold mb-2">{loc.name}</p><Button variant="destructive" size="sm" className="h-7 text-[10px] w-full" onClick={() => handleDeleteLocation(loc.id)}>Delete</Button></div></Popup></Marker>
            ))}
          </MapContainer>
          <Button className="absolute bottom-6 right-6 z-[400] rounded-full w-12 h-12 p-0 shadow-2xl gradient-bg" onClick={handleLocateMe}><Locate className="w-5 h-5" /></Button>
          {shareSuccess && <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] bg-success text-white px-4 py-2 rounded-full shadow-lg text-sm animate-bounce-subtle">{shareSuccess}</div>}
        </div>
      </div>

      {showNameDialog && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-card p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 animate-fade-in">
            <h3 className="font-bold text-xl mb-4 text-card-foreground">Save Location</h3>
            <Input value={newLocationName} onChange={e => setNewLocationName(e.target.value)} placeholder="e.g. Home, Office" className="mb-6 h-12" autoFocus />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowNameDialog(false); setIsSavingLocation(false); }} className="flex-1">Cancel</Button>
              <Button onClick={confirmSaveLocation} disabled={!newLocationName.trim()} className="flex-1 gradient-bg">Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};