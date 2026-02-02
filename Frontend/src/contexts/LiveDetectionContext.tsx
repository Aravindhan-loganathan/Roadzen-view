import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

// Common detection types
export interface Detection {
  id?: number;
  label: string;
  conf: number;
  box: [number, number, number, number]; // [x, y, w, h] in percentages
}

export interface VehicleCounts {
  car: number;
  bike: number;
  bus: number;
  truck: number;
  auto: number;
}

export const initialCounts: VehicleCounts = { car: 0, bike: 0, bus: 0, truck: 0, auto: 0 };

interface LiveDetectionContextType {
  // Global State
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  videoSource: string | null;
  setVideoSource: (src: string | null) => void;
  liveUrl: string;
  setLiveUrl: (url: string) => void;
  isLiveStreaming: boolean;
  setIsLiveStreaming: (val: boolean) => void;
  isModelActive: boolean;
  setIsModelActive: (val: boolean) => void;
  
  // Playback State (for Offline)
  isPlaying: boolean;
  togglePlay: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  progress: number;
  setProgress: (val: number) => void;
  duration: number;
  currentTime: number;
  
  // Analysis Data
  fps: number;
  currentCounts: VehicleCounts;
  totalCounts: VehicleCounts;
  detections: Detection[];
  
  // Traffic Control State (Derived from Analysis)
  congestionLevel: 'Low' | 'Medium' | 'High';
  signalState: 'Red' | 'Yellow' | 'Green';

  // Ref Access
  videoRef: React.RefObject<HTMLVideoElement>; // We expose the ref so we can attach it to DOM
  resetStats: () => void;
}

const LiveDetectionContext = createContext<LiveDetectionContextType | undefined>(undefined);

