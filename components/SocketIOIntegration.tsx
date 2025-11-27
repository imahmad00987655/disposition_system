'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { userAPI } from '@/lib/api';
import { formatPhoneNumber, validatePakistaniPhoneNumber } from '@/lib/utils';

interface CallEventData {
  caller_id_number?: string;
  phoneNumber?: string;
  callerid?: string;
  connectedlinenum?: string;
  calleridnum?: string;
  src?: string;
  event?: string;
  type?: string;
  queue?: string;
  [key: string]: any;
}

interface SocketIOIntegrationProps {
  agentName: string;
  onCallEvent: (phoneNumber: string, eventType: string, matchingComplaints: any[]) => void;
}

export const SocketIOIntegration: React.FC<SocketIOIntegrationProps> = ({
  agentName,
  onCallEvent,
}) => {
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const recentlyHandledCalls = useRef<Map<string, number>>(new Map());
  const { showToast } = useToast();

  useEffect(() => {
    if (!agentName || connectionAttempted) return;

    const initializeSocket = async () => {
      setConnectionAttempted(true);
      
      try {
        // Fetch Intellicom username
        const response = await userAPI.fetchIntellicomUser(agentName);
        if (!response.success || !response.data?.intellicomUserName) {
          console.warn('Could not find Intellicom username for agent');
          return;
        }

        const intellicomUserName = response.data.intellicomUserName;
        console.log('Attempting to connect Socket.IO with agent:', intellicomUserName);
        
        // Check if Socket.IO is available
        if (typeof window !== 'undefined' && (window as any).io) {
          // Match the exact configuration from the Intellicom example
          const newSocket = (window as any).io('http://mcc.contegris.com:4001/integration', {
            query: `agent_name=SIP/${intellicomUserName}`,
            path: '/integration-app'
          });
          
          newSocket.on('connect', () => {
            console.log('Socket.IO connected successfully');
            console.log('Connection info status:', newSocket.connected);
            setIsConnected(true);
            showToast('success', 'Phone system connected');
          });

          // Listen for connected event from server
          newSocket.on('connected', (data: any) => {
            console.log('Server connected message:', data.message);
          });

          newSocket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setIsConnected(false);
            showToast('warning', 'Phone system disconnected');
          });

          let errorCount = 0;
          newSocket.on('connect_error', (error: any) => {
            errorCount++;
            if (errorCount === 1) {
              console.error('Socket.IO connection error:', error.message);
              console.warn('Unable to connect to Intellicom server. Please check:');
              console.warn('1. Server is accessible at http://mcc.contegris.com:4001');
              console.warn('2. Network/firewall allows connection');
              console.warn('3. CORS is configured on server');
              showToast('warning', 'Phone system offline - calls will not trigger popup');
            }
            setIsConnected(false);
            
            // Stop trying after 3 attempts
            if (errorCount >= 3) {
              console.log('Socket.IO: Stopping connection attempts');
              newSocket.close();
            }
          });

          // Listen for call events from Intellicom
          newSocket.on('ring', (eventData: CallEventData) => {
            console.log('Ring event received');
            handleCallEvent(eventData, 'ring');
          });

          newSocket.on('answer', (eventData: CallEventData) => {
            console.log('Answer event received');
            handleCallEvent(eventData, 'answer');
          });

          newSocket.on('end', (eventData: CallEventData) => {
            console.log('End event received');
            // Don't show popup on call end
          });

          newSocket.on('dial', (eventData: CallEventData) => {
            console.log('Dial event received');
            handleCallEvent(eventData, 'dial');
          });

          newSocket.on('ctidata', (eventData: CallEventData) => {
            console.log('CTI Data event received');
            handleCallEvent(eventData, 'ctidata');
          });

          setSocket(newSocket);
        } else {
          console.error('Socket.IO library not loaded. Please ensure the script is loaded in <head>');
          showToast('warning', 'Socket.IO library not available');
        }
      } catch (error) {
        console.error('Error initializing Socket.IO:', error);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [agentName]);

  const handleCallEvent = (data: CallEventData, eventType: string) => {
    console.log('Call Event Received:', { eventType, data });

    // Skip outbound queue
    if (data.queue === 'outbound') {
      console.log('Skipping popup for outbound queue');
      return;
    }

    // Extract phone number from various possible fields
    let callNumber = '';
    const possibleFields = [
      'caller_id_number', 'phoneNumber', 'callerid', 'connectedlinenum',
      'calleridnum', 'src', 'channel', 'uniqueid', 'linkedid', 'extension'
    ];

    for (const field of possibleFields) {
      if (data[field]) {
        callNumber = data[field];
        break;
      }
    }

    if (!callNumber) {
      console.log('No phone number found in call data');
      return;
    }

    // Format and validate phone number
    const formattedCallNumber = formatPhoneNumber(callNumber);
    const validation = validatePakistaniPhoneNumber(formattedCallNumber);

    if (!validation.valid) {
      console.log('Invalid phone number format:', formattedCallNumber);
      return;
    }

    // Check if this phone number was handled recently (within last 30 seconds)
    // Using ref for SYNCHRONOUS check (state updates are async)
    const now = Date.now();
    const lastHandledTime = recentlyHandledCalls.current.get(formattedCallNumber);
    
    if (lastHandledTime && (now - lastHandledTime) < 30000) { // 30 seconds
      console.log('Phone number recently handled, skipping duplicate popup:', formattedCallNumber, 'Last handled:', new Date(lastHandledTime).toLocaleTimeString());
      return;
    }

    // Mark this phone number as handled (synchronous update with ref)
    recentlyHandledCalls.current.set(formattedCallNumber, now);
    console.log('Marked as handled:', formattedCallNumber, 'at', new Date(now).toLocaleTimeString());

    // Trigger popup
    console.log('Triggering popup for:', formattedCallNumber, 'Event:', eventType);
    onCallEvent(formattedCallNumber, eventType, []);
  };

  // Clean up old entries from recently handled calls (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const callsMap = recentlyHandledCalls.current;
      
      // Remove entries older than 2 minutes
      for (const [phone, time] of callsMap.entries()) {
        if (now - time > 120000) { // 2 minutes
          callsMap.delete(phone);
          console.log('Removed old entry:', phone);
        }
      }
      console.log('Cleaned up old call entries, remaining:', callsMap.size);
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
        isConnected 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}>
        {isConnected ? '📞 Connected' : '📞 Disconnected'}
      </div>
    </div>
  );
};
