import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerApi } from '../../api/auth.api';
import { Button, Input, Logo } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    mobNo1: '', 
    role: 'user' 
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerApi(form);
      toast.success('Registration successful! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up" style={{ maxWidth: 480 }}>
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size={64} centered subtitle="Create your account to get started" />
        </div>

        <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '24px' }} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
             <div style={{ gridColumn: '1 / -1' }}>
                <Input
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                />
             </div>
             
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
            
            <Input
              label="Mobile Number"
              name="mobNo1"
              type="tel"
              value={form.mobNo1}
              onChange={handleChange}
              placeholder="9876543210"
              required
              maxLength={10}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min 8 chars, 1 digit"
              required
            />

            <Input
              label="I am a..."
              name="role"
              as="select"
              value={form.role}
              onChange={handleChange}
              required
              options={[
                { value: 'user', label: 'Tenant / Student' },
                { value: 'owner', label: 'PG Owner' },
                { value: 'manager', label: 'Property Manager' },
                { value: 'employee', label: 'Staff / Employee' },
              ]}
            />
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg" style={{ marginTop: 8 }}>
            Create Account
          </Button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
