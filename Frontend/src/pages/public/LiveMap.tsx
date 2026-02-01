import React, { useState, useEffect } from 'react';
import { Search, Navigation, Clock, MapPin, Route, Loader2, AlertTriangle, ArrowRight, Locate, Share2, Save, Star, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useMapContext } from '@/contexts/MapContext';

interface RouteInfo {
  id: number;
  name: string;
  time: string;
  distance: string;
  traffic: string;
  path: [number, number][];
  penalty?: number;
  signalIds: number[];
}

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
  // reference latitude for scaling
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
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newLocationName, setNewLocationName] = useState('');

  // Emergency vehicles & roadblocks for public map (to show when a route is selected)
  const [emergencyVehicles, setEmergencyVehicles] = useState<any[]>([]);
  const [roadblocks, setRoadblocks] = useState<any[]>([]);
  const [onRouteVehicles, setOnRouteVehicles] = useState<any[]>([]);
  const [onRouteRoadblocks, setOnRouteRoadblocks] = useState<any[]>([]);
  const navigate = useNavigate();


  useEffect(() => {
    // Only fetch if markers are empty (first load)
    if (markers.length > 0) {
      setLoading(false);
      return;
    }

    const fetchMarkers = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const response = await fetch('http://localhost:3000/api/signals', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
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
      } catch (e) {
        console.error('Error loading emergency vehicles', e);
      }
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

    fetchMarkers();
    fetchEmergencyVehicles();
    fetchRoadblocks();

    const interval = setInterval(() => {
      fetchMarkers();
      fetchEmergencyVehicles();
      fetchRoadblocks();
    }, 15000); // poll every 15s

    return () => clearInterval(interval);
  }, []);

  // Compute vehicles and roadblocks that are near the selected route
  useEffect(() => {
    if (!selectedRoute) {
      setOnRouteVehicles([]);
      setOnRouteRoadblocks([]);
      return;
    }
    const route = suggestedRoutes.find(r => r.id === selectedRoute);
    if (!route) {
      setOnRouteVehicles([]);
      setOnRouteRoadblocks([]);
      return;
    }

    const path = route.path as [number, number][];
    const vehiclesOn = emergencyVehicles.filter(ev => isPointNearPath([ev.lat, ev.lng], path, 120));
    const roadblocksOn = roadblocks.filter(rb => isPointNearPath([rb.lat, rb.lng], path, 120));
    setOnRouteVehicles(vehiclesOn);
    setOnRouteRoadblocks(roadblocksOn);
  }, [selectedRoute, suggestedRoutes, emergencyVehicles, roadblocks]); // Only run once on mount (or if empty)

  // Fetch saved locations
  const fetchSavedLocations = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/saved-locations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedLocations(data);
      }
    } catch (error) {
      console.error('Error fetching saved locations:', error);
    }
  };

  useEffect(() => {
    fetchSavedLocations();
  }, []);

  // Handle URL parameters for shared routes and locations
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    const destinationParam = params.get('destination');
    const locationParam = params.get('location');
    const latParam = params.get('lat');
    const lngParam = params.get('lng');

    if (sourceParam && destinationParam) {
      // Shared route
      setSource(decodeURIComponent(sourceParam));
      setDestination(decodeURIComponent(destinationParam));
      // Auto-search after a short delay to allow markers to load
      setTimeout(() => {
        if (markers.length > 0) {
          handleSearch();
        }
      }, 1000);
    } else if (locationParam && latParam && lngParam) {
      // Shared location
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      setMapCenter([lat, lng]);
      setMapZoom(16);
      setSource(decodeURIComponent(locationParam));
    }
  }, [markers.length]); // Run when markers are loaded


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
          const routeSignalIds: number[] = [];

          // Identify and Order Signals
          const matchedSignals = markers
            .map(marker => {
              // Find the first point on the path that is close to this marker
              // We use findIndex to get the position (sequence) of the match
              const matchIndex = path.findIndex((point: [number, number]) => 
                getDistance(point[0], point[1], marker.lat, marker.lng) < 0.2 // Increased from 0.05 (50m) to 0.1 (100m)
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
            .sort((a, b) => a.index - b.index); // Sort by sequence in the path!

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
            signalIds: routeSignalIds
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

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
        setSource(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocationError(null);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('An unknown error occurred.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleShareRoute = async () => {
    if (!source || !destination) {
      setShareSuccess('Please select a route first');
      setTimeout(() => setShareSuccess(null), 3000);
      return;
    }

    const shareUrl = `${window.location.origin}/public/map?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess('Route link copied to clipboard!');
      setTimeout(() => setShareSuccess(null), 3000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSuccess('Route link copied to clipboard!');
      setTimeout(() => setShareSuccess(null), 3000);
    }
  };

  const handleShareLocation = async (lat: number, lng: number, name: string) => {
    const shareUrl = `${window.location.origin}/public/map?location=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(`Location "${name}" link copied!`);
      setTimeout(() => setShareSuccess(null), 3000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSuccess(`Location "${name}" link copied!`);
      setTimeout(() => setShareSuccess(null), 3000);
    }
  };

  const handleMapClickForSave = (lat: number, lng: number) => {
    setTempLocation({ lat, lng });
    setShowNameDialog(true);
  };

  const confirmSaveLocation = async () => {
    if (!newLocationName.trim() || !tempLocation) return;
    
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch('http://localhost:3000/api/saved-locations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newLocationName,
          latitude: tempLocation.lat,
          longitude: tempLocation.lng
        }),
      });

      if (response.ok) {
        setShareSuccess(`Location "${newLocationName}" saved successfully!`);
        setTimeout(() => setShareSuccess(null), 3000);
        fetchSavedLocations();
      } else {
        setLocationError('Failed to save location');
        setTimeout(() => setLocationError(null), 3000);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      setLocationError('Error saving location');
      setTimeout(() => setLocationError(null), 3000);
    } finally {
      setShowNameDialog(false);
      setNewLocationName('');
      setTempLocation(null);
      setIsSavingLocation(false);
    }
  };

  const cancelSaveLocation = () => {
    setShowNameDialog(false);
    setNewLocationName('');
    setTempLocation(null);
    setIsSavingLocation(false);
  };

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this saved location?")) return;

    try {
      const token = localStorage.getItem('traffic_token');
      const response = await fetch(`http://localhost:3000/api/saved-locations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchSavedLocations();
        setShareSuccess('Location deleted');
        setTimeout(() => setShareSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  // Pre-define and memoize the icons for each traffic level to avoid creating new objects on every render
  const trafficIcons = React.useMemo(() => {
    const createIcon = (traffic: string) => {
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

    return {
      low: createIcon('low'),
      medium: createIcon('medium'),
      high: createIcon('high'),
      light: createIcon('low'),
      moderate: createIcon('medium'),
      heavy: createIcon('high'),
    } as Record<string, any>;
  }, []);

  // Custom icon for user location (memoized for performance)
  const userLocationIcon = React.useMemo(() => {
    const html = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
        <div class="absolute w-8 h-8 rounded-full bg-blue-500 animate-ping opacity-30"></div>
      </div>`;

    return divIcon({
      className: 'bg-transparent border-0',
      html: html,
      iconSize: [32, 32],
    });
  }, []);

  // Custom icon for saved locations
  const savedLocationIcon = React.useMemo(() => {
    const html = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eab308" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md text-white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>`;

    return divIcon({
      className: 'bg-transparent border-0',
      html: html,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  }, []);

  const handleViewAllRouteSignals = () => {
    navigate('/public/signals', { state: { routeData: suggestedRoutes } });
  };

  // ChangeView component to handle programmatic map movement
  const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, zoom);
    }, [center[0], center[1], zoom]); // Only move when external center/zoom changes
    return null;
  };

  // Filter markers to show only those on the selected route
  const displayedMarkers = React.useMemo(() => {
    if (!selectedRoute) return [];
    const route = suggestedRoutes.find(r => r.id === selectedRoute);
    return route ? markers.filter(m => route.signalIds.includes(m.id)) : [];
  }, [selectedRoute, markers, suggestedRoutes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Component to auto-fit the map to the selected route
  // Fully disabled as per user request to avoid annoying automatic zooming
  const FitBoundsToRoute = () => {
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

  const selectSuggestion = (marker: any, type: 'source' | 'destination') => {
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

        if (isSavingLocation) {
          handleMapClickForSave(lat, lng);
          return;
        }

        const coordString = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        if (activeInput === 'source') {
          setSource(coordString);
          setActiveInput('destination');
        } else {
          setDestination(coordString);
        }
      },
      // Note: We don't sync moveend back to context here to avoid re-render loops during dragging
      // unless specifically requested for sharing features. 
      // If we need to sync, we should debounce it.
    });
    return null;
  };

  // Component to handle recentering from navigation state (e.g. from Alerts page)
  const RecenterMap = () => {
    const map = useMap();
    useEffect(() => {
       // Only recenter if we are not showing routes (user manually moving map is fine otherwise)
       // But if we have a saved center, maybe we just use that on initial mount?
       // Let's rely on MapContainer center for initial, and moveend to save state
    }, []);
    return null;
  };

  return (
    <div className="space-y-6">
      {/* ... header ... */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Live Traffic Map</h1>
        <p className="text-muted-foreground mt-1">View real-time traffic conditions and find optimal routes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <div className="space-y-4">
          {/* ... Search ... */}
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
            <Button 
              variant="outline"
              className="w-full gap-2" 
              onClick={handleLocateMe}
            >
              <Locate className="w-4 h-4" />
              Use My Location
            </Button>
            <Button 
              variant="outline"
              className="w-full gap-2" 
              onClick={handleShareRoute}
              disabled={!source.trim() || !destination.trim()}
            >
              <Share2 className="w-4 h-4" />
              Share Route
            </Button>
            <Button 
              variant={isSavingLocation ? "default" : "outline"}
              className={`w-full gap-2 ${isSavingLocation ? 'ring-2 ring-primary animate-pulse' : ''}`}
              onClick={() => setIsSavingLocation(!isSavingLocation)}
            >
              <Save className="w-4 h-4" />
              {isSavingLocation ? 'Click Map to Save' : 'Save Location'}
            </Button>
            {locationError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                {locationError}
              </div>
            )}
            {shareSuccess && (
              <div className="text-xs text-success bg-success/10 p-2 rounded border border-success/20">
                {shareSuccess}
              </div>
            )}
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
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                <Route className="w-4 h-4" />
                Suggested Routes
                </h3>
            </div>
            
            {suggestedRoutes.some(r => r.traffic === 'heavy') && (
               <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive flex items-center gap-2">
                 <AlertTriangle className="w-3 h-3" />
                 High congestion detected.
               </div>
            )}
            <div className="space-y-2">
              {suggestedRoutes.map((route) => (
                <div key={route.id} className="space-y-2">
                  <button
                    onClick={() => setSelectedRoute(route.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedRoute === route.id
                        ? 'bg-primary/10 border border-primary'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{route.name}</span>
                        {/* Inline counts for verification */}
                        <span className="text-[11px] font-mono text-muted-foreground ml-2">
                          {emergencyVehicles.filter(ev => isPointNearPath([ev.lat, ev.lng], route.path, 120)).length}🚑
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground ml-1">
                          {roadblocks.filter(rb => isPointNearPath([rb.lat, rb.lng], route.path, 120)).length}🚧
                        </span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getTrafficColor(route.traffic)}`} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {route.time}
                        {route.penalty !== undefined && route.penalty > 0 && (
                          <span className="text-destructive font-medium ml-1">
                            (+{route.penalty}m)
                          </span>
                        )}
                      </span>
                      <span>{route.distance}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
            
            <Button 
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={handleViewAllRouteSignals}
            >
                View Detailed Status for All Routes
                <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          )}
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 glow-card overflow-hidden min-h-[500px] lg:min-h-[600px] relative">
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            scrollWheelZoom="center"
            dragging={true}
            doubleClickZoom={false}
            touchZoom={true}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <MapClickHandler />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBoundsToRoute />
            {selectedRoute && (() => {
              const route = suggestedRoutes.find(r => r.id === selectedRoute);
              if (!route) return null;
              return (
                <Polyline 
                  key={`route-${route.id}-${route.traffic}`}
                  positions={route.path}
                  color={getTrafficHexColor(route.traffic)}
                  weight={6}
                  opacity={0.8}
                  lineJoin="round"
                  lineCap="round"
                />
              );
            })()}
            {userLocation && (
              <Marker position={userLocation} icon={userLocationIcon}>
                <Popup>
                  <div className="font-sans">
                    <p className="font-semibold">Your Location</p>
                    <p className="text-sm text-muted-foreground">Current position</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {savedLocations.map(loc => (
              <Marker 
                key={`saved-${loc.id}`} 
                position={[loc.latitude, loc.longitude]} 
                icon={savedLocationIcon}
              >
                <Popup>
                  <div className="font-sans min-w-[150px]">
                    <p className="font-bold text-base mb-1">{loc.name}</p>
                    <p className="text-xs text-muted-foreground mb-3">Saved Location</p>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full h-8 text-xs"
                      onClick={() => handleDeleteLocation(loc.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {displayedMarkers.map(marker => (
              <Marker 
                key={marker.id} 
                position={[marker.lat, marker.lng]} 
                icon={trafficIcons[marker.traffic.toLowerCase()] || trafficIcons.low}
              >
                <Popup>
                  <div className="font-sans">
                    <p className="font-semibold">{marker.name}</p>
                    <p className="text-sm text-muted-foreground capitalize mb-2">{marker.traffic} traffic</p>
                    <button
                      onClick={() => handleShareLocation(marker.lat, marker.lng, marker.name)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Share2 className="w-3 h-3" />
                      Share Location
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Emergency vehicles and roadblocks along the selected route */}
            {selectedRoute && onRouteVehicles.map(ev => (
              <Marker
                key={`ev-on-${ev.id}`}
                position={[ev.lat, ev.lng]}
                icon={divIcon({
                  className: 'bg-transparent border-0',
                  html: `<div class="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white text-sm">${ev.type === 'firetruck' ? '🚒' : ev.type === 'police' ? '🚓' : '🚑'}</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <div className="font-semibold">{(ev.type || '').toUpperCase()}</div>
                    <div className="text-sm text-muted-foreground">{ev.identifier}</div>
                    <div className="text-xs mt-2 text-muted-foreground">On selected route</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {selectedRoute && onRouteRoadblocks.map(rb => (
              <Marker
                key={`rb-on-${rb.id}`}
                position={[rb.lat, rb.lng]}
                icon={divIcon({
                  className: 'bg-transparent border-0',
                  html: `<div class="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm">🚧</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <div className="font-semibold">Roadblock</div>
                    <div className="text-sm text-muted-foreground">{rb.reason}</div>
                    <div className="text-xs mt-2 text-muted-foreground">On selected route</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Debug overlay: shows counts for selected route (temporary) */}
          {selectedRoute && (
            <div className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border border-border rounded-md px-3 py-2 text-sm shadow-md">
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground">On selected route:</div>
                <div className="font-medium">{onRouteVehicles.length} 🚑</div>
                <div className="font-medium">{onRouteRoadblocks.length} 🚧</div>
              </div>
            </div>
          )}
        </div>

        {/* Save Location Modal Overlay */}
        {showNameDialog && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-sm border border-border animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Save Location</h3>
                <button onClick={cancelSaveLocation} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enter a name for this location to save it to your map.
              </p>
              <Input 
                value={newLocationName} 
                onChange={e => setNewLocationName(e.target.value)}
                placeholder="e.g., Home, Office, Gym"
                className="mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmSaveLocation()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelSaveLocation}>Cancel</Button>
                <Button onClick={confirmSaveLocation} disabled={!newLocationName.trim()}>Save Location</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
