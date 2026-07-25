import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPasswordApi } from '../../api/auth.api';
import { Button, Input, Logo } from '../../components/common';
import { getErrorMessage } from '../../utils/helpers';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPasswordApi({ email });
      setSent(true);
      toast.success('Password reset link sent to your email!');
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
          <Logo size={64} centered subtitle="Reset your password" />
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#00d4aa]/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-[#00d4aa]" />
            </div>
            <h3 className="text-lg font-bold dark:text-[#f0f0f8] text-gray-900 mb-2">Check Your Email</h3>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 mb-6">
              We've sent a password reset link to <span className="font-bold text-[#6c63ff]">{email}</span>. 
              Please check your inbox and follow the instructions.
            </p>
            <Button onClick={() => { setSent(false); setEmail(''); }} variant="outline" className="w-full">
              Send Another Link
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 text-center mb-6">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <Button
                type="submit"
                loading={loading}
                disabled={!email.trim()}
                className="w-full mt-2"
                size="lg"
              >
                Send Reset Link
              </Button>
            </form>
          </>
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
