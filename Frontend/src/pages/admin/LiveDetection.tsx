import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Upload,
  Trash2,
  Activity,
  Car,
  Bike,
  Bus,
  Truck,
  Ambulance,
  Cpu,
  Wifi,
  WifiOff,
  FileVideo,
  Settings,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Detection {
  id?: number;
  label: string;
  conf: number;
  box: [number, number, number, number]; // [x, y, w, h] in percentages (0-1)
}

interface VehicleCounts {
  car: number;
  bike: number;
  bus: number;
  truck: number;
  ambulance: number;
}

const initialCounts: VehicleCounts = { car: 0, bike: 0, bus: 0, truck: 0, ambulance: 0 };

export const LiveDetection: React.FC = () => {
  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Detection State
  const [isModelActive, setIsModelActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  
  // Stats State
  const [currentCounts, setCurrentCounts] = useState<VehicleCounts>(initialCounts);
  const [totalCounts, setTotalCounts] = useState<VehicleCounts>(initialCounts);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const totalCountsRef = useRef<VehicleCounts>(initialCounts); // Ref to avoid dependency loops
  const idMapping = useRef<Map<number, number>>(new Map());
  const nextId = useRef(1);

  const { toast } = useToast();

  // --- Video Handlers ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      resetStats();
      setIsPlaying(false);
      setProgress(0);
      toast({
        title: "Video Loaded",
        description: "Ready to play. Enable 'Model Connected' for detection.",
      });
    }
  };

  const handleClearVideo = () => {
    if (videoSource) {
      URL.revokeObjectURL(videoSource);
      setVideoSource(null);
      resetStats();
      setIsPlaying(false);
      setIsModelActive(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetStats = () => {
    setDetections([]);
    setCurrentCounts(initialCounts);
    setTotalCounts(initialCounts);
    totalCountsRef.current = initialCounts;
    seenIds.current.clear();
    idMapping.current.clear();
    nextId.current = 1;
    setFps(0);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(curr);
      if (dur > 0) {
        setProgress((curr / dur) * 100);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      const newTime = (value[0] / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(value[0]);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Canvas Drawing ---

  const getClassColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'car': return '#3b82f6'; // primary
      case 'bike': 
      case 'motorcycle': return '#22c55e'; // success
      case 'bus': return '#eab308'; // warning
      case 'truck': return '#64748b'; // muted
      case 'ambulance': return '#ef4444'; // destructive
      default: return '#3b82f6';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(det => {
      const [x, y, w, h] = det.box;
      const color = getClassColor(det.label);
      
      const sx = x * canvas.width;
      const sy = y * canvas.height;
      const sw = w * canvas.width;
      const sh = h * canvas.height;

      // Draw Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // Draw Label
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      const idText = det.id ? `ID:${det.id} ` : '';
      const text = `${idText}${det.label} ${Math.round(det.conf * 100)}%`;
      const textMetrics = ctx.measureText(text);
      ctx.fillRect(sx, sy - 20, textMetrics.width + 10, 20);

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(text, sx + 5, sy - 6);
    });
  }, [detections]);

  // --- WebSocket & Inference ---

  useEffect(() => {
    if (!isModelActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket('ws://localhost:8000/ws/detection');
    wsRef.current = ws;
    let animationFrameId: number;

    ws.onopen = () => {
      console.log('Connected to Model Stream');
      toast({ title: "Connected", description: "Streaming to inference server..." });
      sendFrames();
    };

    const sendFrames = () => {
      if (ws.readyState !== WebSocket.OPEN) return;

      // Only send frames if video is playing and not ended
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const video = videoRef.current;
        
        // Maintain aspect ratio for model input (max 640)
        const scale = 640 / video.videoWidth;
        const w = Math.floor(video.videoWidth * scale);
        const h = Math.floor(video.videoHeight * scale);

        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        
        if (offscreenCanvasRef.current.width !== w || offscreenCanvasRef.current.height !== h) {
          offscreenCanvasRef.current.width = w;
          offscreenCanvasRef.current.height = h;
        }
        
        const ctx = offscreenCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          offscreenCanvasRef.current.toBlob((blob) => {
            // Prevent network congestion
            if (blob && ws.readyState === WebSocket.OPEN && ws.bufferedAmount === 0) {
              ws.send(blob);
            }
          }, 'image/jpeg', 0.6);
        }
      }
      
      animationFrameId = requestAnimationFrame(sendFrames);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.detections) {
          setDetections(data.detections);
          
          // Calculate stats
          const current = { ...initialCounts };
          let newUniqueDetected = false;
          const newTotal = { ...totalCountsRef.current };

          data.detections.forEach((det: Detection) => {
            const label = det.label.toLowerCase();
            const key = (label === 'motorcycle' ? 'bike' : label) as keyof VehicleCounts;
            
            // Map Backend ID to Frontend ID (1...N)
            let displayId = det.id;
            if (det.id !== undefined) {
              if (!idMapping.current.has(det.id)) {
                idMapping.current.set(det.id, nextId.current++);
              }
              displayId = idMapping.current.get(det.id);
              // Update detection object for rendering
              det.id = displayId;
            }

            // Update Live Count (Current Frame)
            if (current[key] !== undefined) current[key]++;

            // Update Total Count (Unique IDs)
            if (displayId !== undefined && !seenIds.current.has(displayId)) {
              seenIds.current.add(displayId);
              if (newTotal[key] !== undefined) newTotal[key]++;
              newUniqueDetected = true;
            }
          });

          setCurrentCounts(current);
          
          if (newUniqueDetected) {
            setTotalCounts(newTotal);
            totalCountsRef.current = newTotal;
          }
        }
        
        if (data.fps) setFps(data.fps);
      } catch (e) {
        console.error('Error parsing detection data', e);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket Error");
      toast({ 
        title: "Connection Failed", 
        description: "Could not connect to inference server.", 
        variant: "destructive" 
      });
      setIsModelActive(false);
    };

    ws.onclose = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isModelActive]);

  const vehicleTypes = [
    { type: 'Car', key: 'car', icon: Car, color: 'text-primary' },
    { type: 'Bike', key: 'bike', icon: Bike, color: 'text-success' },
    { type: 'Bus', key: 'bus', icon: Bus, color: 'text-warning' },
    { type: 'Truck', key: 'truck', icon: Truck, color: 'text-muted-foreground' },
    { type: 'Ambulance', key: 'ambulance', icon: Ambulance, color: 'text-destructive' },
  ];

  const totalDetected = Object.values(totalCounts).reduce((a, b) => a + b, 0);
  const currentDetected = Object.values(currentCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Live Detection
          </h1>
          <p className="text-muted-foreground mt-1">Real-time AI vehicle tracking and counting</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="video/*"
            onChange={handleFileUpload}
          />
          
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
            <Switch 
              id="model-toggle" 
              checked={isModelActive}
              onCheckedChange={setIsModelActive}
              disabled={!videoSource}
            />
            <Label htmlFor="model-toggle" className={cn("cursor-pointer flex items-center gap-2 text-sm font-medium", !videoSource && "opacity-50")}>
              {isModelActive ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
              {isModelActive ? 'Model Active' : 'Model Offline'}
            </Label>
          </div>

          {videoSource ? (
            <Button variant="destructive" size="sm" onClick={handleClearVideo} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Video
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Video Player Section */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="relative w-full h-full bg-black/90 rounded-xl overflow-hidden shadow-2xl border border-border/50 group">
            <div 
              ref={containerRef} 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              {videoSource ? (
                <video
                  ref={videoRef}
                  src={videoSource}
                  className="w-full h-full object-fill"
                  playsInline
                  crossOrigin="anonymous"
                  muted={isMuted}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleVideoLoaded}
                  onEnded={handleVideoEnded}
                />
              ) : (
                <div className="text-center p-10">
                  <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                    <FileVideo className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">No Video Source</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                    Upload a video file to start detection. The AI model will process frames in real-time.
                  </p>
                  <Button variant="outline" className="mt-6 gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                    Select File
                  </Button>
                </div>
              )}
              
              {/* Canvas Overlay */}
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            </div>

            {/* Custom Controls Overlay */}
            {videoSource && (
              <div 
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <Slider
                    value={[progress]}
                    max={100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    
                    <div className="flex items-center gap-2 group/vol">
                      <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>

                    <span className="text-white/80 text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {isModelActive && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                        <Cpu className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-xs text-white font-mono">{fps} FPS</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Panel */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* Total Count Card */}
          <div className="glow-card p-4 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Total Detected</h3>
                  <p className="text-xs text-muted-foreground">Cumulative unique count</p>
                </div>
              </div>
              <AnimatedCounter
                end={totalDetected}
                className="text-4xl font-display font-bold gradient-text"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">In Frame</p>
                <p className="text-xl font-bold">{currentDetected}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">FPS</p>
                <p className="text-xl font-bold">{fps}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Breakdown */}
          <div className="glow-card p-0 bg-card/50 backdrop-blur-sm">
            <div className="p-3 border-b border-border/50 bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Classification
              </h3>
            </div>
            <div className="divide-y divide-border/50">
              {vehicleTypes.map(({ type, key, icon: Icon, color }) => (
                <div key={type} className="p-2 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-lg bg-muted transition-colors group-hover:bg-white/10", color.replace('text-', 'bg-').replace('foreground', '') + '/10')}>
                        <Icon className={cn("w-5 h-5", color)} />
                      </div>
                      <div>
                        <span className="font-medium block">{type}</span>
                        <span className="text-xs text-muted-foreground">
                          {currentCounts[key as keyof VehicleCounts]} in frame
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold font-mono block">
                        {totalCounts[key as keyof VehicleCounts]}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar for visual ratio */}
                  <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", color.replace('text-', 'bg-'))}
                      style={{ width: `${totalDetected > 0 ? (totalCounts[key as keyof VehicleCounts] / totalDetected) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