export const LiveDetectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- State ---
  const [isOnline, setIsOnline] = useState(false);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState('');
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  
  const [isModelActive, setIsModelActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentCounts, setCurrentCounts] = useState<VehicleCounts>(initialCounts);
  const [totalCounts, setTotalCounts] = useState<VehicleCounts>(initialCounts);

  // Computed Traffic State
  const [congestionLevel, setCongestionLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [signalState, setSignalState] = useState<'Red' | 'Yellow' | 'Green'>('Red');
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Refs
  // We keep the video element in the Provider (by creating it programmatically or using a hidden Ref? 
  // Programmatic `document.createElement` is hard to inspect.
  // We'll use a Ref that we EXPECT the Page to populate? NO, if page unmounts, Ref is null.
  // We need the Element to live HERE.
  const videoElementRef = useRef<HTMLVideoElement>(null); 
  // Actually, we can just use `useRef` to HOLD the element, but we need to render it somewhere?
  // No, we can render it in the Provider but hidden!
  
  const wsRef = useRef<WebSocket | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const seenIds = useRef<Set<number>>(new Set());
  const idMapping = useRef<Map<number, number>>(new Map());
  const nextId = useRef(1);
  const totalCountsRef = useRef<VehicleCounts>(initialCounts);

  const resetStats = () => {
    setDetections([]);
    setCurrentCounts(initialCounts);
    setTotalCounts(initialCounts);
    totalCountsRef.current = initialCounts;
    seenIds.current.clear();
    idMapping.current.clear();
    nextId.current = 1;
    setFps(0);
    setCongestionLevel('Low');
    setSignalState('Red');
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

  // --- Dynamic Traffic Control Logic ---
  // Calculates congestion and signal state based on real-time vehicle density
  useEffect(() => {
    const { car, bike, bus, truck, auto } = currentCounts;
    // Calculate Weighted Density Score
    // Bus/Truck = 2.5 (High impact)
    // Car/Auto = 1.0 (Standard)
    // Bike = 0.5 (Low impact)
    const densityScore = (car * 1) + (auto * 1) + (bus * 2.5) + (truck * 2.5) + (bike * 0.5);

    let newCongestion: 'Low' | 'Medium' | 'High' = 'Low';
    let newSignal: 'Red' | 'Yellow' | 'Green' = 'Red';

    if (densityScore >= 12) {
      newCongestion = 'High';
      newSignal = 'Green'; // Clear the heavy traffic
    } else if (densityScore >= 5) {
      newCongestion = 'Medium';
      newSignal = 'Yellow'; // Warning / Flowing
    } else {
      newCongestion = 'Low';
      newSignal = 'Red'; // Stop / Waiting
    }

    setCongestionLevel(newCongestion);
    setSignalState(newSignal);
  }, [currentCounts]);

  // Sync localStorage for SignalControl
  useEffect(() => {
    if (isLiveStreaming || isModelActive) {
      localStorage.setItem('isLiveDetectionActive', 'true');
    } else {
      localStorage.setItem('isLiveDetectionActive', 'false');
    }
  }, [isLiveStreaming, isModelActive]);

  // WebSocket Logic
  useEffect(() => {
    if (isOnline) {
       // Online Logic (Optional: Connect to backend stream for data not just video?)
       // Currently Online is just MJPEG. If we want detection data, we might need WS too?
       // Assuming Online is just viewing for now unless backend pushes data.
       return; 
    }

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
      console.log('Connected to Offline Model Stream (Background)');
      sendFrames();
    };

    const sendFrames = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      const lastSendTime = (ws as any)._lastSendTime || 0;
      if (now - lastSendTime < 33) {
        animationFrameId = requestAnimationFrame(sendFrames);
        return;
      }

      // We need the video element to extract frames
      if (videoElementRef.current && !videoElementRef.current.paused && !videoElementRef.current.ended) {
        const video = videoElementRef.current;
        const scale = 480 / video.videoWidth;
        const w = Math.floor(video.videoWidth * scale);
        const h = Math.floor(video.videoHeight * scale);

        if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement('canvas');
        if (offscreenCanvasRef.current.width !== w) {
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
      } catch (e) { console.error(e); }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      cancelAnimationFrame(animationFrameId);
    };
  }, [isModelActive, isOnline]);

  // Handle Playback Controls
  const togglePlay = () => {
    if (videoElementRef.current) {
      if (isPlaying) videoElementRef.current.pause();
      else videoElementRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };
  
  const toggleMute = () => {
      if (videoElementRef.current) {
         videoElementRef.current.muted = !isMuted;
         setIsMuted(!isMuted);
      }
  };

  return (
    <LiveDetectionContext.Provider value={{
      isOnline, setIsOnline,
      videoSource, setVideoSource,
      liveUrl, setLiveUrl,
      isLiveStreaming, setIsLiveStreaming,
      isModelActive, setIsModelActive,
      fps, 
      currentCounts,
      totalCounts,
      detections,
      congestionLevel,
      signalState,
      videoRef: videoElementRef,
      isPlaying, togglePlay,
      isMuted, toggleMute,
      progress, setProgress,
      duration, currentTime,
      resetStats
    }}>
      {/* Hidden Global Video Element for Background Processing */}
      <video
        ref={videoElementRef}
        src={videoSource || undefined}
        style={{ display: 'none' }} // Hidden by default, detached?
        // Wait, if it's display:none, can we drawImage? Yes.
        // But we want to SHOW it in the Page.
        // The Page will extract this element and append it, or we rely on Canvas syncing?
        // Simpler: The Page renders a Canvas that draws this Video? 
        // Or we just unhide it?
        // Actually, 'display: none' might pause rendering on some browsers?
        // Let's use visibility: hidden or position absolute offscreen.
        className="hidden-background-video"
        playsInline
        crossOrigin="anonymous"
        muted={isMuted} // Controlled by state
        onTimeUpdate={() => {
            if (videoElementRef.current) {
                setCurrentTime(videoElementRef.current.currentTime);
                if (videoElementRef.current.duration) {
                    setProgress((videoElementRef.current.currentTime / videoElementRef.current.duration) * 100);
                }
            }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      {children}
    </LiveDetectionContext.Provider>
  );
};

export const useLiveDetection = () => {
  const context = useContext(LiveDetectionContext);
  if (context === undefined) {
    throw new Error('useLiveDetection must be used within a LiveDetectionProvider');
  }
  return context;
};
