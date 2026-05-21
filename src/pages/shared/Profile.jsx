import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { updateProfileApi, getAvatarUploadUrlApi, saveAvatarApi, deleteAvatarApi } from '../../api/profile.api';
import { Input, Button, Card } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';
import { User, Mail, Phone, MapPin, Shield, Activity, Calendar, ExternalLink, Camera, Trash2 } from 'lucide-react';

export default function Profile() {
  const { user, isStaff, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '', email: '', mobNo1: '', mobNo2: '',
      address: { city: '', state: '', pincode: '' }
    }
  });

  const [avatarUrl, setAvatarUrl] = useState(user?.picture || null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
        }
      });
      setAvatarUrl(user.picture || null);
    }
  }, [user, reset]);

  const updateMut = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (_, variables) => {
      toast.success('Profile updated successfully!');
      updateUser(variables);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onSubmit = (data) => updateMut.mutate(data);

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
    } catch (err) {
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

  const initials = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information</p>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarSelect}
          />
          <div style={{ position: 'relative' }}>
            <div
              className="profile-avatar-large"
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: avatarUrl && avatarUrl !== 'https://i.imgur.com/CR1iy7U.png'
                  ? 'transparent'
                  : 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: 'white',
                overflow: 'hidden',
                opacity: avatarUploading ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 11, fontWeight: 700 }}>Uploading...</div>
              )}
            </div>
            <div
              onClick={() => !avatarUploading && fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--bg-surface)', padding: 6, borderRadius: '50%', border: '1px solid var(--border)', cursor: avatarUploading ? 'wait' : 'pointer', zIndex: 2 }}
              title="Change photo"
            >
              <Camera size={14} className="text-primary" />
            </div>
            {avatarUrl && avatarUrl !== 'https://i.imgur.com/CR1iy7U.png' && (
              <div
                onClick={handleAvatarDelete}
                style={{ position: 'absolute', bottom: -5, right: 24, background: 'var(--bg-surface)', padding: 6, borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer', zIndex: 2 }}
                title="Remove photo"
              >
                <Trash2 size={14} style={{ color: 'var(--danger)' }} />
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name}</h2>
            <p className="text-muted" style={{ textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-grid">
            <Input 
              label="Full Name" 
              {...register('name', { required: 'Name is required' })} 
              error={errors.name?.message} 
              required
            />
            <Input 
              label="Email Address" 
              {...register('email')} 
              disabled 
              required
            />
            <Input 
              label="Mobile 1" 
              type="tel" 
              {...register('mobNo1', { 
                required: 'Mobile is required',
                pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' }
              })} 
              error={errors.mobNo1?.message} 
              maxLength={10} 
              required
            />
            <Input 
              label="Mobile 2" 
              type="tel" 
              {...register('mobNo2', {
                pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' }
              })} 
              error={errors.mobNo2?.message} 
              maxLength={10} 
            />
            
            <div className="full" style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Address Details</h3>
            </div>
            
            <Input 
              label="City" 
              {...register('address.city', { required: 'City is required' })} 
              error={errors.address?.city?.message}
              required
            />
            <Input 
              label="State" 
              {...register('address.state', { required: 'State is required' })} 
              error={errors.address?.state?.message}
              required
            />
            <Input 
              label="Pincode" 
              type="tel" 
              {...register('address.pincode', {
                required: 'Pincode is required',
                pattern: { value: /^[0-9]{6}$/, message: 'Must be 6 digits' }
              })} 
              error={errors.address?.pincode?.message}
              maxLength={6} 
              required
            />
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={updateMut.isPending}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
