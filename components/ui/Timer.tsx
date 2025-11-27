'use client';

import React, { useEffect, useState, useRef } from 'react';
import { calculateTimeRemaining } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { complaintAPI } from '@/lib/api';

interface TimerProps {
  endTime: Date | string;
  commentType?: string;
  complaintId?: string;
  isLatest?: boolean; // Only latest timer is active
  className?: string;
  onExpire?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ 
  endTime, 
  commentType, 
  complaintId,
  isLatest = false,
  className,
  onExpire,
}) => {
  const [timeData, setTimeData] = useState(() => {
    const date = typeof endTime === 'string' ? new Date(endTime) : endTime;
    return calculateTimeRemaining(date, commentType);
  });
  const hasAutoTagged = useRef(false);

  useEffect(() => {
    const date = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    // Only active timer should countdown (latest one)
    if (!isLatest) {
      setTimeData({ timeRemaining: 'Expired', isExpired: true, status: 'expired' });
      return;
    }
    
    const interval = setInterval(() => {
      const newTimeData = calculateTimeRemaining(date, commentType);
      setTimeData(newTimeData);
      
      // Auto-tag manager when timer expires (EXACT logic from script)
      if (newTimeData.isExpired && !hasAutoTagged.current && complaintId && isLatest) {
        hasAutoTagged.current = true;
        autoTagManager(complaintId);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, commentType, isLatest, complaintId]);

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

