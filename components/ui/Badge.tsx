import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusColor } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'status';
  status?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  status,
  className,
}) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold';
  
  const colorClass = variant === 'status' && status
    ? getStatusColor(status)
    : 'bg-gray-100 text-gray-800';
  
  return (
    <span className={cn(baseStyles, colorClass, className)}>
      {children}
    </span>
  );
};

