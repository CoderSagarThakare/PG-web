import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useBlocker } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  updateProfileApi,
  getAvatarUploadUrlApi,
  saveAvatarApi,
  deleteAvatarApi,
  getAadharUploadUrlApi,
  verifyAadharApi,
  deleteAadharFileApi
} from '../../api/profile.api';
import { sendVerificationOtpApi, verifyOtpApi } from '../../api/auth.api';
import { Input, Button, Card, ConfirmModal, Badge, SelectDropdown, Modal } from '../../components/common';
import { cn } from '../../utils/cn';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import {
  MapPin, Shield, ExternalLink, Camera, Trash2,
  FileText, CheckCircle, AlertCircle, Loader2, Upload, Car,
  Clock, RotateCw, Building2
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser, syncProfile } = useAuth();
  const fileInputRef = useRef(null);
  const aadharInputRef = useRef(null);

  // Tracks the S3 key of any Aadhaar uploaded in this session (not yet saved to DB)
  const uploadedAadharKeyRef = useRef(null);
  // Tracks whether the user has saved the form (so we don't delete on clean exit)
  const isSavedRef = useRef(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      name: '', email: '', mobNo1: '', mobNo2: '',
      address: { city: '', state: '', pincode: '' },
      aadharNumber: '',
      aadharFileKey: '',
      gender: '',
      vehicleType: 'none',
      vehicleNumber: '',
    }
  });

  const [avatarUrl, setAvatarUrl] = useState(user?.picture || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [aadharFileUrl, setAadharFileUrl] = useState(user?.aadharFileUrl || null);
  const [aadharFileType, setAadharFileType] = useState(() => {
    const key = user?.aadharFileKey || '';
    return key.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
  });
  const [aadharUploading, setAadharUploading] = useState(false);
  const [aadharVerifying, setAadharVerifying] = useState(false);
  const [aadharError, setAadharError] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Email OTP verification state
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

  const handleSendOtp = async () => {
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
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOtpVerifying(false);
    }
  };

  const watchAadharFileKey = watch('aadharFileKey');
  const watchAadharNumber = watch('aadharNumber');

  const hasUnsavedAadharUpload = useCallback(() => (
    uploadedAadharKeyRef.current &&
    !isSavedRef.current &&
    uploadedAadharKeyRef.current !== user?.aadharFileKey
  ), [user?.aadharFileKey]);

  const deleteUnsavedAadharFromS3 = useCallback(() => {
    if (hasUnsavedAadharUpload()) {
      deleteAadharFileApi(uploadedAadharKeyRef.current).catch(() => {});
      uploadedAadharKeyRef.current = null;
    }
  }, [hasUnsavedAadharUpload]);

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        mobNo1: user.mobNo1 || '',
        mobNo2: user.mobNo2 || '',
        address: {
          city: user.address?.city || '',
          state: user.address?.state || '',
          pincode: user.address?.pincode || ''
        },
        aadharNumber: user.aadharNumber || '',
        aadharFileKey: user.aadharFileKey || '',
        gender: user.gender || '',
        vehicleType: user.vehicleType || 'none',
        vehicleNumber: user.vehicleNumber || '',
      });
      setAvatarUrl(user.picture || null);
      setAadharFileUrl(user.aadharFileUrl || null);
      setAadharFileType((user.aadharFileKey || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
      setAadharError(null);
      uploadedAadharKeyRef.current = null;
      isSavedRef.current = true;
    }
  }, [user, reset]);

  useEffect(() => {
    return () => {
      if (uploadedAadharKeyRef.current && !isSavedRef.current &&
          uploadedAadharKeyRef.current !== user?.aadharFileKey) {
        deleteAadharFileApi(uploadedAadharKeyRef.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasUnsavedAadharUpload() || (isDirty && !isSavedRef.current)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedAadharUpload, isDirty]);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        (hasUnsavedAadharUpload() || (isDirty && !isSavedRef.current)) &&
        currentLocation.pathname !== nextLocation.pathname,
      [hasUnsavedAadharUpload, isDirty]
    )
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPendingNavigation(blocker);
      setShowUnsavedModal(true);
    }
  }, [blocker]);

  const handleConfirmLeave = () => {
    deleteUnsavedAadharFromS3();
    setShowUnsavedModal(false);
    pendingNavigation?.proceed();
    setPendingNavigation(null);
  };

  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
    pendingNavigation?.reset();
    setPendingNavigation(null);
  };

  const updateMut = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: async () => {
      isSavedRef.current = true;
      uploadedAadharKeyRef.current = null;
      toast.success('Profile updated successfully!');
      await syncProfile();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onSubmit = (data) => {
    if (!data.aadharNumber || !data.aadharFileKey) {
      toast.error('Aadhaar card document is required and must be verified.');
      return;
    }
    // Send null for empty gender so backend clears it
    const payload = { 
      ...data, 
      gender: data.gender || null,
      vehicleNumber: data.vehicleType === 'none' ? null : data.vehicleNumber || null 
    };
    isSavedRef.current = true;
    updateMut.mutate(payload);
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Only image files are supported');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB');
    setAvatarUploading(true);
    try {
      const { data } = await getAvatarUploadUrlApi(file.name, file.type);
      const { uploadUrl, key } = data.data;
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const saveRes = await saveAvatarApi(key);
      const newPicture = saveRes.data.data.picture;
      setAvatarUrl(newPicture);
      updateUser({ picture: newPicture });
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    if (!window.confirm('Remove your custom photo and revert to default?')) return;
    try {
      const { data } = await deleteAvatarApi();
      setAvatarUrl(data.data.picture);
      updateUser({ picture: data.data.picture });
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  const handleAadharSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) return toast.error('Only JPEG, PNG or PDF files are supported');
    if (file.size > 5 * 1024 * 1024) return toast.error('File size must be under 5 MB');

    setAadharUploading(true);
    setAadharError(null);
    isSavedRef.current = false;

    try {
      if (uploadedAadharKeyRef.current && uploadedAadharKeyRef.current !== user?.aadharFileKey) {
        await deleteAadharFileApi(uploadedAadharKeyRef.current).catch(() => {});
        uploadedAadharKeyRef.current = null;
      }

      const { data } = await getAadharUploadUrlApi(file.name, file.type);
      const { uploadUrl, key } = data.data;

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!uploadRes.ok) throw new Error('Failed to upload file to S3 bucket');

      uploadedAadharKeyRef.current = key;
      setAadharUploading(false);
      setAadharVerifying(true);

      const verifyRes = await verifyAadharApi(key);
      const verifiedAadharNumber = verifyRes.data?.data?.aadharNumber;
      if (!verifiedAadharNumber) throw new Error('Aadhaar number could not be parsed from document');

      setValue('aadharNumber', verifiedAadharNumber, { shouldDirty: true, shouldValidate: true });
      setValue('aadharFileKey', key, { shouldDirty: true, shouldValidate: true });
      setAadharFileType(isPdf ? 'pdf' : 'image');
      setAadharFileUrl(URL.createObjectURL(file));
      toast.success('Aadhaar card verified successfully!');
    } catch (err) {
      uploadedAadharKeyRef.current = null;
      isSavedRef.current = true;
      setValue('aadharNumber', '', { shouldDirty: true });
      setValue('aadharFileKey', '', { shouldDirty: true });
      setAadharFileUrl(null);
      const errMsg = getErrorMessage(err);
      setAadharError(errMsg);
      toast.error(errMsg);
    } finally {
      setAadharUploading(false);
      setAadharVerifying(false);
      if (aadharInputRef.current) aadharInputRef.current.value = '';
    }
  };

  const initials = user?.name?.[0]?.toUpperCase() || 'U';
  const hasUnsaved = isDirty || hasUnsavedAadharUpload();

  const unsavedModalMessage = hasUnsavedAadharUpload()
    ? 'You have uploaded an Aadhaar card that hasn\'t been saved yet.\n\nIf you leave now, the uploaded document will be permanently deleted from our servers and your profile will NOT be updated.\n\nClick "Stay & Save" to go back and save your changes.'
    : 'You have unsaved changes. If you leave now, all your edits will be lost.';

  return (
    <div className="fade-in w-full pb-10">

      {/* Navigation blocker modal */}
      <ConfirmModal
        isOpen={showUnsavedModal}
        onClose={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        title="⚠️ Unsaved Changes"
        message={unsavedModalMessage}
        cancelText="Stay & Save"
        confirmText="Leave Anyway"
        confirmVariant="danger"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">My Profile</h1>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Manage your personal information and verification details</p>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsaved && (
              <span className="text-[12px] dark:text-[#6b6e82] text-gray-500">
                You have unsaved changes
              </span>
            )}
            <Button
              type="submit"
              loading={updateMut.isPending}
              disabled={(!isDirty && !hasUnsavedAadharUpload()) || aadharUploading || aadharVerifying}
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* ── Unsaved Changes Banner ── */}
        {hasUnsaved && (
          <div className="flex items-center gap-3 bg-[#ffa94d]/10 border border-[#ffa94d]/35 rounded-lg px-4 py-2.5 mb-5 text-[13px] font-medium text-[#ffa94d]">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              {hasUnsavedAadharUpload()
                ? <>Your Aadhaar has been verified but <strong>not saved</strong>. If you leave this page, the uploaded document will be deleted and your profile will <strong>NOT</strong> be updated.</>
                : <>You have <strong>unsaved changes</strong>. Click "Save Changes" before leaving or your edits will be lost.</>
              }
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* ══ LEFT COLUMN ══ */}
          <div className="flex flex-col gap-4">

            {/* ── Avatar Card (horizontal, compact) ── */}
            <Card className="px-5 py-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <div className="flex items-center gap-3.5">
                {/* Avatar with gradient ring */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-[#6c63ff] to-[#00d4aa]">
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-[22px] font-extrabold text-white overflow-hidden"
                      style={{
                        background: avatarUrl && avatarUrl !== 'https://i.imgur.com/CR1iy7U.png'
                          ? 'transparent' : 'linear-gradient(135deg, #6c63ff, #00d4aa)',
                        opacity: avatarUploading ? 0.5 : 1,
                      }}
                    >
                      {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        : initials}
                    </div>
                  </div>
                  <div
                    onClick={() => !avatarUploading && fileInputRef.current?.click()}
                    title="Change photo"
                    className="absolute -bottom-0.5 -right-0.5 dark:bg-[#1a1d2e] bg-white p-1 rounded-full border dark:border-[#2d3052] border-gray-200 flex items-center justify-center"
                    style={{ cursor: avatarUploading ? 'wait' : 'pointer' }}
                  >
                    {avatarUploading
                      ? <Loader2 size={11} className="animate-spin text-[#6c63ff]" />
                      : <Camera size={11} className="text-[#6c63ff]" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold dark:text-[#f0f0f8] text-gray-900 mb-0.5">
                    {user?.name}
                  </div>
                  <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                    {user?.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant={user?.role === 'owner' ? 'owner' : user?.role === 'manager' ? 'manager' : 'user'} className="uppercase">
                      {user?.role}
                    </Badge>
                    {user?.employeeDetails?.designation && (
                      <Badge variant="accent" className="capitalize">
                        {user.employeeDetails.designation}
                      </Badge>
                    )}
                    {user?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00d4aa] bg-[#00d4aa]/10 px-2 py-0.5 rounded-md border border-[#00d4aa]/30">
                        <CheckCircle size={12} /> Email Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ffa94d] bg-[#ffa94d]/10 px-2 py-0.5 rounded-md border border-[#ffa94d]/30">
                          <AlertCircle size={12} /> Unverified
                        </span>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpSending}
                          className="text-[11px] font-bold text-[#6c63ff] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {otpSending ? <Loader2 size={11} className="animate-spin" /> : null} Verify Now
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                {avatarUrl && avatarUrl !== 'https://i.imgur.com/CR1iy7U.png' && (
                  <button
                    type="button" onClick={handleAvatarDelete}
                    className="btn btn-ghost btn-icon p-1.5 text-[#ff4d6d] opacity-70"
                    title="Remove photo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>

            {/* ── KYC Card (compact) ── */}
            <Card className="px-5 py-4">

              {/* KYC Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-[26px] h-[26px] rounded-md bg-[#6c63ff]/15 flex items-center justify-center">
                    <Shield size={13} className="text-[#6c63ff]" />
                  </div>
                  <span className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900">Identity Verification</span>
                </div>
                {watchAadharFileKey ? (
                  <Badge variant="success">
                    <CheckCircle size={10} /> Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <AlertCircle size={10} /> Required
                  </Badge>
                )}
              </div>

              <input type="hidden" {...register('aadharNumber')} />
              <input type="hidden" {...register('aadharFileKey')} />

              {/* State: empty — compact upload zone */}
              {!watchAadharFileKey && !aadharUploading && !aadharVerifying && (
                <div
                  className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all bg-gray-50 dark:bg-[#242740]",
                    aadharError
                      ? "border-[#ff4d6d] bg-[#ff4d6d]/5 dark:bg-[#ff4d6d]/5"
                      : "border-gray-200 dark:border-[#2d3052] hover:border-[#6c63ff] hover:bg-gray-100 dark:hover:bg-[#2d3052]/50"
                  )}
                  onClick={() => aadharInputRef.current?.click()}
                >
                  <input ref={aadharInputRef} type="file" accept="image/jpeg,image/png,application/pdf"
                    className="hidden" onChange={handleAadharSelect} />
                  <Upload size={20} className="text-gray-500 dark:text-[#6b6e82]" />
                  <p className="font-semibold text-gray-900 dark:text-[#f0f0f8] text-[12px] mt-1.5">Upload Aadhaar Card</p>
                  <p className="text-gray-500 dark:text-[#6b6e82] text-[11px]">JPEG, PNG or PDF · Max 5 MB</p>
                </div>
              )}

              {/* State: uploading / verifying — inline progress */}
              {(aadharUploading || aadharVerifying) && (
                <div className="flex items-center gap-2.5 dark:bg-[#242740] bg-gray-50 border dark:border-[#2d3052] border-gray-200 rounded-lg px-3 py-2.5">
                  <Loader2 size={16} className={`animate-spin ${aadharVerifying ? 'text-[#00d4aa]' : 'text-[#6c63ff]'}`} />
                  <div>
                    <div className="text-[12px] font-semibold dark:text-[#f0f0f8] text-gray-900">
                      {aadharVerifying ? 'Verifying via Rekognition OCR…' : 'Uploading to S3…'}
                    </div>
                    <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mt-px">
                      {aadharVerifying ? 'Validating Aadhaar number checksum' : 'Streaming document securely'}
                    </div>
                  </div>
                </div>
              )}

              {/* State: verified — thumbnail + number inline */}
              {watchAadharFileKey && !aadharUploading && !aadharVerifying && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5 dark:bg-[#242740] bg-gray-50 border dark:border-[#2d3052] border-gray-200 rounded-xl px-2.5 py-2">
                    {/* Thumbnail */}
                    {aadharFileUrl && (
                      aadharFileType === 'pdf' ? (
                        <div className="w-11 h-8 rounded shrink-0 border dark:border-[#2d3052] border-gray-200 bg-[#00d4aa]/10 flex items-center justify-center">
                          <FileText size={16} className="text-[#00d4aa]" />
                        </div>
                      ) : (
                        <img src={aadharFileUrl} alt="Aadhaar"
                          className="w-11 h-8 object-cover rounded shrink-0 border dark:border-[#2d3052] border-gray-200"
                        />
                      )
                    )}

                    {/* Number */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold uppercase tracking-wide">
                        Aadhaar
                      </div>
                      <div className="text-[13px] font-extrabold font-mono tracking-[1.5px] dark:text-[#f0f0f8] text-gray-900 mt-px">
                        {watchAadharNumber ? watchAadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—'}
                      </div>
                    </div>

                    {/* Action icons */}
                    <div className="flex gap-0.5 shrink-0">
                      {aadharFileUrl && (
                        <a href={aadharFileUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-[#a0a3b1] hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors p-1.5" title="View document">
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button type="button" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-[#a0a3b1] hover:bg-gray-100 dark:hover:bg-[#2d3052] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors p-1.5" title="Replace Aadhaar"
                        onClick={() => aadharInputRef.current?.click()}>
                        <Upload size={12} />
                      </button>
                      <input ref={aadharInputRef} type="file" accept="image/jpeg,image/png,application/pdf"
                        className="hidden" onChange={handleAadharSelect} />
                    </div>
                  </div>

                  {/* Not-saved chip */}
                  {hasUnsavedAadharUpload() && (
                    <div className="flex items-center gap-1.5 text-[#ffa94d] bg-[#ffa94d]/8 border border-[#ffa94d]/30 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold">
                      <AlertCircle size={12} className="shrink-0" />
                      Not saved — click "Save Changes" below
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {aadharError && (
                <div className="flex items-start gap-2 text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 px-3 py-2.5 rounded-lg text-[11px] font-medium mt-2.5">
                  <AlertCircle size={13} className="shrink-0 mt-px" />
                  <div>
                    <strong className="block mb-0.5">Verification Failed</strong>
                    {aadharError}
                  </div>
                </div>
              )}
            </Card>

            {/* Vehicle Details */}
            <Card>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-[30px] h-[30px] rounded-lg bg-[#ffa94d]/15 flex items-center justify-center">
                  <Car size={14} className="text-[#ffa94d]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">Vehicle Details</h3>
                  <p className="text-[11px] dark:text-[#6b6e82] text-gray-500">For PG parking verification</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-[#6b6e82] uppercase tracking-[0.8px] block">Do you own a vehicle?</label>
                  <SelectDropdown
                    value={watch('vehicleType') || 'none'}
                    onChange={e => {
                      const val = e.target.value;
                      setValue('vehicleType', val, { shouldDirty: true });
                      if (val === 'none') {
                        setValue('vehicleNumber', '', { shouldDirty: true });
                      }
                    }}
                    options={[
                      { value: 'none', label: 'No Vehicle' },
                      { value: 'bike', label: 'Two-Wheeler (Bike/Scooter)' },
                      { value: 'car', label: 'Four-Wheeler (Car)' }
                    ]}
                  />
                </div>

                {(watch('vehicleType') === 'bike' || watch('vehicleType') === 'car') && (
                  <Input
                    label="Vehicle Number Plate"
                    placeholder="e.g. MH19AC2317"
                    {...register('vehicleNumber', {
                      required: 'Vehicle number is required',
                      pattern: {
                        value: /^(?:[a-zA-Z]{2}[0-9]{1,2}[a-zA-Z]{1,2}[0-9]{4}|[0-9]{2}BH[0-9]{4}[a-zA-Z]{2})$/,
                        message: 'Enter a valid Indian vehicle number without spaces or hyphens (e.g. MH19AC2317 or 22BH1234AA)'
                      },
                      onChange: (e) => {
                        e.target.value = e.target.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
                      }
                    })}
                    error={errors.vehicleNumber?.message}
                    required
                  />
                )}
              </div>
            </Card>

            {/* Staff Details Card */}
            {user?.employeeDetails && (
              <Card className="px-5 py-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-[30px] h-[30px] rounded-lg bg-[#6c63ff]/15 flex items-center justify-center">
                    <Building2 size={14} className="text-[#6c63ff]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">Staff Details</h3>
                    <p className="text-[11px] dark:text-[#6b6e82] text-gray-500">Your PG job details</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-[#2d3052]/30">
                    <span className="text-gray-400 dark:text-[#6b6e82]">Designation</span>
                    <span className="font-bold dark:text-[#f0f0f8] text-gray-800 capitalize bg-[#6c63ff]/10 text-[#6c63ff] border border-[#6c63ff]/20 px-2 py-0.5 rounded">
                      {user.employeeDetails.designation}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-[#2d3052]/30">
                    <span className="text-gray-400 dark:text-[#6b6e82]">Monthly Salary</span>
                    <span className="font-bold text-[#51cf66]">
                      ₹{Number(user.employeeDetails.monthlySalary || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-[#2d3052]/30">
                    <span className="text-gray-400 dark:text-[#6b6e82]">Joined Date</span>
                    <span className="font-semibold dark:text-[#f0f0f8] text-gray-700">
                      {user.employeeDetails.joinedDate ? formatDate(user.employeeDetails.joinedDate) : '—'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 py-1.5">
                    <span className="text-gray-400 dark:text-[#6b6e82]">Assigned PGs ({user.employeeDetails.pgs?.length || 0})</span>
                    <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto mt-1">
                      {user.employeeDetails.pgs?.map(pg => (
                        <div key={pg.id} className="bg-gray-50/50 dark:bg-[#242740]/40 p-2 rounded-lg border border-gray-100/30 dark:border-[#2d3052]/20 font-semibold text-gray-700 dark:text-[#e0e0f0]">
                          {pg.name}
                        </div>
                      ))}
                      {(!user.employeeDetails.pgs || user.employeeDetails.pgs.length === 0) && (
                        <div className="text-gray-400 dark:text-[#6b6e82] italic">No PGs assigned yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="flex flex-col gap-4">

            {/* Personal Details */}
            <Card>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-[30px] h-[30px] rounded-lg bg-[#6c63ff]/15 flex items-center justify-center">
                  <Shield size={14} className="text-[#6c63ff]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">Personal Details</h3>
                  <p className="text-[11px] dark:text-[#6b6e82] text-gray-500">Basic contact information</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]">
                      Email Address <span className="text-[#ff4d6d]">*</span>
                    </label>
                    {user?.isEmailVerified ? (
                      <span className="text-[11px] font-bold text-[#00d4aa] flex items-center gap-1">
                        <CheckCircle size={12} /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpSending}
                        className="text-[11px] font-bold text-[#ffa94d] hover:text-[#ff922b] flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        {otpSending ? <Loader2 size={11} className="animate-spin" /> : <AlertCircle size={11} />}
                        Verify via OTP
                      </button>
                    )}
                  </div>
                  <Input label="" {...register('email')} disabled required />
                </div>
                <Input
                  label="Mobile 1" type="tel"
                  {...register('mobNo1', { required: 'Mobile is required', pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' } })}
                  error={errors.mobNo1?.message} maxLength={10} required
                />
                <Input
                  label="Mobile 2 (optional)" type="tel"
                  {...register('mobNo2', { pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' } })}
                  error={errors.mobNo2?.message} maxLength={10}
                />

                {/* Gender selector */}
                <div className="col-span-full flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-gray-700 dark:text-[#a0a3b1]">
                    Gender <span className="text-[11px] text-gray-400 dark:text-[#6b6e82] font-normal">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'male',           label: '♂ Male' },
                      { value: 'female',         label: '♀ Female' },
                      { value: 'transgender',    label: '⚧ Transgender' },
                      { value: 'preferNotToSay', label: '🔒 Prefer not to say' },
                    ].map(opt => {
                      const selected = watch('gender') === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            'flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 cursor-pointer select-none transition-all duration-150 text-[13px] font-semibold',
                            selected
                              ? 'border-[#6c63ff] bg-[#6c63ff]/10 text-[#6c63ff] dark:text-[#a8a2ff]'
                              : 'border-gray-200 dark:border-[#2d3052] text-gray-500 dark:text-[#6b6e82] hover:border-[#6c63ff]/50 hover:bg-[#6c63ff]/5'
                          )}
                        >
                          <input
                            type="radio"
                            value={opt.value}
                            {...register('gender')}
                            className="sr-only"
                          />
                          <span className={cn(
                            'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                            selected ? 'border-[#6c63ff] bg-[#6c63ff]' : 'border-gray-300 dark:border-[#2d3052]'
                          )}>
                            {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Address Details */}
            <Card>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-[30px] h-[30px] rounded-lg bg-[#00d4aa]/10 flex items-center justify-center">
                  <MapPin size={14} className="text-[#00d4aa]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-900">Address Details</h3>
                  <p className="text-[11px] dark:text-[#6b6e82] text-gray-500">Your current residential address</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input label="City" {...register('address.city', { required: 'City is required' })} error={errors.address?.city?.message} required />
                <Input label="State" {...register('address.state', { required: 'State is required' })} error={errors.address?.state?.message} required />
                <Input
                  label="Pincode" type="tel"
                  {...register('address.pincode', { required: 'Pincode is required', pattern: { value: /^[0-9]{6}$/, message: 'Must be 6 digits' } })}
                  error={errors.address?.pincode?.message} maxLength={6} required
                />
              </div>
            </Card>
          </div>
        </div>
      </form>
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
              Verify OTP
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
