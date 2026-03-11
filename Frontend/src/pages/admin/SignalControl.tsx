import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Radio,
  Zap,
  Settings,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { junctions } from '@/data/mockData';
import { useLiveDetection } from '@/contexts/LiveDetectionContext';
import { cn } from '@/lib/utils';

import { API_BASE_URL } from '@/services/apiConfig';

export const SignalControl: React.FC = () => {
  const { state } = useLocation();
  const [autoMode, setAutoMode] = useState(true);
  const [signalTimer, setSignalTimer] = useState([30]);
  
  // Persist selected junction ID
  const [selectedJunction, setSelectedJunction] = useState<number>(() => {
    if (state?.signalId) {
      localStorage.setItem('lastSelectedSignalId', String(state.signalId));
      return state.signalId;
    }
    const saved = localStorage.getItem('lastSelectedSignalId');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [manualSignalState, setManualSignalState] = useState<'Red' | 'Yellow' | 'Green'>('Red');
  const [fetchedData, setFetchedData] = useState<any>(null);

  // Live Detection Context
  const { 
    isModelActive, 
    isLiveStreaming, 
    signalState, 
    congestionLevel: liveCongestion 
  } = useLiveDetection();

  const isDetectionActive = isModelActive || isLiveStreaming;
  const mockJunction = junctions.find(j => j.id === selectedJunction);

  // Fetch signal data for persistence
  useEffect(() => {
    if (selectedJunction) {
      localStorage.setItem('lastSelectedSignalId', String(selectedJunction));
      
      const fetchSignal = async () => {
        try {
           const token = localStorage.getItem('traffic_token');
           const res = await fetch(`${API_BASE_URL}/signals`, {
              headers: { Authorization: `Bearer ${token}` }
           });
           if(res.ok) {
             const data = await res.json();
             const found = data.find((s: any) => s.id === selectedJunction);
             if (found) {
                setFetchedData(found);
                // Sync manual state if found
                if (found.status && ['Red', 'Yellow', 'Green'].includes(found.status)) {
                    setManualSignalState(found.status);
                }
             }
           }
        } catch(e) { console.error('Failed to fetch signal details', e); }
      };
      fetchSignal();
    }
  }, [selectedJunction]);
  
  // Resolve current state logic
  const resolveSignalState = () : 'Red' | 'Yellow' | 'Green' => {
    // Priority 1: Emergency Override (Forces GREEN to clear path)
    if (emergencyOverride) return 'Green';
    
    // Priority 2: Manual Mode
    if (!autoMode) return manualSignalState;
    
    // Priority 3: AI Auto Mode (Live Detection)
    if (isDetectionActive) return signalState;
    
    // Priority 4: Standard Mock/Nav Data (Auto Fallback)
    const level = (state?.congestionLevel || fetchedData?.congestionLevel || mockJunction?.congestionLevel || 'low').toLowerCase();
    if (level === 'high') return 'Red';
    if (level === 'medium') return 'Yellow';
    return 'Green'; // Low congestion = Green
  };

  const currentActiveLight = resolveSignalState();

  const currentJunction = {
    id: selectedJunction,
    name: state?.signalName || fetchedData?.name || mockJunction?.name || 'Traffic Junction',
    congestionLevel: isDetectionActive 
      ? liveCongestion 
      : (state?.congestionLevel || fetchedData?.congestionLevel || mockJunction?.congestionLevel || 'low'),
    countdown: autoMode ? (mockJunction?.countdown || 30) : signalTimer[0], // Use slider in manual
    currentGreen: fetchedData?.currentGreen || mockJunction?.currentGreen || '--'
  };

  // Sync with Backend
  useEffect(() => {
    const updateBackend = async () => {
         try {
             const token = localStorage.getItem('traffic_token');
             
             // Map signal state to congestion level for map display
             let derivedCongestion: string;
             if (currentActiveLight === 'Red') {
               derivedCongestion = 'high';
             } else if (currentActiveLight === 'Yellow') {
               derivedCongestion = 'medium';
             } else {
               derivedCongestion = 'low';
             }
             
             await fetch(`${API_BASE_URL}/signals/${selectedJunction}`, {
                 method: 'PUT',
                 headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                 },
                 body: JSON.stringify({
                     status: currentActiveLight,
                     congestionLevel: derivedCongestion
                 })
             });
             console.log(`Synced signal ${selectedJunction}: ${currentActiveLight} -> ${derivedCongestion}`);
         } catch(e) { console.error('Failed to sync signal state', e); }
    };
    
    // Debounce to avoid excessive updates
    const timer = setTimeout(updateBackend, 500); 
    return () => clearTimeout(timer);
  }, [currentActiveLight, selectedJunction]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Signal Control</h1>
          <p className="text-muted-foreground mt-1">Manage traffic signal timing and modes</p>
        </div>
        {emergencyOverride && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive animate-pulse border border-destructive/20">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Emergency Override Active - Priority Route Cleared</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ... Control Panel ... */}
        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Control Mode
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {autoMode ? (
                    <Play className="w-5 h-5 text-success" />
                  ) : (
                    <Pause className="w-5 h-5 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">{autoMode ? 'Auto Mode' : 'Manual Mode'}</p>
                    <p className="text-sm text-muted-foreground">
                      {autoMode ? 'AI-optimized timing' : 'Manual control enabled'}
                    </p>
                  </div>
                </div>
                <Switch 
                   checked={autoMode} 
                   onCheckedChange={(val) => {
                     setAutoMode(val);
                     if (emergencyOverride) setEmergencyOverride(false); // Disable emergency if switching modes? Optional.
                   }} 
                />
              </div>

              {/* Manual Controls - Visible only in Manual Mode */}
              {!autoMode && !emergencyOverride && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-2">
                   <p className="text-sm font-medium mb-3">Manual Override</p>
                   <div className="flex justify-between gap-2">
                      {['Red', 'Yellow', 'Green'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setManualSignalState(color as 'Red' | 'Yellow' | 'Green')}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-md text-xs font-bold uppercase transition-all",
                            manualSignalState === color 
                              ? color === 'Red' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                              : color === 'Yellow' ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" 
                              : "bg-green-500 text-white shadow-lg shadow-green-500/20"
                              : "bg-card hover:bg-muted border border-border text-muted-foreground"
                          )}
                        >
                          {color}
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Signal Timer */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-4">Signal Timer</h3>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-display font-bold">{signalTimer[0]}</span>
                <span className="text-muted-foreground ml-1">seconds</span>
              </div>
              <Slider
                value={signalTimer}
                onValueChange={setSignalTimer}
                max={120}
                min={10}
                step={5}
                disabled={autoMode} // Timer usually purely automatic in AI mode, but manual in fixed mode
                className={cn("py-4", autoMode && "opacity-50 cursor-not-allowed")}
              />
              <p className="text-sm text-muted-foreground text-center">
                {autoMode ? 'AI optimizes timing automatically' : 'Sets duration for current manual phase'}
              </p>
            </div>
          </div>

          {/* Emergency Override */}
          <div className="glow-card p-6 border-destructive/20">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
              <Zap className="w-5 h-5" />
              Emergency Override
            </h3>
            <Button
              variant={emergencyOverride ? 'destructive' : 'outline'}
              className={cn("w-full transition-all", emergencyOverride && "animate-pulse")}
              onClick={() => {
                const newState = !emergencyOverride;
                setEmergencyOverride(newState);
                if (newState) {
                   setAutoMode(false); // Force manual mode logic essentially
                }
              }}
            >
              {emergencyOverride ? 'DEACTIVATE EMERGENCY' : 'ACTIVATE EMERGENCY'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Forces signal GREEN immediately for priority vehicles
            </p>
          </div>
        </div>

        {/* Signal Visualization */}
        <div className="lg:col-span-2 glow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Junction: {currentJunction.name}</h3>
            <div className="flex items-center gap-2">
              <Radio className={cn("w-4 h-4", emergencyOverride ? "text-destructive" : autoMode ? "text-success" : "text-warning")} />
              <span className="text-sm text-muted-foreground">
                {emergencyOverride ? 'EMERGENCY OVERRIDE' : autoMode ? 'AI Controlled' : 'Manual Control'}
              </span>
            </div>
          </div>

          {/* Large Traffic Signal Display */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className="bg-slate-950 p-4 rounded-3xl border-4 border-slate-800 shadow-2xl flex flex-col gap-4">
              {/* Red Light */}
              <div className={cn("w-16 h-16 rounded-full transition-all duration-500",
                currentActiveLight === 'Red'
                  ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-pulse' 
                  : 'bg-red-950/20 opacity-30'
              )} />
              
              {/* Yellow Light */}
              <div className={cn("w-16 h-16 rounded-full transition-all duration-500",
                currentActiveLight === 'Yellow'
                  ? 'bg-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6)] animate-pulse' 
                  : 'bg-yellow-900/10 opacity-30'
              )} />
              
              {/* Green Light */}
              <div className={cn("w-16 h-16 rounded-full transition-all duration-500",
                currentActiveLight === 'Green'
                  ? 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.6)] animate-pulse' 
                  : 'bg-emerald-950/10 opacity-30'
              )} />
            </div>

            <div className="mt-8 text-center space-y-4">
              {/* Signal Command */}
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <h2 className={cn("text-5xl font-display font-bold uppercase tracking-widest",
                   emergencyOverride ? 'text-blue-500 animate-pulse' :
                   currentActiveLight === 'Red' ? 'text-red-500' :
                   currentActiveLight === 'Yellow' ? 'text-yellow-400' : 
                   'text-emerald-500'
                )}>
                  {emergencyOverride ? 'PRIORITY' :
                   currentActiveLight === 'Green' ? 'GO' : 
                   currentActiveLight === 'Yellow' ? 'SLOW' : 
                   'STOP'}
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-[0.2em]">Signal Command</p>
              </div>

              {/* Congestion Status (Separated) */}
              <div className="flex items-center justify-center gap-3">
                 <div className={cn("w-2 h-2 rounded-full",
                    currentJunction.congestionLevel.toLowerCase() === 'low' ? 'bg-emerald-500' :
                    currentJunction.congestionLevel.toLowerCase() === 'medium' ? 'bg-yellow-500' : 
                    currentJunction.congestionLevel.toLowerCase() === 'high' ? 'bg-red-500' : 'bg-gray-500'
                 )} />
                 <p className="text-lg font-medium text-foreground">
                    {/* If Live Detection is Off, check Mock/Nav. If On, use Live Data */}
                    {!isDetectionActive && !state 
                       ? 'Waiting for Live Feed...' 
                       : `${currentJunction.congestionLevel.toUpperCase()} CONGESTION`
                    }
                 </p>
              </div>
            </div>

            {/* Countdown Display */}
            <div className="mt-6">
               <div className="bg-black border border-white/10 rounded-lg px-6 py-3">
                  <span className="font-mono text-5xl font-bold text-orange-500 tracking-wider">
                    {currentJunction.countdown?.toString().padStart(2, '0') || '30'}
                  </span>
                  <span className="text-xs text-orange-500/50 ml-1">s</span>
               </div>
            </div>
          </div>

          {/* Current Active Lane */}
          <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/30 text-center">
            <p className="text-sm text-muted-foreground">Current Active Lane</p>
            <p className="text-2xl font-display font-bold text-success">{currentJunction.currentGreen}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
