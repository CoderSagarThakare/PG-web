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
              <div style={{ fontSize: 32, fontWeight: 950, color: 'var(--text-primary)' }}>{f(activeRent.amount + (activeRent.penaltyAmount || 0))}</div>
              {activeRent.penaltyAmount > 0 && (
                <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700, marginTop: 2 }}>
                  Base: {f(activeRent.amount)} + Late Fee: {f(activeRent.penaltyAmount)}
                </div>
              )}
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
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Active Days</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{getActiveDays(activeRent)}</div>
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
                <th>Days</th>
                <th>Rent Due</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th>Payment Mode</th>
                <th>Transaction Date</th>
                <th>Reference No / Txn ID</th>
                <th>Actions</th>
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
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{getActiveDays(rec)}</td>
                  <td style={{ fontSize: 14, fontWeight: 700 }}>
                    <div>{f(rec.amount + (rec.penaltyAmount || 0))}</div>
                    {rec.penaltyAmount > 0 ? (
                      <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 500, marginTop: 2 }}>
                        Base: {f(rec.amount)} + Late Fee: {f(rec.penaltyAmount)}
                      </div>
                    ) : rec.bedId?.price && rec.amount < rec.bedId.price ? (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                        Base: {f(rec.bedId.price)} (Prorated)
                      </div>
                    ) : null}
                  </td>
                  <td style={{ fontSize: 14, fontWeight: 700, color: rec.status === 'paid' ? 'var(--success)' : 'var(--text-primary)' }}>
                    {f(rec.amountPaid)}
                  </td>
                  <td>
                    <Badge variant={STATUS_VARIANT[rec.status]}>{rec.status}</Badge>
                    {rec.penaltyAmount > 0 && rec.status === 'paid' && (
                      <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                        (Late Fee Applied)
                      </div>
                    )}
                  </td>
                  <td>{rec.paymentMode ? MODE_EMOJIS[rec.paymentMode] : '—'}</td>
                  <td>{rec.paidDate ? formatDate(rec.paidDate) : '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.referenceNo || '—'}</td>
                  <td>
                    <button onClick={() => setBreakdownTarget(rec)}
                      style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--primary)' }}
                      title="View Breakdown">
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
                <span className="text-muted">Due Amount:</span> 
                <strong style={{ display: 'block', color: 'var(--primary)', fontSize: 14 }}>
                  {f(selectedRent.amount + (selectedRent.penaltyAmount || 0))}
                </strong>
                {selectedRent.penaltyAmount > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>
                    (Incl. {f(selectedRent.penaltyAmount)} Late Fee)
                  </span>
                )}
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

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setSelectedRent(null)}>Cancel</Button>
              <Button style={{ flex: 1 }} onClick={handleSubmitProof} loading={submitProofMut.isPending}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header section in card */}
              <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Rent Period</span>
                  <Badge variant={STATUS_VARIANT[breakdownTarget.status] || 'default'}>{breakdownTarget.status}</Badge>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{monthName}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {breakdownTarget.pgId?.name} · Bed {breakdownTarget.bedId?.bedNumber} · Room {breakdownTarget.roomId?.roomNumber}
                </p>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>
                  Days Occupied: <span style={{ color: 'var(--primary)' }}>{getActiveDays(breakdownTarget) !== '—' ? getActiveDays(breakdownTarget).replace('D', ' days') : '—'}</span>
                </div>
              </div>

              {/* Price breakdown details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Financial Breakdown</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Base Rent:</span>
                    <span style={{ fontWeight: 600 }}>{f(breakdownTarget.amount)}</span>
                  </div>
                  {breakdownTarget.penaltyAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                      <span>Late Fee Penalty:</span>
                      <span style={{ fontWeight: 700 }}>+ {f(breakdownTarget.penaltyAmount)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', paddingRow: 4 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
                    <span>Total Due:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{f(breakdownTarget.amount + (breakdownTarget.penaltyAmount || 0))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--success)' }}>
                    <span>Amount Paid:</span>
                    <span>{f(breakdownTarget.amountPaid)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: breakdownTarget.status === 'paid' ? 'var(--text-muted)' : 'var(--warning)' }}>
                    <span>Outstanding Balance:</span>
                    <span>{f(Math.max(0, (breakdownTarget.amount + (breakdownTarget.penaltyAmount || 0)) - breakdownTarget.amountPaid))}</span>
                  </div>
                </div>
              </div>

              {/* Payment Transaction details */}
              {(breakdownTarget.paymentMode || breakdownTarget.referenceNo || breakdownTarget.paidDate || breakdownTarget.notes) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaction Info</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Payment Method</span>
                      <strong>{breakdownTarget.paymentMode ? MODE_EMOJIS[breakdownTarget.paymentMode] : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Transaction Date</span>
                      <strong>{breakdownTarget.paidDate ? formatDate(breakdownTarget.paidDate) : '—'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Transaction Reference / Txn ID</span>
                      <strong style={{ fontFamily: 'monospace' }}>{breakdownTarget.referenceNo || '—'}</strong>
                    </div>
                    {breakdownTarget.notes && (
                      <div style={{ gridColumn: 'span 2', padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, borderLeft: '3px solid var(--primary)' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>REMARKS / NOTES</span>
                        <span style={{ fontStyle: 'italic' }}>{breakdownTarget.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', marginTop: 8 }}>
                <Button style={{ flex: 1 }} onClick={() => setBreakdownTarget(null)}>Close Details</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
