import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyPGInfoApi, getBedHistoryApi } from '../../api/onboarding.api';
import { Badge, Card, Spinner, EmptyState, Button } from '../../components/common';
import { formatDate } from '../../utils/helpers';
import {
  Home, Building2, Calendar, ShieldCheck, Phone,
  User, CheckCircle2, ChevronRight, Clock, ArrowRight
} from 'lucide-react';

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
                Onboarded - Room Allocation Pending
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
                {history.map((assignment, index) => {
                  const isActive = !assignment.endDate;
                  return (
                    <div key={assignment._id} className="relative">
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
                            Room {assignment.roomId?.roomNumber || '—'} · Bed {assignment.bedId?.bedNumber || '—'}
                          </h4>
                          <span className="text-xs dark:text-[#6b6e82] text-gray-500">
                            {formatDate(assignment.startDate)} – {assignment.endDate ? formatDate(assignment.endDate) : 'Present'}
                          </span>
                        </div>
                        <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-1">
                          {assignment.shiftReason === 'initial_onboarding'
                            ? 'Onboarding Stay Admission'
                            : assignment.shiftReason === 'room_shift'
                            ? 'Bed Shift Transfer'
                            : 'Occupancy Log'}
                          {assignment.shiftNote && ` (${assignment.shiftNote})`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Side Panel: Onboarding Status, Deposits & Emergency Info */}
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
