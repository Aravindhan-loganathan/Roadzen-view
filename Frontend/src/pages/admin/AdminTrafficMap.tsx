import React, { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';

interface Signal {
  id: number;
  name: string;
  lat: number;
  lng: number;
  congestionLevel: 'low' | 'medium' | 'high';
}

export const AdminTrafficMap: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/signals');
        const data = await res.json();
        setSignals(data.filter((s: any) => s.lat && s.lng));
      } catch (e) {
        console.error('Failed to load signals', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, []);

  const trafficIcons = useMemo(() => {
    const makeIcon = (color: string) =>
      divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="relative flex items-center justify-center w-6 h-6">
            <div class="w-3 h-3 rounded-full ${color} animate-pulse"></div>
            <div class="absolute w-3 h-3 rounded-full ${color} animate-ping opacity-60"></div>
          </div>
        `,
        iconSize: [24, 24],
      });

    return {
      low: makeIcon('bg-green-500'),
      medium: makeIcon('bg-yellow-500'),
      high: makeIcon('bg-red-500'),
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-bold">
        Traffic Congestion Overview
      </h1>

      <div className="glow-card overflow-hidden h-[600px]">
        <MapContainer
          center={[13.0827, 80.2707]} // default city center
          zoom={12}
          scrollWheelZoom
          className="w-full h-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {signals.map(signal => (
            <Marker
              key={signal.id}
              position={[signal.lat, signal.lng]}
              icon={trafficIcons[signal.congestionLevel]}
            >
              <Popup>
                <div className="font-sans">
                  <p className="font-semibold">{signal.name}</p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {signal.congestionLevel} congestion
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
