'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Calendar, Package, Minus } from 'lucide-react';
import { NewCustomer } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import type { InteractionChannel } from '@/lib/types';

interface CustomerDataPopupProps {
  phoneNumber: string;
  matchingCustomers: NewCustomer[];
  onClose: () => void;
  onFocus?: () => void;
  onMinimize?: () => void;
  zIndex?: number;
}

export const CustomerDataPopup: React.FC<CustomerDataPopupProps> = ({
  phoneNumber,
  matchingCustomers,
  onClose,
  onFocus,
  onMinimize,
  zIndex = 1000,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [interactionChannel, setInteractionChannel] = useState<InteractionChannel>('Call');
  const [callReceivedTime, setCallReceivedTime] = useState<string>('');

  // Set call received time for display (data is already saved in handleCallEvent)
  useEffect(() => {
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setCallReceivedTime(formattedTime);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    
    if (onFocus) onFocus();
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  useEffect(() => {
    const existingChannel = matchingCustomers.find(customer => customer.interaction_channel)?.interaction_channel;
    if (existingChannel) {
      setInteractionChannel(existingChannel as InteractionChannel);
    }
  }, [matchingCustomers]);

  const popupStyle: React.CSSProperties =
    position.x === 0 && position.y === 0
      ? {
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }
      : {
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none',
        };

  return (
    <div 
      className={`fixed bg-white rounded-lg shadow-2xl w-[90vw] max-w-[1200px] max-h-[90vh] overflow-hidden cursor-move transition-shadow ${
        isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.3)]' : ''
      }`}
      style={{
        ...popupStyle,
        zIndex,
        ...(position.x === 0 && position.y === 0 ? {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        } : {}),
      }}
      onMouseDownCapture={() => onFocus?.()}
      onMouseDown={handleMouseDown}
    >
        {/* Header - Drag Handle */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 relative select-none">
          <div className="no-drag absolute top-4 right-4 flex items-center gap-2">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="text-white hover:text-gray-200 transition-colors"
                title="Minimize"
              >
                <Minus size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Customer Registration Data</h2>
              <p className="text-lg opacity-90">{phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="no-drag overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div>
            <div className="mb-4 px-6 pt-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Found {matchingCustomers.length} customer record(s)
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm items-end">
                  <div>
                    <span className="font-medium text-gray-600">Phone Number:</span>
                    <p className="text-gray-800">{phoneNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total Records:</span>
                    <p className="text-gray-800">{matchingCustomers.length}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Module:</span>
                    <p className="text-gray-800">New Customer Registration</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Time:</span>
                    <p className="text-gray-800">{callReceivedTime || new Date().toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <Select
                      label="Interaction Channel"
                      value={interactionChannel}
                      onChange={(event) => setInteractionChannel(event.target.value as InteractionChannel)}
                      options={[
                        { value: 'Call', label: 'Call' },
                        { value: 'WhatsApp', label: 'WhatsApp' },
                        { value: 'Facebook', label: 'Facebook' },
                        { value: 'Instagram', label: 'Instagram' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Records */}
            <div className="bg-white border-t border-gray-200 overflow-hidden">
              <div className="space-y-4 p-6">
                {matchingCustomers.map((customer, index) => (
                  <div key={customer.id || index} className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Customer Name</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{customer.customer_name}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Gender</span>
                        <p className="text-sm text-gray-900 mt-1">{customer.gender}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Contact</span>
                        <p className="text-sm text-gray-900 mt-1">{customer.contact}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Reason of Call</span>
                        <p className="text-sm text-gray-900 mt-1">{customer.reason_of_call}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Brand Type</span>
                        <p className="text-sm text-gray-900 mt-1">{customer.brand_type}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">City</span>
                        <p className="text-sm text-gray-900 mt-1">{customer.city}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Interaction Channel</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {customer.interaction_channel || interactionChannel}
                        </p>
                      </div>
                      
                      {customer.address && (
                        <div className="col-span-full">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Address</span>
                          <p className="text-sm text-gray-900 mt-1 bg-white p-2 rounded">{customer.address}</p>
                        </div>
                      )}
                      
                      {customer.comments && (
                        <div className="col-span-full">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Comments</span>
                          <p className="text-sm text-gray-900 mt-1 bg-white p-2 rounded">{customer.comments}</p>
                        </div>
                      )}
                      
                      {customer.current_status && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Current Status</span>
                          <p className="text-sm text-gray-900 mt-1">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {customer.current_status}
                            </span>
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Agent Name</span>
                        <p className="text-sm text-gray-900 mt-1">{customer.agent_name}</p>
                      </div>
                      
                      {customer.date_added && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Date Added</span>
                          <p className="text-sm text-gray-900 mt-1">{formatDate(customer.date_added)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="no-drag bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Call received at {callReceivedTime || new Date().toLocaleTimeString()} | Customer data from New Customer Registration module
          </div>
          <button
            onClick={onClose}
            className="no-drag px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
  );
};

