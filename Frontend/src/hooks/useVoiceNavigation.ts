import { useState, useEffect, useCallback, useRef } from 'react';
import { RouteInfo } from '@/contexts/MapContext';



interface VoiceSettings {
    rate: number;
    pitch: number;
    volume: number;
    voice?: SpeechSynthesisVoice;
}

const defaultSettings: VoiceSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
};

export const useVoiceNavigation = () => {
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
    const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultSettings);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    const speechQueue = useRef<string[]>([]);
    const isProcessingQueue = useRef(false);
    const currentRoute = useRef<RouteInfo | null>(null);
    const userPosition = useRef<[number, number] | null>(null);
    const hasAnnouncedStart = useRef(false);

    // Initialize voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);

            // Try to select a good default voice (prefer English voices)
            const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith('en'))
                || voices[0];

            if (preferredVoice) {
                setVoiceSettings(prev => ({ ...prev, voice: preferredVoice }));
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Load saved settings from localStorage
    useEffect(() => {
        const savedEnabled = localStorage.getItem('voiceNavigationEnabled');
        const savedSettings = localStorage.getItem('voiceNavigationSettings');

        if (savedEnabled !== null) {
            setIsVoiceEnabled(savedEnabled === 'true');
        }

        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                setVoiceSettings(prev => ({ ...prev, ...settings }));
            } catch (error) {
                console.error('Failed to load voice settings:', error);
            }
        }
    }, []);

    // Process speech queue
    const processQueue = useCallback(() => {
        if (isProcessingQueue.current || speechQueue.current.length === 0 || !isVoiceEnabled) {
            return;
        }

        isProcessingQueue.current = true;
        const text = speechQueue.current.shift()!;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voiceSettings.rate;
        utterance.pitch = voiceSettings.pitch;
        utterance.volume = voiceSettings.volume;

        if (voiceSettings.voice) {
            utterance.voice = voiceSettings.voice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            isProcessingQueue.current = false;

            // Process next item in queue
            if (speechQueue.current.length > 0) {
                setTimeout(() => processQueue(), 300); // Small delay between announcements
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setIsSpeaking(false);
            isProcessingQueue.current = false;

            // Continue with next item
            if (speechQueue.current.length > 0) {
                setTimeout(() => processQueue(), 300);
            }
        };

        window.speechSynthesis.speak(utterance);
    }, [isVoiceEnabled, voiceSettings]);

    // Speak function with queue
    const speak = useCallback((text: string, priority: boolean = false) => {
        if (!isVoiceEnabled) return;

        // Cancel current speech if priority
        if (priority) {
            window.speechSynthesis.cancel();
            speechQueue.current = [];
            isProcessingQueue.current = false;
        }

        speechQueue.current.push(text);
        processQueue();
    }, [isVoiceEnabled, processQueue]);

    // Toggle voice navigation
    const toggleVoice = useCallback(() => {
        const newState = !isVoiceEnabled;
        setIsVoiceEnabled(newState);
        localStorage.setItem('voiceNavigationEnabled', String(newState));

        if (!newState) {
            window.speechSynthesis.cancel();
            speechQueue.current = [];
            isProcessingQueue.current = false;
        } else {
            speak('Voice navigation enabled', true);
        }
    }, [isVoiceEnabled, speak]);

    // Update voice settings
    const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
        setVoiceSettings(prev => {
            const updated = { ...prev, ...settings };
            localStorage.setItem('voiceNavigationSettings', JSON.stringify({
                rate: updated.rate,
                pitch: updated.pitch,
                volume: updated.volume,
                voiceName: updated.voice?.name
            }));
            return updated;
        });
    }, []);

    // Calculate distance between two points (in meters)
    const calculateDistance = useCallback((point1: [number, number], point2: [number, number]): number => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = point1[0] * Math.PI / 180;
        const φ2 = point2[0] * Math.PI / 180;
        const Δφ = (point2[0] - point1[0]) * Math.PI / 180;
        const Δλ = (point2[1] - point1[1]) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }, []);

    // Format distance for speech
    const formatDistanceForSpeech = useCallback((meters: number): string => {
        if (meters < 50) {
            return 'in a few meters';
        } else if (meters < 100) {
            return `in ${Math.round(meters / 10) * 10} meters`;
        } else if (meters < 1000) {
            return `in ${Math.round(meters / 50) * 50} meters`;
        } else {
            const km = (meters / 1000).toFixed(1);
            return `in ${km} kilometers`;
        }
    }, []);

    // Announce route selection
    // IMPROVED announceRoute function for useVoiceNavigation.ts
    // Replace the existing announceRoute function with this version

    // Announce route selection
    const announceRoute = useCallback((route: RouteInfo) => {
        currentRoute.current = route;
        hasAnnouncedStart.current = false;
        setCurrentInstructionIndex(0);

        const trafficStatus = route.traffic === 'heavy' ? 'heavy traffic' :
            route.traffic === 'moderate' ? 'moderate traffic' :
                'light traffic';

        // Main route announcement
        const announcement = `Route selected. ${route.name}. 
    Estimated time: ${route.time}. 
    Distance: ${route.distance}. 
    Traffic condition: ${trafficStatus}.`;

        speak(announcement, true);

        // Announce first instruction after a delay
        setTimeout(() => {
            if (route.instructions && route.instructions.length > 0) {
                const firstInstruction = route.instructions[0];

                // Check if instruction is valid and not undefined
                if (firstInstruction && firstInstruction !== 'undefined' && firstInstruction.trim() !== '') {
                    speak(`Starting navigation. ${firstInstruction}`);
                    hasAnnouncedStart.current = true;
                } else {
                    // Fallback if first instruction is invalid
                    speak(`Starting navigation to ${route.name}. Follow the blue line on the map.`);
                    hasAnnouncedStart.current = true;
                }
            } else {
                // Fallback if no instructions available
                speak(`Starting navigation. Route calculated. Distance: ${route.distance}. Follow the blue line on the map.`);
                hasAnnouncedStart.current = true;
            }
        }, 3000);
    }, [speak]);

    // Announce traffic warning
    const announceTrafficWarning = useCallback((location: string, trafficLevel: string) => {
        const warning = trafficLevel === 'heavy'
            ? `Warning: Heavy traffic ahead at ${location}`
            : `Moderate traffic ahead at ${location}`;

        speak(warning, true);
    }, [speak]);

    // Announce emergency vehicle
    const announceEmergencyVehicle = useCallback((vehicleType: string, distance?: number) => {
        const distanceText = distance
            ? formatDistanceForSpeech(distance)
            : 'nearby';

        speak(`Alert: ${vehicleType} ${distanceText}. Please be cautious.`, true);
    }, [speak, formatDistanceForSpeech]);

    // Announce roadblock
    const announceRoadblock = useCallback((reason: string, distance?: number) => {
        const distanceText = distance
            ? formatDistanceForSpeech(distance)
            : 'ahead';

        speak(`Warning: Roadblock ${distanceText}. Reason: ${reason}.`, true);
    }, [speak, formatDistanceForSpeech]);

    // Update user position and provide navigation guidance
    const updateUserPosition = useCallback((position: [number, number]) => {
        userPosition.current = position;

        if (!currentRoute.current || !currentRoute.current.instructions) return;

        const route = currentRoute.current;
        const instructions = route.instructions;
        const path = route.path;

        // Find closest point on route
        let minDistance = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < path.length; i++) {
            const distance = calculateDistance(position, path[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        // Check if we need to announce the next instruction
        // Estimate instruction index based on path progress
        const progressRatio = closestIndex / path.length;
        const estimatedInstructionIndex = Math.floor(progressRatio * instructions.length);

        if (estimatedInstructionIndex > currentInstructionIndex &&
            estimatedInstructionIndex < instructions.length) {

            setCurrentInstructionIndex(estimatedInstructionIndex);
            speak(instructions[estimatedInstructionIndex]);

            // Announce arrival if it's the last instruction
            if (estimatedInstructionIndex === instructions.length - 1) {
                setTimeout(() => {
                    speak('You are approaching your destination.', true);
                }, 2000);
            }
        }

        // Check for upcoming turns (look ahead)
        const lookAheadDistance = 200; // 200 meters
        const lookAheadIndex = Math.min(closestIndex + 10, path.length - 1);
        const distanceToLookAhead = calculateDistance(position, path[lookAheadIndex]);

        // Distance-based warnings for upcoming maneuvers
        if (distanceToLookAhead < lookAheadDistance &&
            estimatedInstructionIndex < instructions.length - 1) {
            const nextInstruction = instructions[estimatedInstructionIndex + 1];

            if (nextInstruction && !isSpeaking) {
                const distanceText = formatDistanceForSpeech(distanceToLookAhead);
                speak(`${distanceText}, ${nextInstruction}`);
            }
        }
    }, [currentInstructionIndex, isSpeaking, calculateDistance, formatDistanceForSpeech, speak]);

    // Announce rerouting
    const announceRerouting = useCallback((reason: string) => {
        speak(`Calculating new route due to ${reason}.`, true);
    }, [speak]);

    // Announce destination reached
    const announceArrival = useCallback(() => {
        speak('You have arrived at your destination.', true);
        currentRoute.current = null;
        setCurrentInstructionIndex(0);
        hasAnnouncedStart.current = false;
    }, [speak]);

    // Stop navigation
    const stopNavigation = useCallback(() => {
        window.speechSynthesis.cancel();
        speechQueue.current = [];
        isProcessingQueue.current = false;
        currentRoute.current = null;
        setCurrentInstructionIndex(0);
        hasAnnouncedStart.current = false;
        speak('Navigation stopped.', true);
    }, [speak]);

    return {
        isVoiceEnabled,
        isSpeaking,
        currentInstructionIndex,
        voiceSettings,
        availableVoices,
        toggleVoice,
        speak,
        updateVoiceSettings,
        announceRoute,
        announceTrafficWarning,
        announceEmergencyVehicle,
        announceRoadblock,
        announceRerouting,
        announceArrival,
        updateUserPosition,
        stopNavigation,
    };
};