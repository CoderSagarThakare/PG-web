import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfileApi, updateStaffProfileApi } from '../../api/profile.api';
import { Input, Button, Card } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';
import { User, Mail, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const { user, isStaff, updateUser } = useAuth();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '', email: '', mobNo1: '', mobNo2: '',
      address: { city: '', state: '', pincode: '' }
    }
  });

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
    }
  }, [user, reset]);

  const updateMut = useMutation({
    mutationFn: (data) => isStaff ? updateStaffProfileApi(data) : updateUserProfileApi(data),
    onSuccess: (_, variables) => {
      toast.success('Profile updated successfully!');
      updateUser(variables);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onSubmit = (data) => {
    updateMut.mutate(data);
  };

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
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: 'white'
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
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
