import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glassmorphism?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glassmorphism = false,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl shadow-lg p-4 transition-all duration-300',
        glassmorphism ? 'glassmorphism' : 'bg-white',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn('text-2xl font-bold text-gradient', className)}>
      {children}
    </h2>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
};

