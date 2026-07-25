import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Logo } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';

const STAFF_ROLES = ['owner', 'manager', 'employee'];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const isTestingEnv = 
    import.meta.env.DEV || 
    import.meta.env.MODE === 'development' || 
    import.meta.env.VITE_SHOW_TEST_CREDENTIALS === 'true' || 
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117] px-4 py-6 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute w-[600px] h-[600px] bg-[#6c63ff]/10 rounded-full top-[-200px] right-[-200px] blur-3xl pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-[#00d4aa]/8 rounded-full bottom-[-100px] left-[-100px] blur-3xl pointer-events-none" />

      <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl p-8 sm:p-11 w-full max-w-[440px] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative z-10 animate-[slideUp_0.25s_ease]">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size={64} centered subtitle="Sign in to your account" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6" noValidate>
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

          <Button 
            type="submit" 
            loading={loading} 
            disabled={!form.email.trim() || !form.password.trim()} 
            className="w-full mt-2" 
            size="lg"
          >
            Sign In
          </Button>
        </form>

        {isTestingEnv && (
          <div className="mt-5 p-4 bg-[#242740] dark:bg-[#242740] rounded-lg text-[12px] space-y-2.5">
            <p className="text-[#6b6e82] mb-1 font-semibold">Select Test Account to Autofill:</p>
            <div className="flex flex-col gap-2">
              {[
                { id: 'owner', label: 'Owner', email: 'coder.sagarthakare@gmail.com', pass: 'sagar123' },
                { id: 'manager', label: 'Manager', email: 'manager1@gmail.com', pass: 'Sagar@123' },
                { id: 'user', label: 'User', email: 'saggythakare01@gmail.com', pass: 'Sagar@123' }
              ].map(acc => {
                const isSelected = form.email === acc.email && form.password === acc.pass;
                return (
                  <label key={acc.id} className="flex items-start gap-2.5 cursor-pointer text-[#a0a3b1] hover:text-white transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ email: acc.email, password: acc.pass });
                        } else {
                          setForm({ email: '', password: '' });
                        }
                      }}
                      className="rounded border-gray-300 text-[#6c63ff] focus:ring-[#6c63ff]/40 bg-white dark:bg-[#242740] dark:border-[#2d3052] w-4 h-4 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#6c63ff] dark:text-[#8e87ff]">{acc.label}: </span>
                      <span className="font-semibold text-gray-900 dark:text-[#f0f0f8]">{acc.email}</span>
                      <span className="text-gray-400 dark:text-[#6b6e82]"> ({acc.pass})</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-[#6b6e82]">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-[#6c63ff] font-bold hover:underline">Register Now</Link>
        </div>
      </div>
    </div>
  );
}
