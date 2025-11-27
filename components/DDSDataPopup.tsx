'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, Phone, MapPin, Calendar, Package, Minus } from 'lucide-react';
import { DDSAppointment } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { DDSDetailPanel } from '@/components/modules/DDSManagement';

interface DDSDataPopupProps {
  phoneNumber: string;
  matchingDDS: DDSAppointment[];
  onClose: () => void;
  onFocus?: () => void;
  onMinimize?: () => void;
  zIndex?: number;
}

export const DDSDataPopup: React.FC<DDSDataPopupProps> = ({
  phoneNumber,
  matchingDDS,
  onClose,
  onFocus,
  onMinimize,
  zIndex = 1000,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-purple-100 text-purple-800';
      case 'Customer is in contact with DDS':
        return 'bg-blue-100 text-blue-800';
      case 'Customer not responding':
        return 'bg-yellow-100 text-yellow-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 relative select-none">
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
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Door to Door Appointment Data</h2>
              <p className="text-lg opacity-90">{phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="no-drag overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div>
            <div className="mb-4 px-6 pt-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Found {matchingDDS.length} DDS appointment(s)
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Phone Number:</span>
                    <p className="text-gray-800">{phoneNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total Records:</span>
                    <p className="text-gray-800">{matchingDDS.length}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Module:</span>
                    <p className="text-gray-800">Door to Door</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Time:</span>
                    <p className="text-gray-800">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DDS Records */}
            <div className="bg-white border-t border-gray-200 overflow-hidden">
              <div className="space-y-4 p-6">
                {matchingDDS.map((dds, index) => {
                  const recordKey = dds.id ? String(dds.id) : `index-${index}`;

                  return (
                    <div
                      key={recordKey}
                      className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow space-y-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{dds.customer_name}</p>
                          <p className="text-xs text-gray-500">#{dds.id || 'Unassigned'}</p>
                        </div>
                        {dds.current_status && (
                          <span
                            className={`self-start md:self-auto px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              dds.current_status
                            )}`}
                          >
                            {dds.current_status}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Contact</span>
                          <span>{dds.contact}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">City</span>
                          <span>{dds.city}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase block">Brand</span>
                          <span>{dds.brand_type}</span>
                        </div>
                      </div>

                      {dds.address && (
                        <div className="text-sm text-gray-700">
                          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Address</span>
                          <p className="bg-white p-3 rounded">{dds.address}</p>
                        </div>
                      )}

                      {dds.comments && (
                        <div className="text-sm text-gray-700">
                          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Comments</span>
                          <p className="bg-white p-3 rounded">{dds.comments}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                        <span>
                          <strong className="uppercase text-gray-400 mr-1">Agent:</strong>
                          {dds.agent_name || 'N/A'}
                        </span>
                        <span>
                          <strong className="uppercase text-gray-400 mr-1">Date Added:</strong>
                          {dds.date_added ? formatDate(dds.date_added) : 'N/A'}
                        </span>
                        <span>
                          <strong className="uppercase text-gray-400 mr-1">Gender:</strong>
                          {dds.gender}
                        </span>
                      </div>

                      <div className="no-drag border-t border-orange-200 pt-4 mt-2">
                        <DDSDetailPanel appointment={dds} onRefresh={() => {}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="no-drag bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            DDS data from Door to Door module
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

