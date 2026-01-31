import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  traffic: string;
}

export interface RouteInfo {
  id: number;
  name: string;
  time: string;
  distance: string;
  traffic: string;
  path: [number, number][];
  penalty?: number;
  signalIds: number[];
}

interface MapContextType {
  source: string;
  setSource: (s: string) => void;
  destination: string;
  setDestination: (d: string) => void;
  suggestedRoutes: RouteInfo[];
  setSuggestedRoutes: (routes: RouteInfo[]) => void;
  selectedRoute: number | null;
  setSelectedRoute: (id: number | null) => void;
  showRoutes: boolean;
  setShowRoutes: (show: boolean) => void;
  markers: MapMarker[];
  setMarkers: (markers: MapMarker[]) => void;
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [source, setSource] = useState('Anna Salai Junction');
  const [destination, setDestination] = useState('Tidel Park Signal');
  const [suggestedRoutes, setSuggestedRoutes] = useState<RouteInfo[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.03, 80.24]);
  const [mapZoom, setMapZoom] = useState(12);

  return (
    <MapContext.Provider value={{
      source, setSource,
      destination, setDestination,
      suggestedRoutes, setSuggestedRoutes,
      selectedRoute, setSelectedRoute,
      showRoutes, setShowRoutes,
      markers, setMarkers,
      mapCenter, setMapCenter,
      mapZoom, setMapZoom
    }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};
