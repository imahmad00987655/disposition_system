'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { orderAPI, complaintAPI, userAPI, commentSystemAPI } from '@/lib/api';
import type { OrderRecord, OrderItem, OrderTagAssignment, ComplaintHistory, CommentType as CommentTypeDB, AdditionalOption } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  formatTime,
  calculateEndTime,
  calculateAutoTimeline,
  getAgentFromURL,
} from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Timer } from '@/components/ui/Timer';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

// Comment types and options are now loaded from database

const commentSchema = z.object({
  comment_type: z.string().min(1, 'Please select a comment type'),
  additional_option: z.string().optional(),
  comment: z.string().min(1, 'Comment is required'),
  agent_name: z.string().min(1),
  tagged_to: z.string(),
  timeline_date: z.string(),
  timeline_time: z.string(),
}).partial({
  tagged_to: true,
  timeline_date: true,
  timeline_time: true,
  additional_option: true,
});

type FormData = z.infer<typeof commentSchema>;

interface OrderDetailPanelProps {
  order: OrderRecord;
}

const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({ order }) => {
  const [history, setHistory] = useState<ComplaintHistory[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<Array<{ value: string; label: string }>>([]);
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdditionalOption, setShowAdditionalOption] = useState(false);
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOption[]>([]);
  const [commentTypes, setCommentTypes] = useState<CommentTypeDB[]>([]);
  const [selectedCommentTypeData, setSelectedCommentTypeData] = useState<CommentTypeDB | null>(null);
  const { showToast } = useToast();

  // Get comment types that clear timeline (from database)
  const clearTimelineComments = useMemo(() => {
    return commentTypes
      .filter(ct => ct.clear_timeline)
      .map(ct => ct.comment_text);
  }, [commentTypes]);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset, setError, clearErrors } = useForm<FormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      agent_name: '',
      comment: '',
    },
  });

  const selectedCommentType = watch('comment_type');
  const selectedAdditionalOption = watch('additional_option');

  const primaryTag = useMemo(() => {
    return order.assigned_tags?.find(tag => tag.tag?.slug === 'delivered-by-dealer')
      || order.assigned_tags?.[0]
      || null;
  }, [order.assigned_tags]);

  useEffect(() => {
    loadHistory();
    loadAgentName();
    loadCommentTypes();
  }, []);

  useEffect(() => {
    // Load tagged users after agentName is loaded
    if (agentName) {
      loadTaggedUsers();
    }
  }, [agentName]);

  const loadCommentTypes = async () => {
    try {
      const response = await commentSystemAPI.fetchCommentTypes('order');
      if (response.success && response.data) {
        // Handle nested response structure: { status: 'success', data: [...] }
        const data = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any)?.data || [];
        setCommentTypes(Array.isArray(data) ? data : []);
      } else {
        setCommentTypes([]);
        showToast('error', 'Failed to load comment types');
      }
    } catch (error) {
      console.error('Failed to load comment types:', error);
      setCommentTypes([]);
      showToast('error', 'Failed to load comment types');
    }
  };

  useEffect(() => {
    if (!selectedCommentType) {
      setShowAdditionalOption(false);
      setAdditionalOptions([]);
      setSelectedCommentTypeData(null);
      return;
    }

    setValue('comment', selectedCommentType);
    setValue('additional_option', '');

    // Find the selected comment type data
    const commentTypeData = commentTypes.find(ct => ct.comment_text === selectedCommentType);
    setSelectedCommentTypeData(commentTypeData || null);

    // Load additional options from database
    if (commentTypeData) {
      loadAdditionalOptions(commentTypeData.comment_text, 'order');
    } else {
      setShowAdditionalOption(false);
      setAdditionalOptions([]);
    }
  }, [selectedCommentType, commentTypes, setValue]);

  const loadAdditionalOptions = async (commentText: string, module: 'complaint' | 'order' | 'dds') => {
    try {
      const response = await commentSystemAPI.fetchAdditionalOptions({
        comment_text: commentText,
        module: module,
      });

      if (response.success && response.data) {
        // Handle nested response structure: { status: 'success', data: [...] }
        const data = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any)?.data || [];
        const options = Array.isArray(data) ? data : [];
        
        if (options.length > 0) {
          setAdditionalOptions(options);
          setShowAdditionalOption(true);
        } else {
          setShowAdditionalOption(false);
          setAdditionalOptions([]);
        }
      } else {
        setShowAdditionalOption(false);
        setAdditionalOptions([]);
      }
    } catch (error) {
      console.error('Failed to load additional options:', error);
      setShowAdditionalOption(false);
      setAdditionalOptions([]);
    }
  };

  useEffect(() => {
    if (selectedAdditionalOption && selectedAdditionalOption.trim() !== '' && selectedCommentType) {
      const concatenatedComment = `${selectedCommentType} (${selectedAdditionalOption})`;
      setValue('comment', concatenatedComment);
    } else if (selectedCommentType && !selectedAdditionalOption) {
      setValue('comment', selectedCommentType);
    }
  }, [selectedAdditionalOption, selectedCommentType, setValue]);

  const loadHistory = async () => {
    try {
      // Use order_name as complaint_id for history tracking
      const response = await complaintAPI.loadHistory(order.order_name);
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load order history:', error);
    }
  };

  const loadTaggedUsers = async () => {
    try {
      // Get current user name and department
      const currentUserName = agentName || (typeof window !== 'undefined' ? sessionStorage.getItem('ccms_agentName') : null);
      const department = 'orders'; // Orders module
      
      const response = await userAPI.fetchTaggedUsers(department, currentUserName || undefined);
      if (response.success && response.data?.taggedUsers) {
        const users = response.data.taggedUsers.map(u => ({
          value: u.fullName,
          label: u.fullName,
        }));
        setTaggedUsers([{ value: '', label: 'Select Tagged User' }, ...users]);
      }
    } catch (error) {
      console.error('Failed to load tagged users:', error);
    }
  };

  const loadAgentName = async () => {
    const storedAgent =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('ccms_agentName')
        : null;

    if (storedAgent) {
      setAgentName(storedAgent);
      setValue('agent_name', storedAgent);
      return;
    }

    const userNo = getAgentFromURL();
    if (userNo) {
      try {
        const response = await userAPI.fetchAgentName(userNo);
        if (response.success && response.data?.fullName) {
          setAgentName(response.data.fullName);
          setValue('agent_name', response.data.fullName);
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch agent name, using fallback.', error);
      }
    }
    setAgentName('Demo Agent');
    setValue('agent_name', 'Demo Agent');
  };

  const handleCommentSubmit = async (data: FormData) => {
    setLoading(true);
    clearErrors(['tagged_to', 'timeline_date', 'timeline_time']);

    try {
      // Get validation rules from database
      const commentTypeData = commentTypes.find(ct => ct.comment_text === data.comment_type);
      
      if (!commentTypeData) {
        showToast('error', 'Invalid comment type selected');
        setLoading(false);
        return;
      }

      const hasManualTimelineInput = Boolean(data.timeline_date || data.timeline_time);
      let hasValidationError = false;

      // Validate tagged_user based on database rules
      if (commentTypeData.requires_tagged_user === 1 && !data.tagged_to) {
        setError('tagged_to', {
          type: 'manual',
          message: 'Tagged user is required for this comment type.',
        });
        hasValidationError = true;
      }

      // Validate timeline based on database rules
      if (commentTypeData.requires_timeline === 1) {
        if (!data.timeline_date) {
          setError('timeline_date', {
            type: 'manual',
            message: 'Timeline date is required for this comment type.',
          });
          hasValidationError = true;
        }
        if (!data.timeline_time) {
          setError('timeline_time', {
            type: 'manual',
            message: 'Timeline time is required for this comment type.',
          });
          hasValidationError = true;
        }
      }

      // If manual timeline input provided, both date and time are required
      if (hasManualTimelineInput) {
        if (!data.timeline_date) {
          setError('timeline_date', {
            type: 'manual',
            message: 'Timeline date is required when specifying a custom timeline.',
          });
          hasValidationError = true;
        }
        if (!data.timeline_time) {
          setError('timeline_time', {
            type: 'manual',
            message: 'Timeline time is required when specifying a custom timeline.',
          });
          hasValidationError = true;
        }
      }

      if (hasValidationError) {
        setLoading(false);
        return;
      }

      let finalComment = data.comment;
      if (data.additional_option && data.additional_option.trim() !== '') {
        finalComment = `${data.comment} (${data.additional_option})`;
      }

      let timelineDate = data.timeline_date;
      let timelineTime = data.timeline_time;

      // Apply timeline logic from database
      if (commentTypeData.clear_timeline) {
        timelineDate = '';
        timelineTime = '';
      } else if (commentTypeData.requires_timeline === 1) {
        timelineDate = data.timeline_date || '';
        timelineTime = data.timeline_time || '';
      } else if (!timelineDate || !timelineTime) {
        if (commentTypeData.auto_timeline) {
          const startTimestamp = new Date().toISOString();
          const { date, time } = calculateAutoTimeline(startTimestamp);
          timelineDate = date;
          timelineTime = time;
        }
      }

      const response = await complaintAPI.submitComment({
        complaint_id: order.order_name, // Use order_name instead of id for complaint_id
        comment: finalComment,
        commentType: data.comment_type,
        additionalComment: data.additional_option || '',
        agentName: data.agent_name,
        taggedTo: data.tagged_to || '',
        timelineDate: timelineDate || '',
        timelineTime: timelineTime || '',
      });

      if (response.success) {
        showToast('success', response.data?.message || 'Comment submitted successfully!');
        reset({
          agent_name: agentName,
          comment: '',
          comment_type: '',
          additional_option: '',
          tagged_to: '',
          timeline_date: '',
          timeline_time: '',
        });
        await loadHistory();
      } else {
        showToast('error', response.error || 'Failed to submit comment');
      }
    } catch (error) {
      showToast('error', 'Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  const renderProducts = (items: OrderItem[]) => (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Products</h4>
      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-gray-300 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Quantity</th>
              <th className="px-3 py-2 text-right">Base Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-gray-700 text-gray-200">
                <td className="px-3 py-2 font-medium">{item.title}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{item.sku}</td>
                <td className="px-3 py-2">{item.product_type}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">Rs. {item.base_price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr_1fr] gap-6">
      <div className="lg:col-span-1 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl space-y-4 shadow-sm border border-gray-800/30">
        <h3 className="text-lg font-bold border-b border-white/10 pb-3">Order Details</h3>

        <div>
          <p className="text-xs text-gray-400 uppercase">Order Name</p>
          <p className="text-sm font-semibold">{order.order_name}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Order Date</p>
          <p className="text-sm">{formatDate(order.order_date)}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Order Status</p>
          <Badge variant="status" status={order.order_status}>
            {order.order_status}
          </Badge>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Primary Tag</p>
          <p className="text-sm">{primaryTag?.tag?.name || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Brand</p>
          <p className="text-sm">{order.brand_name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <p className="text-xs text-gray-400 uppercase">Payment Mode</p>
            <p className="text-sm">{order.payment_mode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Total Price</p>
            <p className="text-sm font-semibold">Rs. {Number(order.total_price).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Discount</p>
            <p className="text-sm">Rs. {order.discount?.toLocaleString() || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">City</p>
            <p className="text-sm">{order.customer_city}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Customer Name</p>
          <p className="text-sm font-medium">{order.customer_name}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Customer Phone</p>
          <p className="text-sm">{order.customer_phone}</p>
        </div>

        {order.customer_email && (
          <div>
            <p className="text-xs text-gray-400 uppercase">Customer Email</p>
            <p className="text-sm">{order.customer_email}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-400 uppercase">Customer Address</p>
          <p className="text-sm bg-gray-800 p-3 rounded-md border border-gray-700">
            {order.customer_address}
          </p>
        </div>

        {order.assigned_tags?.length ? (
          <div>
            <p className="text-xs text-gray-400 uppercase">Tags</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {order.assigned_tags.map((assignment: OrderTagAssignment) => (
                <span
                  key={assignment.id}
                  className="px-2 py-1 rounded-full bg-purple-600 bg-opacity-20 text-purple-200 text-xs"
                >
                  {assignment.tag?.name || 'Tag'}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {order.has_items?.length ? renderProducts(order.has_items) : null}
      </div>

      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-purple-600">Add Order Comment</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">Order #{order.order_name}</span>
        </div>

        <form onSubmit={handleSubmit(handleCommentSubmit)} className="space-y-4 flex-1 flex flex-col">
          <Select
            label="Comment Type"
            options={[
              { value: '', label: 'Select Comment Type' },
              ...(Array.isArray(commentTypes) ? commentTypes.map(type => ({ value: type.comment_text, label: type.comment_text })) : []),
            ]}
            error={errors.comment_type?.message}
            {...register('comment_type')}
          />

          {showAdditionalOption && (
            <Select
              label="Additional Option"
              options={[
                { value: '', label: 'Select Option' },
                ...additionalOptions.map(opt => ({ value: opt.option_text, label: opt.option_text })),
              ]}
              {...register('additional_option')}
            />
          )}

          <Textarea
            label="Final Comment"
            rows={4}
            error={errors.comment?.message}
            {...register('comment')}
          />

          <Input
            label="Agent Name"
            value={agentName}
            readOnly
            className="bg-gray-100"
          />

          <div>
            <Select
              label={
                selectedCommentTypeData?.requires_tagged_user === 1
                  ? "Tagged To *"
                  : selectedCommentTypeData?.requires_tagged_user === 0
                  ? "Tagged To (Optional)"
                  : "Tagged To"
              }
              options={taggedUsers}
              error={errors.tagged_to?.message}
              {...register('tagged_to')}
            />
            {selectedCommentTypeData?.requires_tagged_user === 0 && (
              <p className="text-xs text-green-600 mt-1">
                ℹ️ Tagged user is optional for this comment type
              </p>
            )}
            {selectedCommentTypeData?.requires_timeline === 1 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Tagged user and timeline are required for this comment type
              </p>
            )}
          </div>

 	        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={
                selectedCommentTypeData?.requires_timeline === 1
                  ? "Timeline Date *"
                  : "Timeline Date"
              }
              type="date"
              error={errors.timeline_date?.message}
              {...register('timeline_date')}
            />

            <Input
              label={
                selectedCommentTypeData?.requires_timeline === 1
                  ? "Timeline Time *"
                  : "Timeline Time"
              }
              type="time"
              error={errors.timeline_time?.message}
              {...register('timeline_time')}
            />
          </div>

          <div className="pt-2 mt-auto">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              Submit Comment
            </Button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-purple-600">Previous Interactions</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="space-y-3 overflow-y-auto pr-2 flex-1">
          {history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              No previous interactions
            </div>
          ) : (
            (() => {
              let latestActiveIndex = -1;
              let latestTimestamp: Date | null = null;

              history.forEach((entry, idx) => {
                // Check if comment matches any database comment type with clear_timeline = 1
                const isSpecial = clearTimelineComments.some(ct => 
                  entry.comment === ct || entry.comment.startsWith(ct + ' (')
                );
                const isDone = entry.comment?.toLowerCase().includes('done');
                const entryTimestamp = new Date(entry.timestamp);

                if (!isSpecial && !isDone && entry.timeline_date && entry.timeline_time) {
                  if (!latestTimestamp || entryTimestamp > latestTimestamp) {
                    latestTimestamp = entryTimestamp;
                    latestActiveIndex = idx;
                  }
                }
              });

              return history.map((item, index) => {
                // Check if comment matches any database comment type with clear_timeline = 1
                const isSpecial = clearTimelineComments.some(ct => 
                  item.comment === ct || item.comment.startsWith(ct + ' (')
                );
                const isDone = item.comment?.toLowerCase().includes('done');
                const isLatestActive = index === latestActiveIndex;

                return (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2 text-gray-500">
                      <div>
                        <span className="font-semibold">Sr#:</span>
                        <span className="ml-1 font-medium text-purple-600">#{history.length - index}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">Timestamp:</span>
                        <span className="ml-1 text-gray-700">{formatDateTime(item.timestamp)}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Remarks</span>
                      <p className="text-sm text-gray-800 mt-1 leading-relaxed">{item.comment}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-semibold">Agent Name:</span>
                        <span className="ml-1 text-gray-700">{item.agent_name}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Tagged To:</span>
                        <span className="ml-1 text-gray-700">{item.tagged_to || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Timeline Date:</span>
                        <span className="ml-1 text-gray-700">{item.timeline_date ? formatDate(item.timeline_date) : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Timeline Time:</span>
                        <span className="ml-1 text-gray-700">{item.timeline_time ? formatTime(item.timeline_time) : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span className="font-semibold">Timer Countdown:</span>
                        <span>
                          {(isSpecial || isDone || !item.timeline_date || !item.timeline_time) ? (
                            <span className="text-green-600 font-semibold">0:0:0</span>
                          ) : (
                            <Timer
                              endTime={calculateEndTime(item.timeline_date, item.timeline_time)}
                              commentType={item.comment}
                              complaintId={order.id.toString()}
                              isLatest={isLatestActive}
                              onExpire={loadHistory}
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>
    </div>
  );
};

interface OrderManagementProps {
  searchTerm?: string;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ searchTerm }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { showToast } = useToast();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.fetchOrders();
      if (response.success && response.data) {
        const normalized = response.data.map(order => ({
          ...order,
          assigned_tags: order.assigned_tags ?? [],
          has_items: order.has_items ?? [],
          order_comments: order.order_comments ?? [],
        })) as OrderRecord[];
        setOrders(normalized);
      } else {
        showToast('error', response.error || 'Failed to load orders');
      }
    } catch (error) {
      showToast('error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    // Check if user has Orders access
    let userCode: string | null = null;
    
    if (typeof window !== 'undefined') {
      const storedCode = sessionStorage.getItem('ccms_agentCode');
      if (storedCode) {
        userCode = storedCode;
      }
    }

    if (!userCode) {
      const userNo = getAgentFromURL();
      if (userNo) {
        userCode = userNo;
      }
    }

    // Check department from session or URL
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const department = urlParams?.get('department') || (typeof window !== 'undefined' ? sessionStorage.getItem('ccms_department') : null);
    
    // If department is 'orders' from URL/session, allow access (department-specific user)
    if (department === 'orders') {
      setHasAccess(true);
      loadOrders();
      return;
    }

    // Regular users from vwUsers (no department set) - give them access to ALL modules
    // Only check database access for users who have department restrictions
    if (!department && userCode) {
      // Regular vwUsers user - allow access without database check
      setHasAccess(true);
      loadOrders();
      return;
    }

    // If no user code, deny access
    if (!userCode) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Check database for access (only for department-specific users)
    try {
      const response = await userAPI.checkDepartmentAccess(userCode, 'orders');
      if (response.success && response.data?.hasAccess) {
        setHasAccess(true);
        loadOrders();
      } else {
        setHasAccess(false);
        setLoading(false);
        showToast('error', 'You do not have access to Order Management module. Contact Team Lead for access.');
      }
    } catch (error) {
      console.error('Failed to check Orders access:', error);
      setHasAccess(false);
      setLoading(false);
      showToast('error', 'Failed to verify access. Please contact administrator.');
    }
  };

  const visibleOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((order) => {
      const matches = [
        order.order_name,
        order.order_status,
        order.customer_phone,
        order.customer_name,
        order.id,
      ];

      return matches.some(value =>
        value?.toString().toLowerCase().includes(term)
      );
    });
  }, [orders, searchTerm]);

  const columns = useMemo(() => [
    {
      id: 'customer_phone',
      header: 'Customer Phone',
      accessorKey: 'customer_phone' as keyof OrderRecord,
      enableColumnFilter: true,
      width: '160px',
    },
    {
      id: 'customer_name',
      header: 'Customer Name',
      accessorKey: 'customer_name' as keyof OrderRecord,
      enableSorting: true,
      enableColumnFilter: true,
      width: '220px',
    },
    {
      id: 'order_name',
      header: 'Order Name',
      accessorKey: 'order_name' as keyof OrderRecord,
      enableSorting: true,
      enableColumnFilter: true,
      width: '180px',
    },
    {
      id: 'order_status',
      header: 'Order Status',
      accessorKey: 'order_status' as keyof OrderRecord,
      cell: (row: OrderRecord) => (
        <Badge variant="status" status={row.order_status}>
          {row.order_status}
        </Badge>
      ),
      enableColumnFilter: true,
      width: '180px',
    },
    {
      id: 'payment_mode',
      header: 'Payment Mode',
      accessorKey: 'payment_mode' as keyof OrderRecord,
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'customer_city',
      header: 'City',
      accessorKey: 'customer_city' as keyof OrderRecord,
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'total_price',
      header: 'Total Price',
      accessorKey: 'total_price' as keyof OrderRecord,
      cell: (row: OrderRecord) => `Rs. ${Number(row.total_price).toLocaleString()}`,
      enableSorting: true,
      width: '150px',
    },
    {
      id: 'order_date',
      header: 'Order Date',
      accessorKey: 'order_date' as keyof OrderRecord,
      cell: (row: OrderRecord) => formatDate(row.order_date),
      enableSorting: true,
      width: '150px',
    },
  ], []);

  const expandableRow = (order: OrderRecord) => (
    <OrderDetailPanel order={order} />
  );

  if (hasAccess === null || loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-full"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have access to the Order Management module.</p>
          <p className="text-sm text-gray-500">Please contact your Team Lead to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Order Management</h1>
          <p className="text-gray-600 mt-2">
            Track customer orders, manage timelines, and record follow-ups
          </p>
        </div>
        <Card className="border-none bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <CardContent className="py-4 px-6">
            <p className="text-sm uppercase tracking-wide text-white text-opacity-80">Total Orders</p>
            <p className="text-3xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={visibleOrders}
        columns={columns}
        searchPlaceholder="Search orders by name, phone, status..."
        exportFilename="orders"
        expandableRow={expandableRow}
        getRowId={(row) => row.id.toString()}
      />
    </div>
  );
};