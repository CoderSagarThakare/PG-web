import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyPGsApi, getPGByIdApi, createPGApi, updatePGApi, deletePGApi, getFacilitiesApi, getManagersApi } from '../../api/pg.api';
import { sendVerificationOtpApi, verifyOtpApi } from '../../api/auth.api';
import { Building2, Plus, Edit2, Trash2, MapPin, Users, Bed, AlertTriangle, Shield, Clock, RotateCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, QueryError, ConfirmModal, StatCard, Input } from '../../components/common';
import PGForm from '../../components/owner/PGForm';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const defaultForm = {
  name: '', address: { landmark: '', city: '', state: '', country: 'India', pincode: '' },
  pgType: 'unisex', totalRooms: '', description: '', managerId: '',
  checkInTime: '', checkOutTime: '', facilities: []
};

export default function ManagePGs() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPG, setEditPG] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { user, updateUser, syncProfile } = useAuth();
  const isOwner = user?.role === 'owner';

  // Email verification prompt & OTP state
  const [showVerifyPromptModal, setShowVerifyPromptModal] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpTimer, setOtpTimer] = useState(120);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let interval = null;
    if (otpModalOpen) {
      interval = setInterval(() => {
        setOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpModalOpen]);

  const handleAddPgClick = () => {
    if (isOwner && !user?.isEmailVerified && pgs.length === 0) {
      setShowVerifyPromptModal(true);
      return;
    }
    setModalOpen(true);
  };

  const handleSendOtp = async () => {
    setShowVerifyPromptModal(false);
    setOtpSending(true);
    try {
      await sendVerificationOtpApi();
      toast.success(`Verification OTP sent to ${user?.email}`);
      setOtpCode('');
      setOtpTimer(120);
      setResendCooldown(30);
      setOtpModalOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }
    setOtpVerifying(true);
    try {
      await verifyOtpApi({ otp: Number(otpCode) });
      toast.success('Email verified successfully! 🎉');
      updateUser({ isEmailVerified: true });
      await syncProfile();
      setOtpModalOpen(false);
      setModalOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpVerifying(false);
    }
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => { const r = await getMyPGsApi(); return r.data?.data; },
    retry: 1,
  });

  // Only fetch managers if the user is an owner and the modal is open
  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => { const r = await getManagersApi(); return r.data?.data; },
    enabled: isOwner && modalOpen,
  });

  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => { const r = await getFacilitiesApi(); return r.data?.data; },
    enabled: modalOpen,
  });

  const pgs = data?.pgs || [];
  const managers = managersData?.managers || [];
  const facilitiesList = facilitiesData?.facilities || [];

  const createMutation = useMutation({
    mutationFn: createPGApi,
    onSuccess: () => { toast.success('PG created!'); qc.invalidateQueries(['my-pgs']); closeModal(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePGApi(id, data),
    onSuccess: () => { toast.success('PG updated!'); qc.invalidateQueries(['my-pgs']); closeModal(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePGApi,
    onSuccess: () => { toast.success('PG deleted!'); qc.invalidateQueries(['my-pgs']); setConfirmId(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const closeModal = () => { setModalOpen(false); setEditPG(null); };

  const openEdit = (pg) => {
    setEditPG(pg);
    setModalOpen(true);
  };



  const onSubmit = (formData) => {
    if (editPG) return updateMutation.mutateAsync({ id: editPG._id, data: formData });
    else return createMutation.mutateAsync(formData);
  };

  const pgTypeLabels = { male: 'Male', female: 'Female', unisex: 'Unisex', coLiving: 'Co-Living' };
  const pgTypeColors = { male: 'info', female: 'purple', unisex: 'accent', coLiving: 'warning' };

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">My PGs</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Manage all your PG properties</p>
        </div>
        <div className="flex gap-3 items-center">
          {isOwner && (
            <Button onClick={handleAddPgClick}>
              <Plus size={16} /> Add PG
            </Button>
          )}
        </div>
      </div>

      {/* Email Verification Alert Banner for Unverified Owners */}
      {isOwner && !user?.isEmailVerified && pgs.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#ffa94d]/10 border border-[#ffa94d]/30 flex items-center justify-between gap-4 flex-wrap animate-[slideDown_0.25s_ease]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ffa94d]/20 text-[#ffa94d] flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold dark:text-[#f0f0f8] text-gray-900">Email Verification Required</h4>
              <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-0.5">Please verify your email address to add and list PG properties on StaySync.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSendOtp} loading={otpSending} className="bg-[#ffa94d] hover:bg-[#ff922b] text-slate-950 font-bold border-none">
              Verify Email Now
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total PGs" value={pgs.length} color="primary" icon={<Building2 size={40} />} />
        <StatCard label="Total Rooms" value={pgs.reduce((s, p) => s + (p.totalRooms || 0), 0)} color="accent" icon={<Bed size={40} />} />
        <StatCard label="Occupied Beds" value={pgs.reduce((s, p) => s + (p.occupiedBeds || 0), 0)} color="warning" />
        <StatCard label="Empty Beds" value={pgs.reduce((s, p) => s + (p.emptyBeds || 0), 0)} color="success" />
      </div>

      {isLoading ? <Spinner center /> : isError ? (
        <QueryError onRetry={refetch} error={error} />
      ) : pgs.length === 0 ? (
        <EmptyState
          icon={<Building2 size={64} />}
          title="No PGs yet"
          description="Add your first PG property to get started."
          action={isOwner ? <Button onClick={handleAddPgClick}><Plus size={16} /> Add PG</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pgs.map(pg => (
            <Card key={pg._id} hover onClick={() => navigate(`/pg/${pg._id}`)}>
              <div className="flex items-start justify-between mb-5">
                <div>
                   <div className="text-base font-bold dark:text-[#f0f0f8] text-gray-900">{pg.name} <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">({pg.pgDisplayId})</span></div>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-[#6b6e82]" />
                    <span className="text-xs dark:text-[#6b6e82] text-gray-500">{pg.address?.city}, {pg.address?.state}</span>
                  </div>
                </div>
                <Badge variant={pgTypeColors[pg.pgType] || 'default'}>{pgTypeLabels[pg.pgType] || pg.pgType}</Badge>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-black text-[#6c63ff]">{pg.totalRooms}</div>
                  <div className="text-xs dark:text-[#6b6e82] text-gray-500">Rooms</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-[#00d4aa]">{pg.emptyBeds || 0}</div>
                  <div className="text-xs dark:text-[#6b6e82] text-gray-500">Empty Beds</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-[#ffa94d]">{pg.occupiedBeds || 0}</div>
                  <div className="text-xs dark:text-[#6b6e82] text-gray-500">Occupied</div>
                </div>
              </div>

              {pg.managerId && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-[#242740] rounded-lg mb-3">
                  <span className="text-xs dark:text-[#6b6e82] text-gray-500">Manager: </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">{pg.managerId?.name || 'Assigned'}</span>
                </div>
              )}

              <div className="flex justify-between items-center" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-[#ffa94d]/12 text-[#ffa94d] px-2 py-1 rounded-lg text-xs font-bold">
                    ★ {pg.rating ? pg.rating.toFixed(1) : '0.0'} ({pg.numReviews ?? 0})
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative inline-flex group">
                    <Button variant="outline" size="sm" className="btn-icon" onClick={() => navigate(`/pg/${pg._id}/inventory`)}>
                      <Bed size={14} />
                    </Button>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1d2e] border border-[#2d3052] text-[#f0f0f8] text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10 pointer-events-none">Inventory Manager</span>
                  </div>
                  
                  <div className="relative inline-flex group">
                    <Button variant="ghost" size="sm" className="btn-icon" onClick={() => openEdit(pg)}>
                      <Edit2 size={14} />
                    </Button>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1d2e] border border-[#2d3052] text-[#f0f0f8] text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10 pointer-events-none">Edit Property</span>
                  </div>
                  
                  <div className="relative inline-flex group">
                    <Button variant="danger" size="sm" className="btn-icon" onClick={() => setConfirmId(pg._id)}>
                      <Trash2 size={14} />
                    </Button>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1d2e] border border-[#2d3052] text-[#f0f0f8] text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10 pointer-events-none">Delete Property</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editPG ? 'Edit PG' : 'Add New PG'} size="lg">
        <PGForm
          initialData={editPG}
          onSubmit={onSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          managers={managers}
          facilitiesList={facilitiesList}
          buttonText={editPG ? 'Update PG' : 'Create PG'}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteMutation.mutate(confirmId)}
        loading={deleteMutation.isPending}
        title="Delete PG"
        message="Are you sure you want to delete this PG? This action cannot be undone."
      />

      {/* Verify Prompt Modal */}
      <Modal isOpen={showVerifyPromptModal} onClose={() => setShowVerifyPromptModal(false)} title="Verify Your Account">
        <div className="text-center py-3 space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#ffa94d]/15 text-[#ffa94d] flex items-center justify-center mx-auto">
            <Shield size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold dark:text-[#f0f0f8] text-gray-900">Email Verification Required</h3>
            <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-1.5 px-4">
              To keep properties safe and trusted, property owners must verify their email address before adding their first PG property on StaySync.
            </p>
          </div>
          <div className="p-3 bg-[#242740] rounded-lg text-xs text-[#a0a3b1] font-medium max-w-sm mx-auto">
            We will send a 6-digit verification code to <span className="font-bold text-[#6c63ff]">{user?.email}</span>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button onClick={handleSendOtp} loading={otpSending} className="w-full">
              Verify via OTP Now
            </Button>
            <Button variant="ghost" onClick={() => { setShowVerifyPromptModal(false); navigate('/profile'); }} className="w-full">
              Go to Profile
            </Button>
          </div>
        </div>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal isOpen={otpModalOpen} onClose={() => setOtpModalOpen(false)} title="Verify Email Address">
        <form onSubmit={handleVerifyOtp} className="space-y-4 py-2">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#6c63ff]/15 text-[#6c63ff] flex items-center justify-center mx-auto mb-3">
              <Shield size={24} />
            </div>
            <h4 className="text-base font-bold dark:text-[#f0f0f8] text-gray-900">Enter 6-Digit OTP</h4>
            <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-1">
              We have sent a verification code to <span className="font-bold text-[#6c63ff]">{user?.email}</span>
            </p>
          </div>

          <div>
            <Input
              label="Verification Code (OTP)"
              placeholder="e.g. 123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoFocus
              required
            />
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#2d3052]/50 text-xs">
              {/* Timer Status Pill */}
              {otpTimer > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6c63ff]/10 border border-[#6c63ff]/30 text-[#a099ff] text-[11px] font-semibold">
                  <Clock size={12} className="animate-pulse text-[#6c63ff]" />
                  Code expires in <span className="font-extrabold text-white font-mono">{Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 text-[#ff4d6d] text-[11px] font-bold">
                  <AlertCircle size={12} /> Code Expired
                </span>
              )}

              {/* Resend OTP Action Button */}
              {resendCooldown > 0 && otpTimer > 0 ? (
                <span className="px-3 py-1 rounded-lg bg-[#242740] border border-[#2d3052] text-[#6b6e82] text-[11px] font-medium cursor-not-allowed select-none">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="px-3 py-1 rounded-lg bg-[#6c63ff]/20 hover:bg-[#6c63ff]/30 border border-[#6c63ff]/50 text-[#a099ff] hover:text-white text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(108,99,255,0.25)] flex items-center gap-1.5 cursor-pointer"
                >
                  {otpSending ? (
                    <Loader2 size={12} className="animate-spin text-[#6c63ff]" />
                  ) : (
                    <RotateCw size={12} className="text-[#6c63ff]" />
                  )}
                  Resend OTP
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setOtpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={otpVerifying} disabled={otpCode.length !== 6}>
              Verify OTP & Proceed
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
