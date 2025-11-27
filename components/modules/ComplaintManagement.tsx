'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { complaintAPI } from '@/lib/api';
import type { Complaint } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { DispositionForm } from '@/components/modules/DispositionForm';

interface ComplaintManagementProps {
  onComplaintsLoaded?: (complaints: Complaint[]) => void;
  searchTerm?: string;
}

export const ComplaintManagement: React.FC<ComplaintManagementProps> = ({ onComplaintsLoaded, searchTerm }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const response = await complaintAPI.fetchComplaints();
      if (response.success && response.data) {
        setComplaints(response.data);
        onComplaintsLoaded?.(response.data);
      } else {
        showToast('error', response.error || 'Failed to load complaints');
      }
    } catch (error) {
      showToast('error', 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const visibleComplaints = useMemo(() => {
    if (!searchTerm) return complaints;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return complaints;

    return complaints.filter((complaint) => {
      const matches = [
        complaint.CmpNo,
        complaint.CName,
        complaint.Contact,
        complaint.Contact2,
      ];

      return matches.some(value =>
        value?.toString().toLowerCase().includes(term)
      );
    });
  }, [complaints, searchTerm]);

  const columns = [
    {
      id: 'CmpNo',
      header: 'Complaint#',
      accessorKey: 'CmpNo' as keyof Complaint,
      enableSorting: true,
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'CName',
      header: 'Customer Name',
      accessorKey: 'CName' as keyof Complaint,
      enableSorting: true,
      enableColumnFilter: true,
      width: '200px',
    },
    {
      id: 'Contact',
      header: 'Contact No',
      accessorKey: 'Contact' as keyof Complaint,
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'CmpDate',
      header: 'Cmp Date',
      accessorKey: 'CmpDate' as keyof Complaint,
      cell: (row: Complaint) => formatDate(row.CmpDate),
      enableSorting: true,
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'ProductType',
      header: 'Brand',
      accessorKey: 'ProductType' as keyof Complaint,
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'quality',
      header: 'Quality',
      accessorKey: 'qltytext' as keyof Complaint,
      cell: (row: Complaint) => row.qltytext || row.qltytext_khi || 'N/A',
      enableColumnFilter: true,
      width: '120px',
    },
    {
      id: 'size',
      header: 'Size',
      accessorKey: 'sizetext' as keyof Complaint,
      cell: (row: Complaint) => row.sizetext || row.sizetext_khi || 'N/A',
      enableColumnFilter: true,
      width: '100px',
    },
    {
      id: 'CurrentStatus',
      header: 'Current Status',
      accessorKey: 'CurrentStatus' as keyof Complaint,
      cell: (row: Complaint) => (
        <Badge variant="status" status={row.CurrentStatus}>
          {row.CurrentStatus}
        </Badge>
      ),
      enableColumnFilter: true,
      width: '150px',
    },
    {
      id: 'vRemarks1',
      header: 'Remarks',
      accessorKey: 'vRemarks1' as keyof Complaint,
      cell: (row: Complaint) => (
        <div className="max-w-xs truncate" title={row.vRemarks1}>
          {row.vRemarks1}
        </div>
      ),
      enableColumnFilter: true,
      width: '200px',
    },
  ];

  const expandableRow = (complaint: Complaint) => (
    <DispositionForm complaint={complaint} onSuccess={loadComplaints} />
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-full"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Complaint Management</h1>
          <p className="text-gray-600 mt-2">
            Manage and track customer complaints efficiently
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Complaints</p>
          <p className="text-3xl font-bold text-purple-600">{complaints.length}</p>
        </div>
      </div>

      <DataTable
        data={visibleComplaints}
        columns={columns}
        searchPlaceholder="Search complaints by name, number, contact..."
        exportFilename="complaints"
        expandableRow={expandableRow}
        getRowId={(row) => row.CmpNo}
      />
    </div>
  );
};

