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
import { Badge, Button, Card, Modal, Spinner, EmptyState, Input, ConfirmModal, SelectDropdown } from '../../components/common';
import { getErrorMessage, formatDate, formatDateTime, formatTime } from '../../utils/helpers';
import { cn } from '../../utils/cn';
import {
  IndianRupee, TrendingUp, Clock, AlertCircle, Phone, Plus,
  Edit2, Trash2, CheckCircle2, Zap, Check, X, ShieldAlert, FileCheck,
  FileText, Banknote, Smartphone, Landmark, Globe
} from 'lucide-react';

const PAYMENT_MODES = {
  cash: { 
    label: 'Cash', 
    icon: Banknote, 
    color: 'text-[#51cf66] bg-[#51cf66]/8 border-[#51cf66]/25 dark:bg-[#51cf66]/12 dark:border-[#51cf66]/20' 
  },
  upi: { 
    label: 'UPI', 
    icon: Smartphone, 
    color: 'text-[#6c63ff] bg-[#6c63ff]/8 border-[#6c63ff]/25 dark:bg-[#6c63ff]/12 dark:border-[#6c63ff]/20' 
  },
  bank_transfer: { 
    label: 'Bank Transfer', 
    icon: Landmark, 
    color: 'text-[#00d4aa] bg-[#00d4aa]/8 border-[#00d4aa]/25 dark:bg-[#00d4aa]/12 dark:border-[#00d4aa]/20' 
  },
  cheque: { 
    label: 'Cheque', 
    icon: FileText, 
    color: 'text-[#ffa94d] bg-[#ffa94d]/8 border-[#ffa94d]/25 dark:bg-[#ffa94d]/12 dark:border-[#ffa94d]/20' 
  },
  online: { 
    label: 'Online', 
    icon: Globe, 
    color: 'text-[#cc5de8] bg-[#cc5de8]/8 border-[#cc5de8]/25 dark:bg-[#cc5de8]/12 dark:border-[#cc5de8]/20' 
  }
};

const PaymentModeBadge = ({ mode }) => {
  const config = PAYMENT_MODES[mode];
  if (!config) return <span className="text-gray-400 dark:text-[#6b6e82]">—</span>;
  const Icon = config.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border tracking-wider uppercase transition-all duration-200 shadow-sm",
      config.color
    )}>
      <Icon size={12} className="flex-shrink-0 stroke-[2.5]" />
      <span>{config.label}</span>
    </span>
  );
};

const STATUS_VARIANT = { paid: 'success', pending: 'warning', under_review: 'info', partial: 'info', overdue: 'danger' };

const getDaysInMonth = (yearMonth) => {
  if (!yearMonth) return 30;
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
};

const calculateActiveDaysFromCheckIn = (checkInDateStr, rentMonthStr) => {
  if (!checkInDateStr || !rentMonthStr) return 30;
  
  const [rentYear, rentMonth] = rentMonthStr.split('-').map(Number);
  const checkIn = new Date(checkInDateStr);
  const checkInYear = checkIn.getFullYear();
  const checkInMonth = checkIn.getMonth() + 1;
  const checkInDay = checkIn.getDate();
  
  const totalDays = new Date(rentYear, rentMonth, 0).getDate();
  
  const rentFirstDate = new Date(rentYear, rentMonth - 1, 1);
  if (checkIn < rentFirstDate) {
    return totalDays;
  }
  
  const rentLastDate = new Date(rentYear, rentMonth, 0, 23, 59, 59, 999);
  if (checkIn > rentLastDate) {
    return 0;
  }
  
  if (checkInYear === rentYear && checkInMonth === rentMonth) {
    return (totalDays - checkInDay) + 1;
  }
  
  return totalDays;
};

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
  paymentMode: 'cash', paidDate: '', referenceNo: '', notes: '', rentMonth: currentMonth(),
  status: 'paid', activeDays: '', joiningDate: ''
};

