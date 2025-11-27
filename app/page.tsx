'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Users, Package, Truck, Menu, X, LogOut, Search, BarChart3 } from 'lucide-react';
import { ComplaintManagement } from '@/components/modules/ComplaintManagement';
import { NewCustomerRegistration } from '@/components/modules/NewCustomerRegistration';
import { DDSManagement } from '@/components/modules/DDSManagement';
import { OrderManagement } from '@/components/modules/OrderManagement';
import { TeamDashboard } from '@/components/modules/TeamDashboard';
import { SocketIOIntegration } from '@/components/SocketIOIntegration';
import { CallPopup, NoDataFoundNotification } from '@/components/CallPopup';
import { NewCustomerPopup } from '@/components/NewCustomerPopup';
import { CustomerDataPopup } from '@/components/CustomerDataPopup';
import { DDSDataPopup } from '@/components/DDSDataPopup';
import { useToast } from '@/components/ui/Toast';
import { userAPI, complaintAPI, customerAPI, ddsAPI, orderAPI } from '@/lib/api';
import { Complaint, NewCustomer, DDSAppointment, OrderRecord } from '@/lib/types';
import { OrderDataPopup } from '@/components/OrderDataPopup';
import { formatPhoneNumber } from '@/lib/utils';

type TabType = 'complaints' | 'customers' | 'orders' | 'dds' | 'dashboard';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface CallPopupData {
  id: string;
  phoneNumber: string;
  eventType: string;
  matchingComplaints: Complaint[];
  isMinimized: boolean;
}

interface NewCustomerPopupData {
  id: string;
  phoneNumber: string;
  isMinimized: boolean;
}

interface CustomerDataPopupData {
  id: string;
  phoneNumber: string;
  matchingCustomers: NewCustomer[];
  isMinimized: boolean;
}

interface DDSDataPopupData {
  id: string;
  phoneNumber: string;
  matchingDDS: DDSAppointment[];
  isMinimized: boolean;
}

interface OrderDataPopupData {
  id: string;
  phoneNumber: string;
  matchingOrders: OrderRecord[];
  isMinimized: boolean;
}

type MinimizedPopupKind = 'call' | 'customer' | 'dds' | 'order' | 'newCustomer';

