import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Plus, Info, Trash2, Save, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';

interface Signal {
  id: number;
  name: string;
  lat: number;
  lng: number;
  congestionLevel: 'low' | 'medium' | 'high';
}

const LocationMarker = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const AdminTrafficMap: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newJunction, setNewJunction] = useState<{ lat: number; lng: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', congestionLevel: 'low' as 'low' | 'medium' | 'high' });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSignals = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/signals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSignals(Array.isArray(data) ? data.filter((s: any) => s.lat && s.lng) : []);
    } catch (e) {
      console.error('Signals Load Error:', e);
      setError('Failed to synchronize with traffic grid');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleUpdateCongestion = async (id: number, level: string) => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch(`http://localhost:3000/api/signals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ congestionLevel: level }),
      });
      if (res.ok) {
        setSignals(signals.map(s => s.id === id ? { ...s, congestionLevel: level as any } : s));
        setSuccess('Traffic density updated');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Update failed');
      }
    } catch (e) {
      setError('Connection failure');
    }
  };

  const handleDeleteSignal = async (id: number) => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch(`http://localhost:3000/api/signals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setSignals(prev => prev.filter(s => s.id !== id));
        setDeletingId(null);
        setSuccess('Junction decommissioned');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Decommission failed');
      }
    } catch (e) {
      setError('Network synchronization error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateJunction = async () => {
    if (!newJunction || !formData.name) return;
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          lat: newJunction.lat,
          lng: newJunction.lng,
          congestionLevel: formData.congestionLevel,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setSignals(prev => [...prev, created]);
        setNewJunction(null);
        setFormData({ name: '', congestionLevel: 'low' });
        setIsAdding(false);
        setSuccess('Junction deployed successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Deployment aborted');
      }
    } catch (e) {
      setError('Deployment network error');
    }
  };

  const trafficIcons = useMemo(() => {
    const makeIcon = (color: string) =>
      divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="w-4 h-4 rounded-full ${color} shadow-[0_0_15px_currentColor] animate-pulse"></div>
            <div class="absolute w-6 h-6 rounded-full ${color} animate-ping opacity-20"></div>
          </div>
        `,
        iconSize: [32, 32],
      });

    return {
      low: makeIcon('bg-emerald-500'),
      medium: makeIcon('bg-amber-500'),
      high: makeIcon('bg-rose-500'),
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-[#0A0C10]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-primary font-display font-bold animate-pulse tracking-widest uppercase text-xs">Initializing Grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-80px)] space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight text-white">GRID CONTROL</h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              System Online • {signals.length} Nodes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="flex items-center gap-2 mr-4">
            {error && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right duration-300">
                {error}
              </div>
            )}
            {success && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right duration-300">
                {success}
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setNewJunction(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 ${
              isAdding 
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 hover:bg-rose-500/30 active:scale-95' 
                : 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] active:scale-95'
            }`}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancel Mode' : 'Deploy Junction'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 p-2">
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative bg-slate-950">
          <MapContainer
            center={[13.0827, 80.2707]}
            zoom={12}
            scrollWheelZoom
            className={`w-full h-full ${isAdding ? 'cursor-crosshair' : ''}`}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <LocationMarker onMapClick={(lat, lng) => isAdding && setNewJunction({ lat, lng })} />

            {signals.map(signal => (
              <Marker
                key={signal.id}
                position={[signal.lat, signal.lng]}
                icon={trafficIcons[signal.congestionLevel]}
              >
                <Popup className="custom-popup" offset={[0, -10]}>
                  <div className="p-3 min-w-[240px] bg-[#0A0C10] text-white">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">NODE ID</span>
                        <span className="text-[11px] font-mono text-primary">#{signal.id.toString().padStart(4, '0')}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        signal.congestionLevel === 'low' ? 'bg-emerald-500/10 text-emerald-500' :
                        signal.congestionLevel === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                        {signal.congestionLevel} Density
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-4">{signal.name}</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-3 tracking-widest">Adjust Capacity</p>
                        <div className="flex gap-2">
                          {(['low', 'medium', 'high'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => handleUpdateCongestion(signal.id, level)}
                              className={`flex-1 py-2 text-[9px] font-black rounded-lg border transition-all ${
                                signal.congestionLevel === level 
                                  ? level === 'low' ? 'bg-emerald-500 text-black border-emerald-500' : 
                                    level === 'medium' ? 'bg-amber-500 text-black border-amber-500' : 
                                    'bg-rose-500 text-white border-rose-500'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/40'
                              }`}
                            >
                              {level.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                        {deletingId === signal.id ? (
                          <div 
                            className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl flex items-center justify-between animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Decommission?</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSignal(signal.id);
                                }}
                                className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-md text-[10px] font-black"
                              >
                                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'YES'}
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                                className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md text-[10px]"
                              >
                                NO
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              // CRITICAL: Stop propagation to keep popup open
                              e.stopPropagation();
                              setDeletingId(signal.id);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors text-[10px] font-black uppercase tracking-widest group"
                          >
                            <Trash2 className="w-4 h-4 group-hover:animate-bounce pointer-events-none" />
                            Decommission Junction
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {newJunction && (
              <Marker position={[newJunction.lat, newJunction.lng]}>
                <Popup autoClose={false} closeOnClick={false} className="deployment-popup">
                  <div className="px-3 py-1 bg-primary text-white rounded-full text-[9px] font-black uppercase shadow-2xl animate-bounce">
                    Target Set
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Deployment Assistant Card */}
          {isAdding && (
            <div className="absolute top-6 left-6 z-[1000] w-80 animate-in slide-in-from-left duration-500">
              <div className="bg-[#0A0C10]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                    DEPLOYMENT
                  </h2>
                  <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {!newJunction ? (
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
                      <Navigation className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-center text-[10px] font-black tracking-widest text-muted-foreground leading-relaxed uppercase">
                      Select target coordinates on the active grid map to begin deployment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Designation</label>
                      <input 
                        type="text" 
                        placeholder="NAME OF INTERSECTION"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Load Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['low', 'medium', 'high'] as const).map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData({ ...formData, congestionLevel: level })}
                            className={`py-2 rounded-lg border text-[9px] font-black transition-all ${
                              formData.congestionLevel === level 
                              ? 'bg-primary border-primary text-white' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {level.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1 group hover:border-primary/20 transition-colors">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-muted-foreground font-black">LATITUDE</span>
                        <span className="text-primary font-mono">{newJunction.lat.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-muted-foreground font-black">LONGITUDE</span>
                        <span className="text-primary font-mono">{newJunction.lng.toFixed(6)}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button 
                        onClick={() => setNewJunction(null)}
                        className="flex-1 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
                      >
                        Reset
                      </button>
                      <button 
                        disabled={!formData.name}
                        onClick={handleCreateJunction}
                        className="flex-[2] py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        Initialize
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Statistics */}
        <div className="space-y-4">
          <div className="bg-[#0A0C10] border border-white/5 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xs font-black tracking-[0.3em] uppercase mb-8 text-primary">REAL-TIME TELEMETRY</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active System Nodes</span>
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-black text-white">{signals.length}</span>
                  <Activity className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(signals.length / 50) * 100}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-6 border-t border-white/5">
                {[
                  { label: 'HIGH LOAD', val: signals.filter(s => s.congestionLevel === 'high').length, color: 'text-rose-500', bg: 'bg-rose-500' },
                  { label: 'MODERATE', val: signals.filter(s => s.congestionLevel === 'medium').length, color: 'text-amber-500', bg: 'bg-amber-500' },
                  { label: 'EFFICIENT', val: signals.filter(s => s.congestionLevel === 'low').length, color: 'text-emerald-500', bg: 'bg-emerald-500' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 p-4 rounded-xl flex items-center justify-between group transition-all hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${stat.bg} shadow-[0_0_8px_currentColor]`} />
                      <span className="text-[10px] font-black tracking-widest text-muted-foreground group-hover:text-white transition-colors">{stat.label}</span>
                    </div>
                    <span className={`text-xl font-black ${stat.color}`}>{stat.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col gap-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
              <Shield className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Security Protocol</h3>
            <p className="text-[10px] text-white/50 leading-relaxed font-bold uppercase tracking-tight">
              Grid modifications require administrative elevation. Node deployment is permanent until manually decommissioned. 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Help icons
const Activity = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const Settings = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.74l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const Shield = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const Navigation = (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>;

// Helper SVG Icon
const MarkerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
