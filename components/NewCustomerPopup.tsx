'use client';

import React, { useState, useEffect } from 'react';
import { X, Minus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { customerAPI } from '@/lib/api';
import { phoneValidation } from '@/lib/utils';
import type { InteractionChannel, City } from '@/lib/types';

interface NewCustomerPopupProps {
  phoneNumber: string;
  agentName: string;
  onClose: () => void;
  onFocus?: () => void;
  onMinimize?: () => void;
  zIndex?: number;
}

const cities = [
  "Karachi", "Hyderabad", "Rawalpindi/Islamabad", "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala",
  "Sialkot", "Bahawalpur", "Sargodha", "Sheikhupura", "Jhang",
  "Gujrat", "Sahiwal", "Kasur", "Rahim Yar Khan", "Okara",
  "Wazirabad", "Dera Ghazi Khan", "Chiniot", "Kamoke", "Mandi Bahauddin",
  "Jhelum", "Sadiqabad", "Khanewal", "Hafizabad", "Khushab",
  "Muzaffargarh", "Khanpur", "Chakwal", "Mianwali", "Vehari",
  "Burewala", "Bahawalnagar", "Toba Tek Singh", "Pakpattan", "Jaranwala",
  "Chishtian", "Daska", "Muridke", "Ahmadpur East", "Kamalia",
  "Kharian", "Gojra", "Mandi Burewala", "Samundri", "Pattoki",
  "Jahanian", "Kot Addu", "Jampur", "Layyah", "Rajanpur",
  "Attock", "Narowal", "Lodhran", "Taxila", "Haroonabad",
  "Bhakkar", "Murree", "Nankana Sahib", "Ferozewala", "Hasilpur"
];

const brandTypes = ["Molty", "Celeste", "Dura", "Superstar", "CHF", "Chemical", "Offisys"];
const reasonsOfCall = ["New Complaint", "Order Follow-up", "Dealer Location", "Product Info", "New DDS Appointment"];
const ddsCities: City[] = ["Lahore", "Karachi", "Hyderabad", "Rawalpindi/Islamabad"];
const interactionChannels: InteractionChannel[] = ['Call', 'WhatsApp', 'Facebook', 'Instagram'];

export const NewCustomerPopup: React.FC<NewCustomerPopupProps> = ({
  phoneNumber,
  agentName,
  onClose,
  onFocus,
  onMinimize,
  zIndex = 1000,
}) => {
  const [formData, setFormData] = useState({
    gender: 'Male',
    customer_name: '',
    city: '',
    contact: phoneNumber,
    brand_type: '',
    reason_of_call: '',
    address: '',
    comments: '',
    current_status: 'Pending',
    interaction_channel: 'Call' as InteractionChannel,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDDSFields, setShowDDSFields] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { showToast } = useToast();

  useEffect(() => {
    setShowDDSFields(formData.reason_of_call === 'New DDS Appointment');
  }, [formData.reason_of_call]);

  useEffect(() => {
    if (formData.reason_of_call === 'New DDS Appointment' && formData.city && !ddsCities.includes(formData.city as City)) {
      setFormData(prev => ({ ...prev, city: '' }));
    }
  }, [formData.reason_of_call, formData.city]);

  const availableCities = formData.reason_of_call === 'New DDS Appointment' ? ddsCities : cities;

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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.customer_name || formData.customer_name.trim().length < 2) {
        showToast('error', 'Please enter customer name (minimum 2 characters)');
        setSubmitting(false);
        return;
      }

      if (!formData.city) {
        showToast('error', 'Please select a city');
        setSubmitting(false);
        return;
      }

      if (!formData.brand_type) {
        showToast('error', 'Please select a brand type');
        setSubmitting(false);
        return;
      }

      if (!formData.reason_of_call) {
        showToast('error', 'Please select reason of call');
        setSubmitting(false);
        return;
      }

      // Validate address for DDS appointments
      if (formData.reason_of_call === 'New DDS Appointment' && (!formData.address || formData.address.trim().length === 0)) {
        showToast('error', 'Address is required for DDS Appointment');
        setSubmitting(false);
        return;
      }

      // Validate phone number
      const validation = phoneValidation(formData.contact);
      if (!validation.valid) {
        showToast('error', 'Invalid phone number. Mobile: 11 digits (03XX), Landline: 10-11 digits');
        setSubmitting(false);
        return;
      }

      if (!agentName) {
        showToast('error', 'Agent name is required');
        setSubmitting(false);
        return;
      }

      // Prepare data with Pakistan timezone
      const now = new Date();
      const pakistanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
      const dateAdded = pakistanTime.getFullYear() + '-' + 
                       String(pakistanTime.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(pakistanTime.getDate()).padStart(2, '0') + ' ' + 
                       String(pakistanTime.getHours()).padStart(2, '0') + ':' + 
                       String(pakistanTime.getMinutes()).padStart(2, '0') + ':' + 
                       String(pakistanTime.getSeconds()).padStart(2, '0');

      const customerData = {
        gender: formData.gender,
        customerName: formData.customer_name,
        city: formData.city,
        contact: validation.cleaned,
        brandType: formData.brand_type,
        reasonOfCall: formData.reason_of_call,
        address: formData.address || '',
        comments: formData.comments || '',
        currentStatus: formData.current_status || 'Pending',
        agentName: agentName,
        dateAdded: dateAdded,
        interactionChannel: formData.interaction_channel,
      };

      console.log('Submitting customer data:', customerData);
      const response = await customerAPI.submitCustomer(customerData);
      console.log('API Response:', response);

      if (response.success) {
        showToast('success', 'Customer registered successfully!');
        onClose();
        
        // If DDS appointment, show notification
        if (formData.reason_of_call === 'New DDS Appointment') {
          showToast('info', 'DDS appointment created! Check Door to Door section.');
        }
      } else {
        const errorMessage = response.error || 
                           (response.data as any)?.message || 
                           'Failed to register customer';
        console.error('Registration error:', errorMessage);
        showToast('error', errorMessage);
      }
    } catch (error) {
      console.error('Submit error:', error);
      showToast('error', 'Failed to register customer: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      gender: 'Male',
      customer_name: '',
      city: '',
      contact: phoneNumber,
      brand_type: '',
      reason_of_call: '',
      address: '',
      comments: '',
      current_status: 'Pending',
      interaction_channel: 'Call',
    });
    setShowDDSFields(false);
  };

  const popupStyle = position.x === 0 && position.y === 0
    ? {} // Centered initially
    : {
        position: 'fixed' as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
      };

  return (
    <div 
      className={`fixed bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-fade-in cursor-move transition-shadow ${
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
          
          <div>
            <h2 className="text-2xl font-bold">New Customer Registration</h2>
            <p className="text-sm opacity-90 mt-1">Phone Number: <strong>{phoneNumber}</strong></p>
          </div>
        </div>

        {/* Form Content */}
        <div className="no-drag p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Gender & Customer Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Gender *"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
              />

              <Input
                label="Customer Name *"
                placeholder="Enter full name"
                value={formData.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
                required
              />
            </div>

            {/* Row 2: City & Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="City *"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                options={[
                  { value: '', label: 'Select City' },
                  ...availableCities.map(city => ({ value: city, label: city }))
                ]}
                required
              />

              <Input
                label="Contact *"
                placeholder="03XX-XXXXXXX"
                value={formData.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                readOnly
                className="bg-gray-100"
              />
            </div>

            {/* Row 3: Brand Type & Reason of Call */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Brand Type *"
                value={formData.brand_type}
                onChange={(e) => handleChange('brand_type', e.target.value)}
                options={[
                  { value: '', label: 'Select Brand' },
                  ...brandTypes.map(brand => ({ value: brand, label: brand }))
                ]}
                required
              />

              <Select
                label="Reason of Call *"
                value={formData.reason_of_call}
                onChange={(e) => handleChange('reason_of_call', e.target.value)}
                options={[
                  { value: '', label: 'Select Reason' },
                  ...reasonsOfCall.map(reason => ({ value: reason, label: reason }))
                ]}
                required
              />
            </div>

            {/* Row 4: Interaction Channel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Interaction Channel *"
                value={formData.interaction_channel}
                onChange={(e) => handleChange('interaction_channel', e.target.value)}
                options={interactionChannels.map(channel => ({ value: channel, label: channel }))}
                required
              />
            </div>

            {/* Conditional DDS Fields */}
            {showDDSFields && (
              <div className="border-t border-gray-200 pt-4 space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold text-purple-600">
                  DDS Appointment Details
                </h3>

                <Textarea
                  label="Address *"
                  placeholder="Enter complete address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  required={showDDSFields}
                />

                <Textarea
                  label="Comments (Special instruction / Preferred time / Preferred mode of contact)"
                  placeholder="Please provide details..."
                  rows={3}
                  value={formData.comments}
                  onChange={(e) => handleChange('comments', e.target.value)}
                />

                <Select
                  label="Current Status"
                  value={formData.current_status}
                  onChange={(e) => handleChange('current_status', e.target.value)}
                  options={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Customer is in contact with DDS', label: 'Customer is in contact with DDS' },
                    { value: 'Customer not responding', label: 'Customer not responding' },
                    { value: 'Delivered', label: 'Delivered' },
                  ]}
                />
              </div>
            )}

            {/* Agent Name */}
            <Input
              label="Agent Name"
              value={agentName}
              readOnly
              className="bg-gray-100"
            />

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
                className="flex-1"
              >
                Submit
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </form>
        </div>
      </div>
  );
};

