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

  // Emergency vehicles & roadblocks for public map
  const [emergencyVehicles, setEmergencyVehicles] = useState<any[]>([]);
  const [roadblocks, setRoadblocks] = useState<any[]>([]);
  const navigate = useNavigate();


  useEffect(() => {
    // Only fetch if markers are empty (first load)
    if (markers.length > 0) {
      setLoading(false);
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

    if (markers.length === 0) fetchMarkers();
    fetchEmergencyVehicles();
    fetchRoadblocks();

    const interval = setInterval(() => {
      fetchMarkers();
      fetchEmergencyVehicles();
      fetchRoadblocks();
    }, 15000); // poll every 15s

    return () => clearInterval(interval);
  }, []);

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
      // Removed setMapZoom to prevent automatic zooming
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
        // Removed setMapZoom to prevent automatic zooming on click
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

  // Pre-define and memoize the icons for each traffic level
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

  // Custom icon for user location
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
      // Only set view if coordinates are actually different to avoid redundant movement
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const isSameCenter = Math.abs(currentCenter.lat - center[0]) < 0.0001 && Math.abs(currentCenter.lng - center[1]) < 0.0001;
      const isSameZoom = currentZoom === zoom;
      
      if (!isSameCenter) {
        // Use current map zoom to prevent resetting user's zoom level
        map.setView(center, currentZoom);
      } else if (!isSameZoom) {
        map.setZoom(zoom);
      }
    }, [center[0], center[1], zoom]);
    return null;
  };

  // Filter markers to show only those on the ALL suggested routes if no selected route, or just selected route
  const displayedMarkers = React.useMemo(() => {
    if (!suggestedRoutes || suggestedRoutes.length === 0) return [];
    
    if (selectedRoute) {
        const route = suggestedRoutes.find(r => r.id === selectedRoute);
        return route ? markers.filter(m => route.signalIds.includes(m.id)) : [];
    }
    
    // If multiple routes, show signals for top 2 routes
    const allRouteSignalIds = new Set<number>();
    suggestedRoutes.slice(0, 2).forEach(r => {
        r.signalIds.forEach(id => allRouteSignalIds.add(id));
    });
    return markers.filter(m => allRouteSignalIds.has(m.id));
  }, [selectedRoute, markers, suggestedRoutes]);

  // Combined and filtered emergency vehicles and roadblocks
  const displayedAlertMarkers = React.useMemo(() => {
    if (!suggestedRoutes || suggestedRoutes.length === 0) return { evs: [], rbs: [] };
    
    // Get routes to check proximity against
    const routesToCheck = selectedRoute 
        ? [suggestedRoutes.find(r => r.id === selectedRoute)!] 
        : suggestedRoutes.slice(0, 2);
    
    // Safety check if find returned undefined
    if (routesToCheck.some(r => !r)) return { evs: [], rbs: [] };

    const evOnRoutes = emergencyVehicles.filter(ev => 
        routesToCheck.some(r => isPointNearPath([ev.lat, ev.lng], r.path, 150))
    );
    
    const rbOnRoutes = roadblocks.filter(rb => 
        routesToCheck.some(r => isPointNearPath([rb.lat, rb.lng], r.path, 150))
    );
    
    return { evs: evOnRoutes, rbs: rbOnRoutes };
  }, [emergencyVehicles, roadblocks, suggestedRoutes, selectedRoute]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
      zoomend(e) {
        // Sync state when user manually zooms
        setMapZoom(e.target.getZoom());
      },
      moveend(e) {
        // Sync state when user manually moves map
        const center = e.target.getCenter();
        setMapCenter([center.lat, center.lng]);
      }
    });
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Live Traffic Map</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time alerts, routing and congestion monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <div className="space-y-4">
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
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={handleLocateMe} className="gap-2 text-xs">
                    <Locate className="w-3.5 h-3.5" /> Me
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareRoute} className="gap-2 text-xs">
                    <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
            </div>
          </div>

          {/* Suggested Routes Section */}
          {showRoutes && (
          <div className="glow-card p-4 animate-fade-in max-h-[400px] overflow-y-auto">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Route className="w-4 h-4" /> Suggested Routes
            </h3>
            <div className="space-y-2">
              {suggestedRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedRoute === route.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{route.name}</span>
                    <div className={`w-2 h-2 rounded-full ${getTrafficColor(route.traffic)}`} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {route.time}</span>
                    <span>{route.distance}</span>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="link" className="w-full mt-2 text-xs" onClick={handleViewAllRouteSignals}>Detailed Status <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </div>
          )}

          {/* Map Legend */}
          <div className="glow-card p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Map Legend
            </h3>
            
            <div className="space-y-4">
              {/* Alerts Section */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Active Alerts</p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white shadow-sm flex items-center justify-center text-sm">🚑</div>
                    <span className="text-xs font-medium">Emergency Vehicle</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-white shadow-sm flex items-center justify-center text-sm">🚧</div>
                    <span className="text-xs font-medium">Roadblock</span>
                  </div>
                </div>
              </div>

              {/* Traffic Section */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Signal Traffic</p>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="relative w-3 h-3 rounded-full bg-success">
                        <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                      </div>
                    </div>
                    <span className="text-xs font-medium">Low Traffic</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="relative w-3 h-3 rounded-full bg-warning">
                        <div className="absolute inset-0 rounded-full bg-warning animate-ping opacity-75" />
                      </div>
                    </div>
                    <span className="text-xs font-medium">Moderate Traffic</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="relative w-3 h-3 rounded-full bg-destructive">
                        <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
                      </div>
                    </div>
                    <span className="text-xs font-medium">Heavy Traffic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 glow-card overflow-hidden min-h-[500px] lg:min-h-[650px] relative border-white/5 shadow-2xl">
          <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full z-0">
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <MapClickHandler />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Render Routes */}
            {(selectedRoute ? suggestedRoutes.filter(r => r.id === selectedRoute) : suggestedRoutes.slice(0, 2)).map(route => (
                <Polyline 
                    key={`route-${route.id}`}
                    positions={route.path}
                    color={getTrafficHexColor(route.traffic)}
                    weight={selectedRoute === route.id ? 8 : 4}
                    opacity={selectedRoute === route.id ? 0.9 : 0.4}
                />
            ))}

            {/* Signal Markers */}
            {displayedMarkers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={trafficIcons[marker.traffic.toLowerCase()] || trafficIcons.low}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold">{marker.name}</p>
                    <p className="text-xs capitalize">{marker.traffic} Traffic</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Alert Markers (Emergency & Roadblocks) */}
            {displayedAlertMarkers.evs.map(ev => (
              <Marker
                key={`ev-${ev.id}`}
                position={[ev.lat, ev.lng]}
                icon={divIcon({
                  className: 'bg-transparent',
                  html: `<div class="w-8 h-8 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-lg animate-bounce-subtle">${ev.type === 'firetruck' ? '🚒' : '🚑'}</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup><div className="font-bold">{(ev.type || '').toUpperCase()}</div><div className="text-xs">{ev.identifier}</div></Popup>
              </Marker>
            ))}
            {displayedAlertMarkers.rbs.map(rb => (
              <Marker
                key={`rb-${rb.id}`}
                position={[rb.lat, rb.lng]}
                icon={divIcon({
                  className: 'bg-transparent',
                  html: `<div class="w-8 h-8 rounded-full bg-yellow-500 border-2 border-white shadow-lg flex items-center justify-center text-lg">🚧</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup><div className="font-bold">Roadblock</div><div className="text-xs">{rb.reason}</div></Popup>
              </Marker>
            ))}

            {/* User & Saved Locations */}
            {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}
            {savedLocations.map(loc => (
              <Marker key={`saved-${loc.id}`} position={[loc.latitude, loc.longitude]} icon={savedLocationIcon}>
                <Popup>
                    <div className="p-2">
                        <p className="font-bold mb-2">{loc.name}</p>
                        <Button variant="destructive" size="sm" className="h-7 text-[10px] w-full" onClick={() => handleDeleteLocation(loc.id)}>Delete</Button>
                    </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <Button 
            className="absolute bottom-6 right-6 z-[400] rounded-full w-12 h-12 p-0 shadow-2xl gradient-bg"
            onClick={handleLocateMe}
          >
            <Locate className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Save Location Modal */}
      {showNameDialog && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-card p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 animate-fade-in">
              <h3 className="font-bold text-xl mb-4">Save Location</h3>
              <Input value={newLocationName} onChange={e => setNewLocationName(e.target.value)} placeholder="e.g. Home, Office" className="mb-6 h-12" autoFocus />
              <div className="flex gap-3">
                <Button variant="outline" onClick={cancelSaveLocation} className="flex-1">Cancel</Button>
                <Button onClick={confirmSaveLocation} disabled={!newLocationName.trim()} className="flex-1 gradient-bg">Save</Button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};
