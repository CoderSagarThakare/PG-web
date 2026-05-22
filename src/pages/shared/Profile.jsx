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
import { Input, Button, Card, ConfirmModal } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';
import {
  MapPin, Shield, ExternalLink, Camera, Trash2,
  FileText, CheckCircle, AlertCircle, Loader2, Upload
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
      aadharFileKey: ''
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
        aadharFileKey: user.aadharFileKey || ''
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
    isSavedRef.current = true;
    updateMut.mutate(data);
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
    <div className="fade-in" style={{ width: '100%', paddingBottom: 40 }}>

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

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information and verification details</p>
        </div>
      </div>

      {/* ── Unsaved Changes Banner ── */}
      {hasUnsaved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,169,77,0.1)',
          border: '1px solid rgba(255,169,77,0.35)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 16px',
          marginBottom: 20,
          fontSize: 13, fontWeight: 500,
          color: 'var(--warning)',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            {hasUnsavedAadharUpload()
              ? <>Your Aadhaar has been verified but <strong>not saved</strong>. If you leave this page, the uploaded document will be deleted and your profile will <strong>NOT</strong> be updated.</>
              : <>You have <strong>unsaved changes</strong>. Click "Save Changes" before leaving or your edits will be lost.</>
            }
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="profile-grid-container">

          {/* ══ LEFT COLUMN ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Avatar Card (horizontal, compact) ── */}
            <Card style={{ padding: '16px 20px' }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar with gradient ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', padding: 2,
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: avatarUrl && avatarUrl !== 'https://i.imgur.com/CR1iy7U.png'
                        ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 800, color: 'white', overflow: 'hidden',
                      opacity: avatarUploading ? 0.5 : 1,
                    }}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials}
                    </div>
                  </div>
                  <div
                    onClick={() => !avatarUploading && fileInputRef.current?.click()}
                    title="Change photo"
                    style={{
                      position: 'absolute', bottom: -1, right: -1,
                      background: 'var(--bg-surface)', padding: 4, borderRadius: '50%',
                      border: '1px solid var(--border)', cursor: avatarUploading ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {avatarUploading
                      ? <Loader2 size={11} className="animate-spin text-primary" />
                      : <Camera size={11} className="text-primary" />}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                  <span className="badge badge-primary" style={{ textTransform: 'capitalize', fontSize: 10, padding: '2px 8px' }}>
                    {user?.role}
                  </span>
                </div>

                {avatarUrl && avatarUrl !== 'https://i.imgur.com/CR1iy7U.png' && (
                  <button
                    type="button" onClick={handleAvatarDelete}
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 6, color: 'var(--danger)', opacity: 0.7 }}
                    title="Remove photo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </Card>

            {/* ── KYC Card (compact) ── */}
            <Card style={{ padding: '16px 20px' }}>

              {/* KYC Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Shield size={13} className="text-primary" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Identity Verification</span>
                </div>
                {watchAadharFileKey ? (
                  <span className="badge badge-success" style={{ gap: 4, fontSize: 10 }}>
                    <CheckCircle size={10} /> Verified
                  </span>
                ) : (
                  <span className="badge badge-warning" style={{ gap: 4, fontSize: 10 }}>
                    <AlertCircle size={10} /> Required
                  </span>
                )}
              </div>

              <input type="hidden" {...register('aadharNumber')} />
              <input type="hidden" {...register('aadharFileKey')} />

              {/* State: empty — compact upload zone */}
              {!watchAadharFileKey && !aadharUploading && !aadharVerifying && (
                <div
                  className={`file-upload-zone ${aadharError ? 'error' : ''}`}
                  onClick={() => aadharInputRef.current?.click()}
                  style={{ padding: '14px 12px', gap: 6 }}
                >
                  <input ref={aadharInputRef} type="file" accept="image/jpeg,image/png,application/pdf"
                    style={{ display: 'none' }} onChange={handleAadharSelect} />
                  <Upload size={20} className="file-upload-zone-icon" />
                  <p className="file-upload-zone-title" style={{ fontSize: 12 }}>Upload Aadhaar Card</p>
                  <p className="file-upload-zone-desc" style={{ fontSize: 11 }}>JPEG, PNG or PDF · Max 5 MB</p>
                </div>
              )}

              {/* State: uploading / verifying — inline progress */}
              {(aadharUploading || aadharVerifying) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                }}>
                  <Loader2 size={16} className={`animate-spin ${aadharVerifying ? 'text-accent' : 'text-primary'}`} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {aadharVerifying ? 'Verifying via Rekognition OCR…' : 'Uploading to S3…'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {aadharVerifying ? 'Validating Aadhaar number checksum' : 'Streaming document securely'}
                    </div>
                  </div>
                </div>
              )}

              {/* State: verified — thumbnail + number inline */}
              {watchAadharFileKey && !aadharUploading && !aadharVerifying && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', padding: '8px 10px',
                  }}>
                    {/* Thumbnail */}
                    {aadharFileUrl && (
                      aadharFileType === 'pdf' ? (
                        <div style={{
                          width: 44, height: 32, borderRadius: 4, flexShrink: 0,
                          border: '1px solid var(--border)',
                          background: 'var(--accent-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FileText size={16} className="text-accent" />
                        </div>
                      ) : (
                        <img src={aadharFileUrl} alt="Aadhaar"
                          style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0 }}
                        />
                      )
                    )}

                    {/* Number */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Aadhaar
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1.5, color: 'var(--text-primary)', marginTop: 1 }}>
                        {watchAadharNumber ? watchAadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—'}
                      </div>
                    </div>

                    {/* Action icons */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {aadharFileUrl && (
                        <a href={aadharFileUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-ghost btn-icon" style={{ padding: 5 }} title="View document">
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button type="button" className="btn btn-ghost btn-icon"
                        style={{ padding: 5 }} title="Replace Aadhaar"
                        onClick={() => aadharInputRef.current?.click()}>
                        <Upload size={12} />
                      </button>
                      <input ref={aadharInputRef} type="file" accept="image/jpeg,image/png,application/pdf"
                        style={{ display: 'none' }} onChange={handleAadharSelect} />
                    </div>
                  </div>

                  {/* Not-saved chip */}
                  {hasUnsavedAadharUpload() && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: 'var(--warning)', background: 'rgba(255,169,77,0.08)',
                      border: '1px solid rgba(255,169,77,0.3)',
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      Not saved — click "Save Changes" below
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {aadharError && (
                <div style={{
                  display: 'flex', alignItems: 'start', gap: 8,
                  color: 'var(--danger)', background: 'var(--danger-light)',
                  padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                  fontSize: 11, fontWeight: 500,
                  border: '1px solid rgba(255, 77, 109, 0.2)', marginTop: 10,
                }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: 2 }}>Verification Failed</strong>
                    {aadharError}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Personal Details */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={14} className="text-primary" />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Personal Details</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Basic contact information</p>
                </div>
              </div>
              <div className="form-grid">
                <Input label="Full Name" {...register('name', { required: 'Name is required' })} error={errors.name?.message} required />
                <Input label="Email Address" {...register('email')} disabled required />
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
              </div>
            </Card>

            {/* Address Details */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MapPin size={14} className="text-accent" />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Address Details</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your current residential address</p>
                </div>
              </div>
              <div className="form-grid">
                <Input label="City" {...register('address.city', { required: 'City is required' })} error={errors.address?.city?.message} required />
                <Input label="State" {...register('address.state', { required: 'State is required' })} error={errors.address?.state?.message} required />
                <Input
                  label="Pincode" type="tel"
                  {...register('address.pincode', { required: 'Pincode is required', pattern: { value: /^[0-9]{6}$/, message: 'Must be 6 digits' } })}
                  error={errors.address?.pincode?.message} maxLength={6} required
                />
              </div>
            </Card>

            {/* Save Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              {hasUnsaved && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
        </div>
      </form>
    </div>
  );
}
