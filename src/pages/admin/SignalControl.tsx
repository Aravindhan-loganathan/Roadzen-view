import React, { useState } from 'react';
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
import { TrafficSignal } from '@/components/ui/TrafficSignal';
import { junctions } from '@/data/mockData';

export const SignalControl: React.FC = () => {
  const [autoMode, setAutoMode] = useState(true);
  const [signalTimer, setSignalTimer] = useState([30]);
  const [selectedJunction, setSelectedJunction] = useState(1);
  const [emergencyOverride, setEmergencyOverride] = useState(false);

  const currentJunction = junctions.find(j => j.id === selectedJunction) || junctions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Signal Control</h1>
          <p className="text-muted-foreground mt-1">Manage traffic signal timing and modes</p>
        </div>
        {emergencyOverride && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive animate-pulse">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Emergency Override Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
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
                <Switch checked={autoMode} onCheckedChange={setAutoMode} />
              </div>
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
                max={60}
                min={10}
                step={5}
                disabled={autoMode}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">
                {autoMode ? 'Disable auto mode to adjust timer' : 'Drag to set green signal duration'}
              </p>
            </div>
          </div>

          {/* Emergency Override */}
          <div className="glow-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              Emergency Override
            </h3>
            <Button
              variant={emergencyOverride ? 'destructive' : 'outline'}
              className="w-full"
              onClick={() => setEmergencyOverride(!emergencyOverride)}
            >
              {emergencyOverride ? 'Deactivate Override' : 'Activate Emergency Override'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Forces all signals to provide priority route
            </p>
          </div>
        </div>

        {/* Signal Visualization */}
        <div className="lg:col-span-2 glow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Junction: {currentJunction.name}</h3>
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${autoMode ? 'text-success' : 'text-warning'}`} />
              <span className="text-sm text-muted-foreground">
                {autoMode ? 'AI Controlled' : 'Manual'}
              </span>
            </div>
          </div>

          {/* Junction Selector */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {junctions.slice(0, 4).map((junction) => (
              <button
                key={junction.id}
                onClick={() => setSelectedJunction(junction.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedJunction === junction.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {junction.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* LED Signal Status Simulation */}
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Intersection Background */}
            <div className="absolute inset-0 bg-muted/30 rounded-xl">
              {/* Roads */}
              <div className="absolute left-1/2 top-0 bottom-0 w-20 -translate-x-1/2 bg-muted/50" />
              <div className="absolute top-1/2 left-0 right-0 h-20 -translate-y-1/2 bg-muted/50" />
              
              {/* Center */}
              <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground text-center">Junction<br/>Center</span>
              </div>
            </div>

            {/* Traffic Signals at each direction */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="text-center mb-2">
                <span className="text-xs font-medium">NORTH</span>
              </div>
              <TrafficSignal
                initialState={currentJunction.currentGreen === 'North' ? 'green' : 'red'}
                countdown={currentJunction.countdown}
              />
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <TrafficSignal
                initialState={currentJunction.currentGreen === 'South' ? 'green' : 'red'}
                countdown={currentJunction.countdown}
              />
              <div className="text-center mt-2">
                <span className="text-xs font-medium">SOUTH</span>
              </div>
            </div>

            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-xs font-medium">WEST</span>
                </div>
                <TrafficSignal
                  initialState={currentJunction.currentGreen === 'West' ? 'green' : 'red'}
                  countdown={currentJunction.countdown}
                />
              </div>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2">
                <TrafficSignal
                  initialState={currentJunction.currentGreen === 'East' ? 'green' : 'red'}
                  countdown={currentJunction.countdown}
                />
                <div className="text-left">
                  <span className="text-xs font-medium">EAST</span>
                </div>
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
