'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Timer } from '@/components/ui/Timer';
import { useToast } from '@/components/ui/Toast';
import { ddsAPI, complaintAPI, userAPI, commentSystemAPI } from '@/lib/api';
import type { DDSAppointment, DDSStatus, ComplaintHistory, CommentType, AdditionalOption } from '@/lib/types';
import {
  formatPhone,
  formatDateTime,
  formatDate,
  formatTime,
  calculateEndTime,
  calculateAutoTimeline,
  getAgentFromURL,
} from '@/lib/utils';

const ddsStatusOptions: DDSStatus[] = [
  'Pending',
  'Customer is in contact with DDS',
  'Customer not responding',
  'Delivered',
];

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

interface DDSManagementProps {
  searchTerm?: string;
}

export interface DDSDetailPanelProps {
  appointment: DDSAppointment;
  onRefresh?: () => Promise<void> | void;
}

export const DDSDetailPanel: React.FC<DDSDetailPanelProps> = ({ appointment, onRefresh }) => {
  const { showToast } = useToast();
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [history, setHistory] = useState<ComplaintHistory[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<Array<{ value: string; label: string }>>([]);
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdditionalOption, setShowAdditionalOption] = useState(false);
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOption[]>([]);
  const [commentTypes, setCommentTypes] = useState<CommentType[]>([]);
  const [selectedCommentTypeData, setSelectedCommentTypeData] = useState<CommentType | null>(null);

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

  useEffect(() => {
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
      const response = await commentSystemAPI.fetchCommentTypes('dds');
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
    loadStatusHistory();
    loadHistory();
  }, [appointment.id, appointment.current_status]);

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
      loadAdditionalOptions(commentTypeData.comment_text, 'dds');
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

  const loadStatusHistory = async () => {
    if (!appointment.id) return;
    try {
      const response = await ddsAPI.fetchStatusHistory(appointment.id!);
      if (response.success) {
        const phpResponse = response.data as any;
        const historyData = phpResponse.data || [];
        // Log for debugging
        console.log('Status History Data:', historyData);
        setStatusHistory(historyData);
      } else {
        console.error('Failed to load status history:', response.error);
        showToast('error', 'Failed to load status history');
      }
    } catch (error) {
      console.error('Error loading status history:', error);
      showToast('error', 'Failed to load status history');
    }
  };

  const loadHistory = async () => {
    if (!appointment.id) return;
    try {
      const response = await complaintAPI.loadHistory(appointment.id!.toString());
      if (response.success && response.data) {
        // Log for debugging
        console.log('Previous Interaction History Data:', response.data);
        setHistory(response.data);
      } else {
        console.error('Failed to load history:', response.error);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadTaggedUsers = async () => {
    try {
      // Get current user name and department
      const currentUserName = agentName || (typeof window !== 'undefined' ? sessionStorage.getItem('ccms_agentName') : null);
      const department = 'dds'; // DDS module
      
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
        complaint_id: appointment.id!.toString(),
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
        await Promise.all([loadHistory(), loadStatusHistory()]);
        await onRefresh?.();
      } else {
        showToast('error', response.error || 'Failed to submit comment');
      }
    } catch (error) {
      showToast('error', 'Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            statusHistory.map((entry, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition">
                <div className="text-sm font-medium text-gray-800">
                  Changed from{' '}
                  <span className="text-red-600">{entry.old_status || 'N/A'}</span> to{' '}
                  <span className="text-green-600">{entry.new_status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2 flex justify-between">
                  <span>By: {entry.changed_by || 'N/A'}</span>
                  <span>{entry.changed_at ? formatDateTime(entry.changed_at) : 'Unknown'}</span>
                </div>
                {entry.change_reason && (
                  <div className="text-xs text-gray-500 mt-1">
                    Reason: {entry.change_reason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-purple-600">Add New Comment</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            Apt #{appointment.id || 'N/A'}
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
              isLoading={loading}
            >
              Submit Comment
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-lg font-bold text-purple-600">Previous Interaction History</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                              countdownSeconds={item.countdown_seconds}
                              commentType={item.comment}
                              complaintId={appointment.id!.toString()}
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

export const DDSManagement: React.FC<DDSManagementProps> = ({ searchTerm }) => {
  const [appointments, setAppointments] = useState<DDSAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentAgentName, setCurrentAgentName] = useState<string>('Dashboard User');
  const [currentAgentCode, setCurrentAgentCode] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    // Check if user has DDS access
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
    
    // If department is 'dds' from URL/session, allow access (department-specific user)
    if (department === 'dds') {
      setHasAccess(true);
      loadAppointments();
      return;
    }

    // Regular users from vwUsers (no department set) - give them access to ALL modules
    // Only check database access for users who have department restrictions
    if (!department && userCode) {
      // Regular vwUsers user - allow access without database check
      setHasAccess(true);
      loadAppointments();
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
      const response = await userAPI.checkDepartmentAccess(userCode, 'dds');
      if (response.success && response.data?.hasAccess) {
        setHasAccess(true);
        loadAppointments();
      } else {
        setHasAccess(false);
        setLoading(false);
        showToast('error', 'You do not have access to DDS module. Contact Team Lead for access.');
      }
    } catch (error) {
      console.error('Failed to check DDS access:', error);
      setHasAccess(false);
      setLoading(false);
      showToast('error', 'Failed to verify access. Please contact administrator.');
    }
  };

  useEffect(() => {
    const resolveAgentInfo = async () => {
      let agentName = 'Dashboard User';
      let agentCode: string | null = null;

      if (typeof window !== 'undefined') {
        const storedName = sessionStorage.getItem('ccms_agentName');
        if (storedName) {
          agentName = storedName;
        }
        const storedCode = sessionStorage.getItem('ccms_agentCode');
        if (storedCode) {
          agentCode = storedCode;
        }
      }

      if (!agentCode) {
        const userNo = getAgentFromURL();
        if (userNo) {
          agentCode = userNo;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('ccms_agentCode', userNo);
          }
          try {
            const response = await userAPI.fetchAgentName(userNo);
            if (response.success && response.data?.fullName) {
              agentName = response.data.fullName;
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('ccms_agentName', response.data.fullName);
              }
            }
          } catch (error) {
            console.warn('Failed to resolve agent name, using fallback.', error);
          }
        }
      }

      setCurrentAgentName(agentName);
      setCurrentAgentCode(agentCode);
    };

    resolveAgentInfo();
  }, []);

  const loadAppointments = async (options?: { silent?: boolean }) => {
    const shouldShowLoader = !options?.silent;
    if (shouldShowLoader) {
      setLoading(true);
    }
    try {
      const response = await ddsAPI.fetchDDS();
      if (response.success && response.data) {
        // Handle response format from PHP
        const ddsData = (response.data as any).data || response.data;
        setAppointments(ddsData);
      } else {
        showToast('error', response.error || 'Failed to load DDS appointments');
      }
    } catch (error) {
      showToast('error', 'Failed to load DDS appointments');
    } finally {
      if (shouldShowLoader) {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (id: string | undefined, newStatus: DDSStatus) => {
    if (!id) {
      showToast('error', 'Unable to update status: missing appointment ID.');
      console.error('[DDS] Status update aborted: missing appointment ID.');
      return;
    }

    setUpdatingId(id.toString());
    try {
      const changedBy = currentAgentName || currentAgentCode || 'Dashboard User';
      const changeReason = `Status updated via dashboard${currentAgentName ? ` by ${currentAgentName}` : ''}`;

      // Update status via real API with agent name
      const response = await ddsAPI.updateStatus({ 
        id: id.toString(), 
        status: newStatus,
        changedBy,
        changeReason,
      });

      if (response.success) {
        // Update local state WITHOUT reloading the page
        setAppointments(prev =>
          prev.map(apt => 
            apt.id === id ? { ...apt, current_status: newStatus } : apt
          )
        );
        const successMessage =
          response.data?.message ||
          `Status updated from "${response.data?.oldStatus ?? 'previous status'}" to "${response.data?.newStatus ?? newStatus}"`;
        showToast('success', successMessage);
        console.log('[DDS] Status update success', {
          id,
          newStatus,
          serverMessage: response.data?.message,
          oldStatus: response.data?.oldStatus,
          rawResponse: response,
        });
        await loadAppointments({ silent: true });
      } else {
        showToast('error', response.error || 'Failed to update status');
        console.error('[DDS] Status update failed', {
          id,
          attemptedStatus: newStatus,
          error: response.error,
          rawResponse: response,
        });
      }
    } catch (error) {
      showToast('error', 'Failed to update status');
      console.error('[DDS] Status update exception', {
        id,
        attemptedStatus: newStatus,
        error,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return appointments;

    return appointments.filter((appointment) => {
      const matches = [
        appointment.id,
        appointment.customer_name,
        appointment.contact,
        appointment.city,
      ];

      return matches.some(value =>
        value?.toString().toLowerCase().includes(term)
      );
    });
  }, [appointments, searchTerm]);

  const columns = [
    {
      id: 'id',
      header: 'Apt #',
      accessorKey: 'id' as keyof DDSAppointment,
      cell: (row: DDSAppointment) => row.id || 'N/A',
      width: '130px',
    },
    {
      id: 'gender',
      header: 'Gender',
      accessorKey: 'gender' as keyof DDSAppointment,
      width: '80px',
    },
    {
      id: 'customer_name',
      header: 'Name',
      accessorKey: 'customer_name' as keyof DDSAppointment,
      enableSorting: true,
      enableColumnFilter: true,
      width: '200px',
    },
    {
      id: 'city',
      header: 'City',
      accessorKey: 'city' as keyof DDSAppointment,
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorKey: 'contact' as keyof DDSAppointment,
      cell: (row: DDSAppointment) => formatPhone(row.contact),
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'brand_type',
      header: 'Brand',
      accessorKey: 'brand_type' as keyof DDSAppointment,
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'address',
      header: 'Address',
      accessorKey: 'address' as keyof DDSAppointment,
      cell: (row: DDSAppointment) => (
        <div className="max-w-xs truncate" title={row.address}>
          {row.address}
        </div>
      ),
      width: '250px',
    },
    {
      id: 'comments',
      header: 'Comments',
      accessorKey: 'comments' as keyof DDSAppointment,
      cell: (row: DDSAppointment) => (
        <div className="max-w-xs truncate" title={row.comments || ''}>
          {row.comments || 'N/A'}
        </div>
      ),
      width: '200px',
    },
    {
      id: 'current_status',
      header: 'Current Status',
      cell: (row: DDSAppointment) => (
        <div className="min-w-[260px]">
          {updatingId === row.id ? (
            <div className="flex items-center justify-center py-2">
              <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <select
              value={row.current_status}
              onChange={(e) => handleStatusChange(row.id, e.target.value as DDSStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none bg-white cursor-pointer text-sm"
              onClick={(e) => e.stopPropagation()}
              disabled={!row.id}
            >
              {ddsStatusOptions.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          )}
        </div>
      ),
      enableSorting: false,
      width: '280px',
    },
    {
      id: 'agent_name',
      header: 'Agent',
      accessorKey: 'agent_name' as keyof DDSAppointment,
      width: '150px',
    },
    {
      id: 'date_added',
      header: 'Date Added',
      accessorKey: 'date_added' as keyof DDSAppointment,
      cell: (row: DDSAppointment) => row.date_added ? formatDateTime(row.date_added) : 'N/A',
      enableSorting: true,
      width: '180px',
    },
  ];

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
          <p className="text-gray-600 mb-4">You do not have access to the Door-to-Door Service (DDS) module.</p>
          <p className="text-sm text-gray-500">Please contact your Team Lead to request access.</p>
        </div>
      </div>
    );
  }

  const expandableRow = (appointment: DDSAppointment) => (
    <DDSDetailPanel appointment={appointment} onRefresh={() => loadAppointments({ silent: true })} />
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Door to Door Service (DDS)</h1>
          <p className="text-gray-600 mt-2">
            Manage DDS appointments and track delivery status
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-purple-600">{filteredAppointments.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">In Contact</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredAppointments.filter(a => a.current_status === 'Customer is in contact with DDS').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Delivered</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredAppointments.filter(a => a.current_status === 'Delivered').length}
            </p>
          </div>
        </div>
      </div>

      <DataTable
        data={filteredAppointments}
        columns={columns}
        searchPlaceholder="Search DDS appointments..."
        exportFilename="dds-appointments"
        expandableRow={expandableRow}
        getRowId={(row) => row.id?.toString() ?? ''}
      />
    </div>
  );
};

