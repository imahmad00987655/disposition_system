'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Timer } from '@/components/ui/Timer';
import { useToast } from '@/components/ui/Toast';
import { complaintAPI, userAPI, commentSystemAPI } from '@/lib/api';
import type { Complaint, ComplaintHistory, CommentType as CommentTypeDB, AdditionalOption } from '@/lib/types';
import { formatDateTime, formatTime, formatDate, getAgentFromURL, calculateEndTime, calculateAutoTimeline } from '@/lib/utils';

// Dynamic schema - will be validated in onSubmit based on comment type
const schema = z.object({
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

type FormData = z.infer<typeof schema>;

interface DispositionFormProps {
  complaint: Complaint;
  onSuccess: () => void;
}

export const DispositionForm: React.FC<DispositionFormProps> = ({ complaint, onSuccess }) => {
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
    resolver: zodResolver(schema),
    defaultValues: {
      agent_name: '',
      comment: '',
    },
  });

  const selectedCommentType = watch('comment_type');
  const selectedAdditionalOption = watch('additional_option');

  useEffect(() => {
    loadHistory();
    loadTaggedUsers();
    loadAgentName();
    loadCommentTypes();
  }, []);

  const loadCommentTypes = async () => {
    try {
      const response = await commentSystemAPI.fetchCommentTypes('complaint');
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
    // Auto-fill comment based on comment type
    if (selectedCommentType) {
      setValue('comment', selectedCommentType);
      setValue('additional_option', '');
      
      // Find the selected comment type data
      const commentTypeData = commentTypes.find(ct => ct.comment_text === selectedCommentType);
      setSelectedCommentTypeData(commentTypeData || null);
      
      // Load additional options from database
      if (commentTypeData) {
        loadAdditionalOptions(commentTypeData.comment_text, 'complaint');
      } else {
        setShowAdditionalOption(false);
        setAdditionalOptions([]);
      }
    } else {
      setSelectedCommentTypeData(null);
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

  // EXACT logic from script - concatenate additional option with comment
  useEffect(() => {
    if (selectedAdditionalOption && selectedAdditionalOption.trim() !== '' && selectedCommentType) {
      // Concatenate: "Done (Customer not responding)"
      const concatenatedComment = `${selectedCommentType} (${selectedAdditionalOption})`;
      setValue('comment', concatenatedComment);
    } else if (selectedCommentType && !selectedAdditionalOption) {
      // Reset to base comment if additional option cleared
      setValue('comment', selectedCommentType);
    }
  }, [selectedAdditionalOption, selectedCommentType, setValue]);

  const loadHistory = async () => {
    try {
      const response = await complaintAPI.loadHistory(complaint.CmpNo);
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadTaggedUsers = async () => {
    try {
      const response = await userAPI.fetchTaggedUsers();
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
    const userNo = getAgentFromURL();
    if (userNo) {
      try {
        const response = await userAPI.fetchAgentName(userNo);
        if (response.success && response.data?.fullName) {
          setAgentName(response.data.fullName);
          setValue('agent_name', response.data.fullName);
        }
      } catch (error) {
        setAgentName('Demo Agent');
        setValue('agent_name', 'Demo Agent');
      }
    } else {
      setAgentName('Demo Agent');
      setValue('agent_name', 'Demo Agent');
    }
  };

  const onSubmit = async (data: FormData) => {
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
      // requires_tagged_user: 1=required, 0=optional, -1=not needed
      if (commentTypeData.requires_tagged_user === 1 && !data.tagged_to) {
        setError('tagged_to', {
          type: 'manual',
          message: 'Tagged user is required for this comment type.',
        });
        hasValidationError = true;
      }

      // Validate timeline based on database rules
      // requires_timeline: 1=required, 0=optional, -1=not needed
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
        // Clear timeline for this comment type
        timelineDate = '';
        timelineTime = '';
      } else if (commentTypeData.requires_timeline === 1) {
        // Timeline is required - use provided values
        timelineDate = data.timeline_date || '';
        timelineTime = data.timeline_time || '';
      } else if (!timelineDate || !timelineTime) {
        // Auto-calculate timeline if enabled and not provided
        if (commentTypeData.auto_timeline) {
          const startTimestamp = new Date().toISOString();
          const { date, time } = calculateAutoTimeline(startTimestamp);
          timelineDate = date;
          timelineTime = time;
        }
      }

      const response = await complaintAPI.submitComment({
        complaint_id: complaint.CmpNo,
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
      showToast('error', 'Failed to submit comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Read-only Fields */}
      <div className="lg:col-span-1 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-bold border-b border-gray-700 pb-2">Complaint Details</h3>
        
        <div>
          <p className="text-xs text-gray-400 uppercase">Contact 2</p>
          <p className="text-sm">{complaint.Contact2 || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Region</p>
          <p className="text-sm">{complaint.Zone || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Brand Name</p>
          <p className="text-sm">{complaint.ProductType}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Gross Price</p>
          <p className="text-sm">Rs. {complaint.Gr_Price?.toLocaleString() || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Issue in Mattress</p>
          <p className="text-sm bg-gray-800 p-2 rounded">{complaint.IssueInMatress || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Decision Management</p>
          <p className="text-sm bg-gray-800 p-2 rounded">{complaint.DecisionManagement || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Customer Payment</p>
          <p className="text-sm">Rs. {complaint.customerpayment?.toLocaleString() || complaint.custpaymamt_khi || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Dealer Replacement</p>
          <p className="text-sm">{complaint.dealtext_payment || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Dealer Payment</p>
          <p className="text-sm">Rs. {complaint.dealtext || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Full Address</p>
          <p className="text-sm bg-gray-800 p-2 rounded">{complaint.Address || 'N/A'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">Cover price</p>
          <p className="text-sm bg-gray-800 p-2 rounded">{complaint.cvrprice || 'N/A'}</p>
        </div>
      </div>

      {/* Middle Column - Disposition Form */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-lg font-bold text-purple-600 border-b border-gray-200 pb-2">
          Add New Comment
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Comment Type"
            options={[
              { value: '', label: 'Select Comment Type' },
              ...(Array.isArray(commentTypes) ? commentTypes.map(type => ({ value: type.comment_text, label: type.comment_text })) : [])
            ]}
            error={errors.comment_type?.message}
            {...register('comment_type')}
          />

          {showAdditionalOption && (
            <Select
              label="Additional Option"
              options={[
                { value: '', label: 'Select Option' },
                ...additionalOptions.map(opt => ({ value: opt.option_text, label: opt.option_text }))
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

          <div className="grid grid-cols-2 gap-4">
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

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={loading}
          >
            Submit Comment
          </Button>
        </form>
      </div>

      {/* Right Column - History */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-bold text-purple-600 border-b border-gray-200 pb-2 mb-4">
          Previous Interactions
        </h3>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No previous interactions</p>
          ) : (
            (() => {
              // Find latest active timer using database clear_timeline flag
              let latestActiveIndex = -1;
              let latestTimestamp: Date | null = null;
              
              // Find the most recent entry with a timeline (excluding clear_timeline comments)
              history.forEach((entry, idx) => {
                // Check if comment matches any database comment type with clear_timeline = 1
                const isSpecial = clearTimelineComments.some(ct => 
                  entry.comment === ct || entry.comment.startsWith(ct + ' (')
                );
                const entryTimestamp = new Date(entry.timestamp);
                
                if (!isSpecial && entry.timeline_date && entry.timeline_time) {
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
                const isLatestActive = index === latestActiveIndex;
                
                return (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover-lift">
                    {/* 8 Columns Layout as specified */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500 font-semibold">Sr#:</span>
                        <span className="ml-1 font-medium text-purple-600">#{history.length - index}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold">Timestamp:</span>
                        <span className="ml-1">{formatDateTime(item.timestamp)}</span>
                      </div>
                    </div>

                    <div className="mb-2">
                      <span className="text-gray-500 font-semibold text-xs">Remarks:</span>
                      <p className="text-sm text-gray-800 mt-1">{item.comment}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 font-semibold">Agent Name:</span>
                        <span className="ml-1 font-medium">{item.agent_name}</span>
                      </div>

                      <div>
                        <span className="text-gray-500 font-semibold">Tagged To:</span>
                        <span className="ml-1 font-medium">{item.tagged_to || 'N/A'}</span>
                      </div>

                      <div>
                        <span className="text-gray-500 font-semibold">Timeline Date:</span>
                        <span className="ml-1">{item.timeline_date ? formatDate(item.timeline_date) : 'N/A'}</span>
                      </div>

                      <div>
                        <span className="text-gray-500 font-semibold">Timeline Time:</span>
                        <span className="ml-1">{item.timeline_time ? formatTime(item.timeline_time) : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Timer Countdown - EXACT logic from script */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-semibold text-xs">Timer Countdown:</span>
                        <span className="ml-1">
                          {(isSpecial || !item.timeline_date || !item.timeline_time) ? (
                            // Clear timeline comment or no timeline: Show 0:0:0 in green
                            <span className="text-green-600">0:0:0</span>
                          ) : (
                            // Regular comment with timer
                            <Timer
                              endTime={calculateEndTime(item.timeline_date, item.timeline_time)}
                              countdownSeconds={item.countdown_seconds}
                              commentType={item.comment}
                              complaintId={complaint.CmpNo}
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

