'use client';

import React, { useEffect, useState, useRef } from 'react';
import { calculateTimeRemaining } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { complaintAPI } from '@/lib/api';

interface TimerProps {
  endTime?: Date | string; // Optional now, can use countdown_seconds instead
  countdownSeconds?: number | null; // Countdown from database
  commentType?: string;
  complaintId?: string;
  isLatest?: boolean; // Only latest timer is active
  className?: string;
  onExpire?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ 
  endTime, 
  countdownSeconds,
  commentType, 
  complaintId,
  isLatest = false,
  className,
  onExpire,
}) => {
  // Track when component mounted to calculate elapsed time from countdown_seconds
  const mountTimeRef = useRef<number>(Date.now());
  const initialCountdownRef = useRef<number | null>(countdownSeconds ?? null);
  
  // Use countdown_seconds from database if available, otherwise calculate from endTime
  const [timeData, setTimeData] = useState(() => {
    if (countdownSeconds !== null && countdownSeconds !== undefined) {
      // Use database countdown_seconds
      const seconds = Math.max(0, countdownSeconds);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (seconds <= 0) {
        return { timeRemaining: 'Expired', isExpired: true, status: 'expired' as const };
      }
      
      return {
        timeRemaining: `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        isExpired: false,
        status: 'active' as const
      };
    } else if (endTime) {
      const date = typeof endTime === 'string' ? new Date(endTime) : endTime;
      return calculateTimeRemaining(date, commentType);
    } else {
      return { timeRemaining: 'N/A', isExpired: false, status: 'active' as const };
    }
  });
  const hasAutoTagged = useRef(false);
  
  // Update mount time and initial countdown when props change
  useEffect(() => {
    mountTimeRef.current = Date.now();
    initialCountdownRef.current = countdownSeconds ?? null;
  }, [countdownSeconds]);

  useEffect(() => {
    // Only active timer should countdown (latest one)
    if (!isLatest) {
      setTimeData({ timeRemaining: 'Expired', isExpired: true, status: 'expired' });
      return;
    }
    
    // Prefer countdown_seconds from database when available (more reliable), otherwise use endTime
    const interval = setInterval(() => {
      let newTimeData;
      
      if (initialCountdownRef.current !== null && initialCountdownRef.current !== undefined) {
        // Use countdown_seconds from database and calculate elapsed time for accurate countdown
        const elapsedSeconds = Math.floor((Date.now() - mountTimeRef.current) / 1000);
        const remainingSeconds = Math.max(0, initialCountdownRef.current - elapsedSeconds);
        
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const secs = remainingSeconds % 60;
        
        if (remainingSeconds <= 0) {
          newTimeData = { timeRemaining: 'Expired', isExpired: true, status: 'expired' as const };
        } else {
          newTimeData = {
            timeRemaining: `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
            isExpired: false,
            status: 'active' as const
          };
        }
      } else if (endTime) {
        // Fallback: Calculate from endTime
        const date = typeof endTime === 'string' ? new Date(endTime) : endTime;
        newTimeData = calculateTimeRemaining(date, commentType);
      } else {
        newTimeData = { timeRemaining: 'N/A', isExpired: false, status: 'active' as const };
      }
      
      setTimeData(newTimeData);
      
      // Auto-tag manager when timer expires (EXACT logic from script)
      if (newTimeData.isExpired && !hasAutoTagged.current && complaintId && isLatest) {
        hasAutoTagged.current = true;
        autoTagManager(complaintId);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, countdownSeconds, commentType, isLatest, complaintId, onExpire]);

  // Auto-tag manager function from script
  const autoTagManager = async (cmpNo: string) => {
    try {
      console.log('Timer expired! Auto-tagging manager for complaint:', cmpNo);
      
      await complaintAPI.submitComment({
        complaint_id: cmpNo,
        comment: 'Timer Expired',
        commentType: 'Auto',
        agentName: 'System',
        taggedTo: 'Rizwan (Manager)',
        timelineDate: '',
        timelineTime: '',
      });
      
      console.log('Manager tagged successfully for:', cmpNo);
    } catch (error) {
      console.error('Error tagging manager:', error);
    }
  };

  const colorClass = 
    timeData.status === 'completed' 
      ? 'text-green-600' 
      : timeData.status === 'expired'
      ? 'text-red-600 font-bold'
      : 'text-green-600 font-semibold';

  return (
    <span className={cn(colorClass, className)}>
      {timeData.timeRemaining}
    </span>
  );
};

