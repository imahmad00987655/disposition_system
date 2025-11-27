// API service layer for backend communication
import type {
  Complaint,
  ComplaintHistory,
  NewCustomer,
  DDSAppointment,
  TaggedUser,
  ApiResponse,
  InteractionChannel,
  OrderRecord,
  CommentType,
  AdditionalOption,
  TeamDashboardData,
} from './types';

// API endpoints from existing system
// Use environment variables if available, otherwise use defaults

const COMPLAINTS_API = process.env.NEXT_PUBLIC_COMPLAINTS_API || 'http://192.168.1.209:6004/callcenterreportdata';
// PHP files served by XAMPP - point directly to XAMPP server  


// For Docker: Set NEXT_PUBLIC_API_BASE_URL environment variable
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/Disposition-system/';
const ORDERS_API = process.env.NEXT_PUBLIC_ORDERS_API || 'http://192.168.1.209:5125/api_data';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

// Complaint Management APIs
export const complaintAPI = {
  // Fetch all complaints from external API
  fetchComplaints: async (): Promise<ApiResponse<Complaint[]>> => {
    try {
      const response = await fetch(COMPLAINTS_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Sort by date (newest first)
      data.sort((a: any, b: any) => {
        const dateA = new Date(a.CmpDate.split("-").reverse().join("-"));
        const dateB = new Date(b.CmpDate.split("-").reverse().join("-"));
        return dateB.getTime() - dateA.getTime();
      });
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Load complaint history
  loadHistory: async (complaintId: string): Promise<ApiResponse<ComplaintHistory[]>> => {
    return fetchAPI<ComplaintHistory[]>(`load_history.php?complaint_id=${complaintId}`);
  },

  // Submit new comment/disposition
  submitComment: async (data: {
    complaint_id: string;
    comment: string;
    commentType: string;
    additionalComment?: string;
    agentName: string;
    taggedTo?: string;
    timelineDate?: string;
    timelineTime?: string;
  }): Promise<ApiResponse<{ status: string; message: string }>> => {
    try {
      const formData = new URLSearchParams({
        complaint_id: data.complaint_id,
        comment: data.comment,
        commentType: data.commentType,
        additionalComment: data.additionalComment || '',
        agentName: data.agentName,
        taggedTo: data.taggedTo || '',
        timelineDate: data.timelineDate || '',
        timelineTime: data.timelineTime || ''
      });

      const response = await fetch(`${API_BASE_URL}submit_comment.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.status === 'success',
        data: result,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },
};

// New Customer APIs
export const customerAPI = {
  // Fetch all new customers
  fetchCustomers: async (): Promise<ApiResponse<NewCustomer[]>> => {
    return fetchAPI<NewCustomer[]>(`fetch_new_customers.php`);
  },

  // Submit new customer
  submitCustomer: async (data: {
    gender: string;
    customerName: string;
    city: string;
    contact: string;
    brandType: string;
    reasonOfCall: string;
    address?: string;
    comments?: string;
    currentStatus?: string;
    agentName: string;
    dateAdded: string;
    interactionChannel?: InteractionChannel;
  }): Promise<ApiResponse<{ success: boolean; message: string; customerId?: string }>> => {
    try {
      console.log('Sending customer data to API:', data);
      
      const response = await fetch(`${API_BASE_URL}submit_new_customer.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response from submit_new_customer.php:', result);
      
      return {
        success: result.success,
        data: result,
        error: result.success ? undefined : result.message,
      };
    } catch (error) {
      console.error('API Error in submitCustomer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },
};

// DDS APIs
export const ddsAPI = {
  // Fetch all DDS appointments
  fetchDDS: async (): Promise<ApiResponse<DDSAppointment[]>> => {
    return fetchAPI<DDSAppointment[]>(`fetch_dds_data.php`);
  },

  // Update DDS status
  updateStatus: async (data: {
    id: string;
    status: string;
    changedBy?: string;
    changeReason?: string;
  }): Promise<ApiResponse<{ message: string; oldStatus?: string; newStatus?: string }>> => {
    try {
      const response = await fetch(`${API_BASE_URL}update_dds_status.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const normalizedSuccess =
        result.success === true ||
        result.success === 'true' ||
        result.status === true ||
        result.status === 'success' ||
        result.error === false ||
        result.code === 200;

      const message =
        result.message ||
        result.status_message ||
        (normalizedSuccess ? 'Status updated successfully.' : 'Failed to update status.');

      const oldStatus = result.oldStatus ?? result.old_status ?? result.previous_status ?? result.previousStatus;
      const newStatus =
        result.newStatus ?? result.new_status ?? result.current_status ?? result.updated_status ?? data.status;

      return {
        success: normalizedSuccess,
        data: {
          message,
          oldStatus,
          newStatus,
        },
        error: normalizedSuccess ? undefined : (result.error || message || 'Failed to update status.'),
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Fetch DDS status history
  fetchStatusHistory: async (ddsId: string): Promise<ApiResponse<any[]>> => {
    return fetchAPI<any[]>(`fetch_dds_status_history.php?dds_id=${ddsId}`);
  },
};

export const orderAPI = {
  fetchOrders: async (): Promise<ApiResponse<OrderRecord[]>> => {
    try {
      const response = await fetch(ORDERS_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const candidates = [
        data,
        (data as any)?.data,
        (data as any)?.orders,
        (data as any)?.data?.orders,
      ];

      let orders: any[] | null = null;
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          orders = candidate;
          break;
        }
      }

      if (!orders) {
        const candidateObject =
          candidates.find(
            (candidate) =>
              candidate &&
              typeof candidate === 'object' &&
              !Array.isArray(candidate)
          ) ?? null;

        if (candidateObject) {
          const values = Object.values(candidateObject);
          if (values.every(value => value && typeof value === 'object')) {
            orders = values;
          }
        }
      }

      if (!orders) {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          orders = [data];
        }
      }

      orders = orders ?? [];

      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      console.error('Order API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load orders',
      };
    }
  },
};

// Agent and User APIs
export const userAPI = {
  // Fetch agent name by user number
  fetchAgentName: async (userNo: string): Promise<ApiResponse<{ fullName: string }>> => {
    return fetchAPI<{ fullName: string }>(`fetch_agent_name.php?user_no=${userNo}`);
  },

  // Fetch tagged users list
  fetchTaggedUsers: async (department?: string, currentUser?: string): Promise<ApiResponse<{ taggedUsers: TaggedUser[] }>> => {
    const params = new URLSearchParams();
    if (department) {
      params.append('department', department);
    }
    if (currentUser) {
      params.append('current_user', currentUser);
    }
    const queryString = params.toString();
    const url = `fetch_tagged_users.php${queryString ? '?' + queryString : ''}`;
    return fetchAPI<{ taggedUsers: TaggedUser[] }>(url);
  },

  // Fetch Intellicom user for Socket.IO
  fetchIntellicomUser: async (fullName: string): Promise<ApiResponse<{ intellicomUserName: string }>> => {
    return fetchAPI<{ intellicomUserName: string }>(`fetch_intellicom_user.php?full_name=${encodeURIComponent(fullName)}`);
  },

  // Check department access (updated to use username instead of user_code)
  checkDepartmentAccess: async (username: string, department: 'dds' | 'orders'): Promise<ApiResponse<{ hasAccess: boolean; full_name?: string }>> => {
    try {
      const response = await fetch(`${API_BASE_URL}check_department_access.php?username=${encodeURIComponent(username)}&department=${department}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        return {
          success: true,
          data: {
            hasAccess: result.hasAccess || false,
            full_name: result.full_name,
          },
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to check department access',
          data: { hasAccess: false },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check department access',
        data: { hasAccess: false },
      };
    }
  },
};

// Comment System APIs (Database-driven)
export const commentSystemAPI = {
  // Fetch comment types for a specific module
  fetchCommentTypes: async (module: 'complaint' | 'order' | 'dds'): Promise<ApiResponse<CommentType[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}fetch_comment_types.php?module=${module}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle PHP response structure: { status: 'success', data: [...] }
      if (result.status === 'success' && Array.isArray(result.data)) {
        return {
          success: true,
          data: result.data,
        };
      } else if (Array.isArray(result)) {
        // Fallback: if result is directly an array
        return {
          success: true,
          data: result,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Invalid response format',
        };
      }
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },

  // Fetch additional options for a comment type
  fetchAdditionalOptions: async (params: {
    comment_type_id?: number;
    comment_text?: string;
    module?: 'complaint' | 'order' | 'dds';
  }): Promise<ApiResponse<AdditionalOption[]>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params.comment_type_id) {
        queryParams.append('comment_type_id', params.comment_type_id.toString());
      }
      if (params.comment_text) {
        queryParams.append('comment_text', params.comment_text);
      }
      if (params.module) {
        queryParams.append('module', params.module);
      }

      const response = await fetch(`${API_BASE_URL}fetch_additional_options.php?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle PHP response structure: { status: 'success', data: [...] }
      if (result.status === 'success' && Array.isArray(result.data)) {
        return {
          success: true,
          data: result.data,
        };
      } else if (Array.isArray(result)) {
        // Fallback: if result is directly an array
        return {
          success: true,
          data: result,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Invalid response format',
        };
      }
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },
};

// Mock data removed - using real database now
export const mockData = {
  complaints: [] as Complaint[],
  history: [] as ComplaintHistory[],
  newCustomers: [] as NewCustomer[],
  ddsAppointments: [] as DDSAppointment[],
  taggedUsers: [] as TaggedUser[],
  customers: [] as NewCustomer[],
};

// Team Dashboard APIs
export const teamDashboardAPI = {
  // Fetch team performance statistics
  fetchTeamStats: async (params?: {
    dateRange?: 'today' | 'week' | 'month';
    agent?: string;
  }): Promise<ApiResponse<TeamDashboardData>> => {
    try {
      // Get user credentials from sessionStorage and URL
      let agentCode: string | null = null;
      let agentName: string | null = null;
      
      if (typeof window !== 'undefined') {
        agentCode = sessionStorage.getItem('ccms_agentCode');
        agentName = sessionStorage.getItem('ccms_agentName');
        
        // Also check URL for user_no if not in sessionStorage
        if (!agentCode) {
          const urlParams = new URLSearchParams(window.location.search);
          const userNo = urlParams.get('user_no');
          if (userNo) {
            agentCode = userNo;
          }
        }
      }
      
      const queryParams = new URLSearchParams();
      if (params?.dateRange) {
        queryParams.append('date_range', params.dateRange);
      }
      if (params?.agent) {
        queryParams.append('agent', params.agent);
      }
      
      // Add authentication credentials for Rizwan Manager
      if (agentCode) {
        queryParams.append('code', agentCode.toString().trim());
      }
      if (agentName) {
        queryParams.append('username', agentName.toLowerCase().trim());
      }
      // Always send password for authentication
      queryParams.append('password', 'hello');

      const response = await fetch(`${API_BASE_URL}fetch_team_stats.php?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to fetch team statistics',
        };
      }
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  },
};

// All mock data removed - application uses real database now
// See PHP files in public/api/: submit_new_customer.php, fetch_new_customers.php, etc.

