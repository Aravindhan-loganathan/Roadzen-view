import React from 'react';
import { Skeleton } from './skeleton';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="glow-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC = () => {
  return (
    <div className="glow-card p-6 space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
};
