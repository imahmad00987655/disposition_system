'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, User, MapPin, Calendar, MessageSquare, Minus } from 'lucide-react';
import { Complaint } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { DispositionForm } from '@/components/modules/DispositionForm';

interface CallPopupProps {
  phoneNumber: string;
  eventType: string;
  matchingComplaints: Complaint[];
  onClose: () => void;
  onRegisterNewCustomer: (phoneNumber: string) => void;
  onFocus?: () => void;
  onMinimize?: () => void;
  zIndex?: number;
}

// No Data Found Notification Component
export const NoDataFoundNotification: React.FC<{ phoneNumber: string; onClose: () => void }> = ({ 
  phoneNumber, 
  onClose 
}) => {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg shadow-lg p-4 min-w-[300px]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-800 mb-1">No Data Found</h4>
            <p className="text-sm text-gray-600">Phone: <strong>{phoneNumber}</strong></p>
            <p className="text-xs text-gray-500 mt-1">No complaint data available for this number.</p>
          </div>
          <button 
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CallPopup: React.FC<CallPopupProps> = ({
  phoneNumber,
  eventType,
  matchingComplaints,
  onClose,
  onRegisterNewCustomer,
  onFocus,
  onMinimize,
  zIndex = 1000,
}) => {
  const [expandedComplaints, setExpandedComplaints] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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

  const toggleComplaint = (complaintId: string) => {
    setExpandedComplaints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(complaintId)) {
        newSet.delete(complaintId);
      } else {
        newSet.add(complaintId);
      }
      return newSet;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    
    // Bring popup to front when clicked
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
  }, [isDragging, dragOffset]);

  const popupStyle = position.x === 0 && position.y === 0
    ? {} // Centered initially
    : {
        position: 'fixed' as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
      };

  const interactionChannel = 'Call';

  return (
    <div 
      className={`fixed bg-white rounded-lg shadow-2xl w-[95vw] max-w-[1400px] max-h-[90vh] overflow-hidden cursor-move transition-shadow ${
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
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 relative select-none">
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
              <Phone size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Incoming Call</h2>
              <p className="text-lg opacity-90">{phoneNumber}</p>
              <p className="text-sm opacity-75">Event: {eventType}</p>
              <div className="mt-2 inline-flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                <span>Channel</span>
                <span className="bg-white bg-opacity-30 text-white px-2 py-0.5 rounded-full">
                  {interactionChannel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="no-drag overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {matchingComplaints.length > 0 ? (
            <div>
              <div className="mb-4 px-6 pt-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Found {matchingComplaints.length} complaint(s) for this number
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Phone Number:</span>
                      <p className="text-gray-800">{phoneNumber}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Total Complaints:</span>
                      <p className="text-gray-800">{matchingComplaints.length}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Event Type:</span>
                      <p className="text-gray-800">{eventType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Time:</span>
                      <p className="text-gray-800">{callReceivedTime || new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complaints Table */}
              <div className="bg-white border-t border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complaint #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matchingComplaints.map((complaint, index) => (
                      <React.Fragment key={complaint.CmpNo}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleComplaint(complaint.CmpNo)}
                              className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-purple-700 transition-colors"
                            >
                              {expandedComplaints.has(complaint.CmpNo) ? '-' : '+'}
                            </button>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {complaint.CName || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {complaint.CmpNo || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(complaint.CmpDate)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {complaint.qltytext || complaint.qltytext_khi || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {complaint.sizetext || complaint.sizetext_khi || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              complaint.CurrentStatus?.toLowerCase().includes('pending') 
                                ? 'bg-yellow-100 text-yellow-800'
                                : complaint.CurrentStatus?.toLowerCase().includes('resolved')
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {complaint.CurrentStatus || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {complaint.vRemarks1 || 'N/A'}
                          </td>
                        </tr>
                        
                        {/* Expanded Details Row - Full Complaint Management View */}
                        {expandedComplaints.has(complaint.CmpNo) && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="p-0">
                              <div className="bg-white border-t-4 border-purple-500">
                                {/* Full DispositionForm with Complaint Details, Add Comment, and Previous Interactions */}
                                <DispositionForm 
                                  complaint={complaint} 
                                  onSuccess={() => {
                                    console.log('✅ Comment submitted successfully for:', complaint.CmpNo);
                                    // Keep the complaint expanded to show updated data
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
                  <User className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Data Found</h3>
                <p className="text-gray-600 mb-4">
                  No complaint data available for phone number <strong>{phoneNumber}</strong>
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  This appears to be a new customer. You can register them in the system.
                </p>
                <button
                  onClick={() => onRegisterNewCustomer(phoneNumber)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium"
                >
                  Register New Customer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="no-drag bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Call received at {callReceivedTime || new Date().toLocaleTimeString()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="no-drag px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
            {matchingComplaints.length === 0 && (
              <button
                onClick={() => onRegisterNewCustomer(phoneNumber)}
                className="no-drag px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Register Customer
              </button>
            )}
          </div>
        </div>
      </div>
  );
};
