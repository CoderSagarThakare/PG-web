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

export default function MyRent() {
  const qc = useQueryClient();
  const [selectedRent, setSelectedRent] = useState(null);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [referenceNo, setReferenceNo] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-rent'],
    queryFn: async () => (await getMyRentPaymentsApi()).data?.data,
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
    setAmountPaid(rent.amount.toString());
  };

  const handleSubmitProof = () => {
    if (!referenceNo.trim()) {
      toast.error('Please enter the Transaction Reference No / Txn ID');
      return;
    }
    if (Number(amountPaid) < 0) {
      toast.error('Amount Paid cannot be negative');
      return;
    }

    submitProofMut.mutate({
      id: selectedRent._id,
      data: {
        paymentMode,
        referenceNo,
        amountPaid: Number(amountPaid),
        notes
      }
    });
  };

  const activeRent = records.find(r => r.status === 'pending' || r.status === 'under_review' || r.status === 'partial' || r.status === 'overdue');

  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Rent & Payments</h1>
          <p className="page-subtitle">View your monthly PG rent status and submit payments directly</p>
        </div>
      </div>

      {/* Active Bill Section */}
      {activeRent ? (
        <Card style={{ padding: '24px 28px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', tracking: '0.05em' }}>Current Month Dues</span>
                <Badge variant={STATUS_VARIANT[activeRent.status]}>{STATUS_LABEL[activeRent.status]}</Badge>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>{activeRent.rentMonth} Rent</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Bed {activeRent.bedId?.bedNumber} · Room {activeRent.roomId?.roomNumber} · {activeRent.pgId?.name}
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Total Amount Due</div>
              <div style={{ fontSize: 32, fontWeight: 950, color: 'var(--text-primary)' }}>{f(activeRent.amount)}</div>
              {activeRent.status === 'partial' && (
                <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 700, marginTop: 2 }}>
                  Already paid: {f(activeRent.amountPaid)}
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Monthly Rate</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{f(activeRent.bedId?.price || activeRent.amount)}/mo</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Generated Date</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{formatDate(activeRent.createdAt)}</div>
              </div>
            </div>

            {activeRent.status === 'pending' || activeRent.status === 'overdue' || activeRent.status === 'partial' ? (
              <Button onClick={() => openSubmitModal(activeRent)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontWeight: 800 }}>
                <Send size={15} /> Submit Payment Proof
              </Button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
                <Clock size={16} /> Waiting for Owner Approval
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: '24px 28px', background: 'var(--bg-elevated)', borderRadius: 14, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>You're all settled!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No outstanding rent payments for this month. Excellent!</div>
          </div>
        </Card>
      )}

      {/* History Section */}
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Payment History</h3>
      {records.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="No payment records" description="Your billing history will appear here once rent is generated." />
      ) : (
        <div className="table-wrapper" style={{ borderRadius: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Rent Month</th>
                <th>PG / Bed</th>
                <th>Rent Due</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th>Payment Mode</th>
                <th>Transaction Date</th>
                <th>Reference No / Txn ID</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec._id}>
                  <td style={{ fontWeight: 700 }}>{rec.rentMonth}</td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{rec.pgId?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bed {rec.bedId?.bedNumber} · Room {rec.roomId?.roomNumber}</div>
                  </td>
                  <td style={{ fontSize: 14, fontWeight: 700 }}>{f(rec.amount)}</td>
                  <td style={{ fontSize: 14, fontWeight: 700, color: rec.status === 'paid' ? 'var(--success)' : 'var(--text-primary)' }}>
                    {f(rec.amountPaid)}
                  </td>
                  <td>
                    <Badge variant={STATUS_VARIANT[rec.status]}>{rec.status}</Badge>
                  </td>
                  <td>{rec.paymentMode ? MODE_EMOJIS[rec.paymentMode] : '—'}</td>
                  <td>{rec.paidDate ? formatDate(rec.paidDate) : '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.referenceNo || '—'}</td>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Scannable info box */}
            <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 10, display: 'flex', gap: 14, alignItems: 'center', border: '1px solid var(--border)' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={40} className="text-primary" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Easy Payment Guide</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Pay via scanning the owner's QR code at the counter or use direct UPI ID transfers. Please copy and enter the UPI Transaction ID exactly to avoid delays.
                </div>
              </div>
            </div>

            {/* Billing detail summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12 }}>
              <div>
                <span className="text-muted">PG Name:</span> <strong style={{ display: 'block' }}>{selectedRent.pgId?.name}</strong>
              </div>
              <div>
                <span className="text-muted">Bed / Room:</span> <strong style={{ display: 'block' }}>Bed {selectedRent.bedId?.bedNumber} (Room {selectedRent.roomId?.roomNumber})</strong>
              </div>
              <div>
                <span className="text-muted">Rent Month:</span> <strong style={{ display: 'block' }}>{selectedRent.rentMonth}</strong>
              </div>
              <div>
                <span className="text-muted">Due Amount:</span> <strong style={{ display: 'block', color: 'var(--primary)', fontSize: 14 }}>{f(selectedRent.amount)}</strong>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>PAYMENT METHOD</label>
              <select className="form-control" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option value="upi">📱 UPI Scanner / PayTM / GPay</option>
                <option value="bank_transfer">🏦 Bank Transfer (IMPS/NEFT)</option>
                <option value="online">🌐 Online Transfer</option>
                <option value="cash">💵 Handover Cash to Manager</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Transaction ID / UPI Reference No *"
                required
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g., 312093849182"
              />
              <Input
                label="Amount Paid (₹) *"
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

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setSelectedRent(null)}>Cancel</Button>
              <Button style={{ flex: 1 }} onClick={handleSubmitProof} loading={submitProofMut.isPending}>
                Submit Proof
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
