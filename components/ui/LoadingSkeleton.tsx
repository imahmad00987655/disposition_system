import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 1,
  className,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('skeleton h-16 w-full mb-4', className)}
        />
      ))}
    </>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="skeleton h-12 w-full"></div>
      <div className="skeleton h-64 w-full"></div>
      <div className="flex justify-between">
        <div className="skeleton h-10 w-32"></div>
        <div className="skeleton h-10 w-48"></div>
      </div>
    </div>
  );
};

export const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="skeleton h-16 w-full"></div>
        <div className="skeleton h-16 w-full"></div>
        <div className="skeleton h-16 w-full"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="skeleton h-16 w-full"></div>
        <div className="skeleton h-16 w-full"></div>
        <div className="skeleton h-16 w-full"></div>
      </div>
      <div className="skeleton h-32 w-full"></div>
      <div className="flex gap-4">
        <div className="skeleton h-12 w-full"></div>
        <div className="skeleton h-12 w-full"></div>
      </div>
    </div>
  );
};

