 'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Package, Phone, Calendar, MapPin, Tag, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Timer } from '@/components/ui/Timer';
import { useToast } from '@/components/ui/Toast';
import { complaintAPI, userAPI, commentSystemAPI } from '@/lib/api';
import type { OrderRecord, OrderItem, OrderTagAssignment, ComplaintHistory, CommentType as CommentTypeDB, AdditionalOption } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  formatTime,
  calculateAutoTimeline,
  calculateEndTime,
  getAgentFromURL,
} from '@/lib/utils';
// Comment types and options are now loaded from database

interface OrderDataPopupProps {
  orders: OrderRecord[];
  onClose: () => void;
  onFocus?: () => void;
  onMinimize?: () => void;
  zIndex?: number;
}

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

export const OrderDataPopup: React.FC<OrderDataPopupProps> = ({
  orders,
  onClose,
  onFocus,
  onMinimize,
  zIndex = 1000,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [history, setHistory] = useState<ComplaintHistory[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<Array<{ value: string; label: string }>>([]);
  const [agentName, setAgentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalOption, setShowAdditionalOption] = useState(false);
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOption[]>([]);
  const [commentTypes, setCommentTypes] = useState<CommentTypeDB[]>([]);
  const [selectedCommentTypeData, setSelectedCommentTypeData] = useState<CommentTypeDB | null>(null);
  const [callReceivedTime, setCallReceivedTime] = useState<string>('');
  const { showToast } = useToast();

  // Get comment types that clear timeline (from database)
  const clearTimelineComments = useMemo(() => {
    return commentTypes
      .filter(ct => ct.clear_timeline)
      .map(ct => ct.comment_text);
  }, [commentTypes]);

  const activeOrder = orders[activeIndex] ?? orders[0];

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset, setError, clearErrors } = useForm<FormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      agent_name: '',
      comment: '',
    },
  });

  const selectedCommentType = watch('comment_type');
  const selectedAdditionalOption = watch('additional_option');

  useEffect(() => {
    if (orders.length === 0) return;
    if (activeIndex >= orders.length) {
      setActiveIndex(0);
    }
  }, [orders, activeIndex]);

  useEffect(() => {
    loadCommentTypes();
  }, []);

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

  const primaryTag = activeOrder?.assigned_tags?.find(tag => tag.tag?.slug === 'delivered-by-dealer')
    || activeOrder?.assigned_tags?.[0]
    || null;

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;

    onFocus?.();
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

  useEffect(() => {
    if (!activeOrder) return;
    loadHistory();
    loadAgentName();
  }, [activeOrder?.id]);

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

  useEffect(() => {
    // Load tagged users after agentName is loaded
    if (activeOrder && agentName) {
      loadTaggedUsers();
    }
  }, [activeOrder?.id, agentName]);

  const loadHistory = async () => {
    if (!activeOrder?.id) return;
    try {
      // Use order_name as complaint_id for history tracking
      const response = await complaintAPI.loadHistory(activeOrder.order_name);
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
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

  const loadAgentName = () => {
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
      setAgentName('Current Agent');
      setValue('agent_name', 'Current Agent');
    } else {
      setAgentName('Demo Agent');
      setValue('agent_name', 'Demo Agent');
    }
  };

  const handleCommentSubmit = async (data: FormData) => {
    if (!activeOrder?.id) return;
    setIsSubmitting(true);
    clearErrors(['tagged_to', 'timeline_date', 'timeline_time']);

    try {
      // Get validation rules from database
      const commentTypeData = commentTypes.find(ct => ct.comment_text === data.comment_type);
      
      if (!commentTypeData) {
        showToast('error', 'Invalid comment type selected');
        setIsSubmitting(false);
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
        setIsSubmitting(false);
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
        complaint_id: activeOrder.order_name, // Use order_name instead of id for complaint_id
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
        loadHistory();
      } else {
        showToast('error', response.error || 'Failed to submit comment');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const popupStyle: React.CSSProperties =
    position.x === 0 && position.y === 0
      ? { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
      : { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, transform: 'none' };

  const renderProducts = (items: OrderItem[]) => (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Products</h4>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
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
              <tr key={item.id} className="border-t border-gray-200 bg-white">
                <td className="px-3 py-2 font-medium text-gray-900">{item.title}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{item.sku}</td>
                <td className="px-3 py-2 text-gray-700">{item.product_type}</td>
                <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
                <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                  Rs. {item.base_price.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!activeOrder) {
    return null;
  }

  const statusHistory = activeOrder.order_comments ?? [];
  const historyWithLatest = useMemo(() => {
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
    return { items: history, latestIndex: latestActiveIndex };
  }, [history, clearTimelineComments]);

  return (
    <div
      className={`fixed bg-white rounded-lg shadow-2xl w-[95vw] max-w-[1100px] max-h-[90vh] overflow-hidden cursor-move transition-shadow ${
        isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.3)]' : ''
      }`}
      style={{
        ...popupStyle,
        zIndex,
        ...(position.x === 0 && position.y === 0
          ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
          : {}),
      }}
      onMouseDownCapture={() => onFocus?.()}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative select-none">
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Order Details</h2>
              <p className="text-sm opacity-85">Order #{activeOrder.order_name}</p>
              {orders.length > 1 && (
                <p className="text-xs opacity-75 mt-1">
                  Showing {activeIndex + 1} of {orders.length} orders for this customer
                </p>
              )}
            </div>
          </div>

          {orders.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {orders.map((order, idx) => (
                <button
                  key={order.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    idx === activeIndex ? 'bg-white text-purple-600' : 'bg-white bg-opacity-20 text-white'
                  }`}
                >
                  #{order.order_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="no-drag overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Customer</span>
                <p className="text-lg font-semibold text-gray-900">{activeOrder.customer_name}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} />
                <span>{activeOrder.customer_phone}</span>
              </div>
              {activeOrder.customer_email && (
                <p className="text-sm text-gray-600">{activeOrder.customer_email}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>{formatDate(activeOrder.order_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} />
                <span>{activeOrder.customer_city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full px-3 py-1 text-xs font-semibold">
                  {activeOrder.order_status}
                </span>
                {primaryTag?.tag?.name && (
                  <span className="text-purple-600 text-xs font-semibold inline-flex items-center gap-1">
                    <Tag size={14} />
                    {primaryTag.tag.name}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Payment Mode: <span className="font-semibold text-gray-800">{activeOrder.payment_mode}</span>
              </div>
              <div className="text-sm text-gray-500">
                Total Price:{' '}
                <span className="font-semibold text-gray-800">
                  Rs. {Number(activeOrder.total_price).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                Delivery Address
              </span>
              <p>{activeOrder.customer_address}</p>
            </div>
          </div>

          {activeOrder.assigned_tags?.length ? (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                Assigned Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {activeOrder.assigned_tags.map((assignment: OrderTagAssignment) => (
                  <span
                    key={assignment.id}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                  >
                    {assignment.tag?.name || 'Tag'}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {activeOrder.has_items?.length ? renderProducts(activeOrder.has_items) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-purple-600">Status History</h3>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {statusHistory.length} {statusHistory.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                {statusHistory.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No status history available
                  </div>
                ) : (
                  statusHistory.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                      <p className="text-sm text-gray-800">{entry.message}</p>
                      <div className="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>Comment ID: {entry.id}</span>
                        <span>User ID: {entry.user_id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-purple-600">Add Order Comment</h3>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Order #{activeOrder.order_name}
                </span>
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
                        ? 'Tagged To *'
                        : selectedCommentTypeData?.requires_tagged_user === 0
                        ? 'Tagged To (Optional)'
                        : 'Tagged To'
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
                        ? 'Timeline Date *'
                        : 'Timeline Date'
                    }
                    type="date"
                    error={errors.timeline_date?.message}
                    {...register('timeline_date')}
                  />

                  <Input
                    label={
                      selectedCommentTypeData?.requires_timeline === 1
                        ? 'Timeline Time *'
                        : 'Timeline Time'
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
                    isLoading={isSubmitting}
                  >
                    Submit Comment
                  </Button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-purple-600">Previous Interactions</h3>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {historyWithLatest.items.length} {historyWithLatest.items.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                {historyWithLatest.items.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No previous interactions
                  </div>
                ) : (
                  historyWithLatest.items.map((item, index) => {
                    // Check if comment matches any database comment type with clear_timeline = 1
                    const isSpecial = clearTimelineComments.some(ct => 
                      item.comment === ct || item.comment.startsWith(ct + ' (')
                    );
                    const isDone = item.comment?.toLowerCase().includes('done');
                    const isLatestActive = index === historyWithLatest.latestIndex;

                    return (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2 text-gray-500">
                          <div>
                            <span className="font-semibold">Sr#:</span>
                            <span className="ml-1 font-medium text-purple-600">#{historyWithLatest.items.length - index}</span>
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
                                  complaintId={activeOrder.id.toString()}
                                  isLatest={isLatestActive}
                                  onExpire={loadHistory}
                                />
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-drag bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Call received at {callReceivedTime || new Date().toLocaleTimeString()} | Brand: <span className="font-semibold text-gray-700">{activeOrder.brand_name}</span>
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