const getActiveDays = (rec) => {
  if (rec.activeDays !== undefined && rec.activeDays !== null) {
    return `${rec.activeDays}D`;
  }
  if (rec.notes && rec.notes.includes("Prorated rent:")) {
    const match = rec.notes.match(/Prorated rent: (\d+) active days/);
    if (match) return `${match[1]}D`;
  }
  if (rec.rentMonth) {
    const [y, m] = rec.rentMonth.split("-").map(Number);
    if (y && m) {
      const totalDays = new Date(y, m, 0).getDate();
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
  const [bedSearch, setBedSearch]         = useState('');
  const [showBedDropdown, setShowBedDropdown] = useState(false);
  const [breakdownTarget, setBreakdownTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);

  const filteredBeds = useMemo(() => {
    if (!bedSearch.trim()) return beds;
    const term = bedSearch.toLowerCase();
    return beds.filter(b => b.label.toLowerCase().includes(term));
  }, [beds, bedSearch]);

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
    refetchOnWindowFocus: false,
  });

  // Inbox Query — fetch all rents pending verification ('under_review')
  const { data: approvalsData, isLoading: approvalsLoading } = useQuery({
    queryKey: ['rent-approvals', filterPgId],
    queryFn: async () => (await getRentPaymentsApi({
      pgId: filterPgId || undefined,
      status: 'under_review',
      limit: 100
    })).data?.data,
    refetchOnWindowFocus: false,
  });

  const approvals = approvalsData?.records || [];

  const { data: summary } = useQuery({
    queryKey: ['rent-summary', filterPgId, filterMonth],
    queryFn: async () => (await getRentSummaryApi({ pgId: filterPgId || undefined, rentMonth: filterMonth || undefined })).data?.data,
    enabled: !!filterPgId || !!filterMonth,
    refetchOnWindowFocus: false,
  });

  const records = data?.records || [];
  const total   = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  // Load beds when a PG is selected in the record modal
  const loadBeds = async (pgId, month) => {
    if (!pgId) { setBeds([]); return; }
    try {
      const targetMonth = month || form.rentMonth;
      const [roomsRes, rentsRes] = await Promise.all([
        getRoomsApi(pgId),
        getRentPaymentsApi({ pgId, rentMonth: targetMonth, limit: 100 })
      ]);
      const existingBedIds = new Set(
        (rentsRes.data?.data?.records || []).map(r => String(r.bedId?._id))
      );
      const allBeds = (roomsRes.data?.data || []).flatMap(r =>
        (r.beds || [])
          .filter(b => b.status === 'occupied' && !existingBedIds.has(String(b._id)))
          .map(b => ({
            ...b,
            label: `Bed ${b.bedNumber} (Room ${r.roomNumber} - ${b.userId?.name || 'Tenant'}) — ₹${b.price}/mo`,
          }))
      );
      setBeds(allBeds);
    } catch { setBeds([]); }
  };

  const handleBedSelect = (bedId) => {
    const bed = beds.find(b => b._id === bedId);
    const totalDays = getDaysInMonth(form.rentMonth);
    const defaultCheckInDate = `${form.rentMonth}-01`;
    
    setForm(f => ({
      ...f,
      bedId,
      userId: bed?.userId?._id || '',
      joiningDate: defaultCheckInDate,
      activeDays: totalDays,
      amount: bed?.price || '',
      amountPaid: f.status === 'paid' ? (bed?.price || '') : (f.status === 'pending' ? 0 : f.amountPaid),
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
    setShowBulkApproveModal(true);
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
    const defaultCheckInDate = `${rec.rentMonth}-01`;
    setForm({
      amount: rec.amount, amountPaid: rec.amountPaid,
      paymentMode: rec.paymentMode || 'cash',
      paidDate: rec.paidDate ? rec.paidDate.slice(0, 10) : '',
      referenceNo: rec.referenceNo || '',
      notes: rec.notes || '',
      rentMonth: rec.rentMonth,
      bedId: rec.bedId?._id, userId: rec.userId?._id,
      status: rec.status || 'paid',
      activeDays: rec.activeDays !== undefined && rec.activeDays !== null ? rec.activeDays : getDaysInMonth(rec.rentMonth),
      joiningDate: defaultCheckInDate
    });
    setModal('edit');
  };

  const openReject = (id) => {
    setRejectTargetId(id);
    setRejectionNotes('');
    setModal('reject');
  };

  const handleSubmit = () => {
    if (modal === 'record' && !form.bedId) {
      toast.error('Please select an occupied tenant bed from the list');
      return;
    }
    if (form.amount !== '' && Number(form.amount) < 0) {
      toast.error('Rent amount cannot be negative');
      return;
    }
    if (form.amountPaid !== '' && Number(form.amountPaid) < 0) {
      toast.error('Amount paid cannot be negative');
      return;
    }

    const submitForm = { ...form };
    if (submitForm.status === 'pending') {
      submitForm.amountPaid = 0;
      submitForm.paymentMode = null;
      submitForm.paidDate = null;
      submitForm.referenceNo = null;
    }
    // Sanitize empty date string → null to avoid backend CastError
    if (submitForm.paidDate === '' || submitForm.paidDate === undefined) {
      submitForm.paidDate = null;
    }

    if (modal === 'edit') {
      updateMut.mutate({ id: editTarget._id, data: submitForm });
    } else {
      recordMut.mutate(submitForm);
    }
  };

  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">Rent Tracker</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Track payments, verification approvals, and monthly collections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setForm(f => ({ ...f, _genPgId: filterPgId || '' })); setModal('generate'); }} className="flex items-center gap-1.5">
            <Zap size={14} /> Generate Rent Bills
          </Button>
          <Button size="sm" onClick={() => { 
            const initialForm = { ...emptyForm, _pgId: filterPgId || '' };
            setForm(initialForm); 
            setBedSearch('');
            setShowBedDropdown(false);
            setModal('record'); 
            loadBeds(filterPgId, initialForm.rentMonth); 
          }} className="flex items-center gap-1.5">
            <Plus size={14} /> Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { 
              icon: <IndianRupee size={18} />, 
              label: 'Collected', 
              value: f(summary.totalCollected), 
              sub: `${summary.totalDue > 0 ? Math.round((summary.totalCollected / summary.totalDue) * 100) : 0}% of ${f(summary.totalDue)}`, 
              colorClass: 'text-[#51cf66]'
            },
            { icon: <TrendingUp size={18} />, label: 'Collection Rate', value: `${summary.paid || 0} / ${summary.tenantCount || 0}`, sub: `${summary.collectionRate}% tenants paid`, colorClass: 'text-[#6c63ff]' },
            { icon: <Clock size={18} />, label: 'Pending', value: (summary.pending || 0) + (summary.partial || 0) + (summary.under_review || 0), sub: 'payments due', colorClass: 'text-[#ffa94d]' },
            { icon: <AlertCircle size={18} />, label: 'Overdue', value: summary.overdue || 0, sub: 'past due date', colorClass: 'text-[#ff4d6d]' },
          ].map((s, i) => (
            <Card key={i} className="p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={s.colorClass}>{s.icon}</div>
                <span className="text-[10px] font-bold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.9px]">{s.label}</span>
              </div>
              <div className={`text-2xl font-black ${s.colorClass}`}>{s.value}</div>
              <div className="text-xs dark:text-[#6b6e82] text-gray-500 mt-1">{s.sub}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Dynamic Tab Selector */}
      <div className="flex border-b border-gray-200 dark:border-[#2d3052] mb-5 gap-0">
        <button
          onClick={() => setActiveTab('records')}
          className={cn(
            "px-4 py-2.5 text-[13px] font-bold transition-colors border-b-2 cursor-pointer outline-none",
            activeTab === 'records'
              ? "border-[#6c63ff] text-[#6c63ff]"
              : "border-transparent text-gray-500 dark:text-[#a0a3b1] hover:text-gray-900 dark:hover:text-[#f0f0f8]"
          )}
        >
          All Rent Records
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={cn(
            "px-4 py-2.5 text-[13px] font-bold transition-colors border-b-2 cursor-pointer outline-none",
            activeTab === 'approvals'
              ? "border-[#6c63ff] text-[#6c63ff]"
              : "border-transparent text-gray-500 dark:text-[#a0a3b1] hover:text-gray-900 dark:hover:text-[#f0f0f8]"
          )}
        >
          <div className="flex items-center gap-2">
            Approvals Inbox
            {approvals.length > 0 && (
              <span className="bg-[#ff4d6d] text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {approvals.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* VIEW 1: Approvals Inbox Queue */}
      {activeTab === 'approvals' && (
        <div className="fade-in">
          {/* Action header */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
            <div>
              <h3 className="text-base font-bold dark:text-[#f0f0f8] text-gray-900">Student Payment Submissions</h3>
              <p className="text-xs dark:text-[#6b6e82] text-gray-500">Confirm or reject self-reported transactions submitted by tenants</p>
            </div>
            {selectedIds.length > 0 && (
              <Button size="sm" onClick={handleBulkApprove} className="flex items-center gap-1.5">
                <Check size={14} /> Approve Selected ({selectedIds.length})
              </Button>
            )}
          </div>

          {approvalsLoading ? <Spinner center /> : approvals.length === 0 ? (
            <EmptyState icon={<FileCheck size={48} />} title="Approvals Inbox is Empty"
              description="Excellent! No pending student payment proofs require verification." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#2d3052] mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#242740] border-b border-gray-200 dark:border-[#2d3052]">
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === approvals.length}
                        onChange={e => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Student Details</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Bed / PG</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Month</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Days</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Amount Due</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Paid Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Mode</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Txn Ref ID</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left">Tenant Notes</th>
                    <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map(rec => (
                    <tr key={rec._id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-[#242740]/50 last:[&>td]:border-0">
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rec._id)}
                          onChange={e => handleSelectRow(rec._id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                        <div className="font-bold text-[13px] dark:text-[#f0f0f8] text-gray-900">{rec.userId?.name || '—'}</div>
                        <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 flex items-center gap-1 mt-0.5">
                          {rec.userId?.mobNo1 && <><Phone size={10} />{rec.userId.mobNo1}</>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs dark:text-[#f0f0f8] text-gray-900">
                        <div className="font-semibold">Bed {rec.bedId?.bedNumber}</div>
                        <div className="text-gray-500 dark:text-[#6b6e82]">{rec.pgId?.name}</div>
                      </td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs font-bold dark:text-[#f0f0f8] text-gray-900">{rec.rentMonth}</td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs font-semibold dark:text-[#f0f0f8] text-gray-900">{getActiveDays(rec)}</td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900">
                        <div>{f(rec.amount + (rec.penaltyAmount || 0))}</div>
                        {rec.penaltyAmount > 0 ? (
                          <div className="text-[10px] text-[#ff4d6d] font-medium mt-0.5">
                            Base: {f(rec.amount)} + Late Fee: {f(rec.penaltyAmount)}
                          </div>
                        ) : rec.bedId?.price && rec.amount < rec.bedId.price ? (
                          <div className="text-[10px] text-gray-500 dark:text-[#6b6e82] font-medium mt-0.5">
                            Base: {f(rec.bedId.price)} (Prorated)
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                        <Badge variant="info">{f(rec.amountPaid)}</Badge>
                      </td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs dark:text-[#f0f0f8] text-gray-900"><PaymentModeBadge mode={rec.paymentMode} /></td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-[11px] text-gray-500 dark:text-[#6b6e82] font-mono">{rec.referenceNo || '—'}</td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-[11px] text-gray-500 dark:text-[#6b6e82] max-w-[140px] truncate" title={rec.notes}>
                        {rec.notes || '—'}
                      </td>
                      <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                        <div className="flex gap-1.5 justify-end items-center">
                          <button onClick={() => setBreakdownTarget(rec)}
                            className="p-1.5 bg-gray-50 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg cursor-pointer text-[#6c63ff] hover:bg-gray-100 dark:hover:bg-[#2d3052] flex items-center justify-center h-8 w-8 transition-colors"
                            title="View Breakdown">
                            <FileText size={13} />
                          </button>
                          <button
                            onClick={() => setApproveTarget(rec)}
                            className="px-2.5 py-1.5 bg-[#51cf66]/12 hover:bg-[#51cf66]/20 border border-transparent rounded-lg cursor-pointer text-[#51cf66] flex items-center gap-1 font-bold text-[11px] h-8 transition-colors"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => openReject(rec._id)}
                            className="px-2.5 py-1.5 bg-[#ff4d6d]/12 hover:bg-[#ff4d6d]/20 border border-transparent rounded-lg cursor-pointer text-[#ff4d6d] flex items-center gap-1 font-bold text-[11px] h-8 transition-colors"
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
          <div className="flex gap-2.5 mb-4 flex-wrap items-center">
            <SelectDropdown
              value={filterPgId}
              onChange={e => { setFilterPgId(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All PGs' }, ...pgs.map(pg => ({ value: pg._id, label: pg.name }))]}
              className="min-w-[160px]"
            />

            <SelectDropdown
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
              options={monthOptions()}
              className="min-w-[150px]"
            />

            <SelectDropdown
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Status' },
                { value: 'paid', label: 'Paid' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'partial', label: 'Partial' },
                { value: 'pending', label: 'Pending' },
                { value: 'overdue', label: 'Overdue' }
              ]}
              className="min-w-[130px]"
            />

            <SelectDropdown
              value={filterMode}
              onChange={e => { setFilterMode(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Modes' },
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'online', label: 'Online' }
              ]}
              className="min-w-[130px]"
            />

            {(filterStatus || filterMode) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(''); setFilterMode(''); setPage(1); }}>
                Clear
              </Button>
            )}
            <span className="sm:ml-auto text-xs dark:text-[#6b6e82] text-gray-500 font-semibold">{total} records</span>
          </div>

          {/* Table */}
          {isLoading ? <Spinner center /> : records.length === 0 ? (
            <EmptyState icon={<IndianRupee size={48} />} title="No rent records"
              description="Record a payment or auto-generate rent for this month." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#2d3052] mb-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#242740] border-b border-gray-200 dark:border-[#2d3052]">
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Tenant</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Bed / Room</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">PG</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Month</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Days</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Due</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Paid</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Mode</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Paid On</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Ref#</th>
                      <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec => (
                      <tr key={rec._id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-[#242740]/50 last:[&>td]:border-0">
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                          <div className="font-bold text-[13px] dark:text-[#f0f0f8] text-gray-900">{rec.userId?.name || '—'}</div>
                          <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 flex items-center gap-1 mt-0.5">
                            {rec.userId?.mobNo1 && <><Phone size={10} />{rec.userId.mobNo1}</>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs dark:text-[#f0f0f8] text-gray-900">
                          <div className="font-semibold">Bed {rec.bedId?.bedNumber}</div>
                          <div className="text-gray-500 dark:text-[#6b6e82]">Room {rec.roomId?.roomNumber}</div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs dark:text-[#f0f0f8] text-gray-900">{rec.pgId?.name || '—'}</td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs font-bold dark:text-[#f0f0f8] text-gray-900">{rec.rentMonth}</td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs font-semibold dark:text-[#f0f0f8] text-gray-900">{getActiveDays(rec)}</td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900">
                          <div>{f(rec.amount + (rec.penaltyAmount || 0))}</div>
                          {rec.penaltyAmount > 0 ? (
                            <div className="text-[10px] text-[#ff4d6d] font-medium mt-0.5">
                              Base: {f(rec.amount)} + Late Fee: {f(rec.penaltyAmount)}
                            </div>
                          ) : rec.bedId?.price && rec.amount < rec.bedId.price ? (
                            <div className="text-[10px] text-gray-500 dark:text-[#6b6e82] font-medium mt-0.5">
                              Base: {f(rec.bedId.price)} (Prorated)
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                          <Badge variant={rec.status === 'paid' ? 'success' : rec.status === 'partial' ? 'info' : 'default'}>
                            {f(rec.amountPaid)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                          <Badge variant={STATUS_VARIANT[rec.status] || 'default'}>{rec.status}</Badge>
                          {rec.penaltyAmount > 0 && rec.status === 'paid' && (
                            <div className="text-[10px] text-[#ff4d6d] font-semibold mt-0.5">
                              (Late Fee Applied)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs dark:text-[#f0f0f8] text-gray-900"><PaymentModeBadge mode={rec.paymentMode} /></td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-xs dark:text-[#f0f0f8] text-gray-900" title={rec.paidDate ? formatDateTime(rec.paidDate) : '—'}>
                          {rec.paidDate ? (
                            <>
                              <div className="font-semibold">{formatDate(rec.paidDate)}</div>
                              <div className="text-[10px] text-gray-500 dark:text-[#6b6e82]">{formatTime(rec.paidDate)}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30 text-[11px] text-gray-500 dark:text-[#6b6e82] max-w-[80px] truncate">
                          {rec.referenceNo || '—'}
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 dark:border-[#2d3052]/30">
                          <div className="flex gap-1.5 justify-end items-center">
                            <button onClick={() => setBreakdownTarget(rec)}
                              className="p-1.5 bg-gray-50 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg cursor-pointer text-[#6c63ff] hover:bg-gray-100 dark:hover:bg-[#2d3052] h-7 w-7 flex items-center justify-center transition-colors"
                              title="View Breakdown">
                              <FileText size={13} />
                            </button>
                            <button onClick={() => openEdit(rec)}
                              className="p-1.5 bg-gray-50 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg cursor-pointer text-[#6c63ff] hover:bg-gray-100 dark:hover:bg-[#2d3052] h-7 w-7 flex items-center justify-center transition-colors"
                              title="Edit Record">
                              <Edit2 size={13} />
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
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-500 dark:text-[#6b6e82]">
                    Page {page} of {totalPages} · {total} records
                  </span>
                  <div className="flex gap-1.5">
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
        <div className="flex flex-col gap-4">
          {modal === 'record' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.8px] mb-1.5 block">
                  SELECT PG <span className="text-[#ff4d6d]">*</span>
                </label>
                <SelectDropdown
                  value={form._pgId || ''}
                  onChange={e => { 
                    const newPg = e.target.value;
                    setForm(f => ({ ...f, _pgId: newPg, bedId: '', userId: '' })); 
                    setBedSearch('');
                    setShowBedDropdown(false);
                    loadBeds(newPg, form.rentMonth); 
                  }}
                  options={[{ value: '', label: '-- Select PG --' }, ...pgs.map(pg => ({ value: pg._id, label: pg.name }))]}
                  required
                />
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.8px] mb-1.5 block">
                  SELECT TENANT BED <span className="text-[#ff4d6d]">*</span>
                </label>
                <input
                  type="text"
                  className="w-full h-11 bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 text-sm dark:text-[#f0f0f8] text-gray-900 outline-none focus:border-[#6c63ff] transition-all"
                  placeholder="🔍 Type tenant name, bed no, or room no..."
                  value={bedSearch}
                  onFocus={() => setShowBedDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBedDropdown(false), 200)}
                  onChange={e => {
                    setBedSearch(e.target.value);
                    setShowBedDropdown(true);
                  }}
                  required={!form.bedId}
                />
                <span className="text-[10px] text-gray-500 dark:text-[#6b6e82] block mt-1.5 leading-normal">
                  ℹ️ Only displaying occupied beds that do not have an existing rent record for the selected month.
                </span>
                
                {showBedDropdown && (
                  <div className="absolute top-[100%] left-0 right-0 z-[100] bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg max-h-[200px] overflow-y-auto mt-1.5 shadow-lg">
                    {filteredBeds.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-gray-500 dark:text-[#6b6e82]">
                        No occupied beds found matching search
                      </div>
                    ) : (
                      filteredBeds.map(b => (
                        <div
                          key={b._id}
                          onMouseDown={() => {
                            handleBedSelect(b._id);
                            setBedSearch(b.label.split(' — ')[0]);
                            setShowBedDropdown(false);
                          }}
                          className={cn(
                            "px-3 py-2 text-xs cursor-pointer border-b border-gray-100 dark:border-[#2d3052]/30 hover:bg-[#6c63ff]/10 hover:text-[#6c63ff]",
                            form.bedId === b._id ? "bg-[#6c63ff]/15 text-[#6c63ff]" : "text-gray-900 dark:text-[#f0f0f8]"
                          )}
                        >
                          {b.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {modal === 'edit' && editTarget && (
            <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg text-xs font-semibold text-gray-900 dark:text-[#f0f0f8]">
              <strong>{editTarget.userId?.name}</strong> · Bed {editTarget.bedId?.bedNumber} · {editTarget.rentMonth}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Rent Month" type="month" value={form.rentMonth} required
              onChange={e => {
                const newMonth = e.target.value;
                const totalDays = getDaysInMonth(newMonth);
                setForm(f => ({ 
                  ...f, 
                  rentMonth: newMonth, 
                  bedId: '', 
                  userId: '', 
                  amount: '', 
                  amountPaid: '', 
                  activeDays: totalDays 
                }));
                setBedSearch('');
                loadBeds(form._pgId || filterPgId, newMonth);
              }} />
            
            <Input 
              label="Check-in / Joining Date" 
              type="date" 
              value={form.joiningDate} 
              required
              onChange={e => {
                const dateStr = e.target.value;
                const totalDays = getDaysInMonth(form.rentMonth);
                const activeDays = calculateActiveDaysFromCheckIn(dateStr, form.rentMonth);
                
                const bed = beds.find(b => b._id === form.bedId) || editTarget?.bedId;
                const basePrice = bed?.price || form.amount || 0;
                
                let calculatedAmount = basePrice;
                if (activeDays < totalDays && activeDays >= 0) {
                  calculatedAmount = Math.round((activeDays / totalDays) * basePrice);
                } else if (activeDays === 0) {
                  calculatedAmount = 0;
                }
                
                setForm(f => {
                  const newAmountPaid = f.status === 'paid' ? calculatedAmount : (f.status === 'pending' ? 0 : f.amountPaid);
                  return {
                    ...f,
                    joiningDate: dateStr,
                    activeDays: activeDays,
                    amount: calculatedAmount,
                    amountPaid: newAmountPaid
                  };
                });
              }} 
            />

            <Input label="Rent Amount (₹)" type="number" min="0" value={form.amount} required
              onChange={e => {
                const val = e.target.value;
                const calculatedAmount = val === '' ? '' : Number(val);
                setForm(f => {
                  const newAmountPaid = f.status === 'paid' ? calculatedAmount : (f.status === 'pending' ? 0 : f.amountPaid);
                  return {
                    ...f,
                    amount: calculatedAmount,
                    amountPaid: newAmountPaid
                  };
                });
              }} />

            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.8px] mb-1.5 block">PAYMENT STATUS</label>
              <SelectDropdown
                value={form.status}
                onChange={e => {
                  const newStatus = e.target.value;
                  setForm(f => ({
                    ...f,
                    status: newStatus,
                    amountPaid: newStatus === 'paid' ? f.amount : (newStatus === 'pending' ? 0 : f.amountPaid),
                    ...(newStatus === 'pending' && {
                      paymentMode: null,
                      paidDate: '',
                      referenceNo: '',
                    })
                  }));
                }}
                options={[
                  { value: 'paid', label: 'Paid (Full)' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'under_review', label: 'Under Review' }
                ]}
              />
            </div>

            <Input label="Amount Paid (₹)" type="number" min="0" value={form.amountPaid} required
              disabled={form.status === 'pending' || form.status === 'paid'}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) setForm(f => ({ ...f, amountPaid: val }));
              }} />

            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.8px] mb-1.5 block">PAYMENT MODE</label>
              <SelectDropdown
                value={form.status === 'pending' ? '' : (form.paymentMode || '')}
                disabled={form.status === 'pending'}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value || null }))}
                options={
                  form.status === 'pending'
                    ? [{ value: '', label: '-- No Payment Mode --' }]
                    : [
                        { value: 'cash', label: 'Cash' },
                        { value: 'upi', label: 'UPI / Scanner' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                        { value: 'cheque', label: 'Cheque' },
                        { value: 'online', label: 'Online' }
                      ]
                }
              />
            </div>

            <Input label="Payment Date" type="date" value={form.status === 'pending' ? '' : form.paidDate}
              disabled={form.status === 'pending'}
              onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))} />
            
            <Input label="Reference / Txn ID" value={form.status === 'pending' ? '' : form.referenceNo}
              disabled={form.status === 'pending'}
              onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="UPI ID, cheque no..." />
          </div>
          <Input label="Notes" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any remarks..." />

          <div className="flex gap-3 mt-2 flex-col-reverse sm:flex-row pt-4 border-t border-gray-200 dark:border-[#2d3052]">
            <Button variant="ghost" className="flex-1" onClick={() => { setModal(null); setEditTarget(null); }}>Cancel</Button>
            <Button className="flex-1" loading={recordMut.isPending || updateMut.isPending} onClick={handleSubmit}>
              {modal === 'edit' ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal isOpen={modal === 'generate'} onClose={() => setModal(null)} title="Auto-Generate Monthly Rent">
        <div className="flex flex-col gap-4 mt-1">
          <div className="p-3.5 bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 rounded-lg text-xs font-semibold leading-relaxed flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              Creates pending rent records for all currently occupied beds in the selected PG. Existing records are skipped.
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.8px] mb-1.5 block">
              SELECT PG <span className="text-[#ff4d6d]">*</span>
            </label>
            <SelectDropdown
              value={form._genPgId || ''}
              onChange={e => setForm(f => ({ ...f, _genPgId: e.target.value }))}
              options={[{ value: '', label: '-- Select PG --' }, ...pgs.map(pg => ({ value: pg._id, label: pg.name }))]}
              required
            />
          </div>
          <Input label="For Month" type="month" value={form.rentMonth} required
            onChange={e => setForm(f => ({ ...f, rentMonth: e.target.value }))} />

          {form.rentMonth && form.rentMonth > currentMonth() && (
            <div className="p-3 bg-[#ff4d6d]/10 text-[#ff4d6d] border border-[#ff4d6d]/20 rounded-lg text-xs font-semibold leading-relaxed flex items-start gap-2">
              ⚠️ You cannot generate bills for {getMonthName(form.rentMonth)} month in {getMonthName(currentMonth())} month.
            </div>
          )}

          <div className="flex gap-3 mt-2 flex-col-reverse sm:flex-row pt-4 border-t border-gray-200 dark:border-[#2d3052]">
            <Button variant="ghost" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button 
              className="flex-1" 
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
              <Zap size={14} className="mr-1.5" /> Generate Rent Slips
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rejection Notes Modal */}
      <Modal isOpen={modal === 'reject'} onClose={() => { setModal(null); setRejectTargetId(null); setRejectionNotes(''); }} title="Reject Payment Proof">
        <div className="flex flex-col gap-4 mt-1">
          <div className="p-3.5 bg-[#ff4d6d]/10 text-[#ff4d6d] border border-[#ff4d6d]/20 rounded-lg text-xs font-semibold leading-relaxed flex items-start gap-2">
            <ShieldAlert size={20} className="flex-shrink-0" />
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

          <div className="flex gap-3 mt-2 flex-col-reverse sm:flex-row pt-4 border-t border-gray-200 dark:border-[#2d3052]">
            <Button variant="ghost" className="flex-1" onClick={() => { setModal(null); setRejectTargetId(null); }}>Cancel</Button>
            <Button className="flex-1" variant="danger" loading={rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTargetId, notes: rejectionNotes })}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detailed Rent Breakdown Modal */}
      <Modal
        isOpen={!!breakdownTarget}
        onClose={() => setBreakdownTarget(null)}
        title="Rent Payment Breakdown"
        size="lg"
      >
        {breakdownTarget && (
          <div className="flex flex-col gap-4">
            {/* Header section in card */}
            <div className="p-4 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-200 dark:border-[#2d3052]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-[#6c63ff] uppercase tracking-[0.9px]">Rent Period</span>
                <Badge variant={STATUS_VARIANT[breakdownTarget.status] || 'default'}>{breakdownTarget.status}</Badge>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-[#f0f0f8]">{getMonthName(breakdownTarget.rentMonth)} {breakdownTarget.rentMonth.split('-')[0]}</h3>
              <p className="text-xs text-gray-500 dark:text-[#6b6e82] mt-1">
                {breakdownTarget.pgId?.name} · Bed {breakdownTarget.bedId?.bedNumber} · Room {breakdownTarget.roomId?.roomNumber}
              </p>
              <div className="text-xs text-gray-500 dark:text-[#6b6e82] mt-2 font-semibold">
                Days Occupied: <span className="text-[#6c63ff]">{getActiveDays(breakdownTarget) !== '—' ? getActiveDays(breakdownTarget).replace('D', ' days') : '—'}</span>
              </div>
            </div>

            {/* Tenant details if present */}
            {breakdownTarget.userId && (
              <div className="flex flex-col gap-1.5 p-3.5 bg-gray-50 dark:bg-[#242740]/40 border border-gray-200 dark:border-[#2d3052]/40 rounded-lg text-xs text-gray-900 dark:text-[#f0f0f8]">
                <span className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.9px] mb-1">Tenant Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div><strong>Name:</strong> {breakdownTarget.userId.name}</div>
                  {breakdownTarget.userId.mobNo1 && <div><strong>Phone:</strong> {breakdownTarget.userId.mobNo1}</div>}
                  {breakdownTarget.userId.email && <div className="sm:col-span-2"><strong>Email:</strong> {breakdownTarget.userId.email}</div>}
                </div>
              </div>
            )}

            {/* Price breakdown details */}
            <div className="flex flex-col gap-2.5 p-4 bg-gray-50 dark:bg-[#242740] rounded-xl border border-gray-200 dark:border-[#2d3052]">
              <span className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.9px]">Financial Breakdown</span>
              <div className="flex flex-col gap-2 text-xs mt-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-[#6b6e82]">Base Rent:</span>
                  <span className="font-semibold">{f(breakdownTarget.amount)}</span>
                </div>
                {breakdownTarget.penaltyAmount > 0 && (
                  <div className="flex justify-between text-[#ff4d6d]">
                    <span>Late Fee Penalty:</span>
                    <span className="font-bold">+ {f(breakdownTarget.penaltyAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-[#2d3052] my-1" />
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-[#f0f0f8]">
                  <span>Total Due:</span>
                  <span>{f(breakdownTarget.amount + (breakdownTarget.penaltyAmount || 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#51cf66]">
                  <span>Amount Paid:</span>
                  <span>{f(breakdownTarget.amountPaid)}</span>
                </div>
                <div className={cn("flex justify-between text-xs font-bold", breakdownTarget.status === 'paid' ? "text-gray-500 dark:text-[#6b6e82]" : "text-[#ffa94d]")}>
                  <span>Outstanding Balance:</span>
                  <span>{f(Math.max(0, (breakdownTarget.amount + (breakdownTarget.penaltyAmount || 0)) - breakdownTarget.amountPaid))}</span>
                </div>
              </div>
            </div>

            {/* Payment Transaction details */}
            {(breakdownTarget.paymentMode || breakdownTarget.referenceNo || breakdownTarget.paidDate || breakdownTarget.notes) && (
              <div className="flex flex-col gap-2.5 p-4 bg-gray-50 dark:bg-[#242740]/40 border border-gray-200 dark:border-[#2d3052]/40 rounded-lg text-xs text-gray-900 dark:text-[#f0f0f8]">
                <span className="text-[10px] font-bold text-gray-500 dark:text-[#6b6e82] uppercase tracking-[0.9px]">Transaction Info</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div>
                    <span className="text-gray-500 dark:text-[#6b6e82] block text-[10px] mb-1">Payment Method</span>
                    <PaymentModeBadge mode={breakdownTarget.paymentMode} />
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-[#6b6e82] block text-[10px]">Transaction Date</span>
                    <strong>{breakdownTarget.paidDate ? formatDate(breakdownTarget.paidDate) : '—'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 dark:text-[#6b6e82] block text-[10px]">Transaction Reference / Txn ID</span>
                    <strong className="font-mono text-xs">{breakdownTarget.referenceNo || '—'}</strong>
                  </div>
                  {breakdownTarget.recordedBy && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 dark:text-[#6b6e82] block text-[10px]">Recorded By</span>
                      <strong>{breakdownTarget.recordedBy.name}</strong>
                    </div>
                  )}
                  {breakdownTarget.notes && (
                    <div className="sm:col-span-2 p-2.5 bg-white dark:bg-[#242740] rounded-lg border-l-4 border-[#6c63ff]">
                      <span className="text-gray-500 dark:text-[#6b6e82] block text-[10px] font-bold mb-1">REMARKS / NOTES</span>
                      <span className="italic text-gray-700 dark:text-gray-300">{breakdownTarget.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex mt-2">
              <Button className="w-full" onClick={() => setBreakdownTarget(null)}>Close Details</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Single Approval Modal */}
      <ConfirmModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => {
          approveMut.mutate({ id: approveTarget._id });
          setApproveTarget(null);
        }}
        title="Approve Rent Payment"
        message={`Are you sure you want to approve the rent payment proof for ${approveTarget?.userId?.name || 'this tenant'}?`}
        confirmText="Approve Payment"
        confirmVariant="success"
        loading={approveMut.isPending}
      />

      {/* Confirm Bulk Approval Modal */}
      <ConfirmModal
        isOpen={showBulkApproveModal}
        onClose={() => setShowBulkApproveModal(false)}
        onConfirm={() => {
          bulkApproveMut.mutate({ rentIds: selectedIds });
          setShowBulkApproveModal(false);
        }}
        title="Bulk Approve Payments"
        message={`Are you sure you want to verify and approve the payments for all ${selectedIds.length} selected students?`}
        confirmText="Confirm Bulk Approve"
        confirmVariant="success"
        loading={bulkApproveMut.isPending}
      />
    </div>
  );
}
