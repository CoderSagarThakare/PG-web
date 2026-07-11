import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyPGInfoApi, getBedHistoryApi, confirmSettlementApi } from '../../api/onboarding.api';
import { Badge, Card, Spinner, EmptyState, Button } from '../../components/common';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import {
  Home, Building2, Calendar, ShieldCheck, Phone,
  CheckCircle2, Clock, ArrowRight, LogOut, IndianRupee,
  AlertTriangle
} from 'lucide-react';

// ── Settlement Pending Card ────────────────────────────────────────────────────
// Shown to the tenant when status === 'settlement_pending'
function SettlementCard({ onboarding, pgInfo, onConfirmed }) {
  const qc = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const ob = onboarding?.offboarding || {};

  const confirmMut = useMutation({
    mutationFn: () => confirmSettlementApi(onboarding._id),
    onSuccess: () => {
      toast.success('Settlement confirmed! Your stay is now closed. Thank you.');
      qc.invalidateQueries(['my-pg-info']);
      qc.invalidateQueries(['my-bed-history']);
      if (onConfirmed) onConfirmed();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="fade-in pb-10 max-w-3xl mx-auto px-4">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-[16px] mb-8 bg-gradient-to-r from-[#ff4d6d]/15 to-[#f97316]/15 border border-[#ff4d6d]/30 p-8 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#ff4d6d]/20 flex items-center justify-center">
            <LogOut size={22} className="text-[#ff4d6d]" />
          </div>
          <div>
            <Badge variant="danger" className="text-xs uppercase font-extrabold tracking-wider mb-1">
              Checkout Pending
            </Badge>
            <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">
              Stay Settlement — {pgInfo?.name}
            </h1>
          </div>
        </div>
        <p className="text-sm dark:text-[#6b6e82] text-gray-500 max-w-xl">
          Your owner has initiated your checkout. Please review the settlement breakdown below and confirm receipt of your refund to close your stay.
        </p>
      </div>

      <Card className="p-7 dark:bg-[#242740] bg-gray-50 border border-gray-200 dark:border-[#2d3052] rounded-[14px] flex flex-col gap-6">
        {/* Reason */}
        {ob.reason && (
          <div>
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-1">
              Reason for Checkout
            </h4>
            <p className="text-sm dark:text-[#f0f0f8] text-gray-800 font-medium">{ob.reason}</p>
          </div>
        )}

        {/* Exit date */}
        {ob.exitDate && (
          <div className="flex items-center gap-3">
            <Calendar size={16} className="dark:text-[#6b6e82] text-gray-400" />
            <div>
              <span className="text-xs dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider">Exit Date</span>
              <div className="font-semibold dark:text-[#f0f0f8] text-gray-900 text-sm">{formatDate(ob.exitDate)}</div>
            </div>
          </div>
        )}

        {/* Settlement calculator */}
        <div>
          <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <IndianRupee size={13} /> Final Settlement Breakdown
          </h4>
          <div className="rounded-xl border dark:border-[#2d3052] border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b dark:border-[#2d3052] border-gray-200">
              <span className="text-sm dark:text-[#a0a3b1] text-gray-600">Security Deposit Paid</span>
              <span className="font-bold dark:text-[#f0f0f8] text-gray-900">
                {f(onboarding?.financialTerms?.securityDepositAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-b dark:border-[#2d3052] border-gray-200">
              <div>
                <span className="text-sm text-[#ff4d6d]">− Deductions</span>
                {ob.deductionNotes && (
                  <p className="text-xs dark:text-[#6b6e82] text-gray-400 mt-0.5">{ob.deductionNotes}</p>
                )}
              </div>
              <span className="font-bold text-[#ff4d6d]">{f(ob.deductions)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-b dark:border-[#2d3052] border-gray-200">
              <span className="text-sm text-[#ff4d6d]">− Pending Rent Dues</span>
              <span className="font-bold text-[#ff4d6d]">{f(ob.pendingRent)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-4 dark:bg-[#1a1d2e] bg-white">
              <span className="font-extrabold dark:text-[#f0f0f8] text-gray-900">Net Refund to You</span>
              <span className="text-2xl font-black text-[#51cf66]">{f(ob.refundAmount)}</span>
            </div>
          </div>
          {ob.settlementReference && (
            <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-2">
              Payment ref: <span className="font-mono">{ob.settlementReference}</span>
            </p>
          )}
        </div>

        {/* Confirmation checkbox */}
        <div className="border-t dark:border-[#2d3052] border-gray-200 pt-5">
          <label className="flex items-start gap-3 p-4 dark:bg-[#1a1d2e] bg-white rounded-xl border dark:border-[#2d3052] border-gray-200 cursor-pointer hover:border-[#6c63ff]/50 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-[#6c63ff] cursor-pointer shrink-0"
            />
            <div>
              <span className="font-semibold dark:text-[#f0f0f8] text-gray-900 text-sm">
                I confirm I have received {f(ob.refundAmount)} from the owner
              </span>
              <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-0.5">
                This action is final and will close your stay record.
              </p>
            </div>
          </label>
        </div>

        {/* Danger warning */}
        <div className="flex items-start gap-2 p-3.5 dark:bg-[#ff4d6d]/10 bg-[#ff4d6d]/5 border border-[#ff4d6d]/30 rounded-lg">
          <AlertTriangle size={15} className="text-[#ff4d6d] mt-0.5 shrink-0" />
          <p className="text-sm text-[#ff4d6d] font-medium">
            Once confirmed, this cannot be undone. Your stay history will be archived.
          </p>
        </div>

        <Button
          onClick={() => confirmMut.mutate()}
          loading={confirmMut.isPending}
          disabled={!confirmed}
          className="w-full bg-[#51cf66] hover:bg-[#51cf66]/90 text-white font-bold flex items-center justify-center gap-2 py-3"
        >
          <CheckCircle2 size={18} />
          Confirm Receipt of {f(ob.refundAmount)}
        </Button>
      </Card>
    </div>
  );
}

// ── Main MyPG page ────────────────────────────────────────────────────────────
export default function MyPG() {
  const navigate = useNavigate();

  // 1. Fetch current PG information
  const { data: pgInfoData, isLoading: pgLoading, isError: pgError } = useQuery({
    queryKey: ['my-pg-info'],
    queryFn: async () => (await getMyPGInfoApi()).data?.data,
  });

  // 2. Fetch occupancy history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['my-bed-history'],
    queryFn: async () => (await getBedHistoryApi()).data?.data,
  });

  const isLoading = pgLoading || historyLoading;

  if (isLoading) return <Spinner center />;

  if (pgError || !pgInfoData || !pgInfoData.onboarding) {
    return (
      <div className="fade-in max-w-4xl mx-auto py-10 px-4">
        <EmptyState
          icon={<Building2 size={64} className="text-gray-400 dark:text-[#6b6e82]" />}
          title="No Active PG Stay Found"
          description="You are not currently staying at any PG, or your onboarding process is not completed yet."
        >
          <div className="flex gap-4 mt-6">
            <Button onClick={() => navigate('/browse')} className="bg-[#6c63ff] hover:bg-[#6c63ff]/90 text-white font-semibold">
              Browse PGs &amp; Posts
            </Button>
            <Button variant="ghost" onClick={() => navigate('/my-enquiries')}>
              View My Enquiries
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }

  const { assignment, onboarding, pgInfo } = pgInfoData;
  const history = historyData || [];

  // ── Settlement Pending view ──────────────────────────────────────────────
  if (onboarding?.status === 'settlement_pending') {
    return (
      <SettlementCard
        onboarding={onboarding}
        pgInfo={pgInfo}
        onConfirmed={() => navigate('/my-pg')}
      />
    );
  }

  return (
    <div className="fade-in pb-10 max-w-6xl mx-auto px-4">
      {/* Hero section / PG Header */}
      <div className="relative overflow-hidden rounded-[16px] mb-8 bg-gradient-to-r from-[#6c63ff]/20 to-[#a855f7]/20 border border-gray-200 dark:border-[#2d3052] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={20} className="text-[#6c63ff]" />
            {assignment ? (
              <Badge variant="success" className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5">
                Active Stay
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5">
                Onboarded — Room Allocation Pending
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-black dark:text-[#f0f0f8] text-gray-900 leading-tight">
            {pgInfo?.name}
          </h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-2 max-w-xl">
            {pgInfo?.address?.locationDescription}, {pgInfo?.address?.city}, {pgInfo?.address?.state} - {pgInfo?.address?.pincode}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate('/my-rent')}
            className="bg-[#6c63ff] hover:bg-[#6c63ff]/90 text-white font-semibold flex items-center gap-2"
          >
            Go to My Rent <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main occupancy & room info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* My Room Info Card */}
          <Card className="p-6 dark:bg-[#242740] bg-gray-50 border border-gray-200 dark:border-[#2d3052] rounded-[14px]">
            <h3 className="text-lg font-bold dark:text-[#f0f0f8] text-gray-900 mb-6 flex items-center gap-2">
              <Home size={18} className="text-[#6c63ff]" /> Room &amp; Bed Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="flex flex-col">
                <span className="text-xs dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-[0.5px]">Room</span>
                <span className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900 mt-1">
                  {assignment?.roomId?.roomNumber || '—'}
                </span>
                <span className="text-xs dark:text-[#6b6e82] text-gray-400 mt-0.5">
                  Floor: {assignment?.roomId?.floor ?? '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-[0.5px]">Bed</span>
                <span className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900 mt-1">
                  {assignment?.bedId?.bedNumber || '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-[0.5px]">Monthly Rent</span>
                <span className="text-2xl font-black text-[#6c63ff] mt-1">
                  ₹{Number(onboarding?.financialTerms?.agreedRent || assignment?.bedId?.price || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-[0.5px]">Joining Date</span>
                <span className="text-sm font-semibold dark:text-[#f0f0f8] text-gray-900 mt-2">
                  {onboarding?.joiningDate ? formatDate(onboarding.joiningDate) : assignment?.startDate ? formatDate(assignment.startDate) : '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Occupancy History Timeline */}
          <Card className="p-6 dark:bg-[#242740] bg-gray-50 border border-gray-200 dark:border-[#2d3052] rounded-[14px]">
            <h3 className="text-lg font-bold dark:text-[#f0f0f8] text-gray-900 mb-6 flex items-center gap-2">
              <Clock size={18} className="text-[#6c63ff]" /> My Room Assignment History
            </h3>
            {history.length === 0 ? (
              <div className="text-sm dark:text-[#6b6e82] text-gray-500">No previous occupancy logs found.</div>
            ) : (
              <div className="relative pl-6 border-l-2 dark:border-[#2d3052] border-gray-200 flex flex-col gap-6 ml-2">
                {history.map((item) => {
                  const isActive = !item.endDate;
                  return (
                    <div key={item._id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={[
                          'absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2',
                          isActive
                            ? 'bg-[#6c63ff] border-[#6c63ff] shadow-[0_0_8px_rgba(108,99,255,0.4)]'
                            : 'dark:bg-[#1a1d2e] bg-white dark:border-[#2d3052] border-gray-300',
                        ].join(' ')}
                      />
                      <div>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-sm dark:text-[#f0f0f8] text-gray-900">
                            Room {item.roomId?.roomNumber || '—'} · Bed {item.bedId?.bedNumber || '—'}
                          </h4>
                          <span className="text-xs dark:text-[#6b6e82] text-gray-500">
                            {formatDate(item.startDate)} – {item.endDate ? formatDate(item.endDate) : 'Present'}
                          </span>
                        </div>
                        <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-1">
                          {item.shiftReason === 'initial_onboarding'
                            ? 'Onboarding Stay Admission'
                            : item.shiftReason === 'room_shift'
                            ? 'Bed Shift Transfer'
                            : item.shiftReason === 'offboarding'
                            ? 'Checkout'
                            : 'Occupancy Log'}
                          {item.shiftNote && ` (${item.shiftNote})`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Side Panel: Security Deposit & Emergency Contact */}
        <div className="flex flex-col gap-6">
          {/* Security Deposit Details */}
          <Card className="p-6 dark:bg-[#242740] bg-gray-50 border border-gray-200 dark:border-[#2d3052] rounded-[14px]">
            <h3 className="text-sm font-bold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.5px] mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#51cf66]" /> Security Deposit
            </h3>
            {onboarding?.financialTerms?.securityDepositReceived ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs dark:text-[#6b6e82] text-gray-500">Amount Paid</span>
                  <span className="text-lg font-black dark:text-[#f0f0f8] text-gray-900">
                    ₹{Number(onboarding.financialTerms.securityDepositAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t dark:border-[#2d3052] border-gray-200 pt-3">
                  <span className="dark:text-[#6b6e82] text-gray-500">Confirmation Date</span>
                  <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">
                    {onboarding.financialTerms.securityDepositDate ? formatDate(onboarding.financialTerms.securityDepositDate) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="dark:text-[#6b6e82] text-gray-500">Payment Reference</span>
                  <span className="font-mono text-gray-600 dark:text-[#a0a3b1]">
                    {onboarding.financialTerms.securityDepositReference || '—'}
                  </span>
                </div>
                <Badge variant="success" className="w-full text-center py-1 mt-2 text-xs font-bold">
                  Received &amp; Confirmed
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <Badge variant="warning" className="mb-2">Pending Confirmation</Badge>
                <p className="text-xs dark:text-[#6b6e82] text-gray-500 text-center">
                  Security deposit is still pending or not yet confirmed by the owner/manager.
                </p>
              </div>
            )}
          </Card>

          {/* Emergency Contact */}
          <Card className="p-6 dark:bg-[#242740] bg-gray-50 border border-gray-200 dark:border-[#2d3052] rounded-[14px]">
            <h3 className="text-sm font-bold dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.5px] mb-4 flex items-center gap-2">
              <Phone size={16} className="text-[#6c63ff]" /> Emergency Contact
            </h3>
            {onboarding?.emergencyContact?.phone ? (
              <div className="flex flex-col gap-2.5">
                <div>
                  <span className="text-[10px] dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.5px]">Name</span>
                  <div className="text-sm font-bold dark:text-[#f0f0f8] text-gray-900">{onboarding.emergencyContact.name}</div>
                </div>
                <div>
                  <span className="text-[10px] dark:text-[#6b6e82] text-gray-500 uppercase tracking-[0.5px]">Relation</span>
                  <div className="text-xs font-semibold dark:text-[#a0a3b1] text-gray-600 uppercase mt-0.5">{onboarding.emergencyContact.relation}</div>
                </div>
                <div className="border-t dark:border-[#2d3052] border-gray-200 pt-3 mt-1">
                  <a
                    href={`tel:${onboarding.emergencyContact.phone}`}
                    className="flex items-center justify-center gap-2 py-2 bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] font-bold text-xs rounded-lg transition-colors no-underline"
                  >
                    <Phone size={12} /> Call Emergency Contact
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-xs dark:text-[#6b6e82] text-gray-500">No emergency contacts registered. Please contact the owner or update your profile.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