interface MinimizedPopupEntry {
  kind: MinimizedPopupKind;
  id: string;
  label: string;
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('complaints');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agentName, setAgentName] = useState<string>('');
  const [department, setDepartment] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [callPopups, setCallPopups] = useState<CallPopupData[]>([]);
  const [customerDataPopups, setCustomerDataPopups] = useState<CustomerDataPopupData[]>([]);
  const [ddsDataPopups, setDDSDataPopups] = useState<DDSDataPopupData[]>([]);
  const [orderDataPopups, setOrderDataPopups] = useState<OrderDataPopupData[]>([]);
  const [showNoDataNotification, setShowNoDataNotification] = useState<string | null>(null);
  const [newCustomerPopups, setNewCustomerPopups] = useState<NewCustomerPopupData[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [allCustomers, setAllCustomers] = useState<NewCustomer[]>([]);
  const [allDDS, setAllDDS] = useState<DDSAppointment[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [isComplaintsLoaded, setIsComplaintsLoaded] = useState(false); // Track if all data is loaded
  const [notificationBadges, setNotificationBadges] = useState({
    complaints: 0,
    customers: 0,
    dds: 0,
    orders: 0,
  }); // Badge counts for header
  const { showToast } = useToast();

  // Determine department access and ensure user is authenticated
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsCheckingAuth(true);

    const urlParams = new URLSearchParams(window.location.search);
    const userNo = urlParams.get('user_no');
    const urlDepartment = urlParams.get('department');
    const storedDepartment = sessionStorage.getItem('ccms_department');
    const storedAgentName = sessionStorage.getItem('ccms_agentName');
    const storedAgentCode = sessionStorage.getItem('ccms_agentCode');
    const effectiveDepartment = storedDepartment || urlDepartment || null;

    // Check if user is authenticated (has user_no in URL, department in URL/session, or stored agent info)
    const hasAuth = userNo || effectiveDepartment || storedAgentName || storedAgentCode;

    if (!hasAuth) {
      // No authentication found, redirect to login
      router.push('/login');
      return;
    }

    // User is authenticated
    setIsAuthenticated(true);
    setIsCheckingAuth(false);

    if (effectiveDepartment) {
      setDepartment(effectiveDepartment);
    }

    if (effectiveDepartment === 'dds' || effectiveDepartment === 'orders') {
      const agentName = storedAgentName || (effectiveDepartment === 'dds' ? 'Door-to-Door Agent' : 'Order Management Agent');
      setAgentName(agentName);
      loadAllData();
      return;
    }

    if (userNo) {
      setDepartment('all');
      loadAgentName(userNo);
      loadAllData();
    } else if (storedAgentCode) {
      // If we have stored agent code but no user_no in URL, use stored code
      setDepartment('all');
      loadAgentName(storedAgentCode);
      loadAllData();
    }
  }, []);

  useEffect(() => {
    if (!department) return;

    if (department === 'dds') {
      setActiveTab('dds');
    } else if (department === 'orders') {
      setActiveTab('orders');
    } else if (activeTab === 'dds' || activeTab === 'orders') {
      setActiveTab('complaints');
    }
  }, [department]);

  const loadAllData = async () => {
    try {
      console.log('🔄 Starting to load all data sources...');
      
      // Load all three data sources in parallel
      const [complaintsResponse, customersResponse, ddsResponse, ordersResponse] = await Promise.all([
        complaintAPI.fetchComplaints(),
        customerAPI.fetchCustomers(),
        ddsAPI.fetchDDS(),
        orderAPI.fetchOrders(),
      ]);
      
      // Set complaints data
      if (complaintsResponse.success && complaintsResponse.data) {
        setAllComplaints(complaintsResponse.data);
        console.log('✅ Loaded complaints:', complaintsResponse.data.length);
      } else {
        console.error('❌ Complaints API failed:', complaintsResponse);
      }
      
      // Set customers data
      console.log('📦 Customer Response:', customersResponse);
      if (customersResponse.success && customersResponse.data) {
        // Check if data is nested (PHP returns {success, data: {success, data: []}})
        const customerData = Array.isArray(customersResponse.data) 
          ? customersResponse.data 
          : ((customersResponse.data as any).data || []);
        setAllCustomers(customerData);
        console.log('✅ Loaded customers:', customerData.length);
      } else {
        console.error('❌ Customers API failed:', customersResponse);
        setAllCustomers([]); // Set empty array to prevent undefined
      }
      
      // Set DDS data
      console.log('📦 DDS Response:', ddsResponse);
      if (ddsResponse.success && ddsResponse.data) {
        // Check if data is nested (PHP returns {success, data: {success, data: []}})
        const ddsData = Array.isArray(ddsResponse.data) 
          ? ddsResponse.data 
          : ((ddsResponse.data as any).data || []);
        setAllDDS(ddsData);
        console.log('✅ Loaded DDS appointments:', ddsData.length);
      } else {
        console.error('❌ DDS API failed:', ddsResponse);
        setAllDDS([]); // Set empty array to prevent undefined
      }

      // Set Orders data
      console.log('📦 Orders Response:', ordersResponse);
      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = Array.isArray(ordersResponse.data)
          ? ordersResponse.data
          : [];
        setAllOrders(ordersData);
        console.log('✅ Loaded orders:', ordersData.length);
      } else {
        console.error('❌ Orders API failed:', ordersResponse);
        setAllOrders([]);
      }
      
      setIsComplaintsLoaded(true); // Mark as all data loaded
      console.log('✅ All data sources loaded successfully');
    } catch (error) {
      console.error('❌ Failed to preload data:', error);
      setIsComplaintsLoaded(true); // Mark as loaded even on error to prevent infinite wait
    }
  };

  const filteredComplaints = useMemo(() => {
    if (!globalSearchTerm) return allComplaints;
    const term = globalSearchTerm.trim().toLowerCase();
    if (!term) return allComplaints;
    return allComplaints.filter((complaint) => {
      const values = [
        complaint.CmpNo,
        complaint.CName,
        complaint.Contact,
        complaint.Contact2,
      ];
      return values.some((value) => value?.toString().toLowerCase().includes(term));
    });
  }, [allComplaints, globalSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!globalSearchTerm) return allCustomers;
    const term = globalSearchTerm.trim().toLowerCase();
    if (!term) return allCustomers;
    return allCustomers.filter((customer) => {
      const values = [
        customer.customer_name,
        customer.contact,
        customer.city,
      ];
      return values.some((value) => value?.toString().toLowerCase().includes(term));
    });
  }, [allCustomers, globalSearchTerm]);

  const filteredOrders = useMemo(() => {
    if (!globalSearchTerm) return allOrders;
    const term = globalSearchTerm.trim().toLowerCase();
    if (!term) return allOrders;
    return allOrders.filter((order) => {
      const values = [
        order.id,
        order.order_name,
        order.order_status,
        order.customer_phone,
        order.customer_name,
      ];
      return values.some((value) => value?.toString().toLowerCase().includes(term));
    });
  }, [allOrders, globalSearchTerm]);

  const filteredDDS = useMemo(() => {
    if (!globalSearchTerm) return allDDS;
    const term = globalSearchTerm.trim().toLowerCase();
    if (!term) return allDDS;
    return allDDS.filter((appointment) => {
      const values = [
        appointment.id,
        appointment.customer_name,
        appointment.contact,
        appointment.city,
      ];
      return values.some((value) => value?.toString().toLowerCase().includes(term));
    });
  }, [allDDS, globalSearchTerm]);

  const searchResultBadges = useMemo(() => ({
    complaints: filteredComplaints.length,
    customers: filteredCustomers.length,
    orders: filteredOrders.length,
    dds: filteredDDS.length,
  }), [filteredComplaints.length, filteredCustomers.length, filteredOrders.length, filteredDDS.length]);

  const loadAgentName = async (userNo: string) => {
    try {
      const response = await userAPI.fetchAgentName(userNo);
      if (response.success && response.data?.fullName) {
        setAgentName(response.data.fullName);
      }
    } catch (error) {
      console.error('Failed to load agent name:', error);
    }
  };

  const handleCallEvent = (phoneNumber: string, eventType: string, _: any[]) => {
    console.log('=================== Call Event Received ===================');
    console.log('📞 Phone Number:', phoneNumber);
    console.log('📋 Event Type:', eventType);
    console.log('📊 Data loaded - Complaints:', allComplaints.length, '| Customers:', allCustomers.length, '| DDS:', allDDS.length, '| Orders:', allOrders.length);
    
    // Clean the incoming phone number (remove dashes, spaces, etc.)
    const cleanedIncomingNumber = phoneNumber.replace(/\D/g, '');
    console.log('Cleaned incoming number:', cleanedIncomingNumber);
    
    // Helper function to match phone numbers
    const matchesPhone = (contact: string | undefined) => {
      if (!contact) return false;
      const contactCleaned = contact.replace(/\D/g, '');
      const incomingLast10 = cleanedIncomingNumber.length >= 10 ? cleanedIncomingNumber.slice(-10) : cleanedIncomingNumber;
      const contactLast10 = contactCleaned.length >= 10 ? contactCleaned.slice(-10) : contactCleaned;
      return contactCleaned === cleanedIncomingNumber || contactLast10 === incomingLast10;
    };
    
    // 1. CHECK COMPLAINT MANAGEMENT
    const matchingComplaints = allComplaints.filter(complaint => 
      matchesPhone(complaint.Contact) || matchesPhone(complaint.Contact2)
    );
    
    // 2. CHECK NEW CUSTOMER REGISTRATION
    const matchingCustomers = allCustomers.filter(customer => 
      matchesPhone(customer.contact)
    );
    
    // 3. CHECK DOOR TO DOOR
    const matchingDDS = allDDS.filter(dds => 
      matchesPhone(dds.contact)
    );

    const matchingOrders = allOrders.filter(order =>
      matchesPhone(order.customer_phone)
    );
    
    console.log('✅ Found matches - Complaints:', matchingComplaints.length, 
                '| Customers:', matchingCustomers.length, '| DDS:', matchingDDS.length,
                '| Orders:', matchingOrders.length);
    
    // Generate unique ID for popups
    const popupId = `${phoneNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Track total matches
    const totalMatches = matchingComplaints.length + matchingCustomers.length + matchingDDS.length + matchingOrders.length;
    
    if (totalMatches > 0) {
      // Update notification badges in header
      setNotificationBadges({
        complaints: matchingComplaints.length,
        customers: matchingCustomers.length,
        dds: matchingDDS.length,
        orders: matchingOrders.length,
      });
      
      // Show complaint popup if found
      if (matchingComplaints.length > 0) {
        setCallPopups(prev => [...prev, {
          id: `complaint-${popupId}`,
          phoneNumber,
          eventType,
          matchingComplaints,
          isMinimized: false,
        }]);
        console.log('📋 Showing Complaint popup');
      }
      
      // Show customer popup if found
      if (matchingCustomers.length > 0) {
        setCustomerDataPopups(prev => [...prev, {
          id: `customer-${popupId}`,
          phoneNumber,
          matchingCustomers,
          isMinimized: false,
        }]);
        console.log('👤 Showing Customer popup');
      }
      
      // Show DDS popup if found
      if (matchingDDS.length > 0) {
        setDDSDataPopups(prev => [...prev, {
          id: `dds-${popupId}`,
          phoneNumber,
          matchingDDS,
          isMinimized: false,
        }]);
        console.log('🚚 Showing DDS popup');
      }

      // Show Orders popup if found
      if (matchingOrders.length > 0) {
        setOrderDataPopups(prev => [...prev, {
          id: `order-${popupId}`,
          phoneNumber,
          matchingOrders,
          isMinimized: false,
        }]);
        console.log('📦 Showing Orders popup');
      }
    } else {
      // No data found anywhere - show new customer registration popup
      console.log('❌ No data found in any module');
      setNotificationBadges({ complaints: 0, customers: 0, dds: 0, orders: 0 });
      setShowNoDataNotification(phoneNumber);
      setNewCustomerPopups(prev => [...prev, {
        id: popupId,
        phoneNumber,
        isMinimized: false,
      }]);
    }
    
    console.log('=================== End Call Event ===================');
  };

  const handleRegisterNewCustomer = (phoneNumber: string) => {
    // Generate unique ID (timestamp + random to prevent collisions)
    const popupId = `${phoneNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to new customer popups stack
    setNewCustomerPopups(prev => [...prev, {
      id: popupId,
      phoneNumber,
    isMinimized: false,
    }]);
  };

  const handleCloseCallPopup = (id: string) => {
    setCallPopups(prev => prev.filter(popup => popup.id !== id));
  };

  const handleCloseNewCustomerPopup = (id: string) => {
    setNewCustomerPopups(prev => prev.filter(popup => popup.id !== id));
  };

  const bringCallPopupToFront = (id: string) => {
    setCallPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const bringNewCustomerPopupToFront = (id: string) => {
    setNewCustomerPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const handleCloseCustomerDataPopup = (id: string) => {
    setCustomerDataPopups(prev => prev.filter(popup => popup.id !== id));
  };

  const bringCustomerDataPopupToFront = (id: string) => {
    setCustomerDataPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const handleCloseDDSDataPopup = (id: string) => {
    setDDSDataPopups(prev => prev.filter(popup => popup.id !== id));
  };

  const bringDDSDataPopupToFront = (id: string) => {
    setDDSDataPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const handleCloseOrderDataPopup = (id: string) => {
    setOrderDataPopups(prev => prev.filter(popup => popup.id !== id));
  };

  const bringOrderDataPopupToFront = (id: string) => {
    setOrderDataPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const minimizeCallPopup = (id: string) => {
    setCallPopups(prev => prev.map(p => p.id === id ? { ...p, isMinimized: true } : p));
  };

  const restoreCallPopup = (id: string) => {
    setCallPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const minimizeNewCustomerPopup = (id: string) => {
    setNewCustomerPopups(prev => prev.map(p => p.id === id ? { ...p, isMinimized: true } : p));
  };

  const restoreNewCustomerPopup = (id: string) => {
    setNewCustomerPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const minimizeCustomerDataPopup = (id: string) => {
    setCustomerDataPopups(prev => prev.map(p => p.id === id ? { ...p, isMinimized: true } : p));
  };

  const restoreCustomerDataPopup = (id: string) => {
    setCustomerDataPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const minimizeDDSDataPopup = (id: string) => {
    setDDSDataPopups(prev => prev.map(p => p.id === id ? { ...p, isMinimized: true } : p));
  };

  const restoreDDSDataPopup = (id: string) => {
    setDDSDataPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const minimizeOrderDataPopup = (id: string) => {
    setOrderDataPopups(prev => prev.map(p => p.id === id ? { ...p, isMinimized: true } : p));
  };

  const restoreOrderDataPopup = (id: string) => {
    setOrderDataPopups(prev => {
      const popup = prev.find(p => p.id === id);
      if (!popup) return prev;
      const others = prev.filter(p => p.id !== id);
      return [...others, { ...popup, isMinimized: false }];
    });
  };

  const visibleCallPopups = callPopups.filter(p => !p.isMinimized);
  const visibleCustomerDataPopups = customerDataPopups.filter(p => !p.isMinimized);
  const visibleDDSDataPopups = ddsDataPopups.filter(p => !p.isMinimized);
  const visibleOrderDataPopups = orderDataPopups.filter(p => !p.isMinimized);
  const visibleNewCustomerPopups = newCustomerPopups.filter(p => !p.isMinimized);

  const minimizedPopups: MinimizedPopupEntry[] = [
    ...callPopups.filter(p => p.isMinimized).map(p => ({
      kind: 'call' as MinimizedPopupKind,
      id: p.id,
      label: `Call ${formatPhoneNumber(p.phoneNumber)}`,
    })),
    ...customerDataPopups.filter(p => p.isMinimized).map(p => ({
      kind: 'customer' as MinimizedPopupKind,
      id: p.id,
      label: `Customer ${formatPhoneNumber(p.phoneNumber)}`,
    })),
    ...ddsDataPopups.filter(p => p.isMinimized).map(p => ({
      kind: 'dds' as MinimizedPopupKind,
      id: p.id,
      label: `DDS ${formatPhoneNumber(p.phoneNumber)}`,
    })),
    ...orderDataPopups.filter(p => p.isMinimized).map(p => ({
      kind: 'order' as MinimizedPopupKind,
      id: p.id,
      label: `Order ${formatPhoneNumber(p.phoneNumber)}`,
    })),
    ...newCustomerPopups.filter(p => p.isMinimized).map(p => ({
      kind: 'newCustomer' as MinimizedPopupKind,
      id: p.id,
      label: `New Customer ${formatPhoneNumber(p.phoneNumber)}`,
    })),
  ];

  const handleRestoreMinimizedPopup = (entry: MinimizedPopupEntry) => {
    switch (entry.kind) {
      case 'call':
        restoreCallPopup(entry.id);
        break;
      case 'customer':
        restoreCustomerDataPopup(entry.id);
        break;
      case 'dds':
        restoreDDSDataPopup(entry.id);
        break;
      case 'order':
        restoreOrderDataPopup(entry.id);
        break;
      case 'newCustomer':
        restoreNewCustomerPopup(entry.id);
        break;
      default:
        break;
    }
  };


  // Check if user is Rizwan Manager (code: 48)
  const isRizwanManager = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const agentCode = sessionStorage.getItem('ccms_agentCode');
    const agentName = sessionStorage.getItem('ccms_agentName');
    const urlParams = new URLSearchParams(window.location.search);
    const userNo = urlParams.get('user_no');
    const code = agentCode || userNo;
    return code === '48' || (agentName && agentName.toLowerCase().includes('rizwan'));
  }, []);

  const tabs: Tab[] = [
    {
      id: 'complaints',
      label: 'Complaints',
      icon: <Phone className="w-5 h-5" />,
      component: <ComplaintManagement onComplaintsLoaded={setAllComplaints} searchTerm={globalSearchTerm} />,
    },
    {
      id: 'customers',
      label: 'New Customer',
      icon: <Users className="w-5 h-5" />,
      component: <NewCustomerRegistration agentName={agentName} searchTerm={globalSearchTerm} />,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <Package className="w-5 h-5" />,
      component: <OrderManagement searchTerm={globalSearchTerm} />,
    },
    {
      id: 'dds',
      label: 'Door to Door',
      icon: <Truck className="w-5 h-5" />,
      component: <DDSManagement searchTerm={globalSearchTerm} />,
    },
    // Only show Team Dashboard tab for Rizwan Manager
    ...(isRizwanManager ? [{
      id: 'dashboard' as TabType,
      label: 'Team Dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
      component: <TeamDashboard />,
    }] : []),
  ];

  const visibleTabs = department === 'dds'
    ? tabs.filter(tab => tab.id === 'dds')
    : department === 'orders'
      ? tabs.filter(tab => tab.id === 'orders')
      : tabs; // Show all tabs (dashboard only if isRizwanManager)

  // If active tab is dashboard but user is not Rizwan Manager, switch to complaints
  useEffect(() => {
    if (activeTab === 'dashboard' && !isRizwanManager) {
      setActiveTab('complaints');
    }
  }, [activeTab, isRizwanManager]);

  const activeTabData = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0];

  // Show loading or redirect if not authenticated
  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-4">
            {/* Logo & Branding */}
            <div className="flex items-center space-x-3 lg:space-x-4 flex-shrink-0">
              <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 p-2.5 lg:p-3 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
                <Phone className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Customer Relationship Management
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Customer Journey Tracking System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4 flex-1 max-w-4xl mx-6">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={globalSearchTerm}
                  onChange={(event) => setGlobalSearchTerm(event.target.value)}
                  placeholder="Search phone, order #, complaint #, DDS #..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                />
              </div>
              
              {/* Navigation Tabs */}
              <nav className="flex items-center space-x-2">
                {visibleTabs.map((tab) => {
                  const badgeCount = globalSearchTerm
                    ? tab.id === 'complaints' ? searchResultBadges.complaints :
                      tab.id === 'customers' ? searchResultBadges.customers :
                      tab.id === 'orders' ? searchResultBadges.orders :
                      tab.id === 'dds' ? searchResultBadges.dds : 0
                    : tab.id === 'complaints' ? notificationBadges.complaints :
                      tab.id === 'customers' ? notificationBadges.customers :
                      tab.id === 'orders' ? notificationBadges.orders :
                      tab.id === 'dds' ? notificationBadges.dds :
                      0;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                      transition-all duration-300 outline-none relative group
                      ${activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                        : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-600'
                      }
                    `}
                  >
                    <span className={activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-purple-600'}>
                      {tab.icon}
                    </span>
                    <span className="whitespace-nowrap">{tab.label}</span>
                    
                    {/* Notification Badge */}
                    {badgeCount > 0 && (
                      <span className={`absolute -top-1 -right-1 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                        activeTab === tab.id ? 'bg-white text-purple-600' : 'bg-red-500 animate-pulse'
                      }`}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
              </nav>
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.clear();
                    router.push('/login');
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="whitespace-nowrap">Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden pb-4 space-y-3 border-t border-gray-100 mt-2 pt-4"
              >
                {/* Mobile Search Bar */}
                <div className="px-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={globalSearchTerm}
                      onChange={(event) => setGlobalSearchTerm(event.target.value)}
                      placeholder="Search phone, order #, complaint #, DDS #..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                
                {/* Mobile Navigation Tabs */}
                <div className="space-y-2 px-1">
                  {visibleTabs.map((tab) => {
                    const badgeCount = globalSearchTerm
                      ? tab.id === 'complaints' ? searchResultBadges.complaints :
                        tab.id === 'customers' ? searchResultBadges.customers :
                        tab.id === 'orders' ? searchResultBadges.orders :
                        tab.id === 'dds' ? searchResultBadges.dds : 0
                      : tab.id === 'complaints' ? notificationBadges.complaints :
                        tab.id === 'customers' ? notificationBadges.customers :
                        tab.id === 'orders' ? notificationBadges.orders :
                        tab.id === 'dds' ? notificationBadges.dds :
                        0;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm
                          transition-all duration-300 outline-none relative
                          ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                            : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-600'
                          }
                        `}
                      >
                        <span className={activeTab === tab.id ? 'text-white' : 'text-gray-500'}>
                          {tab.icon}
                        </span>
                        <span className="flex-1 text-left">{tab.label}</span>
                        
                        {/* Notification Badge */}
                        {badgeCount > 0 && (
                          <span className={`text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                            activeTab === tab.id ? 'bg-white text-purple-600' : 'bg-red-500 text-white animate-pulse'
                          }`}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Mobile Logout Button */}
                <div className="px-1 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        sessionStorage.clear();
                        router.push('/login');
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 font-medium text-sm shadow-md"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTabData?.component}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600">
                © 2025 Master Group of industries. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Brands: Molty | Celeste | Dura | Superstar | CHF | Chemical | Offisys
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">System Online</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Socket.IO Integration - Only connect when BOTH agentName and complaints are loaded */}
      {agentName && isComplaintsLoaded && department !== 'dds' && (
        <SocketIOIntegration
          agentName={agentName}
          onCallEvent={handleCallEvent}
        />
      )}
      
      {/* Loading indicator for all data */}
      {agentName && !isComplaintsLoaded && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Loading data sources...</span>
          </div>
        </div>
      )}

      {/* Call Popups - For Existing Complaints (Multiple Stackable) */}
      {visibleCallPopups.map((popup, index) => (
        <CallPopup
          key={popup.id}
          phoneNumber={popup.phoneNumber}
          eventType={popup.eventType}
          matchingComplaints={popup.matchingComplaints}
          onClose={() => handleCloseCallPopup(popup.id)}
          onRegisterNewCustomer={handleRegisterNewCustomer}
          onFocus={() => bringCallPopupToFront(popup.id)}
          onMinimize={() => minimizeCallPopup(popup.id)}
          zIndex={1000 + index}
        />
      ))}

      {/* Customer Data Popups - For Existing Customer Records (Multiple Stackable) */}
      {visibleCustomerDataPopups.map((popup, index) => (
        <CustomerDataPopup
          key={popup.id}
          phoneNumber={popup.phoneNumber}
          matchingCustomers={popup.matchingCustomers}
          onClose={() => handleCloseCustomerDataPopup(popup.id)}
          onFocus={() => bringCustomerDataPopupToFront(popup.id)}
          onMinimize={() => minimizeCustomerDataPopup(popup.id)}
          zIndex={1000 + visibleCallPopups.length + index}
        />
      ))}

      {/* DDS Data Popups - For Existing DDS Appointments (Multiple Stackable) */}
      {visibleDDSDataPopups.map((popup, index) => (
        <DDSDataPopup
          key={popup.id}
          phoneNumber={popup.phoneNumber}
          matchingDDS={popup.matchingDDS}
          onClose={() => handleCloseDDSDataPopup(popup.id)}
          onFocus={() => bringDDSDataPopupToFront(popup.id)}
          onMinimize={() => minimizeDDSDataPopup(popup.id)}
          zIndex={1000 + visibleCallPopups.length + visibleCustomerDataPopups.length + index}
        />
      ))}

      {/* Order Data Popups - For Existing Orders (Multiple Stackable) */}
      {visibleOrderDataPopups.map((popup, index) => (
        <OrderDataPopup
          key={popup.id}
          orders={popup.matchingOrders}
          onClose={() => handleCloseOrderDataPopup(popup.id)}
          onFocus={() => bringOrderDataPopupToFront(popup.id)}
          onMinimize={() => minimizeOrderDataPopup(popup.id)}
          zIndex={
            1000 +
            visibleCallPopups.length +
            visibleCustomerDataPopups.length +
            visibleDDSDataPopups.length +
            index
          }
        />
      ))}

      {/* No Data Found Notification - Bottom Right */}
      {showNoDataNotification && (
        <NoDataFoundNotification
          phoneNumber={showNoDataNotification}
          onClose={() => setShowNoDataNotification(null)}
        />
      )}

      {/* New Customer Registration Popups - For Unknown Numbers (Multiple Stackable) */}
      {visibleNewCustomerPopups.map((popup, index) => (
        <NewCustomerPopup
          key={popup.id}
          phoneNumber={popup.phoneNumber}
          agentName={agentName}
          onClose={() => handleCloseNewCustomerPopup(popup.id)}
          onFocus={() => bringNewCustomerPopupToFront(popup.id)}
          onMinimize={() => minimizeNewCustomerPopup(popup.id)}
          zIndex={
            1000 +
            visibleCallPopups.length +
            visibleCustomerDataPopups.length +
            visibleDDSDataPopups.length +
            visibleOrderDataPopups.length +
            index
          }
        />
      ))}

      {minimizedPopups.length > 0 && (
        <div className="fixed bottom-4 left-4 space-y-2 z-[2500]">
          {minimizedPopups.map(entry => (
            <button
              key={`${entry.kind}-${entry.id}`}
              onClick={() => handleRestoreMinimizedPopup(entry)}
              className="bg-white/95 backdrop-blur border border-gray-200 shadow-lg px-4 py-2 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-100 transition"
            >
              <span>{entry.label}</span>
              <span className="text-xs text-purple-500">Restore</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

