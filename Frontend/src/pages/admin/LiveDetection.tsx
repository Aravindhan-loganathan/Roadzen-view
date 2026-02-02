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
  Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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
  auto: number;
}

const initialCounts: VehicleCounts = { car: 0, bike: 0, bus: 0, truck: 0, auto: 0 };

export const LiveDetection: React.FC = () => {
  // Video State (Offline)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Online / Mode State
  const [isOnline, setIsOnline] = useState(false);
  const [liveUrl, setLiveUrl] = useState(''); // Stores the input URL
  const [isLiveStreaming, setIsLiveStreaming] = useState(false); // Controls <img src>

  // General Detection State
  const [isModelActive, setIsModelActive] = useState(false); // used for offline toggle
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
  const totalCountsRef = useRef<VehicleCounts>(initialCounts);
  const idMapping = useRef<Map<number, number>>(new Map());
  const nextId = useRef(1);

  const { toast } = useToast();

  // --- Helpers ---
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

  const getClassColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'car': return '#3b82f6';
      case 'bike':
      case 'motorcycle': return '#22c55e';
      case 'bus': return '#eab308';
      case 'truck': return '#64748b';
      case 'auto':
      case 'rickshaw': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const updateStats = (dataDetections: Detection[]) => {
    const current = { ...initialCounts };
    let newUniqueDetected = false;
    const newTotal = { ...totalCountsRef.current };

    dataDetections.forEach((det: Detection) => {
      const label = det.label.toLowerCase();
      let key: keyof VehicleCounts | undefined;

      if (label === 'motorcycle' || label === 'bike') key = 'bike';
      else if (label === 'auto' || label === 'rickshaw') key = 'auto';
      else if (['car', 'bus', 'truck'].includes(label)) key = label as keyof VehicleCounts;

      let displayId = det.id;
      if (det.id !== undefined) {
        if (!idMapping.current.has(det.id)) {
          idMapping.current.set(det.id, nextId.current++);
        }
        displayId = idMapping.current.get(det.id);
        det.id = displayId;
      }

      if (key && current[key] !== undefined) current[key]++;
      if (displayId !== undefined && !seenIds.current.has(displayId)) {
        seenIds.current.add(displayId);
        if (key && newTotal[key] !== undefined) newTotal[key]++;
        newUniqueDetected = true;
      }
    });

    setCurrentCounts(current);
    if (newUniqueDetected) {
      setTotalCounts(newTotal);
      totalCountsRef.current = newTotal;
    }
  };

  // --- Offline Mode Logic ---

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
    }
    setVideoSource(null);
    resetStats();
    setIsPlaying(false);
    setIsModelActive(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  // Offline: WebSocket & Inference Loop
  useEffect(() => {
    if (isOnline) return; // Do not run offline logic if isOnline is true

    if (!isModelActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket('ws://localhost:8000/ws/detection'); // Keep original offline endpoint
    wsRef.current = ws;
    let animationFrameId: number;

    ws.onopen = () => {
      console.log('Connected to Offline Model Stream');
      sendFrames();
    };

    const sendFrames = () => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const now = Date.now();
      const lastSendTime = (ws as any)._lastSendTime || 0;

      // Limit to ~30 FPS
      if (now - lastSendTime < 33) {
        animationFrameId = requestAnimationFrame(sendFrames);
        return;
      }

      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const video = videoRef.current;
        // Optimization: limit resolution sent to backend
        const scale = 480 / video.videoWidth;
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
            if (blob && ws.readyState === WebSocket.OPEN && ws.bufferedAmount === 0) {
              ws.send(blob);
              (ws as any)._lastSendTime = now;
            }
          }, 'image/jpeg', 0.5);
        }
      }

      animationFrameId = requestAnimationFrame(sendFrames);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.detections) {
          setDetections(data.detections);
          updateStats(data.detections);
        }
        if (data.fps) setFps(data.fps);
      } catch (e) {
        console.error('Error parsing detection data', e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isModelActive, isOnline]);

  // Offline: Canvas Drawing Effect
  useEffect(() => {
    if (isOnline) return; // Only for offline mode

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
  }, [detections, isOnline]);


  // --- Online Mode Logic ---

  const handleStartStopLive = () => {
    if (isLiveStreaming) {
      // Stop
      setIsLiveStreaming(false);
      // setDetections([]); // Optional: keep last frame? better to clear 
      setFps(0);
    } else {
      // Start
      if (!liveUrl) {
        toast({ title: "Error", description: "Please enter a valid RTSP/HTTP URL", variant: "destructive" });
        return;
      }
      // resetStats(); // Maybe don't reset total stats? User choice. Let's reset for fresh start.
      resetStats();
      setIsLiveStreaming(true);
    }
  };

  // Effect to clean up streaming state if we toggle Offline
  useEffect(() => {
    if (!isOnline) {
      setIsLiveStreaming(false);
    }
  }, [isOnline]);

  // --- Vehicle Types Config ---
  const vehicleTypes = [
    { type: 'Car', key: 'car', icon: Car, color: 'text-primary' },
    { type: 'Bike', key: 'bike', icon: Bike, color: 'text-success' },
    { type: 'Bus', key: 'bus', icon: Bus, color: 'text-warning' },
    { type: 'Truck', key: 'truck', icon: Truck, color: 'text-muted-foreground' },
    { type: 'Auto', key: 'auto', icon: Ambulance, color: 'text-destructive' },
  ];

  const totalDetected = vehicleTypes.reduce((acc, type) => acc + totalCounts[type.key as keyof VehicleCounts], 0);
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

        {/* Unified Controls */}
        <div className="flex items-center gap-4">
          {/* Mode Switch */}
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
            <span className={cn("text-xs font-bold", !isOnline ? "text-primary" : "text-muted-foreground")}>OFFLINE</span>
            <Switch
              id="mode-toggle"
              checked={isOnline}
              onCheckedChange={(val) => {
                setIsOnline(val);
                // Reset everything when mode changes
                setIsModelActive(false);
                setIsLiveStreaming(false);
                handleClearVideo();
              }}
            />
            <span className={cn("text-xs font-bold", isOnline ? "text-primary" : "text-muted-foreground")}>ONLINE</span>
          </div>

          {/* Conditional Controls per Mode */}
          {!isOnline ? (
            // OFFLINE CONTROLS
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*"
                onChange={handleFileUpload}
              />
              <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
                <Switch
                  id="offline-model-toggle"
                  checked={isModelActive}
                  onCheckedChange={setIsModelActive}
                  disabled={!videoSource}
                />
                <Label htmlFor="offline-model-toggle" className={cn("cursor-pointer flex items-center gap-2 text-sm font-medium", !videoSource && "opacity-50")}>
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
            </>
          ) : (
            // ONLINE CONTROLS
            <>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter RTSP/HTTP URL"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className="w-64 h-9"
                  disabled={isLiveStreaming}
                />
                <Button
                  size="sm"
                  variant={isLiveStreaming ? "destructive" : "default"}
                  onClick={handleStartStopLive}
                >
                  {isLiveStreaming ? "Stop Detection" : "Start Detection"}
                </Button>
              </div>
            </>
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
              onClick={!isOnline ? togglePlay : undefined} // Only toggle play if offline
            >

              {!isOnline ? (
                // OFFLINE VIEW
                videoSource ? (
                  <video
                    ref={videoRef}
                    src={videoSource}
                    className="w-full h-full object-contain"
                    playsInline
                    crossOrigin="anonymous"
                    muted={isMuted}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                        if (videoRef.current.duration > 0) setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                      }
                    }}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onEnded={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className="text-center p-10">
                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <FileVideo className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Offline Analysis</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                      Upload a video file to run detection on pre-recorded footage.
                    </p>
                    <Button variant="outline" className="mt-6 gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4" />
                      Select File
                    </Button>
                  </div>
                )
              ) : (
                // ONLINE VIEW (MJPEG)
                isLiveStreaming ? (
                  <img
                    src={`http://localhost:8000/live-stream?url=${encodeURIComponent(liveUrl)}`}
                    alt="Live Detection Stream"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-10">
                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <Tv className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Live IP Camera</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                      Enter a valid RTSP or HTTP Stream URL above and click "Start Detection".
                    </p>
                  </div>
                )
              )}

              {/* Canvas Overlay - Only for Offline */}
              {!isOnline && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              )}
            </div>

            {/* Custom Controls Overlay - Offline Only */}
            {!isOnline && videoSource && (
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
                    onValueChange={(val) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = (val[0] / 100) * videoRef.current.duration;
                        setProgress(val[0]);
                      }
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>

                    <button onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }} className="text-white hover:text-primary transition-colors">
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <span className="text-white/80 text-sm font-mono">
                      {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} /
                      {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* FPS Indicator (Global) */}
            {(isModelActive || isLiveStreaming) && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                <Cpu className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-xs text-white font-mono">{fps || (isLiveStreaming ? "LIVE" : "0")} FPS</span>
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
              <span className="text-4xl font-display font-bold gradient-text">
                {totalDetected}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">In Frame</p>
                <p className="text-xl font-bold">{currentDetected}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">FPS</p>
                <p className="text-xl font-bold">{fps || (isLiveStreaming ? "-" : "0")}</p>
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
