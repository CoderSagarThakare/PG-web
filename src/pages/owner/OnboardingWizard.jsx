import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  initiateOnboardingApi,
  getOnboardingApi,
  updateOnboardingStepApi,
  assignBedApi,
} from '../../api/onboarding.api';
import { getRoomsApi } from '../../api/room.api';
import { useAuth } from '../../context/AuthContext';
import {
  Button, Input, Card, Spinner, Badge, SelectDropdown, Modal,
} from '../../components/common';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import {
  User, FileText, DollarSign, Calendar, BookOpen, Bed,
  CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle,
  Shield, Phone, ExternalLink, Send, ClipboardCheck, PartyPopper,
  Users,
} from 'lucide-react';

// ── Step config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Verification & Details', icon: User },
  { id: 2, label: 'Financial Terms',        icon: DollarSign },
  { id: 3, label: 'Joining Date',           icon: Calendar },
];

const RELATION_OPTIONS = [
  { value: 'father',  label: 'Father' },
  { value: 'mother',  label: 'Mother' },
  { value: 'spouse',  label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend',  label: 'Friend' },
  { value: 'other',   label: 'Other' },
];

// ── Stepper component ────────────────────────────────────────────────────────
function Stepper({ current, completed, onStepClick }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 gap-0">
      {STEPS.map((step, idx) => {
        const isActive    = step.id === current;
        const isCompleted = completed.includes(step.id);
        const Icon        = step.icon;
        const maxAllowed  = Math.max(0, ...completed) + 1;
        const isClickable = step.id <= maxAllowed;

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {/* Circle */}
            <div
              className="flex flex-col items-center min-w-[48px]"
              style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              <div
                className={[
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2 shrink-0',
                  isCompleted
                    ? 'bg-[#51cf66] border-[#51cf66] text-white'
                    : isActive
                    ? 'bg-[#6c63ff] border-[#6c63ff] text-white shadow-[0_0_12px_rgba(108,99,255,0.5)]'
                    : 'dark:bg-[#242740] bg-gray-100 border-gray-200 dark:border-[#2d3052] dark:text-[#6b6e82] text-gray-400',
                ].join(' ')}
              >
                {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={16} />}
              </div>
              <span
                className={[
                  'text-[10px] font-bold mt-1.5 whitespace-nowrap',
                  isActive
                    ? 'text-[#6c63ff]'
                    : isCompleted
                    ? 'text-[#51cf66]'
                    : 'dark:text-[#6b6e82] text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 mt-[-18px]',
                  isCompleted ? 'bg-[#51cf66]' : 'dark:bg-[#2d3052] bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Verification & Details ──────────────────────────────────────────
function StepVerificationAndDetails({ onboarding, onSave, isSaving }) {
  const user = onboarding?.userId || {};
  const savedEmergency = onboarding?.emergencyContact || {};
  const [verified, setVerified] = useState(!!onboarding?.documentsReviewed?.reviewedAt);

  const [ec, setEc] = useState({
    name:     savedEmergency.name     || '',
    phone:    savedEmergency.phone    || '',
    relation: savedEmergency.relation || '',
  });

  useEffect(() => {
    if (onboarding) {
      const emergency = onboarding.emergencyContact || {};
      setEc({
        name:     emergency.name     || '',
        phone:    emergency.phone    || '',
        relation: emergency.relation || '',
      });
      setVerified(!!onboarding.documentsReviewed?.reviewedAt);
    }
  }, [onboarding]);

  const handleSave = () => {
    if (!ec.name || !ec.phone || !ec.relation) {
      toast.error('Please fill all emergency contact fields');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(ec.phone.trim())) {
      toast.error('Please enter a valid 10-digit phone number (e.g. 9876543210)');
      return;
    }
    if (!verified) {
      toast.error('Please verify all documents before proceeding');
      return;
    }
    onSave({
      emergencyContact: ec,
      documentsReviewed: { reviewedAt: new Date().toISOString() },
    });
  };

  const isSaveDisabled =
    !ec.name.trim() ||
    !ec.phone.trim() ||
    !/^[6-9]\d{9}$/.test(ec.phone.trim()) ||
    !ec.relation ||
    !verified;

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Verification & Profile Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Tenant profile card */}
        <Card className="dark:bg-[#242740] bg-gray-50 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm dark:text-[#a0a3b1] text-gray-600 uppercase tracking-wider mb-4">
              Tenant Details
            </h4>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#a855f7] flex items-center justify-center text-white text-xl font-black shrink-0 overflow-hidden">
                {user.picture ? (
                  <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <h3 className="text-lg font-black dark:text-[#f0f0f8] text-gray-900">{user.name || '—'}</h3>
                <p className="text-sm dark:text-[#6b6e82] text-gray-500">{user.email || '—'}</p>
                {user.gender && (
                  <Badge variant="info" className="mt-1 capitalize">{user.gender}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm border-t dark:border-[#2d3052] border-gray-200 pt-4 mt-auto">
            <InfoRow label="Mobile 1"  value={user.mobNo1} icon={Phone} />
            <InfoRow label="Mobile 2"  value={user.mobNo2} icon={Phone} />
            <InfoRow label="Aadhaar"   value={user.aadharNumber ? `XXXX-XXXX-${user.aadharNumber.slice(-4)}` : '—'} icon={Shield} />
            <InfoRow label="Gender"    value={user.gender} icon={User} />
          </div>
        </Card>

        {/* Right Side: Aadhaar Document card */}
        <Card className="dark:bg-[#242740] bg-gray-50">
          <h4 className="font-bold text-sm dark:text-[#a0a3b1] text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={15} /> Aadhaar Document
          </h4>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs dark:text-[#6b6e82] text-gray-500 mb-1">Aadhaar Number</p>
              <p className="font-mono font-bold dark:text-[#f0f0f8] text-gray-900 text-lg">
                {user.aadharNumber ? user.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3') : '—'}
              </p>
            </div>
            {user.aadharFileUrl ? (
              <div className="relative group w-full max-w-[280px]">
                <img
                  src={user.aadharFileUrl}
                  alt="Aadhaar Document"
                  className="w-full h-36 object-cover rounded-lg border dark:border-[#2d3052] border-gray-200"
                />
                <a
                  href={user.aadharFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-bold gap-1 no-underline"
                >
                  <ExternalLink size={16} /> View Full Image
                </a>
              </div>
            ) : (
              <div className="w-full max-w-[280px] h-36 dark:bg-[#1a1d2e] bg-gray-100 rounded-lg border-2 border-dashed dark:border-[#2d3052] border-gray-200 flex items-center justify-center flex-col gap-1">
                <FileText size={24} className="dark:text-[#6b6e82] text-gray-400" />
                <span className="text-xs dark:text-[#6b6e82] text-gray-400">No document uploaded</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Emergency contact form */}
      <div>
        <h4 className="font-bold text-sm dark:text-[#a0a3b1] text-gray-600 uppercase tracking-wider mb-3">
          Emergency Contact Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label={<span className="inline-flex items-center gap-1.5"><User size={14} /> Contact Name</span>}
            required
            value={ec.name}
            onChange={e => setEc(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Ramesh Kumar"
          />
          <Input
            label={<span className="inline-flex items-center gap-1.5"><Phone size={14} /> Phone Number</span>}
            required
            type="tel"
            value={ec.phone}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setEc(p => ({ ...p, phone: val }));
            }}
            placeholder="e.g. 9876543210"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1] inline-flex items-center gap-1.5">
              <Users size={14} /> Relation <span className="text-[#ff4d6d]">*</span>
            </label>
            <SelectDropdown
              value={ec.relation}
              onChange={e => setEc(p => ({ ...p, relation: e.target.value }))}
              options={RELATION_OPTIONS}
              placeholder="Select relation..."
            />
          </div>
        </div>
      </div>

      {/* Reviewer checkbox */}
      <label className="flex items-start gap-3 p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200 cursor-pointer hover:border-[#6c63ff]/50 transition-colors mt-2">
        <input
          type="checkbox"
          checked={verified}
          onChange={e => setVerified(e.target.checked)}
          className="w-5 h-5 mt-0.5 accent-[#6c63ff] cursor-pointer shrink-0"
        />
        <div>
          <span className="font-semibold dark:text-[#f0f0f8] text-gray-900 text-sm">
            I have verified all documents
          </span>
          <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-0.5">
            Confirm that the Aadhaar image and profile photo have been reviewed and match the tenant.
          </p>
        </div>
      </label>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={isSaving} disabled={isSaveDisabled}>
          Save & Continue <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Financial Terms ──────────────────────────────────────────────────
function StepFinancialTerms({ onboarding, onSave, isSaving }) {
  const saved = onboarding?.financialTerms || {};

  const [form, setForm] = useState({
    securityDepositAmount:    saved.securityDepositAmount    || '',
    securityDepositReceived:  saved.securityDepositReceived  || false,
    securityDepositReference: saved.securityDepositReference || '',
    securityDepositDate:      saved.securityDepositDate ? saved.securityDepositDate.split('T')[0] : '',
  });

  useEffect(() => {
    if (onboarding) {
      const f = onboarding.financialTerms || {};
      setForm({
        securityDepositAmount:    f.securityDepositAmount    || '',
        securityDepositReceived:  f.securityDepositReceived  || false,
        securityDepositReference: f.securityDepositReference || '',
        securityDepositDate:      f.securityDepositDate ? f.securityDepositDate.split('T')[0] : '',
      });
    }
  }, [onboarding]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggle = (k) => () => setForm(p => ({ ...p, [k]: !p[k] }));

  const handleSave = () => {
    if (!form.securityDepositAmount || Number(form.securityDepositAmount) <= 0) {
      toast.error('Security Deposit Amount is required and must be greater than 0');
      return;
    }
    if (form.securityDepositReceived && !form.securityDepositDate) {
      toast.error('Deposit Date is required when Security Deposit is marked as received');
      return;
    }
    onSave({
      financialTerms: {
        securityDepositAmount:    Number(form.securityDepositAmount),
        securityDepositReceived:  form.securityDepositReceived,
        securityDepositReference: form.securityDepositReceived ? form.securityDepositReference.trim() : '',
        securityDepositDate:      form.securityDepositReceived ? form.securityDepositDate : null,
      },
    });
  };

  const isSaveDisabled =
    !form.securityDepositAmount ||
    Number(form.securityDepositAmount) <= 0 ||
    (form.securityDepositReceived && !form.securityDepositDate);

  return (
    <div className="flex flex-col gap-5 fade-in">
      {/* Warning banner if deposit not received */}
      {!form.securityDepositReceived && (
        <div className="flex items-start gap-3 p-3.5 dark:bg-[#fcc419]/10 bg-[#fcc419]/5 border border-[#fcc419]/40 rounded-lg">
          <AlertTriangle size={18} className="text-[#fcc419] mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-[#fcc419]">
            Bed assignment is blocked until security deposit is confirmed.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Input
          label="Security Deposit Amount (₹)"
          required
          type="number"
          min="1"
          value={form.securityDepositAmount}
          onChange={set('securityDepositAmount')}
          placeholder="e.g. 16000"
        />
      </div>

      {/* Security deposit toggle */}
      <label className="flex items-center gap-3 p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200 cursor-pointer hover:border-[#6c63ff]/50 transition-colors">
        <input
          type="checkbox"
          checked={form.securityDepositReceived}
          onChange={toggle('securityDepositReceived')}
          className="w-5 h-5 accent-[#6c63ff] cursor-pointer shrink-0"
        />
        <div>
          <span className="font-semibold dark:text-[#f0f0f8] text-gray-900 text-sm">
            Security Deposit Received
          </span>
          <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-0.5">
            Check this once the security deposit has been collected.
          </p>
        </div>
        {form.securityDepositReceived && (
          <Badge variant="success" className="ml-auto shrink-0">✓ Received</Badge>
        )}
      </label>

      {/* Conditional fields when deposit received */}
      {form.securityDepositReceived && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
          <Input
            label="Deposit Reference / Txn ID"
            value={form.securityDepositReference}
            onChange={set('securityDepositReference')}
            placeholder="e.g. IMPS123456789"
          />
          <Input
            label="Deposit Date"
            required
            type="date"
            name="securityDepositDate"
            value={form.securityDepositDate}
            onChange={set('securityDepositDate')}
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving} disabled={isSaveDisabled}>
          Save & Continue <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Joining Date ─────────────────────────────────────────────────────
function StepJoiningDate({ onboarding, onSave, isSaving }) {
  const [joiningDate, setJoiningDate] = useState(
    onboarding?.joiningDate ? onboarding.joiningDate.split('T')[0] : ''
  );

  useEffect(() => {
    if (onboarding?.joiningDate) {
      setJoiningDate(onboarding.joiningDate.split('T')[0]);
    }
  }, [onboarding]);

  const handleSave = () => {
    if (!joiningDate) {
      toast.error('Please select a joining date');
      return;
    }
    onSave({ joiningDate });
  };

  const isSaveDisabled = !joiningDate;

  return (
    <div className="flex flex-col gap-5 fade-in">
      <div className="p-4 dark:bg-[#6c63ff]/10 bg-[#6c63ff]/5 border border-[#6c63ff]/30 rounded-lg flex items-start gap-3">
        <Calendar size={18} className="text-[#6c63ff] mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-[#6c63ff]">
          Rent billing starts from this date. The first month's rent will be prorated if the tenant doesn't move in on the 1st.
        </p>
      </div>

      <div className="max-w-sm">
        <Input
          label="Joining Date"
          required
          type="date"
          name="joiningDate"
          value={joiningDate}
          onChange={e => setJoiningDate(e.target.value)}
        />
      </div>

      {joiningDate && (
        <Card className="dark:bg-[#242740] bg-gray-50 max-w-sm">
          <p className="text-xs dark:text-[#6b6e82] text-gray-500">Selected Joining Date</p>
          <p className="text-xl font-black dark:text-[#f0f0f8] text-gray-900 mt-1">
            {formatDate(joiningDate)}
          </p>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving} disabled={isSaveDisabled}>
          Complete Onboarding <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// ── Utility: label/value row ─────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-xs dark:text-[#6b6e82] text-gray-500 flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-gray-400 dark:text-[#6b6e82] shrink-0" />}
        {label}
      </p>
      <p className="font-semibold dark:text-[#f0f0f8] text-gray-900 text-sm">{value || '—'}</p>
    </div>
  );
}

// ── Main: OnboardingWizard ───────────────────────────────────────────────────
export default function OnboardingWizard() {
  const { id }          = useParams();
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const qc              = useQueryClient();
  const { user }        = useAuth();

  const enquiryId = searchParams.get('enquiryId');

  const [activeStep, setActiveStep]   = useState(1);
  const [completed,  setCompleted]    = useState([]);
  const [celebrating, setCelebrating] = useState(false);
  const [initiateError, setInitiateError] = useState(null);
  const [showAssignBedModal, setShowAssignBedModal] = useState(false);

  // ── Initiate onboarding if coming from enquiry ────────────────────────────
  const [initiatedId, setInitiatedId] = useState(id || null);

  const initiatingRef = useRef(false);

  useEffect(() => {
    if (enquiryId && !id && !initiatedId && !initiateError && !initiatingRef.current) {
      initiatingRef.current = true;
      initiateOnboardingApi(enquiryId)
        .then(res => {
          const newId = res.data?.data?._id || res.data?.data?.id;
          if (newId) {
            setInitiatedId(newId);
            navigate(`/onboarding/${newId}`, { replace: true });
          } else {
            const err = new Error('Could not create onboarding record');
            setInitiateError(err);
            toast.error(err.message);
          }
        })
        .catch(e => {
          setInitiateError(e);
          toast.error(getErrorMessage(e));
        });
    }
  }, [enquiryId, id, initiatedId, initiateError, navigate]);

  // ── Fetch onboarding data ─────────────────────────────────────────────────
  const resolvedId = id || initiatedId;

  const { data: obData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['onboarding', resolvedId],
    queryFn:  async () => (await getOnboardingApi(resolvedId)).data?.data,
    enabled:  !!resolvedId,
    staleTime: 0,
  });

  const onboarding = obData;

  // ── Detect already-completed steps from server data ───────────────────────
  useEffect(() => {
    if (!onboarding) return;
    const done = [];
    if (onboarding.emergencyContact?.name && onboarding.documentsReviewed?.reviewedAt) {
      done.push(1);
    }
    if (onboarding.financialTerms?.securityDepositAmount) done.push(2);
    if (onboarding.joiningDate)                         done.push(3);
    setCompleted(done);
  }, [onboarding]);

  // ── Step save mutation ────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: (data) => updateOnboardingStepApi(resolvedId, data),
    onSuccess: () => {
      qc.invalidateQueries(['onboarding', resolvedId]);
      refetch();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleStepSave = (data, advance = true) => {
    if (Object.keys(data).length > 0) {
      saveMut.mutate(data);
    }
    if (activeStep === 3) {
      setCompleted(prev => [...new Set([...prev, 3])]);
      setShowAssignBedModal(true);
    } else {
      if (advance && activeStep < 3) {
        setCompleted(prev => [...new Set([...prev, activeStep])]);
        setActiveStep(s => s + 1);
      } else if (advance) {
        setCompleted(prev => [...new Set([...prev, activeStep])]);
      }
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (initiateError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertTriangle size={48} className="text-[#ff4d6d] opacity-40" />
        <p className="text-sm font-semibold dark:text-[#a0a3b1] text-gray-500">
          {getErrorMessage(initiateError)}
        </p>
        <Button variant="ghost" onClick={() => navigate('/enquiries')}>
          <ChevronLeft size={16} /> Back to Enquiries
        </Button>
      </div>
    );
  }

  if (!resolvedId || (enquiryId && !id && !initiatedId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Spinner center />
        <p className="text-sm dark:text-[#6b6e82] text-gray-500">Creating onboarding record…</p>
      </div>
    );
  }

  if (isLoading) return <Spinner center />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertTriangle size={48} className="text-[#ff4d6d] opacity-40" />
        <p className="text-sm font-semibold dark:text-[#a0a3b1] text-gray-500">
          {getErrorMessage(error)}
        </p>
        <Button variant="ghost" onClick={() => navigate('/enquiries')}>
          <ChevronLeft size={16} /> Back to Enquiries
        </Button>
      </div>
    );
  }

  // ── Celebration modal ─────────────────────────────────────────────────────
  if (celebrating) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[400px] gap-6 text-center px-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7] flex items-center justify-center text-white shadow-[0_0_40px_rgba(108,99,255,0.5)]">
          <PartyPopper size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900 mb-2">
            Onboarding Complete! 🎉
          </h2>
          <p className="dark:text-[#6b6e82] text-gray-500 max-w-sm">
            The tenant has been successfully onboarded. Bed assigned and rent billing will start from the move-in date.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/enquiries')}>
            Back to Enquiries
          </Button>
          <Button variant="ghost" onClick={() => navigate('/rent')}>
            Go to Rent Tracker
          </Button>
        </div>
      </div>
    );
  }

  // ── Render wizard ─────────────────────────────────────────────────────────
  const stepProps = {
    onboarding,
    onSave:   handleStepSave,
    isSaving: saveMut.isPending,
  };

  return (
    <div className="fade-in max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/enquiries')}
          className="p-2 rounded-lg dark:hover:bg-[#242740] hover:bg-gray-100 transition-colors border-none dark:text-[#a0a3b1] text-gray-500"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">
            Tenant Onboarding
          </h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-0.5">
            {onboarding?.userId?.name} · {onboarding?.pgId?.name}
          </p>
        </div>
        {onboarding?.status && (
          <Badge
            variant={onboarding.status === 'active' ? 'success' : 'warning'}
            className="ml-auto capitalize"
          >
            {onboarding.status}
          </Badge>
        )}
      </div>

      {/* Sticky stepper */}
      <div className="sticky top-0 z-10 dark:bg-[#0f1117]/90 bg-white/90 backdrop-blur-sm py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b dark:border-[#2d3052] border-gray-200 mb-6">
        <Stepper current={activeStep} completed={completed} />
      </div>

      {/* Step content card */}
      <Card className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b dark:border-[#2d3052] border-gray-200">
          {(() => {
            const s = STEPS[activeStep - 1];
            const StepIcon = s.icon;
            return (
              <>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#a855f7] flex items-center justify-center text-white">
                  <StepIcon size={18} />
                </div>
                <div>
                  <h2 className="font-black dark:text-[#f0f0f8] text-gray-900">
                    Step {activeStep}: {s.label}
                  </h2>
                  <p className="text-xs dark:text-[#6b6e82] text-gray-500">
                    {activeStep} of {STEPS.length}
                  </p>
                </div>
              </>
            );
          })()}
        </div>

        {activeStep === 1 && <StepVerificationAndDetails {...stepProps} />}
        {activeStep === 2 && <StepFinancialTerms {...stepProps} />}
        {activeStep === 3 && <StepJoiningDate {...stepProps} />}
      </Card>

      {/* Bottom nav */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="ghost"
          onClick={() => setActiveStep(s => Math.max(1, s - 1))}
          disabled={activeStep === 1}
        >
          <ChevronLeft size={16} /> Previous
        </Button>

        <div className="flex gap-1.5">
          {STEPS.map(s => (
            <button
              key={s.id}
              onClick={() => {
                const maxAllowed = Math.max(0, ...completed) + 1;
                if (s.id <= maxAllowed) {
                  setActiveStep(s.id);
                }
              }}
              className={[
                'w-2 h-2 rounded-full transition-all duration-300 border-none',
                s.id === activeStep
                  ? 'bg-[#6c63ff] scale-125'
                  : completed.includes(s.id)
                  ? 'bg-[#51cf66]'
                  : 'dark:bg-[#2d3052] bg-gray-200 cursor-not-allowed',
              ].join(' ')}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={() => setActiveStep(s => Math.min(3, s + 1))}
          disabled={activeStep === 3 || !completed.includes(activeStep)}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>

      {showAssignBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in animate-duration-200">
          <Card className="max-w-md w-full p-6 dark:bg-[#1a1d2e] bg-white border dark:border-[#2d3052] border-gray-200 shadow-2xl relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#51cf66] to-[#2b8a3e] flex items-center justify-center text-white text-3xl shadow-lg">
                🎉
              </div>
              <div>
                <h3 className="text-xl font-black dark:text-[#f0f0f8] text-gray-900">
                  Onboarding Saved!
                </h3>
                <p className="text-sm dark:text-[#a0a3b1] text-gray-500 mt-2">
                  Verification, financial terms, and joining date for <strong>{onboarding?.userId?.name}</strong> have been saved successfully.
                </p>
                <p className="text-xs dark:text-[#6b6e82] text-gray-400 mt-3 font-semibold">
                  Would you like to assign a bed and allocate a room to this tenant now?
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                <Button
                  className="flex-1 justify-center gap-2"
                  onClick={() => {
                    setShowAssignBedModal(false);
                    const pgId = onboarding?.pgId?._id || onboarding?.pgId;
                    navigate(`/pg/${pgId}/inventory`);
                  }}
                >
                  <Bed size={16} /> Yes, Assign Bed
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 justify-center"
                  onClick={() => {
                    setShowAssignBedModal(false);
                    navigate('/enquiries');
                  }}
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
