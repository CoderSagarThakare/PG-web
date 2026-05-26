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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117] px-4 py-6 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute w-[600px] h-[600px] bg-[#6c63ff]/10 rounded-full top-[-200px] right-[-200px] blur-3xl pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-[#00d4aa]/8 rounded-full bottom-[-100px] left-[-100px] blur-3xl pointer-events-none" />

      <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl p-8 sm:p-11 w-full max-w-[480px] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative z-10 animate-[slideUp_0.25s_ease]">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size={64} centered subtitle="Create your account to get started" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[#6b6e82]">
          <span>Already have an account? </span>
          <Link to="/login" className="text-[#6c63ff] font-bold hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
