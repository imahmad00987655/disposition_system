'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { customerAPI } from '@/lib/api';
import type { NewCustomer, City, BrandType, ReasonOfCall, InteractionChannel } from '@/lib/types';
import { validatePhone, cleanPhone, formatPhone, formatDateTime, getAgentFromURL, phoneValidation } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

const cities: City[] = [
  "Karachi", "Hyderabad", "Rawalpindi/Islamabad", "Lahore",
  "Faisalabad", "Rawalpindi", "Multan", "Gujranwala",
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

const brandTypes: BrandType[] = [
  "Molty", "Celeste", "Dura", "Superstar", "CHF", "Chemical", "Offisys"
];

const reasonsOfCall: ReasonOfCall[] = [
  "New Complaint", "Order Follow-up", "Dealer Location", "Product Info", "New DDS Appointment"
];

const ddsCities: City[] = ["Lahore", "Karachi", "Hyderabad", "Rawalpindi/Islamabad"];

const interactionChannels: InteractionChannel[] = ['Call', 'WhatsApp', 'Facebook', 'Instagram'];

const schema = z.object({
  gender: z.enum(['Male', 'Female']),
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  city: z.string().min(1, 'Please select a city'),
  contact: z.string().refine((val) => validatePhone(val).valid, {
    message: 'Invalid phone number. Mobile: 11 digits starting with 03. Landline: 10-11 digits.',
  }),
  brand_type: z.string().min(1, 'Please select a brand'),
  reason_of_call: z.string().min(1, 'Please select a reason'),
  address: z.string().optional(),
  comments: z.string().optional(),
  current_status: z.string().optional(),
  agent_name: z.string().min(1),
  interaction_channel: z.enum(['Call', 'WhatsApp', 'Facebook', 'Instagram']),
});

type FormData = z.infer<typeof schema>;

interface NewCustomerRegistrationProps {
  agentName?: string;
  searchTerm?: string;
}

export const NewCustomerRegistration: React.FC<NewCustomerRegistrationProps> = ({ agentName: agentNameProp, searchTerm }) => {
  const [customers, setCustomers] = useState<NewCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDDSFields, setShowDDSFields] = useState(false);
  const [agentName, setAgentName] = useState('');
  const { showToast } = useToast();

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: 'Male',
      current_status: 'Pending',
      interaction_channel: 'Call',
    },
  });

  const reasonOfCall = watch('reason_of_call');
  const contactValue = watch('contact');
  const cityValue = watch('city');

  useEffect(() => {
    loadCustomers();
    loadAgentName();
  }, []);

  useEffect(() => {
    setShowDDSFields(reasonOfCall === 'New DDS Appointment');
  }, [reasonOfCall]);

  useEffect(() => {
    if (reasonOfCall === 'New DDS Appointment' && cityValue && !ddsCities.includes(cityValue as City)) {
      setValue('city', '');
    }
  }, [reasonOfCall, cityValue, setValue]);

  const cityOptions = useMemo(() => {
    return reasonOfCall === 'New DDS Appointment' ? ddsCities : cities;
  }, [reasonOfCall]);

  const visibleCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((customer) => {
      const matches = [
        customer.customer_name,
        customer.contact,
        customer.city,
      ];

      return matches.some(value =>
        value?.toString().toLowerCase().includes(term)
      );
    });
  }, [customers, searchTerm]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerAPI.fetchCustomers();
      if (response.success && response.data) {
        // Handle response format from PHP
        const customersData = (response.data as any).data || response.data;
        setCustomers(customersData);
      } else {
        showToast('error', response.error || 'Failed to load customers');
      }
    } catch (error) {
      showToast('error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadAgentName = () => {
    if (agentNameProp) {
      setAgentName(agentNameProp);
      setValue('agent_name', agentNameProp);
    } else {
      const userNo = getAgentFromURL();
      if (userNo) {
        setAgentName('Current Agent');
        setValue('agent_name', 'Current Agent');
      } else {
        setAgentName('Demo Agent');
        setValue('agent_name', 'Demo Agent');
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // Validate phone number
      const validation = phoneValidation(data.contact);
      if (!validation.valid) {
        showToast('error', 'Invalid phone number. Mobile: 11 digits (03XX), Landline: 10-11 digits');
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
        gender: data.gender,
        customerName: data.customer_name,
        city: data.city,
        contact: validation.cleaned,
        brandType: data.brand_type,
        reasonOfCall: data.reason_of_call,
        address: data.address || '',
        comments: data.comments || '',
        currentStatus: data.current_status || 'Pending',
        agentName: data.agent_name,
        dateAdded: dateAdded,
        interactionChannel: data.interaction_channel,
      };

      // Submit to real backend
      const response = await customerAPI.submitCustomer(customerData);

      if (response.success) {
        showToast('success', 'Customer registered successfully!');
        reset({
          gender: 'Male',
          customer_name: '',
          city: '',
          contact: '',
          brand_type: '',
          reason_of_call: '',
          address: '',
          comments: '',
          current_status: 'Pending',
          agent_name: agentName,
          interaction_channel: 'Call',
        });
        setShowDDSFields(false);
        loadCustomers();
        
        // If DDS appointment, show notification
        if (data.reason_of_call === 'New DDS Appointment') {
          showToast('info', 'DDS appointment created! Check Door to Door section.');
        }
      } else {
        showToast('error', response.error || 'Failed to register customer');
      }
    } catch (error) {
      showToast('error', 'Failed to register customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    reset({
      gender: 'Male',
      customer_name: '',
      city: '',
      contact: '',
      brand_type: '',
      reason_of_call: '',
      address: '',
      comments: '',
      current_status: 'Pending',
      agent_name: agentName,
      interaction_channel: 'Call',
    });
  };

  const columns = [
    {
      id: 'gender',
      header: 'Gender',
      accessorKey: 'gender' as keyof NewCustomer,
      width: '80px',
    },
    {
      id: 'customer_name',
      header: 'Name',
      accessorKey: 'customer_name' as keyof NewCustomer,
      enableSorting: true,
      enableColumnFilter: true,
      width: '200px',
    },
    {
      id: 'city',
      header: 'City',
      accessorKey: 'city' as keyof NewCustomer,
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorKey: 'contact' as keyof NewCustomer,
      cell: (row: NewCustomer) => formatPhone(row.contact),
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'brand_type',
      header: 'Brand',
      accessorKey: 'brand_type' as keyof NewCustomer,
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'reason_of_call',
      header: 'Reason',
      accessorKey: 'reason_of_call' as keyof NewCustomer,
      cell: (row: NewCustomer) => (
        <Badge variant="status" status={row.reason_of_call}>
          {row.reason_of_call}
        </Badge>
      ),
      enableColumnFilter: true,
      width: '180px',
    },
    {
      id: 'agent_name',
      header: 'Agent',
      accessorKey: 'agent_name' as keyof NewCustomer,
      width: '150px',
    },
    {
      id: 'interaction_channel',
      header: 'Channel',
      accessorKey: 'interaction_channel' as keyof NewCustomer,
      cell: (row: NewCustomer) => row.interaction_channel || 'Call',
      enableColumnFilter: true,
      width: '140px',
    },
    {
      id: 'date_added',
      header: 'Date Added',
      accessorKey: 'date_added' as keyof NewCustomer,
      cell: (row: NewCustomer) => row.date_added ? formatDateTime(row.date_added) : 'N/A',
      enableSorting: true,
      width: '180px',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">New Customer Registration</h1>
        <p className="text-gray-600 mt-2">
          Register new customers and manage their information
        </p>
      </div>

      {/* Registration Form */}
      <Card className="hover-lift">
        <CardHeader>
          <CardTitle>Customer Information Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Gender"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
                error={errors.gender?.message}
                {...register('gender')}
              />

              <Input
                label="Customer Name"
                placeholder="Enter full name"
                error={errors.customer_name?.message}
                {...register('customer_name')}
              />

              <Select
                label="Reason of Call"
                options={[
                  { value: '', label: 'Select Reason' },
                  ...reasonsOfCall.map(reason => ({ value: reason, label: reason }))
                ]}
                error={errors.reason_of_call?.message}
                {...register('reason_of_call')}
              />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Contact"
                placeholder="03XX-XXXXXXX or 0XX-XXXXXXX"
                error={errors.contact?.message}
                helperText="Mobile: 11 digits (03XX). Landline: 10-11 digits"
                {...register('contact')}
              />

              <Select
                label="Brand Type"
                options={[
                  { value: '', label: 'Select Brand' },
                  ...brandTypes.map(brand => ({ value: brand, label: brand }))
                ]}
                error={errors.brand_type?.message}
                {...register('brand_type')}
              />

              <Select
                label="City"
                options={[
                  { value: '', label: 'Select City' },
                  ...cityOptions.map(city => ({ value: city, label: city }))
                ]}
                error={errors.city?.message}
                {...register('city')}
              />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Interaction Channel"
                options={interactionChannels.map(channel => ({ value: channel, label: channel }))}
                error={errors.interaction_channel?.message}
                {...register('interaction_channel')}
              />
            </div>

            {/* Conditional DDS Fields */}
            {showDDSFields && (
              <div className="border-t border-gray-200 pt-6 space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold text-purple-600">
                  DDS Appointment Details
                </h3>

                <Textarea
                  label="Address *"
                  placeholder="Enter full address"
                  rows={3}
                  error={errors.address?.message}
                  {...register('address')}
                />

                <Textarea
                  label="Comments"
                  placeholder="Special instructions / Preferred time / Preferred mode of contact"
                  rows={3}
                  {...register('comments')}
                />

                <Select
                  label="Current Status"
                  options={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Customer is in contact with DDS', label: 'Customer is in contact with DDS' },
                    { value: 'Customer not responding', label: 'Customer not responding' },
                    { value: 'Delivered', label: 'Delivered' },
                  ]}
                  {...register('current_status')}
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
            <div className="flex gap-4">
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
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="skeleton h-64 w-full"></div>
          ) : (
            <DataTable
              data={visibleCustomers}
              columns={columns}
              searchPlaceholder="Search customers..."
              exportFilename="new-customers"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

