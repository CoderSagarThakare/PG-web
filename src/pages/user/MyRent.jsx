import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyRentPaymentsApi, submitPaymentProofApi } from '../../api/rent.api';
import { Badge, Button, Card, Modal, Spinner, EmptyState, Input } from '../../components/common';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { IndianRupee, Clock, CheckCircle2, AlertCircle, FileText, Send, QrCode, Phone, Landmark } from 'lucide-react';

const STATUS_VARIANT = {
  paid: 'success',
  pending: 'warning',
  under_review: 'info',
  partial: 'info',
  overdue: 'danger'
};

const STATUS_LABEL = {
  paid: 'Paid ✅',
  pending: 'Pending Payment ⏳',
  under_review: 'Under Review 🔍',
  partial: 'Partially Paid 💵',
  overdue: 'Overdue ⚠️'
};

const MODE_EMOJIS = { cash: '💵 Cash', upi: '📱 UPI', bank_transfer: '🏦 Bank', cheque: '📄 Cheque', online: '🌐 Online' };

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

export default function MyRent() {
  const qc = useQueryClient();
  const [selectedRent, setSelectedRent] = useState(null);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [referenceNo, setReferenceNo] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [breakdownTarget, setBreakdownTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-rent'],
    queryFn: async () => (await getMyRentPaymentsApi()).data?.data,
    refetchOnWindowFocus: false,
  });

  const records = data?.records || [];

  const submitProofMut = useMutation({
    mutationFn: ({ id, data }) => submitPaymentProofApi(id, data),
    onSuccess: () => {
      toast.success('Payment proof submitted successfully! The owner will verify and approve.');
      qc.invalidateQueries(['my-rent']);
      setSelectedRent(null);
      setReferenceNo('');
      setAmountPaid('');
      setNotes('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openSubmitModal = (rent) => {
    setSelectedRent(rent);
    setAmountPaid((rent.amount + (rent.penaltyAmount || 0)).toString());
  };

  const handleSubmitProof = () => {
    if (Number(amountPaid) < 0) {
      toast.error('Amount Paid cannot be negative');
      return;
    }

    submitProofMut.mutate({
      id: selectedRent._id,
      data: {
        paymentMode,
        referenceNo: referenceNo.trim() || null,
        amountPaid: Number(amountPaid),
        notes
      }
    });
  };

  const activeRent = records.find(r => r.status === 'pending' || r.status === 'under_review' || r.status === 'partial' || r.status === 'overdue');

  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in pb-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">Rent &amp; Payments</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">View your monthly PG rent status and submit payments directly</p>
        </div>
      </div>

      {/* Active Bill Section */}
      {activeRent ? (
        <Card className="px-7 py-6 dark:bg-[#242740] bg-gray-50 border border-gray-200 dark:border-[#2d3052] rounded-[14px] mb-7">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[11px] font-extrabold text-[#6c63ff] uppercase tracking-[0.05em]">Current Month Dues</span>
                <Badge variant={STATUS_VARIANT[activeRent.status]}>{STATUS_LABEL[activeRent.status]}</Badge>
              </div>
              <h2 className="text-[26px] font-black dark:text-[#f0f0f8] text-gray-900 mb-1.5">{activeRent.rentMonth} Rent</h2>
              <p className="text-[13px] dark:text-[#6b6e82] text-gray-500">
                Bed {activeRent.bedId?.bedNumber} · Room {activeRent.roomId?.roomNumber} · {activeRent.pgId?.name}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-[11px] font-bold dark:text-[#6b6e82] text-gray-500 uppercase mb-1">Total Amount Due</div>
              <div className="text-[32px] font-black dark:text-[#f0f0f8] text-gray-900">{f(activeRent.amount + (activeRent.penaltyAmount || 0))}</div>
              {activeRent.penaltyAmount > 0 && (
                <div className="text-[12px] text-[#ff4d6d] font-bold mt-0.5">
                  Base: {f(activeRent.amount)} + Late Fee: {f(activeRent.penaltyAmount)}
                </div>
              )}
              {activeRent.status === 'partial' && (
                <div className="text-[12px] text-[#ffa94d] font-bold mt-0.5">
                  Already paid: {f(activeRent.amountPaid)}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-[#2d3052] mt-5 pt-5 flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-6">
              <div>
                <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-0.5">Monthly Rate</div>
                <div className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">{f(activeRent.bedId?.price || activeRent.amount)}/mo</div>
              </div>
              <div>
                <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-0.5">Active Days</div>
                <div className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">{getActiveDays(activeRent)}</div>
              </div>
              <div>
                <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-0.5">Generated Date</div>
                <div className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">{formatDate(activeRent.createdAt)}</div>
              </div>
            </div>

            {activeRent.status === 'pending' || activeRent.status === 'overdue' || activeRent.status === 'partial' ? (
              <Button onClick={() => openSubmitModal(activeRent)} className="flex items-center gap-2 px-6 py-2.5 font-extrabold">
                <Send size={15} /> Submit Payment Proof
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-[#6c63ff]/15 text-[#6c63ff] px-5 py-2.5 rounded-lg text-[13px] font-extrabold">
                <Clock size={16} /> Waiting for Owner Approval
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="px-7 py-6 dark:bg-[#242740] bg-gray-50 rounded-[14px] mb-7 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-[#51cf66]/15 flex items-center justify-center text-[#51cf66]">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-[16px] font-extrabold dark:text-[#f0f0f8] text-gray-900">You're all settled!</div>
            <div className="text-[13px] dark:text-[#6b6e82] text-gray-500">No outstanding rent payments for this month. Excellent!</div>
          </div>
        </Card>
      )}

      {/* History Section */}
      <h3 className="text-[18px] font-extrabold dark:text-[#f0f0f8] text-gray-900 mb-3.5">Payment History</h3>
      {records.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="No payment records" description="Your billing history will appear here once rent is generated." />
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-gray-200 dark:border-[#2d3052]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#242740] dark:bg-[#242740] border-b border-gray-200 dark:border-[#2d3052]">
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Rent Month</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">PG / Bed</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Days</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Rent Due</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Amount Paid</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Payment Mode</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Transaction Date</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Reference No / Txn ID</th>
                <th className="px-4 py-3 text-xs font-semibold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.8px] text-left whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec._id} className="transition-colors hover:bg-[#242740] dark:hover:bg-[#242740] [&:last-child>td]:border-0">
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30 font-bold">{rec.rentMonth}</td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                    <div className="text-[13px] font-semibold dark:text-[#f0f0f8] text-gray-900">{rec.pgId?.name}</div>
                    <div className="text-[11px] dark:text-[#6b6e82] text-gray-500">Bed {rec.bedId?.bedNumber} · Room {rec.roomId?.roomNumber}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30 text-[12px] font-semibold">{getActiveDays(rec)}</td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30 text-[14px] font-bold">
                    <div>{f(rec.amount + (rec.penaltyAmount || 0))}</div>
                    {rec.penaltyAmount > 0 ? (
                      <div className="text-[10px] text-[#ff4d6d] font-medium mt-0.5">
                        Base: {f(rec.amount)} + Late Fee: {f(rec.penaltyAmount)}
                      </div>
                    ) : rec.bedId?.price && rec.amount < rec.bedId.price ? (
                      <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 font-medium mt-0.5">
                        Base: {f(rec.bedId.price)} (Prorated)
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                    <Badge variant={rec.status === 'paid' ? 'success' : rec.status === 'partial' ? 'info' : 'default'}>
                      {f(rec.amountPaid)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                    <Badge variant={STATUS_VARIANT[rec.status]}>{rec.status}</Badge>
                    {rec.penaltyAmount > 0 && rec.status === 'paid' && (
                      <div className="text-[10px] text-[#ff4d6d] font-semibold mt-0.5">
                        (Late Fee Applied)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">{rec.paymentMode ? MODE_EMOJIS[rec.paymentMode] : '—'}</td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">{rec.paidDate ? formatDate(rec.paidDate) : '—'}</td>
                  <td className="px-4 py-3.5 text-[11px] dark:text-[#6b6e82] text-gray-500 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30 font-mono">{rec.referenceNo || '—'}</td>
                  <td className="px-4 py-3.5 text-sm dark:text-[#f0f0f8] text-gray-900 border-b border-[#2d3052]/30 dark:border-[#2d3052]/30">
                    <button
                      onClick={() => setBreakdownTarget(rec)}
                      className="px-2 py-1 dark:bg-[#242740] bg-gray-100 border border-gray-200 dark:border-[#2d3052] rounded-md cursor-pointer text-[#6c63ff] hover:opacity-80 transition-opacity"
                      title="View Breakdown"
                    >
                      <FileText size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Proof Submission Modal */}
      {selectedRent && (
        <Modal
          isOpen={!!selectedRent}
          onClose={() => setSelectedRent(null)}
          title="Submit Payment Proof"
          size="lg"
        >
          <div className="flex flex-col gap-[18px]">
            {/* Scannable info box */}
            <div className="dark:bg-[#1a1d2e] bg-white p-4 rounded-[10px] flex gap-3.5 items-center border border-gray-200 dark:border-[#2d3052]">
              <div className="dark:bg-[#242740] bg-gray-100 p-2 rounded-lg flex items-center justify-center">
                <QrCode size={40} className="text-[#6c63ff]" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-extrabold dark:text-[#f0f0f8] text-gray-900">Easy Payment Guide</div>
                <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mt-0.5">
                  Pay via scanning the owner's QR code at the counter or use direct UPI ID transfers. Please copy and enter the UPI Transaction ID exactly to avoid delays.
                </div>
              </div>
            </div>

            {/* Billing detail summary */}
            <div className="grid grid-cols-2 gap-3 p-3 dark:bg-[#242740] bg-gray-100 rounded-lg text-[12px]">
              <div>
                <span className="dark:text-[#6b6e82] text-gray-500">PG Name:</span> <strong className="block dark:text-[#f0f0f8] text-gray-900">{selectedRent.pgId?.name}</strong>
              </div>
              <div>
                <span className="dark:text-[#6b6e82] text-gray-500">Bed / Room:</span> <strong className="block dark:text-[#f0f0f8] text-gray-900">Bed {selectedRent.bedId?.bedNumber} (Room {selectedRent.roomId?.roomNumber})</strong>
              </div>
              <div>
                <span className="dark:text-[#6b6e82] text-gray-500">Rent Month:</span> <strong className="block dark:text-[#f0f0f8] text-gray-900">{selectedRent.rentMonth}</strong>
              </div>
              <div>
                <span className="dark:text-[#6b6e82] text-gray-500">Due Amount:</span>
                <strong className="block text-[#6c63ff] text-[14px]">
                  {f(selectedRent.amount + (selectedRent.penaltyAmount || 0))}
                </strong>
                {selectedRent.penaltyAmount > 0 && (
                  <span className="text-[10px] text-[#ff4d6d] font-semibold">
                    (Incl. {f(selectedRent.penaltyAmount)} Late Fee)
                  </span>
                )}
              </div>
            </div>

            {/* Inputs */}
            <div>
              <label className="text-[11px] font-bold dark:text-[#6b6e82] text-gray-500 mb-1 block">PAYMENT METHOD</label>
              <select className="w-full bg-white dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-3 py-2.5 text-sm dark:text-[#f0f0f8] text-gray-900 outline-none focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/40 transition-all cursor-pointer" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option value="upi">📱 UPI Scanner / PayTM / GPay</option>
                <option value="bank_transfer">🏦 Bank Transfer (IMPS/NEFT)</option>
                <option value="online">🌐 Online Transfer</option>
                <option value="cash">💵 Handover Cash to Manager</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Transaction ID / UPI Reference No"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g., 312093849182 (Optional)"
              />
              <Input
                label="Amount Paid (₹)"
                required
                type="number"
                min="0"
                value={amountPaid}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || Number(val) >= 0) setAmountPaid(val);
                }}
              />
            </div>


            <Input
              label="Additional Notes (Optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Paid from Dad's account..."
            />

            <div className="flex gap-2.5 mt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSelectedRent(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSubmitProof} loading={submitProofMut.isPending}>
                Submit Proof
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detailed Rent Breakdown Modal */}
      <Modal
        isOpen={!!breakdownTarget}
        onClose={() => setBreakdownTarget(null)}
        title="Rent Payment Breakdown"
        size="lg"
      >
        {breakdownTarget && (() => {
          const [y, m] = breakdownTarget.rentMonth.split("-").map(Number);
          const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
          return (
            <div className="flex flex-col gap-4">
              {/* Header section in card */}
              <div className="px-5 py-4 dark:bg-[#242740] bg-gray-50 rounded-[10px] border border-gray-200 dark:border-[#2d3052]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-extrabold text-[#6c63ff] uppercase">Rent Period</span>
                  <Badge variant={STATUS_VARIANT[breakdownTarget.status] || 'default'}>{breakdownTarget.status}</Badge>
                </div>
                <h3 className="text-[18px] font-black dark:text-[#f0f0f8] text-gray-900">{monthName}</h3>
                <p className="text-[12px] dark:text-[#6b6e82] text-gray-500 mt-1">
                  {breakdownTarget.pgId?.name} · Bed {breakdownTarget.bedId?.bedNumber} · Room {breakdownTarget.roomId?.roomNumber}
                </p>
                <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mt-1.5 font-semibold">
                  Days Occupied: <span className="text-[#6c63ff]">{getActiveDays(breakdownTarget) !== '—' ? getActiveDays(breakdownTarget).replace('D', ' days') : '—'}</span>
                </div>
              </div>

              {/* Price breakdown details */}
              <div className="flex flex-col gap-2.5 p-4 dark:bg-[#242740] bg-gray-50 rounded-lg border border-gray-200 dark:border-[#2d3052]">
                <span className="text-[10px] font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase">Financial Breakdown</span>
                <div className="flex flex-col gap-2 text-[13px] mt-1">
                  <div className="flex justify-between">
                    <span className="dark:text-[#6b6e82] text-gray-500">Base Rent:</span>
                    <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{f(breakdownTarget.amount)}</span>
                  </div>
                  {breakdownTarget.penaltyAmount > 0 && (
                    <div className="flex justify-between text-[#ff4d6d]">
                      <span>Late Fee Penalty:</span>
                      <span className="font-bold">+ {f(breakdownTarget.penaltyAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-[#2d3052] my-1" />
                  <div className="flex justify-between text-[15px] font-extrabold dark:text-[#f0f0f8] text-gray-900">
                    <span>Total Due:</span>
                    <span>{f(breakdownTarget.amount + (breakdownTarget.penaltyAmount || 0))}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-extrabold text-[#51cf66]">
                    <span>Amount Paid:</span>
                    <span>{f(breakdownTarget.amountPaid)}</span>
                  </div>
                  <div
                    className="flex justify-between text-[13px] font-extrabold"
                    style={{ color: breakdownTarget.status === 'paid' ? '#6b6e82' : '#ffa94d' }}
                  >
                    <span>Outstanding Balance:</span>
                    <span>{f(Math.max(0, (breakdownTarget.amount + (breakdownTarget.penaltyAmount || 0)) - breakdownTarget.amountPaid))}</span>
                  </div>
                </div>
              </div>

              {/* Payment Transaction details */}
              {(breakdownTarget.paymentMode || breakdownTarget.referenceNo || breakdownTarget.paidDate || breakdownTarget.notes) && (
                <div className="flex flex-col gap-2.5 p-4 dark:bg-[#1a1d2e] bg-white rounded-lg border border-gray-200 dark:border-[#2d3052] text-[12px]">
                  <span className="text-[10px] font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase">Transaction Info</span>
                  <div className="grid grid-cols-2 gap-2.5 mt-1">
                    <div>
                      <span className="dark:text-[#6b6e82] text-gray-500 block">Payment Method</span>
                      <strong className="dark:text-[#f0f0f8] text-gray-900">{breakdownTarget.paymentMode ? MODE_EMOJIS[breakdownTarget.paymentMode] : '—'}</strong>
                    </div>
                    <div>
                      <span className="dark:text-[#6b6e82] text-gray-500 block">Transaction Date</span>
                      <strong className="dark:text-[#f0f0f8] text-gray-900">{breakdownTarget.paidDate ? formatDate(breakdownTarget.paidDate) : '—'}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="dark:text-[#6b6e82] text-gray-500 block">Transaction Reference / Txn ID</span>
                      <strong className="font-mono dark:text-[#f0f0f8] text-gray-900">{breakdownTarget.referenceNo || '—'}</strong>
                    </div>
                    {breakdownTarget.notes && (
                      <div className="col-span-2 p-2 dark:bg-[#242740] bg-gray-100 rounded-md border-l-[3px] border-[#6c63ff]">
                        <span className="dark:text-[#6b6e82] text-gray-500 block text-[10px] font-bold mb-0.5">REMARKS / NOTES</span>
                        <span className="italic dark:text-[#a0a3b1] text-gray-600">{breakdownTarget.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex mt-2">
                <Button className="flex-1" onClick={() => setBreakdownTarget(null)}>Close Details</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
