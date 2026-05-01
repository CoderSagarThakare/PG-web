import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfileApi, updateStaffProfileApi } from '../../api/profile.api';
import { Input, Button, Card } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';
import { User, Mail, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const { user, isStaff, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', mobNo1: '', mobNo2: '',
    address: { city: '', state: '', pincode: '' }
  });

  useEffect(() => {
    if (user) {
      setForm({
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
  }, [user]);

  const updateMut = useMutation({
    mutationFn: (data) => isStaff ? updateStaffProfileApi(data) : updateUserProfileApi(data),
    onSuccess: (_, variables) => {
      toast.success('Profile updated successfully!');
      updateUser(variables);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Only allow digits and restrict length
    if (name === 'mobNo1' || name === 'mobNo2') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'address.pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(f => ({ ...f, address: { ...f.address, [key]: value } }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMut.mutate(form);
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

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <Input label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="Email Address" name="email" value={form.email} disabled />
            <Input label="Mobile 1" name="mobNo1" type="tel" value={form.mobNo1} onChange={handleChange} required minLength={10} maxLength={10} />
            <Input label="Mobile 2" name="mobNo2" type="tel" value={form.mobNo2} onChange={handleChange} minLength={10} maxLength={10} />
            
            <div className="full" style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Address Details</h3>
            </div>
            
            <Input label="City" name="address.city" value={form.address.city} onChange={handleChange} />
            <Input label="State" name="address.state" value={form.address.state} onChange={handleChange} />
            <Input label="Pincode" name="address.pincode" type="tel" value={form.address.pincode} onChange={handleChange} minLength={6} maxLength={6} />
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={updateMut.isPending}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
