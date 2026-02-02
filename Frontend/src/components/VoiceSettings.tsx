import React from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VoiceSettingsProps {
  isVoiceEnabled: boolean;
  voiceSettings: {
    rate: number;
    pitch: number;
    volume: number;
    voice?: SpeechSynthesisVoice;
  };
  availableVoices: SpeechSynthesisVoice[];
  onToggle: () => void;
  onUpdateSettings: (settings: any) => void;
  onTestVoice: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isVoiceEnabled,
  voiceSettings,
  availableVoices,
  onToggle,
  onUpdateSettings,
  onTestVoice,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className={`gap-2 ${isVoiceEnabled ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
        onClick={onToggle}
      >
        {isVoiceEnabled ? (
          <Volume2 className="w-4 h-4 text-primary" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
        {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Voice Navigation Settings</DialogTitle>
            <DialogDescription>
              Customize your voice navigation experience
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Voice Selection */}
            <div className="space-y-2">
              <Label htmlFor="voice">Voice</Label>
              <Select
                value={voiceSettings.voice?.name || ''}
                onValueChange={(value) => {
                  const selectedVoice = availableVoices.find(v => v.name === value);
                  if (selectedVoice) {
                    onUpdateSettings({ voice: selectedVoice });
                  }
                }}
              >
                <SelectTrigger id="voice">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speech Rate */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="rate">Speech Rate</Label>
                <span className="text-sm text-muted-foreground">
                  {voiceSettings.rate.toFixed(1)}x
                </span>
              </div>
              <Slider
                id="rate"
                min={0.5}
                max={2}
                step={0.1}
                value={[voiceSettings.rate]}
                onValueChange={([value]) => onUpdateSettings({ rate: value })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>

            {/* Pitch */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="pitch">Pitch</Label>
                <span className="text-sm text-muted-foreground">
                  {voiceSettings.pitch.toFixed(1)}
                </span>
              </div>
              <Slider
                id="pitch"
                min={0.5}
                max={2}
                step={0.1}
                value={[voiceSettings.pitch]}
                onValueChange={([value]) => onUpdateSettings({ pitch: value })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lower</span>
                <span>Higher</span>
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="volume">Volume</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(voiceSettings.volume * 100)}%
                </span>
              </div>
              <Slider
                id="volume"
                min={0}
                max={1}
                step={0.1}
                value={[voiceSettings.volume]}
                onValueChange={([value]) => onUpdateSettings({ volume: value })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Quiet</span>
                <span>Loud</span>
              </div>
            </div>

            {/* Test Button */}
            <Button 
              onClick={onTestVoice} 
              className="w-full"
              disabled={!isVoiceEnabled}
            >
              Test Voice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};