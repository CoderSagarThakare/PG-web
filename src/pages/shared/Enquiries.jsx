import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getEnquiriesApi, updateEnquiryApi } from '../../api/enquiry.api';
import { getRoomsApi, assignTenantApi } from '../../api/room.api';
import { getMyPGsApi } from '../../api/pg.api';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Search, ChevronLeft, ChevronRight, Phone, CheckCircle2, Bed, Building2 } from 'lucide-react';
import { Badge, Card, Spinner, EmptyState, Modal, Input, Button } from '../../components/common';
import { getErrorMessage, formatDate, formatTime, capitalize } from '../../utils/helpers';

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

const LIMIT = 10;

export default function Enquiries() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUserRole = user?.role === 'user';
  const isStaff = !isUserRole;

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPgId, setFilterPgId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [userName, setUserName] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [assignUserModal, setAssignUserModal] = useState(null); // { userId, userName, pgId, pgName }

  // Debounce userName search
  useEffect(() => {
    const t = setTimeout(() => { setUserName(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterStatus, filterPgId]);

  const params = {
    page,
    limit: LIMIT,
    ...(filterStatus && { status: filterStatus }),
    ...(filterPgId && { pgId: filterPgId }),
    ...(userName && !isUserRole && { userName }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', params],
    queryFn: async () => (await getEnquiriesApi(params)).data?.data,
  });

  // PG list for staff filter — use a long staleTime so the cached result from
  // the dashboard or sidebar is reused. No new network call on every tab visit.
  const { data: pgData } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
    enabled: isStaff,
    staleTime: 5 * 60 * 1000,   // 5 minutes — reuse cache across page navigations
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateEnquiryApi(id, data),
    onSuccess: (_, variables) => {
      toast.success('Enquiry updated!');
      qc.invalidateQueries(['enquiries']);
      
      // If deal is done, ask to assign to a room
      if (variables.data.status === 'dealDone') {
        setAssignUserModal({ 
          userId: selected.userId?._id, 
          userName: selected.userId?.name, 
          pgId: selected.pgId?._id, 
          pgName: selected.pgId?.name 
        });
      }
      
      setSelected(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Dedicated mutation for owner clicking "Call" — only fires when status === interested
  const callMut = useMutation({
    mutationFn: (enquiryId) => updateEnquiryApi(enquiryId, { status: 'contacted' }),
    onSuccess: () => {
      qc.invalidateQueries(['enquiries']);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const enquiries = data?.enquiries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);
  const pgs = pgData?.pgs || [];

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
          <p className="page-subtitle">
            {isUserRole ? 'Track your PG applications' : `${total} total enquiries`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        {/* Search by user name (staff only) */}
        {isStaff && (
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 36 }}
              placeholder="Search by user name..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
        )}

        {/* PG filter (staff only) */}
        {isStaff && pgs.length > 0 && (
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: 160 }}
            value={filterPgId}
            onChange={e => setFilterPgId(e.target.value)}
          >
            <option value="">All PGs</option>
            {pgs.map(pg => (
              <option key={pg._id} value={pg._id}>{pg.name}</option>
            ))}
          </select>
        )}

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
      </div>

      {enquiries.length === 0 ? (
        <EmptyState icon={<MessageSquare size={64} />} title="No enquiries found"
          description="No enquiries match your current filters." />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                 <tr>
                  {!isUserRole && <th>User</th>}
                  <th>Post</th>
                  <th>PG</th>
                  <th>Status</th>
                  <th>Date</th>
                  {isStaff && <th>Contact</th>}
                  {isStaff && <th>Action</th>}
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
                      <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {enq.postId?.title || '—'}
                        {enq.postId?.isDeleted && <Badge variant="danger" style={{ fontSize: 9, padding: '2px 4px' }}>Deleted</Badge>}
                        {enq.postId && !enq.postId.isActive && !enq.postId.isDeleted && <Badge variant="warning" style={{ fontSize: 9, padding: '2px 4px' }}>Inactive</Badge>}
                      </div>
                      <div className="text-xs text-muted">
                        {enq.postId?.occupancyType || '—'} · ₹{enq.postId?.pricePerBed?.toLocaleString() || '—'}/bed
                      </div>
                    </td>
                    <td className="text-sm">{enq.pgId?.name || '—'}</td>
                    <td><Badge variant={statusVariant[enq.status] || 'default'}>{enq.status}</Badge></td>
                    <td>
                      <div className="text-sm" style={{ fontWeight: 500 }}>{formatDate(enq.createdAt)}</div>
                      <div className="text-xs text-muted">{formatTime(enq.createdAt)}</div>
                    </td>

                    {/* Contact / Call column — staff only */}
                    {isStaff && (
                      <td>
                        {enq.userId?.mobNo1 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <a
                              href={`tel:${enq.userId.mobNo1}`}
                              onClick={() => {
                                if (enq.status === 'interested') {
                                  callMut.mutate(enq._id);
                                }
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                                background: enq.status === 'interested' ? 'var(--success-light)' : 'var(--bg-elevated)',
                                color: enq.status === 'interested' ? 'var(--success)' : 'var(--text-secondary)',
                                fontWeight: 600, fontSize: 12, textDecoration: 'none',
                                border: enq.status === 'interested' ? '1px solid rgba(81,207,102,0.3)' : '1px solid var(--border)',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Phone size={12} />
                              {enq.userId.mobNo1}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* Action column */}
                    {isStaff && (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <span className="text-sm text-muted">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  <ChevronLeft size={16} />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && arr[i - 1] !== p - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '...'
                    ? <span key={`dot-${i}`} className="text-muted" style={{ padding: '0 4px' }}>…</span>
                    : <button
                        key={p}
                        className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPage(p)}
                      >{p}</button>
                  )
                }
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
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
      {/* Success & Navigation Modal */}
      <Modal isOpen={!!assignUserModal} onClose={() => setAssignUserModal(null)} title="Deal Confirmed! 🚀">
        {assignUserModal && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ 
              width: 64, height: 64, background: 'var(--success-light)', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 16px', color: 'var(--success)' 
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Congratulations!</h3>
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
              The deal for <strong>{assignUserModal.userName}</strong> is marked as done. 
              Would you like to assign them to a room now?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button 
                onClick={() => {
                  setAssignUserModal(null);
                  navigate(`/pg/${assignUserModal.pgId}/inventory`);
                }}
                style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary), var(--purple))', border: 'none' }}
              >
                Go to Manage Rooms & Beds
              </Button>
              <Button variant="ghost" onClick={() => setAssignUserModal(null)} style={{ width: '100%' }}>
                I'll do it later
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
