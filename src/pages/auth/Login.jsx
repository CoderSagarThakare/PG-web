import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginApi } from '../../api/auth.api';
import { getStaffProfileApi } from '../../api/profile.api';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Logo } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';

const STAFF_ROLES = ['owner', 'manager', 'employee'];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginApi(form);
      const token = data?.data?.token;
      if (!token) throw new Error('No token received');

      // Token received — now fetch profile to get user info + role
      // Try staff profile first, then user profile
      let userData = null;
      try {
        const tempApi = await import('../../api/axios').then(m => m.default);
        tempApi.defaults.headers.Authorization = `Bearer ${token}`;
        const profileRes = await getStaffProfileApi();
        userData = profileRes?.data?.data;
      } catch {
        try {
          const profileRes = await import('../../api/profile.api').then(m => m.getUserProfileApi());
          userData = profileRes?.data?.data;
        } catch {
          userData = { role: 'user' };
        }
      }

      login(userData, token);
      toast.success(`Welcome back, ${userData?.name || 'there'}!`);

      // Redirect based on role
      const role = userData?.role;
      if (role === 'user') navigate('/browse');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up">
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size={64} centered subtitle="Sign in to your account" />
        </div>

        <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '24px' }} noValidate>
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
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign In
          </Button>
        </form>

        <div style={{ marginTop: 20, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Test Credentials</p>
          <p style={{ color: 'var(--text-secondary)' }}>Owner: coder.sagarthakare@gmail.com</p>
          <p style={{ color: 'var(--text-secondary)' }}>Manager: manager1@gmail.com</p>
          <p style={{ color: 'var(--text-secondary)' }}>User: saggythakare01@gmail.com</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Password: Sagar@123</p>
        </div>
      </div>
    </div>
  );
}
