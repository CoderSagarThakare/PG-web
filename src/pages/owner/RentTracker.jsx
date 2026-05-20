import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyPGsApi } from '../../api/pg.api';
import { getRoomsApi } from '../../api/room.api';
import {
  getRentPaymentsApi,
  getRentSummaryApi,
  recordPaymentApi,
  updatePaymentApi,
  deletePaymentApi,
  generateMonthRentApi,
  approvePaymentApi,
  rejectPaymentApi,
  bulkApprovePaymentsApi
} from '../../api/rent.api';
import { Badge, Button, Card, Modal, Spinner, EmptyState, Input } from '../../components/common';
import { getErrorMessage, formatDate, formatDateTime, formatTime } from '../../utils/helpers';
import {
  IndianRupee, TrendingUp, Clock, AlertCircle, Phone, Plus,
  Edit2, Trash2, CheckCircle2, Zap, Check, X, ShieldAlert, FileCheck
} from 'lucide-react';

const MODE_LABELS  = { cash: '💵 Cash', upi: '📱 UPI', bank_transfer: '🏦 Bank', cheque: '📄 Cheque', online: '🌐 Online' };
const STATUS_VARIANT = { paid: 'success', pending: 'warning', under_review: 'info', partial: 'info', overdue: 'danger' };

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthOptions = () => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: val, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) });
  }
  return opts;
};

const getMonthName = (yearMonth) => {
  if (!yearMonth) return '';
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return '';
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString('default', { month: 'long' });
};

const emptyForm = {
  bedId: '', userId: '', amount: '', amountPaid: '',
  paymentMode: 'cash', paidDate: '', referenceNo: '', notes: '', rentMonth: currentMonth()
};

const getActiveDays = (rec) => {
  if (rec.notes && rec.notes.includes("Prorated rent:")) {
    const match = rec.notes.match(/Prorated rent: (\d+) active days/);
    if (match) return `${match[1]}D`;
  }
  if (rec.rentMonth) {
    const [y, m] = rec.rentMonth.split("-").map(Number);
    if (y && m) {
      const totalDays = new Date(y, m, 0).getDate();
      if (rec.amount && rec.bedId?.price && rec.amount < rec.bedId.price) {
        return `${Math.round((rec.amount / rec.bedId.price) * totalDays)}D`;
      }
      return `${totalDays}D`;
    }
  }
  return '—';
};

