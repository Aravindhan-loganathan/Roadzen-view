import React, { useEffect, useState } from 'react';

interface TrafficSignalProps {
  initialState?: 'red' | 'yellow' | 'green';
  countdown?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const TrafficSignal: React.FC<TrafficSignalProps> = ({
  initialState = 'red',
  countdown = 30,
  size = 'md',
}) => {
  const [currentState, setCurrentState] = useState(initialState);
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Cycle through states
          setCurrentState(current => {
            if (current === 'red') return 'green';
            if (current === 'green') return 'yellow';
            return 'red';
          });
          return currentState === 'green' ? 5 : currentState === 'yellow' ? 30 : 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentState]);

  const getLightStyle = (color: 'red' | 'yellow' | 'green') => {
    const isActive = currentState === color;
    const baseClasses = `${sizes[size]} rounded-full transition-all duration-300`;
    
    if (color === 'red') {
      return `${baseClasses} ${isActive ? 'bg-traffic-red shadow-[0_0_15px_hsl(var(--traffic-red))]' : 'bg-traffic-red/20'}`;
    }
    if (color === 'yellow') {
      return `${baseClasses} ${isActive ? 'bg-traffic-yellow shadow-[0_0_15px_hsl(var(--traffic-yellow))]' : 'bg-traffic-yellow/20'}`;
    }
    return `${baseClasses} ${isActive ? 'bg-traffic-green shadow-[0_0_15px_hsl(var(--traffic-green))]' : 'bg-traffic-green/20'}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-foreground/90 rounded-xl p-2 flex flex-col gap-1.5">
        <div className={getLightStyle('red')} />
        <div className={getLightStyle('yellow')} />
        <div className={getLightStyle('green')} />
      </div>
      <span className="text-xs font-mono font-bold text-muted-foreground">{timeLeft}s</span>
    </div>
  );
};
