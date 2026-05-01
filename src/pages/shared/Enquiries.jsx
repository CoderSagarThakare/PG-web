import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getEnquiriesApi, updateEnquiryApi } from '../../api/enquiry.api';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Phone, User, ChevronDown } from 'lucide-react';
import { Badge, Card, Spinner, EmptyState, Modal, Input, Button } from '../../components/common';
import { getErrorMessage, formatDate, capitalize } from '../../utils/helpers';

const statusOptions = [
  { value: 'interested', label: 'Interested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'visited', label: 'Visited' },
  { value: 'dealDone', label: 'Deal Done' },
  { value: 'rejected', label: 'Rejected' },
];

const statusVariant = {
  interested: 'info', contacted: 'warning', visited: 'purple',
  dealDone: 'success', rejected: 'danger', inventoryFull: 'dark',
};

export default function Enquiries() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isUserRole = user?.role === 'user';
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', filterStatus],
    queryFn: async () => (await getEnquiriesApi(filterStatus ? { status: filterStatus } : {})).data?.data,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateEnquiryApi(id, data),
    onSuccess: () => {
      toast.success('Enquiry updated!');
      qc.invalidateQueries(['enquiries']);
      setSelected(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const enquiries = data?.enquiries || [];

  const openUpdate = (enq) => {
    setSelected(enq);
    setNewStatus(enq.status);
    setRemarks(enq.staffRemarks || '');
  };

  const handleUpdate = () => {
    updateMut.mutate({ id: selected._id, data: { status: newStatus, staffRemarks: remarks } });
  };

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isUserRole ? 'My Enquiries' : 'Enquiries'}</h1>
          <p className="page-subtitle">{isUserRole ? 'Track your PG applications' : 'Manage tenant leads and enquiries'}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filters-bar">
        {['', ...statusOptions.map(s => s.value)].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterStatus(s)}
          >
            {s ? capitalize(s) : 'All'}
          </button>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <EmptyState icon={<MessageSquare size={64} />} title="No enquiries found"
          description="Enquiries from interested users will appear here." />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                {!isUserRole && <th>User</th>}
                <th>Post</th>
                <th>PG</th>
                <th>Status</th>
                <th>Date</th>
                {!isUserRole && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {enquiries.map(enq => (
                <tr key={enq._id}>
                  {!isUserRole && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--primary-light)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: 'var(--primary)'
                        }}>
                          {enq.userId?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{enq.userId?.name || '—'}</div>
                          <div className="text-xs text-muted">{enq.userId?.mobNo1 || '—'}</div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{enq.postId?.title || '—'}</div>
                    <div className="text-xs text-muted">
                      {enq.postId?.occupancyType} · ₹{enq.postId?.pricePerBed?.toLocaleString()}/bed
                    </div>
                  </td>
                  <td className="text-sm">{enq.pgId?.name || '—'}</td>
                  <td><Badge variant={statusVariant[enq.status] || 'default'}>{enq.status}</Badge></td>
                  <td className="text-sm text-muted">{formatDate(enq.createdAt)}</td>
                  {!isUserRole && (
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => openUpdate(enq)}>
                        Update
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Update Enquiry Status">
        {selected && (
          <div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
              <div style={{ fontWeight: 600 }}>{selected.userId?.name}</div>
              <div className="text-sm text-muted">{selected.postId?.title}</div>
              <div className="text-xs text-muted mt-4">{selected.userId?.email}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="New Status" name="status" as="select" value={newStatus}
                onChange={e => setNewStatus(e.target.value)} options={statusOptions} />
              <Input label="Staff Remarks" name="remarks" as="textarea"
                value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Add notes about this enquiry..." rows={3} />
            </div>
            <div className="modal-footer">
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={handleUpdate} loading={updateMut.isPending}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