export default function RentTracker() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab]       = useState('records'); // 'records' | 'approvals'
  const [filterPgId, setFilterPgId]     = useState('');
  const [filterMonth, setFilterMonth]   = useState(currentMonth());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMode, setFilterMode]     = useState('');
  const [page, setPage]                 = useState(1);
  const LIMIT = 15;

  const [modal, setModal]                 = useState(null); // null | 'record' | 'edit' | 'generate' | 'reject'
  const [editTarget, setEditTarget]       = useState(null);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [form, setForm]                   = useState(emptyForm);
  const [beds, setBeds]                   = useState([]);

  // Checkbox state for bulk approval
  const [selectedIds, setSelectedIds]     = useState([]);

  // ── Data Fetches ─────────────────────────────────────────────────────────
  const { data: pgData } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
    staleTime: 5 * 60 * 1000,
  });
  const pgs = pgData?.pgs || [];

  const queryParams = useMemo(() => ({
    page, limit: LIMIT,
    ...(filterPgId   && { pgId: filterPgId }),
    ...(filterMonth  && { rentMonth: filterMonth }),
    ...(filterStatus && { status: filterStatus }),
    ...(filterMode   && { paymentMode: filterMode }),
  }), [page, filterPgId, filterMonth, filterStatus, filterMode]);

  // Main Rent History Query
  const { data, isLoading } = useQuery({
    queryKey: ['rent', queryParams],
    queryFn: async () => (await getRentPaymentsApi(queryParams)).data?.data,
  });

  // Inbox Query — fetch all rents pending verification ('under_review')
  const { data: approvalsData, isLoading: approvalsLoading } = useQuery({
    queryKey: ['rent-approvals', filterPgId],
    queryFn: async () => (await getRentPaymentsApi({
      pgId: filterPgId || undefined,
      status: 'under_review',
      limit: 100
    })).data?.data,
  });

  const approvals = approvalsData?.records || [];

  const { data: summary } = useQuery({
    queryKey: ['rent-summary', filterPgId, filterMonth],
    queryFn: async () => (await getRentSummaryApi({ pgId: filterPgId || undefined, rentMonth: filterMonth || undefined })).data?.data,
    enabled: !!filterPgId || !!filterMonth,
  });

  const records = data?.records || [];
  const total   = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  // Load beds when a PG is selected in the record modal
  const loadBeds = async (pgId) => {
    if (!pgId) { setBeds([]); return; }
    try {
      const res = await getRoomsApi({ pgId, withBeds: true });
      const allBeds = (res.data?.data?.rooms || []).flatMap(r =>
        (r.beds || []).filter(b => b.status === 'occupied').map(b => ({
          ...b,
          label: `Bed ${b.bedNumber} (Room ${r.roomNumber} - ${b.userId?.name || 'Tenant'}) — ₹${b.price}/mo`,
        }))
      );
      setBeds(allBeds);
    } catch { setBeds([]); }
  };

  const handleBedSelect = (bedId) => {
    const bed = beds.find(b => b._id === bedId);
    setForm(f => ({
      ...f,
      bedId,
      userId: bed?.userId?._id || '',
      amount: bed?.price || '',
      amountPaid: bed?.price || '',
    }));
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries(['rent']);
    qc.invalidateQueries(['rent-summary']);
    qc.invalidateQueries(['rent-approvals']);
    setSelectedIds([]);
  };

  const recordMut = useMutation({
    mutationFn: recordPaymentApi,
    onSuccess: () => { toast.success('Payment recorded!'); invalidate(); setModal(null); setForm(emptyForm); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePaymentApi(id, data, filterPgId),
    onSuccess: () => { toast.success('Payment updated!'); invalidate(); setModal(null); setEditTarget(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id }) => deletePaymentApi(id, filterPgId),
    onSuccess: () => { toast.success('Record deleted'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const generateMut = useMutation({
    mutationFn: generateMonthRentApi,
    onSuccess: (res) => {
      const d = res.data?.data;
      toast.success(`Generated: ${d?.created} new, ${d?.skipped} skipped`);
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approveMut = useMutation({
    mutationFn: ({ id }) => approvePaymentApi(id, filterPgId),
    onSuccess: () => { toast.success('Payment approved!'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, notes }) => rejectPaymentApi(id, { notes }, filterPgId),
    onSuccess: () => { toast.success('Payment proof rejected'); invalidate(); setModal(null); setRejectTargetId(null); setRejectionNotes(''); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bulkApproveMut = useMutation({
    mutationFn: (data) => bulkApprovePaymentsApi(data, filterPgId),
    onSuccess: (res) => {
      toast.success(`Bulk Approved: ${res.data?.data?.approved} verified successfully!`);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Approve payment proof for all ${selectedIds.length} selected students?`)) {
      bulkApproveMut.mutate({ rentIds: selectedIds });
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(approvals.map(a => a._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const openEdit = (rec) => {
    setEditTarget(rec);
    setForm({
      amount: rec.amount, amountPaid: rec.amountPaid,
      paymentMode: rec.paymentMode || 'cash',
      paidDate: rec.paidDate ? rec.paidDate.slice(0, 10) : '',
      referenceNo: rec.referenceNo || '',
      notes: rec.notes || '',
      rentMonth: rec.rentMonth,
      bedId: rec.bedId?._id, userId: rec.userId?._id,
    });
    setModal('edit');
  };

  const openReject = (id) => {
    setRejectTargetId(id);
    setRejectionNotes('');
    setModal('reject');
  };

  const handleSubmit = () => {
    if (form.amount !== '' && Number(form.amount) < 0) {
      toast.error('Rent amount cannot be negative');
      return;
    }
    if (form.amountPaid !== '' && Number(form.amountPaid) < 0) {
      toast.error('Amount paid cannot be negative');
      return;
    }
    if (modal === 'edit') {
      updateMut.mutate({ id: editTarget._id, data: form });
    } else {
      recordMut.mutate(form);
    }
  };


  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Rent Tracker</h1>
          <p className="page-subtitle">Track payments, verification approvals, and monthly collections</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => { setForm(f => ({ ...f, _genPgId: filterPgId || '' })); setModal('generate'); }} style={{ gap: 6 }}>
            <Zap size={14} /> Generate Rent Bills
          </Button>
          <Button size="sm" onClick={() => { setForm(emptyForm); setModal('record'); loadBeds(filterPgId); }} style={{ gap: 6 }}>
            <Plus size={14} /> Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { icon: <IndianRupee size={18} />, label: 'Collected', value: f(summary.totalCollected), sub: `of ${f(summary.totalDue)}`, color: 'var(--success)' },
            { icon: <TrendingUp size={18} />, label: 'Collection Rate', value: `${summary.paid || 0} / ${summary.tenantCount || 0}`, sub: `${summary.collectionRate}% tenants paid`, color: 'var(--primary)' },
            { icon: <Clock size={18} />, label: 'Pending', value: (summary.pending || 0) + (summary.partial || 0) + (summary.under_review || 0), sub: 'payments due', color: 'var(--warning)' },
            { icon: <AlertCircle size={18} />, label: 'Overdue', value: summary.overdue || 0, sub: 'past due date', color: 'var(--danger)' },
          ].map((s, i) => (
            <Card key={i} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Dynamic Tab Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 20 }}>
        <button
          onClick={() => setActiveTab('records')}
          style={{
            padding: '10px 4px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'records' ? '2px solid var(--primary)' : 'none',
            color: activeTab === 'records' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          All Rent Records
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '10px 4px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'approvals' ? '2px solid var(--primary)' : 'none',
            color: activeTab === 'approvals' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          Approvals Inbox
          {approvals.length > 0 && (
            <span style={{
              background: 'var(--danger)',
              color: '#fff',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              fontWeight: 900
            }}>
              {approvals.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: Approvals Inbox Queue */}
      {activeTab === 'approvals' && (
        <div className="fade-in">
          {/* Action header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Student Payment Submissions</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confirm or reject self-reported transactions submitted by tenants</p>
            </div>
            {selectedIds.length > 0 && (
              <Button size="sm" onClick={handleBulkApprove} style={{ gap: 6 }}>
                <Check size={14} /> Approve Selected ({selectedIds.length})
              </Button>
            )}
          </div>

          {approvalsLoading ? <Spinner center /> : approvals.length === 0 ? (
            <EmptyState icon={<FileCheck size={48} />} title="Approvals Inbox is Empty"
              description="Excellent! No pending student payment proofs require verification." />
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === approvals.length}
                        onChange={e => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>Student Details</th>
                    <th>Bed / PG</th>
                    <th>Month</th>
                    <th>Days</th>
                    <th>Amount Due</th>
                    <th>Paid Amount</th>
                    <th>Mode</th>
                    <th>Txn Ref ID</th>
                    <th>Tenant Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map(rec => (
                    <tr key={rec._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rec._id)}
                          onChange={e => handleSelectRow(rec._id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{rec.userId?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {rec.userId?.mobNo1 && <><Phone size={10} />{rec.userId.mobNo1}</>}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600 }}>Bed {rec.bedId?.bedNumber}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{rec.pgId?.name}</div>
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 700 }}>{rec.rentMonth}</td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{getActiveDays(rec)}</td>
                       <td style={{ fontSize: 13, fontWeight: 700 }}>
                        <div>{f(rec.amount)}</div>
                        {rec.bedId?.price && rec.amount < rec.bedId.price && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Base: {f(rec.bedId.price)}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)' }}>{f(rec.amountPaid)}</td>
                      <td style={{ fontSize: 12 }}>{rec.paymentMode ? MODE_LABELS[rec.paymentMode] : '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.referenceNo || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.notes || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { if (window.confirm('Confirm and approve this payment?')) approveMut.mutate({ id: rec._id }); }}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--success-light)',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              color: 'var(--success)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 800,
                              fontSize: 11
                            }}
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => openReject(rec._id)}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--danger-light)',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              color: 'var(--danger)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 800,
                              fontSize: 11
                            }}
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: All Rent Records (Filterable Table) */}
      {activeTab === 'records' && (
        <div className="fade-in">
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-control" style={{ width: 'auto', minWidth: 160, fontSize: 12 }}
              value={filterPgId} onChange={e => { setFilterPgId(e.target.value); setPage(1); }}>
              <option value="">All PGs</option>
              {pgs.map(pg => <option key={pg._id} value={pg._id}>{pg.name}</option>)}
            </select>

            <select className="form-control" style={{ width: 'auto', fontSize: 12 }}
              value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
              {monthOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select className="form-control" style={{ width: 'auto', fontSize: 12 }}
              value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="under_review">Under Review</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>

            <select className="form-control" style={{ width: 'auto', fontSize: 12 }}
              value={filterMode} onChange={e => { setFilterMode(e.target.value); setPage(1); }}>
              <option value="">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>

            {(filterStatus || filterMode) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(''); setFilterMode(''); setPage(1); }}>
                Clear
              </Button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{total} records</span>
          </div>

          {/* Table */}
          {isLoading ? <Spinner center /> : records.length === 0 ? (
            <EmptyState icon={<IndianRupee size={48} />} title="No rent records"
              description="Record a payment or auto-generate rent for this month." />
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Bed / Room</th>
                      <th>PG</th>
                      <th>Month</th>
                      <th>Days</th>
                      <th>Due</th>
                      <th>Paid</th>
                      <th>Status</th>
                      <th>Mode</th>
                      <th>Paid On</th>
                      <th>Ref#</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec => (
                      <tr key={rec._id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.userId?.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {rec.userId?.mobNo1 && <><Phone size={10} />{rec.userId.mobNo1}</>}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>Bed {rec.bedId?.bedNumber}</div>
                          <div style={{ color: 'var(--text-muted)' }}>Room {rec.roomId?.roomNumber}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{rec.pgId?.name || '—'}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{rec.rentMonth}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{getActiveDays(rec)}</td>
                        <td style={{ fontSize: 13, fontWeight: 700 }}>
                          <div>{f(rec.amount)}</div>
                          {rec.bedId?.price && rec.amount < rec.bedId.price && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                              Base: {f(rec.bedId.price)}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 700, color: rec.status === 'paid' ? 'var(--success)' : 'var(--warning)' }}>
                          {f(rec.amountPaid)}
                        </td>
                        <td><Badge variant={STATUS_VARIANT[rec.status] || 'default'}>{rec.status}</Badge></td>
                        <td style={{ fontSize: 12 }}>{rec.paymentMode ? MODE_LABELS[rec.paymentMode] : '—'}</td>
                        <td style={{ fontSize: 12 }} title={rec.paidDate ? formatDateTime(rec.paidDate) : '—'}>
                          {rec.paidDate ? (
                            <>
                              <div style={{ fontWeight: 600 }}>{formatDate(rec.paidDate)}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(rec.paidDate)}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rec.referenceNo || '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(rec)}
                              style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--primary)' }}>
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Delete this rent record?')) deleteMut.mutate({ id: rec._id }); }}
                              style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--danger)' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Page {page} of {totalPages} · {total} records
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                    <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Record / Edit Payment Modal */}
      <Modal
        isOpen={modal === 'record' || modal === 'edit'}
        onClose={() => { setModal(null); setEditTarget(null); setForm(emptyForm); }}
        title={modal === 'edit' ? 'Edit Payment Record' : 'Record Payment'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {modal === 'record' && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  SELECT PG <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select className="form-control" required value={form._pgId || filterPgId}
                  onChange={e => { setForm(f => ({ ...f, _pgId: e.target.value, bedId: '', userId: '' })); loadBeds(e.target.value); }}>
                  <option value="">-- Select PG --</option>
                  {pgs.map(pg => <option key={pg._id} value={pg._id}>{pg.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                  SELECT TENANT BED <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select className="form-control" required value={form.bedId} onChange={e => handleBedSelect(e.target.value)}>
                  <option value="">-- Select occupied bed --</option>
                  {beds.map(b => <option key={b._id} value={b._id}>{b.label}</option>)}
                </select>
              </div>
            </>
          )}

          {modal === 'edit' && editTarget && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12 }}>
              <strong>{editTarget.userId?.name}</strong> · Bed {editTarget.bedId?.bedNumber} · {editTarget.rentMonth}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Rent Month" type="month" value={form.rentMonth} required
              onChange={e => setForm(f => ({ ...f, rentMonth: e.target.value }))} />
            <Input label="Rent Amount (₹)" type="number" min="0" value={form.amount} required
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) setForm(f => ({ ...f, amount: val }));
              }} />
            <Input label="Amount Paid (₹)" type="number" min="0" value={form.amountPaid} required
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) setForm(f => ({ ...f, amountPaid: val }));
              }} />

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>PAYMENT MODE</label>
              <select className="form-control" value={form.paymentMode}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI / Scanner</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cheque">📄 Cheque</option>
                <option value="online">🌐 Online</option>
              </select>
            </div>
            <Input label="Payment Date" type="date" value={form.paidDate}
              onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))} />
            <Input label="Reference / Txn ID" value={form.referenceNo}
              onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="UPI ID, cheque no..." />
          </div>
          <Input label="Notes" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any remarks..." />

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setModal(null); setEditTarget(null); }}>Cancel</Button>
            <Button style={{ flex: 1 }} loading={recordMut.isPending || updateMut.isPending} onClick={handleSubmit}>
              {modal === 'edit' ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal isOpen={modal === 'generate'} onClose={() => setModal(null)} title="Auto-Generate Monthly Rent">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
          <div style={{ padding: 14, background: 'var(--primary-light)', borderRadius: 10, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
            <CheckCircle2 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Creates pending rent records for all currently occupied beds in the selected PG. Existing records are skipped.
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              SELECT PG <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select className="form-control" required value={form._genPgId || ''}
              onChange={e => setForm(f => ({ ...f, _genPgId: e.target.value }))}>
              <option value="">-- Select PG --</option>
              {pgs.map(pg => <option key={pg._id} value={pg._id}>{pg.name}</option>)}
            </select>
          </div>
          <Input label="For Month" type="month" value={form.rentMonth} required
            onChange={e => setForm(f => ({ ...f, rentMonth: e.target.value }))} />

          {form.rentMonth && form.rentMonth > currentMonth() && (
            <div style={{ 
              padding: '10px 14px', 
              background: 'var(--danger-light)', 
              border: '1px solid var(--danger)', 
              borderRadius: 8, 
              color: 'var(--danger)', 
              fontSize: 12, 
              fontWeight: 600,
              lineHeight: 1.4
            }}>
              ⚠️ You cannot generate bills for {getMonthName(form.rentMonth)} month in {getMonthName(currentMonth())} month.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</Button>
            <Button 
              style={{ flex: 1 }} 
              loading={generateMut.isPending}
              disabled={!form._genPgId || !form.rentMonth || (form.rentMonth > currentMonth())}
              title={form.rentMonth && form.rentMonth > currentMonth() ? `You cannot generate bills for ${getMonthName(form.rentMonth)} month in ${getMonthName(currentMonth())} month.` : ''}
              onClick={() => {
                if (!form._genPgId || !form.rentMonth) {
                  toast.error('Please select a PG and Month');
                  return;
                }
                if (form.rentMonth > currentMonth()) {
                  toast.error(`You cannot generate bills for ${getMonthName(form.rentMonth)} month in ${getMonthName(currentMonth())} month.`);
                  return;
                }
                generateMut.mutate({ pgId: form._genPgId, rentMonth: form.rentMonth });
              }}
            >
              <Zap size={14} style={{ marginRight: 6 }} /> Generate Rent Slips
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rejection Notes Modal */}
      <Modal isOpen={modal === 'reject'} onClose={() => { setModal(null); setRejectTargetId(null); setRejectionNotes(''); }} title="Reject Payment Proof">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
          <div style={{ padding: 14, background: 'var(--danger-light)', borderRadius: 10, fontSize: 13, color: 'var(--danger)', fontWeight: 600, display: 'flex', gap: 10, alignItems: 'center' }}>
            <ShieldAlert size={20} />
            <div>
              Rejection will return the rent status back to "Pending" and clear transaction details so the student can resubmit.
            </div>
          </div>
          <Input
            label="Reason for Rejection *"
            required
            value={rejectionNotes}
            onChange={e => setRejectionNotes(e.target.value)}
            placeholder="e.g., Reference ID doesn't match bank records / Wrong amount entered..."
          />

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setModal(null); setRejectTargetId(null); }}>Cancel</Button>
            <Button style={{ flex: 1 }} variant="danger" loading={rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTargetId, notes: rejectionNotes })}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
