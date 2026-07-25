import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPasswordApi } from '../../api/auth.api';
import { Button, Input, Logo } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi({ password }, token);
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117] px-4">
        <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl p-8 w-full max-w-[440px] text-center">
          <h2 className="text-lg font-bold dark:text-[#f0f0f8] mb-3">Invalid Reset Link</h2>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mb-5">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="text-[#6c63ff] font-bold hover:underline text-sm">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117] px-4 py-6 relative overflow-hidden">
      <div className="absolute w-[600px] h-[600px] bg-[#6c63ff]/10 rounded-full top-[-200px] right-[-200px] blur-3xl pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-[#00d4aa]/8 rounded-full bottom-[-100px] left-[-100px] blur-3xl pointer-events-none" />

      <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl p-8 sm:p-11 w-full max-w-[440px] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative z-10 animate-[slideUp_0.25s_ease]">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size={64} centered subtitle="Set a new password" />
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#00d4aa]/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-[#00d4aa]" />
            </div>
            <h3 className="text-lg font-bold dark:text-[#f0f0f8] text-gray-900 mb-2">Password Updated!</h3>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 mb-6">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              label="New Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />

            <Button
              type="submit"
              loading={loading}
              disabled={!password.trim() || !confirmPassword.trim()}
              className="w-full mt-2"
              size="lg"
            >
              Reset Password
            </Button>
          </form>
        )}

        <div className="mt-5 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#6c63ff] font-bold hover:underline">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
