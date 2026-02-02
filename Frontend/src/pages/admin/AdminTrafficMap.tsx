import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Info, Trash2, Save, X, Settings as SettingsIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';

interface Signal {
  id: number;
  name: string;
  lat: number;
  lng: number;
  congestionLevel: 'low' | 'medium' | 'high';
}

// Emergency Vehicle type from backend
interface EmergencyVehicle {
  id: number;
  type: string;
  identifier: string;
  priority: 'low' | 'medium' | 'high';
  lat: number;
  lng: number;
}

// Roadblock type
interface Roadblock {
  id: number;
  reason: string;
  lat: number;
  lng: number;
  is_active?: boolean;
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
  const navigate = useNavigate();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [emergencyVehicles, setEmergencyVehicles] = useState<EmergencyVehicle[]>([]);
  const [roadblocks, setRoadblocks] = useState<Roadblock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newJunction, setNewJunction] = useState<{ lat: number; lng: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', congestionLevel: 'low' as 'low' | 'medium' | 'high' });

  // Roadblock UI state
  const [isAddingRoadblock, setIsAddingRoadblock] = useState(false);
  const [newRoadblock, setNewRoadblock] = useState<{ lat: number; lng: number } | null>(null);
  const [roadblockForm, setRoadblockForm] = useState({ reason: '' });
  const [editingRoadblockId, setEditingRoadblockId] = useState<number | null>(null);
  const [editingRoadblockForm, setEditingRoadblockForm] = useState<{ id?: number; reason?: string; lat?: number; lng?: number; is_active?: boolean } | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Emergency vehicle deleting state
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  // Confirmation state for inline deletion prompt
  const [confirmingDeleteVehicleId, setConfirmingDeleteVehicleId] = useState<number | null>(null);
  // Roadblock deleting state
  const [deletingRoadblockId, setDeletingRoadblockId] = useState<number | null>(null);
  const [isDeletingRoadblock, setIsDeletingRoadblock] = useState(false);
  const [confirmingDeleteRoadblockId, setConfirmingDeleteRoadblockId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Emergency vehicles UI state
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ type: 'ambulance' as 'ambulance' | 'firetruck' | 'police' | 'other', identifier: '', priority: 'medium' as 'low' | 'medium' | 'high' });
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<{ id?: number; type?: string; identifier?: string; priority?: 'low'|'medium'|'high'; lat?: number; lng?: number } | null>(null);
  const [pickingEditLocationId, setPickingEditLocationId] = useState<number | null>(null);
  const [pickingEditRoadblockId, setPickingEditRoadblockId] = useState<number | null>(null);

  // Dashboard summary stats
  const [dashboardStats, setDashboardStats] = useState<{ emergencyVehiclesCount?: number; roadblocksCount?: number; ambulanceCount?: number; firetruckCount?: number; policeCount?: number } | null>(null);

  const fetchDashboardSummary = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDashboardStats({
        emergencyVehiclesCount: data.emergencyVehiclesCount,
        roadblocksCount: data.roadblocksCount,
        ambulanceCount: data.ambulanceCount,
        firetruckCount: data.firetruckCount,
        policeCount: data.policeCount,
      });
    } catch (e) {
      console.error('Dashboard summary load error', e);
    }
  };

  // Fetch emergency vehicles from backend
  const fetchEmergencyVehicles = async () => { 
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/emergency-vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    } catch (e) {
      console.error('Emergency Vehicles Load Error:', e);
    }
  };

  // Delete emergency vehicle (admin action) - no browser confirm, inline spinner
  const handleDeleteEmergency = async (id: number) => {
    setIsDeletingVehicle(true);
    setDeletingVehicleId(id);

    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch(`http://localhost:3000/api/emergency-vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setEmergencyVehicles(prev => prev.filter(e => e.id !== id));
        setSuccess('Emergency vehicle removed');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Removal failed');
      }
    } catch (e) {
      setError('Network error while removing emergency vehicle');
    } finally {
      setIsDeletingVehicle(false);
      setDeletingVehicleId(null);
    }
  };

  // ---- Roadblocks: fetch / create / edit / delete ----
  const fetchRoadblocks = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/roadblocks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped = Array.isArray(data) ? data.map((row: any) => ({
        id: row.id,
        reason: row.reason,
        is_active: row.is_active,
        lat: parseFloat(row.latitude ?? row.lat ?? 0),
        lng: parseFloat(row.longitude ?? row.lng ?? 0),
      })).filter((r: any) => !Number.isNaN(r.lat) && !Number.isNaN(r.lng)) : [];
      setRoadblocks(mapped);
    } catch (e) {
      console.error('Roadblocks Load Error:', e);
    }
  };

  const handleCreateRoadblock = async () => {
    if (!newRoadblock || !roadblockForm.reason) {
      setError('Provide reason and location');
      return;
    }
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/roadblocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: roadblockForm.reason,
          lat: newRoadblock.lat,
          lng: newRoadblock.lng,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const row = created.data || created;
        setRoadblocks(prev => [...prev, {
          id: row.id,
          reason: row.reason,
          lat: parseFloat(row.latitude ?? row.lat ?? newRoadblock.lat),
          lng: parseFloat(row.longitude ?? row.lng ?? newRoadblock.lng),
        }]);
        setNewRoadblock(null);
        setRoadblockForm({ reason: '' });
        setIsAddingRoadblock(false);
        setSuccess('Roadblock deployed');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Deployment failed');
      }
    } catch (e) {
      setError('Network error while deploying roadblock');
    }
  };

  const startEditRoadblock = (rb: Roadblock) => {
    setEditingRoadblockId(rb.id);
    setEditingRoadblockForm({ id: rb.id, reason: rb.reason, lat: rb.lat, lng: rb.lng, is_active: rb.is_active });
    setPickingEditLocationId(null);
  };

  const togglePickLocationForRoadblockEdit = (id: number) => {
    setPickingEditRoadblockId(prev => prev === id ? null : id);
  };

  const handleSaveEditRoadblock = async (id: number) => {
    if (!editingRoadblockForm) return setError('No edits to save');

    // optimistic update
    const previous = roadblocks.find(rb => rb.id === id);
    setRoadblocks(prev => prev.map(rb => rb.id === id ? {
      ...rb,
      reason: editingRoadblockForm.reason ?? rb.reason,
      lat: editingRoadblockForm.lat ?? rb.lat,
      lng: editingRoadblockForm.lng ?? rb.lng,
      is_active: editingRoadblockForm.is_active ?? rb.is_active,
    } : rb));

    try {
      const token = localStorage.getItem('traffic_token');
      const payload = {
        reason: editingRoadblockForm.reason,
        lat: editingRoadblockForm.lat != null ? Number(editingRoadblockForm.lat) : undefined,
        lng: editingRoadblockForm.lng != null ? Number(editingRoadblockForm.lng) : undefined,
        is_active: editingRoadblockForm.is_active,
      };
      console.debug('Updating roadblock', id, payload);
      const res = await fetch(`http://localhost:3000/api/roadblocks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      console.debug('Roadblock update response status', res.status);

      if (res.ok) {
        const data = await res.json();
        const row = data.data || data;
        setRoadblocks(prev => prev.map(rb => rb.id === id ? {
          ...rb,
          reason: row.reason ?? editingRoadblockForm.reason ?? rb.reason,
          lat: parseFloat(row.latitude ?? row.lat ?? editingRoadblockForm.lat ?? rb.lat),
          lng: parseFloat(row.longitude ?? row.lng ?? editingRoadblockForm.lng ?? rb.lng),
          is_active: row.is_active ?? editingRoadblockForm.is_active ?? rb.is_active,
        } : rb));
        setSuccess('Roadblock updated');
        setEditingRoadblockId(null);
        setEditingRoadblockForm(null);
        setPickingEditRoadblockId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Update failed');
        // revert
        if (previous) setRoadblocks(prev => prev.map(rb => rb.id === id ? previous : rb));
      }
    } catch (e) {
      setError('Network error while updating roadblock');
      // revert
      if (previous) setRoadblocks(prev => prev.map(rb => rb.id === id ? previous : rb));
    }

    // ensure back-end sync
    fetchRoadblocks();
  };

  const handleDeleteRoadblock = async (id: number) => {
    setIsDeletingRoadblock(true);
    setDeletingRoadblockId(id);

    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch(`http://localhost:3000/api/roadblocks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRoadblocks(prev => prev.filter(rb => rb.id !== id));
        setSuccess('Roadblock removed');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Removal failed');
      }
    } catch (e) {
      setError('Network error while removing roadblock');
    } finally {
      setIsDeletingRoadblock(false);
      setDeletingRoadblockId(null);
    }
  };

  const handleCreateEmergencyVehicle = async () => {
    if (!newVehicle || !vehicleForm.identifier) {
      setError('Provide identifier and map location');
      return;
    }
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await fetch('http://localhost:3000/api/emergency-vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: vehicleForm.type,
          identifier: vehicleForm.identifier,
          priority: vehicleForm.priority,
          lat: newVehicle.lat,
          lng: newVehicle.lng,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const row = created.data || created;
        setEmergencyVehicles(prev => [...prev, {
          id: row.id,
          type: row.type,
          identifier: row.identifier,
          priority: row.priority,
          lat: parseFloat(row.latitude ?? row.lat ?? newVehicle.lat),
          lng: parseFloat(row.longitude ?? row.lng ?? newVehicle.lng),
        }]);
        setNewVehicle(null);
        setVehicleForm({ type: 'ambulance', identifier: '', priority: 'medium' });
        setIsAddingVehicle(false);
        setSuccess('Emergency vehicle deployed');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Deployment failed');
      }
    } catch (e) {
      setError('Network error while deploying vehicle');
    }
  };

  const startEditVehicle = (ev: EmergencyVehicle) => {
    setEditingVehicleId(ev.id);
    setEditingForm({ id: ev.id, type: ev.type, identifier: ev.identifier, priority: ev.priority, lat: ev.lat, lng: ev.lng });
    setPickingEditLocationId(null);
  };

  const togglePickLocationForEdit = (id: number) => {
    setPickingEditLocationId(prev => prev === id ? null : id);
  };

  const handleSaveEditVehicle = async (id: number) => {
    if (!editingForm) return setError('No edits to save');

    // optimistic UI update
    const previous = emergencyVehicles.find(ev => ev.id === id);
    setEmergencyVehicles(prev => prev.map(ev => ev.id === id ? {
      ...ev,
      type: editingForm.type ?? ev.type,
      identifier: editingForm.identifier ?? ev.identifier,
      priority: editingForm.priority ?? ev.priority,
      lat: editingForm.lat ?? ev.lat,
      lng: editingForm.lng ?? ev.lng,
    } : ev));

    try {
      const token = localStorage.getItem('traffic_token');
      const payload = {
        lat: editingForm.lat != null ? Number(editingForm.lat) : undefined,
        lng: editingForm.lng != null ? Number(editingForm.lng) : undefined,
        priority: editingForm.priority,
        identifier: editingForm.identifier,
        type: editingForm.type,
      };
      console.debug('Updating emergency vehicle', id, payload);
      const res = await fetch(`http://localhost:3000/api/emergency-vehicles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      console.debug('Emergency vehicle update response status', res.status);

      if (res.ok) {
        const data = await res.json();
        const row = data.data || data;
        setEmergencyVehicles(prev => prev.map(ev => ev.id === id ? {
          ...ev,
          type: row.type ?? editingForm.type ?? ev.type,
          identifier: row.identifier ?? editingForm.identifier ?? ev.identifier,
          priority: row.priority ?? editingForm.priority ?? ev.priority,
          lat: parseFloat(row.latitude ?? row.lat ?? editingForm.lat ?? ev.lat),
          lng: parseFloat(row.longitude ?? row.lng ?? editingForm.lng ?? ev.lng),
        } : ev));
        setSuccess('Emergency vehicle updated');
        setEditingVehicleId(null);
        setEditingForm(null);
        setPickingEditLocationId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Update failed');
        // revert
        if (previous) setEmergencyVehicles(prev => prev.map(ev => ev.id === id ? previous : ev));
      }
    } catch (e) {
      setError('Network error while updating vehicle');
      // revert
      if (previous) setEmergencyVehicles(prev => prev.map(ev => ev.id === id ? previous : ev));
    }

    // ensure back-end sync
    fetchEmergencyVehicles();
  };

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
    fetchEmergencyVehicles();
    fetchRoadblocks();
    fetchDashboardSummary();

    // Poll emergency vehicle locations and roadblocks every 5s to simulate live movement
    const pollInterval = setInterval(() => {
      fetchEmergencyVehicles();
      fetchRoadblocks();
      fetchDashboardSummary();
    }, 5000);

    return () => clearInterval(pollInterval);
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

  // Emergency vehicle icons
  const emergencyIcons = useMemo(() => {
    const makeVehicleIcon = (emoji: string, color: string) =>
      divIcon({
        className: 'bg-transparent border-0',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10">
            <div class="w-6 h-6 rounded-full ${color} shadow-[0_0_20px_currentColor] flex items-center justify-center text-sm">${emoji}</div>
            <div class="absolute w-10 h-10 rounded-full ${color} animate-ping opacity-20"></div>
          </div>
        `,
        iconSize: [36, 36],
      });

    return {
      ambulance: makeVehicleIcon('🚑', 'bg-rose-500'),
      fire: makeVehicleIcon('🚒', 'bg-amber-500'),
      police: makeVehicleIcon('🚓', 'bg-sky-500'),
      roadblock: makeVehicleIcon('🚧', 'bg-yellow-500'),
      default: makeVehicleIcon('🚨', 'bg-rose-500'),
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
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tighttext-gray-900 dark:text-white">GRID CONTROL</h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              System Online • {signals.length} Nodes • {emergencyVehicles.length} Emergency Vehicles • {roadblocks.length} Roadblocks
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

          <div className="flex items-center gap-3">
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

            <button 
              onClick={() => {
                setIsAddingVehicle(!isAddingVehicle);
                setNewVehicle(null);
                setEditingVehicleId(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 ${
                isAddingVehicle 
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 hover:bg-rose-500/30 active:scale-95' 
                  : 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] active:scale-95'
              }`}
            >
              {isAddingVehicle ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAddingVehicle ? 'Cancel Mode' : 'Deploy Vehicle'}
            </button>

            <button 
              onClick={() => {
                setIsAddingRoadblock(!isAddingRoadblock);
                setNewRoadblock(null);
                setEditingRoadblockId(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 ${
                isAddingRoadblock 
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 hover:bg-rose-500/30 active:scale-95' 
                  : 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] active:scale-95'
              }`}
            >
              {isAddingRoadblock ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAddingRoadblock ? 'Cancel Mode' : 'Deploy Roadblock'}
            </button>
          </div>
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

            <LocationMarker onMapClick={(lat, lng) => {
              if (isAdding) setNewJunction({ lat, lng });
              if (isAddingVehicle) setNewVehicle({ lat, lng });
              if (isAddingRoadblock) setNewRoadblock({ lat, lng });

              if (pickingEditLocationId) {
                setEditingForm(f => f ? { ...f, lat, lng } : { lat, lng });
                setSuccess('Picked new location for edit');
              }

              if (pickingEditRoadblockId) {
                setEditingRoadblockForm(f => f ? { ...f, lat, lng } : { lat, lng });
                setSuccess('Picked new location for roadblock edit');
              }
            }} />

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
                    
                    <button
                      onClick={() => navigate('/admin/signals', { 
                        state: { 
                          signalId: signal.id,
                          signalName: signal.name,
                          congestionLevel: signal.congestionLevel
                        } 
                      })}
                      className="w-full mb-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded-lg font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <SettingsIcon className="w-3 h-3" />
                      Control Signal
                    </button>
                    
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

            {/* Emergency Vehicles */}
            {emergencyVehicles.map(ev => (
              <Marker
                key={`ev-${ev.id}`}
                position={[ev.lat, ev.lng]}
                icon={
                  // choose icon based on type
                  (emergencyIcons as any)[(ev.type || '').toLowerCase()] || emergencyIcons.default
                }
              >
                <Popup className="custom-popup" offset={[0, -10]} autoClose={false} closeOnClick={false}>
                  <div className="p-3 min-w-[220px] bg-[#0A0C10] text-white">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">VEHICLE</span>
                        <span className="text-[11px] font-mono text-primary">{ev.identifier}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-500">PRIO {ev.priority}</div>
                    </div>

                    <h3 className="text-lg font-bold mb-4">{(ev.type || '').charAt(0).toUpperCase() + (ev.type || '').slice(1)}</h3>

                    {editingVehicleId === ev.id && editingForm ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Designation</label>
                          <input
                            type="text"
                            value={editingForm.identifier}
                            onChange={e => setEditingForm({ ...editingForm, identifier: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500/50 outline-none transition-all placeholder:text-white/10"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Priority</label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {(['low','medium','high'] as const).map(level => (
                              <button
                                key={level}
                                onClick={() => setEditingForm({ ...editingForm, priority: level })}
                                className={`py-2 rounded-lg border text-[9px] font-black transition-all ${
                                  editingForm.priority === level ? (level === 'low' ? 'bg-emerald-500 border-emerald-500 text-black' : level === 'medium' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-rose-500 border-rose-500 text-white') : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                }`}
                              >
                                {level.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coordinates</div>
                          <div className="text-sm font-mono text-primary">{(editingForm.lat ?? ev.lat).toFixed(6)}, {(editingForm.lng ?? ev.lng).toFixed(6)}</div>

                          <div className="pt-2 flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePickLocationForEdit(ev.id); }}
                              className={`flex-1 py-2 ${pickingEditLocationId === ev.id ? 'bg-white/10' : 'bg-white/5'} text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all`}
                            >
                              {pickingEditLocationId === ev.id ? 'Cancel Pick' : 'Pick on Map'}
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleSaveEditVehicle(ev.id); }}
                              className="flex-1 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all"
                            >
                              Save
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingVehicleId(null); setEditingForm(null); setPickingEditLocationId(null); }}
                              className="py-2 px-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coordinates</div>
                        <div className="text-sm font-mono text-primary">{ev.lat.toFixed(6)}, {ev.lng.toFixed(6)}</div>

                        <div className="pt-2 flex gap-3">
                          {confirmingDeleteVehicleId === ev.id ? (
                            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl flex items-center justify-between">
                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Remove?</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDeleteVehicleId(null); }}
                                  className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md text-[10px]"
                                >
                                  NO
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDeleteVehicleId(null); handleDeleteEmergency(ev.id); }}
                                  disabled={isDeletingVehicle && deletingVehicleId === ev.id}
                                  className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-md text-[10px] font-black"
                                >
                                  {isDeletingVehicle && deletingVehicleId === ev.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'YES'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); startEditVehicle(ev); }}
                                className="flex-1 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmingDeleteVehicleId(ev.id); }}
                                className={`flex-1 py-2 ${isDeletingVehicle && deletingVehicleId === ev.id ? 'bg-rose-600/70' : 'bg-rose-500'} text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all`}
                              >
                                {isDeletingVehicle && deletingVehicleId === ev.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Remove'}
                              </button>
                            </>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Roadblocks */}
            {roadblocks.map(rb => (
              <Marker
                key={`rb-${rb.id}`}
                position={[rb.lat, rb.lng]}
                icon={emergencyIcons.roadblock}
              >
                <Popup className="custom-popup" offset={[0, -10]} autoClose={false} closeOnClick={false}>
                  <div className="p-3 min-w-[220px] bg-[#0A0C10] text-white">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">ROADBLOCK</span>
                        <span className="text-[11px] font-mono text-primary">#{rb.id.toString().padStart(4, '0')}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500">BLOCK</div>
                    </div>

                    {editingRoadblockId === rb.id && editingRoadblockForm ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Reason</label>
                          <input
                            type="text"
                            value={editingRoadblockForm.reason}
                            onChange={e => setEditingRoadblockForm({ ...editingRoadblockForm, reason: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-all placeholder:text-white/10"
                          />
                        </div>

                        <div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coordinates</div>
                          <div className="text-sm font-mono text-primary">{(editingRoadblockForm.lat ?? rb.lat).toFixed(6)}, {(editingRoadblockForm.lng ?? rb.lng).toFixed(6)}</div>

                          <div className="pt-2 flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePickLocationForRoadblockEdit(rb.id); }}
                              className={`flex-1 py-2 ${pickingEditRoadblockId === rb.id ? 'bg-white/10' : 'bg-white/5'} text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all`}
                            >
                              {pickingEditRoadblockId === rb.id ? 'Cancel Pick' : 'Pick on Map'}
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleSaveEditRoadblock(rb.id); }}
                              className="flex-1 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all"
                            >
                              Save
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingRoadblockId(null); setEditingRoadblockForm(null); setPickingEditRoadblockId(null); }}
                              className="py-2 px-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reason</div>
                        <div className="text-sm font-mono text-primary">{rb.reason}</div>

                        <div className="pt-2 flex gap-3">
                          {confirmingDeleteRoadblockId === rb.id ? (
                            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl flex items-center justify-between">
                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Remove?</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDeleteRoadblockId(null); }}
                                  className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md text-[10px]"
                                >
                                  NO
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmingDeleteRoadblockId(null); handleDeleteRoadblock(rb.id); }}
                                  disabled={isDeletingRoadblock && deletingRoadblockId === rb.id}
                                  className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-md text-[10px] font-black"
                                >
                                  {isDeletingRoadblock && deletingRoadblockId === rb.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'YES'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); startEditRoadblock(rb); }}
                                className="flex-1 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all"
                              >
                                Edit
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmingDeleteRoadblockId(rb.id); }}
                                className={`flex-1 py-2 ${isDeletingRoadblock && deletingRoadblockId === rb.id ? 'bg-rose-600/70' : 'bg-rose-500'} text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all`}
                              >
                                {isDeletingRoadblock && deletingRoadblockId === rb.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Remove'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
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

          {/* Emergency Deploy Assistant Card */}
          {isAddingVehicle && (
            <div className="absolute top-6 right-6 z-[1000] w-80 animate-in slide-in-from-right duration-500">
              <div className="bg-[#0A0C10]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    EMERGENCY DEPLOY
                  </h2>
                  <button onClick={() => setIsAddingVehicle(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {!newVehicle ? (
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 animate-pulse">
                      <div className="w-8 h-8 text-rose-500 text-2xl">🚑</div>
                    </div>
                    <p className="text-center text-[10px] font-black tracking-widest text-muted-foreground leading-relaxed uppercase">
                      Select target coordinates on the active grid map to set vehicle location.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['ambulance','firetruck','police'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setVehicleForm({ ...vehicleForm, type: t })}
                            className={`py-2 rounded-lg border text-[9px] font-black transition-all ${
                              vehicleForm.type === t ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {t.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Identifier</label>
                      <input
                        type="text"
                        placeholder="E.g., AMB-123"
                        value={vehicleForm.identifier}
                        onChange={e => setVehicleForm({ ...vehicleForm, identifier: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500/50 outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Priority</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['low','medium','high'] as const).map(level => (
                          <button
                            key={level}
                            onClick={() => setVehicleForm({ ...vehicleForm, priority: level })}
                            className={`py-2 rounded-lg border text-[9px] font-black transition-all ${
                              vehicleForm.priority === level ? (level === 'low' ? 'bg-emerald-500 border-emerald-500 text-black' : level === 'medium' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-rose-500 border-rose-500 text-white') : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {level.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1 group hover:border-rose-500/20 transition-colors">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-muted-foreground font-black">LATITUDE</span>
                        <span className="text-primary font-mono">{newVehicle.lat.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-muted-foreground font-black">LONGITUDE</span>
                        <span className="text-primary font-mono">{newVehicle.lng.toFixed(6)}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setNewVehicle(null)}
                        className="flex-1 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        disabled={!vehicleForm.identifier}
                        onClick={handleCreateEmergencyVehicle}
                        className="flex-[2] py-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        Initialize Vehicle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Roadblock Deploy Assistant Card */}
          {isAddingRoadblock && (
            <div className="absolute bottom-6 right-6 z-[1000] w-80 animate-in slide-in-from-bottom duration-500">
              <div className="bg-[#0A0C10]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping" />
                    ROADBLOCK DEPLOY
                  </h2>
                  <button onClick={() => setIsAddingRoadblock(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {!newRoadblock ? (
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 animate-pulse">
                      <div className="w-8 h-8 text-yellow-500 text-2xl">🚧</div>
                    </div>
                    <p className="text-center text-[10px] font-black tracking-widest text-muted-foreground leading-relaxed uppercase">
                      Select the roadblock location on the map to begin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Reason</label>
                      <input
                        type="text"
                        placeholder="Reason for block (e.g., Construction)"
                        value={roadblockForm.reason}
                        onChange={e => setRoadblockForm({ ...roadblockForm, reason: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-500/50 outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1 group hover:border-yellow-500/20 transition-colors">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-muted-foreground font-black">LATITUDE</span>
                        <span className="text-primary font-mono">{newRoadblock.lat.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-muted-foreground font-black">LONGITUDE</span>
                        <span className="text-primary font-mono">{newRoadblock.lng.toFixed(6)}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setNewRoadblock(null)}
                        className="flex-1 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        disabled={!roadblockForm.reason}
                        onClick={handleCreateRoadblock}
                        className="flex-[2] py-3 bg-yellow-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        Initialize Roadblock
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

          {/* Emergency Summary (vehicles & roadblocks) */}
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 shadow-inner">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Emergency Summary</h3>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-[11px] font-black text-white">Emergency Vehicles</div>
                <div className="text-2xl font-black text-primary">{dashboardStats?.emergencyVehiclesCount ?? '—'}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-black text-muted-foreground">AMB</span>
                  <span className="text-[9px] font-mono text-white/70">{dashboardStats?.ambulanceCount ?? 0}</span>
                  <span className="text-[9px] font-black text-muted-foreground ml-3">FIRE</span>
                  <span className="text-[9px] font-mono text-white/70">{dashboardStats?.firetruckCount ?? 0}</span>
                  <span className="text-[9px] font-black text-muted-foreground ml-3">POL</span>
                  <span className="text-[9px] font-mono text-white/70">{dashboardStats?.policeCount ?? 0}</span>
                </div>
              </div>

              <div className="w-1 bg-white/5 h-12" />

              <div className="flex-1">
                <div className="text-[11px] font-black text-white">Roadblocks</div>
                <div className="text-2xl font-black text-yellow-500">{dashboardStats?.roadblocksCount ?? '—'}</div>
                <div className="text-[9px] text-muted-foreground mt-2">Active</div>
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
