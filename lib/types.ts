// Core data types for the application

export interface Complaint {
  CmpNo: string;
  CName: string;
  Contact: string;
  Contact2?: string;
  CmpDate: string;
  qltytext?: string;
  qltytext_khi?: string;
  sizetext?: string;
  sizetext_khi?: string;
  CurrentStatus: string;
  vRemarks1?: string;
  Zone?: string;
  ProductType: string;
  Gr_Price?: number;
  IssueInMatress?: string;
  DecisionManagement?: string;
  customerpayment?: number;
  custpaymamt_khi?: string;
  dealtext_payment?: string;
  dealtext?: string;
  Address?: string;
  cvrprice?: number | string; // Cover price
}

export interface ComplaintHistory {
  comment: string;
  timestamp: string;
  agent_name: string;
  tagged_to?: string;
  timeline_date?: string;
  timeline_time?: string;
  countdown_seconds?: number | null;
}

export type InteractionChannel =
  | 'Call'
  | 'WhatsApp'
  | 'Facebook'
  | 'Instagram';

export interface NewCustomer {
  id?: string;
  gender: 'Male' | 'Female';
  customer_name: string;
  city: string;
  contact: string;
  brand_type: string;
  reason_of_call: string;
  address?: string;
  comments?: string;
  current_status?: string;
  agent_name: string;
  date_added?: string;
  interaction_channel?: InteractionChannel;
}

export interface DDSAppointment {
  id?: string;
  gender: 'Male' | 'Female';
  customer_name: string;
  city: string;
  contact: string;
  brand_type: string;
  address: string;
  comments?: string;
  current_status?: 'Pending' | 'Customer is in contact with DDS' | 'Customer not responding' | 'Delivered';
  agent_name: string;
  date_added?: string;
}

export interface Agent {
  user_no: string;
  name: string;
}

export interface TaggedUser {
  code: string;
  fullName: string;
}

// Database-driven comment system types (defined early to avoid conflicts)
export interface CommentType {
  id: number;
  comment_text: string;
  requires_tagged_user: number; // 1=required, 0=optional, -1=not needed
  requires_timeline: number; // 1=required, 0=optional, -1=not needed
  auto_timeline: boolean;
  clear_timeline: boolean;
  display_order: number;
}

// Old hardcoded types removed - all comment types and options now come from database
// Use CommentType interface and AdditionalOption interface (database-driven) instead

export type City =
  | "Karachi"
  | "Hyderabad"
  | "Rawalpindi/Islamabad"
  | "Lahore"
  | "Faisalabad"
  | "Rawalpindi"
  | "Multan"
  | "Gujranwala"
  | "Sialkot"
  | "Bahawalpur"
  | "Sargodha"
  | "Sheikhupura"
  | "Jhang"
  | "Gujrat"
  | "Sahiwal"
  | "Kasur"
  | "Rahim Yar Khan"
  | "Okara"
  | "Wazirabad"
  | "Dera Ghazi Khan"
  | "Chiniot"
  | "Kamoke"
  | "Mandi Bahauddin"
  | "Jhelum"
  | "Sadiqabad"
  | "Khanewal"
  | "Hafizabad"
  | "Khushab"
  | "Muzaffargarh"
  | "Khanpur"
  | "Chakwal"
  | "Mianwali"
  | "Vehari"
  | "Burewala"
  | "Bahawalnagar"
  | "Toba Tek Singh"
  | "Pakpattan"
  | "Jaranwala"
  | "Chishtian"
  | "Daska"
  | "Muridke"
  | "Ahmadpur East"
  | "Kamalia"
  | "Kharian"
  | "Gojra"
  | "Mandi Burewala"
  | "Samundri"
  | "Pattoki"
  | "Jahanian"
  | "Kot Addu"
  | "Jampur"
  | "Layyah"
  | "Rajanpur"
  | "Attock"
  | "Narowal"
  | "Lodhran"
  | "Taxila"
  | "Haroonabad"
  | "Bhakkar"
  | "Murree"
  | "Nankana Sahib"
  | "Ferozewala"
  | "Hasilpur"
  | "Islamabad"
  | "Peshawar"
  | "Quetta";

export type BrandType =
  | "Molty"
  | "Celeste"
  | "Dura"
  | "Superstar"
  | "CHF"
  | "Chemical"
  | "Offisys";

export type ReasonOfCall =
  | "New Complaint"
  | "Order Follow-up"
  | "Dealer Location"
  | "Product Info"
  | "New DDS Appointment"
  | "Silent Call";

export type DDSStatus =
  | "Pending"
  | "Customer is in contact with DDS"
  | "Customer not responding"
  | "Delivered";

export interface OrderTag {
  id: number;
  name: string;
  slug: string;
}

export interface OrderTagAssignment {
  id: number;
  order_id: number;
  tag: OrderTag;
  tag_id: number;
}

export interface OrderItem {
  base_price: number;
  id: number;
  order_id: number;
  price: string;
  product_type: string;
  quantity: number;
  sku: string;
  title: string;
}

export interface OrderComment {
  brand_id: number;
  id: number;
  message: string;
  order_id: number;
  user_id: number;
}

export interface OrderRecord {
  id: number;
  order_name: string;
  order_date: string;
  order_status: string;
  order_status_id: number;
  brand_name: string;
  total_price: string;
  payment_mode: string;
  discount: number;
  courier_id?: number;
  is_split?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address: string;
  customer_city: string;
  customer_state?: string | null;
  customer_country?: string;
  assigned_tags: OrderTagAssignment[];
  has_items: OrderItem[];
  order_comments: OrderComment[];
  order_id?: number;
}

export interface TimerData {
  endTime: Date;
  isExpired: boolean;
  timeRemaining: string;
  status: 'active' | 'expired' | 'completed';
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filename: string;
  data: any[];
  columns: string[];
}

export interface FilterState {
  globalFilter: string;
  columnFilters: Record<string, string>;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface TableColumn<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  enableSorting?: boolean;
  enableColumnFilter?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ToastOptions {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// CommentType interface is defined above (moved earlier to avoid type conflicts)

export interface AdditionalOption {
  id: number;
  option_text: string;
  display_order: number;
}

// Team Dashboard Types
export interface AgentStats {
  agent_name: string;
  comments_count: number;
  unique_complaints: number;
  customers_registered: number;
  dds_updates: number;
  last_activity: string | null;
  total_activities: number;
}

export interface RecentActivity {
  id: string;
  activity_type: 'complaint' | 'customer' | 'dds' | 'order';
  comment: string;
  agent_name: string;
  tagged_to?: string | null;
  timestamp: string;
  comment_type: string;
}

export interface DailyStats {
  date: string;
  comments_count: number;
  complaints_count: number;
  agents_count: number;
}

export interface TeamDashboardData {
  summary: {
    total_agents: number;
    total_complaints: number;
    total_comments: number;
    total_customers: number;
    total_dds_updates: number;
    multiple_tagged_count?: number;
    date_range: {
      start: string;
      end: string;
      range: string;
    };
  };
  agent_stats: AgentStats[];
  recent_activities: RecentActivity[];
  daily_stats: DailyStats[];
  tagged_users_stats?: Record<string, number>;
}

