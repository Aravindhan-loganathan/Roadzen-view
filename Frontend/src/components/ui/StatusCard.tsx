import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

interface StatusCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  suffix?: string;
}

const variantStyles = {
  default: 'border-primary/20 hover:border-primary/40',
  success: 'border-success/20 hover:border-success/40',
  warning: 'border-warning/20 hover:border-warning/40',
  danger: 'border-destructive/20 hover:border-destructive/40',
};

const iconVariantStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
};

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  suffix = '',
}) => {
  return (
    <div className={`glow-card p-6 ${variantStyles[variant]} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-baseline gap-1">
            <AnimatedCounter
              end={value}
              suffix={suffix}
              className="text-3xl font-bold text-foreground"
            />
          </div>
          {trend && (
            <p className={`text-xs ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from yesterday
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconVariantStyles[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
