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
      const userData = data?.data?.user;
      
      if (!token) throw new Error('No token received');

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
          <p style={{ color: 'var(--text-secondary)' }}>Owner: <strong>coder.sagarthakare@gmail.com</strong> (sagar123)</p>
          <p style={{ color: 'var(--text-secondary)' }}>Manager: <strong>manager1@gmail.com</strong> (Sagar@123)</p>
          <p style={{ color: 'var(--text-secondary)' }}>User: <strong>saggythakare01@gmail.com</strong> (Sagar@123)</p>
        </div>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>Register Now</Link>
        </div>
      </div>
    </div>
  );
}
