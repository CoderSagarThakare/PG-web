import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { offboardTenantApi } from '../../api/onboarding.api';
import { Modal, Button, Input } from '../common';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { AlertTriangle, User, Home, Bed, Calendar, IndianRupee, CheckCircle2 } from 'lucide-react';

/**
 * OffboardingModal
 * Triggered from tenant management.
 *
 * Props:
 *  - isOpen     {boolean}
 *  - onClose    {function}
 *  - onboarding {object}  — active onboarding record with financialTerms, userId, pgId, currentBedId etc.
 */
export default function OffboardingModal({ isOpen, onClose, onboarding }) {
  const qc = useQueryClient();

  const [vacatingDate,     setVacatingDate]     = useState('');
  const [deductions,       setDeductions]       = useState('');
  const [deductionNotes,   setDeductionNotes]   = useState('');
  const [pendingRent,      setPendingRent]       = useState('');
  const [settleReference,  setSettleReference]  = useState('');
  const [confirmed,        setConfirmed]        = useState(false);

  // Derived values
  const deposit      = Number(onboarding?.financialTerms?.securityDeposit || 0);
  const ded          = Number(deductions) || 0;
  const rent         = Number(pendingRent) || 0;
  const netRefund    = deposit - ded - rent;

  const resetForm = () => {
    setVacatingDate('');
    setDeductions('');
    setDeductionNotes('');
    setPendingRent('');
    setSettleReference('');
    setConfirmed(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const offboardMut = useMutation({
    mutationFn: (data) => offboardTenantApi(data),
    onSuccess: () => {
      toast.success('Tenant offboarded successfully. Bed is now available.');
      qc.invalidateQueries(['onboardings']);
      qc.invalidateQueries(['rooms']);
      handleClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleConfirm = () => {
    if (!vacatingDate) {
      toast.error('Please set a vacating date');
      return;
    }
    if (!confirmed) {
      toast.error('Please confirm the net refundable amount has been paid');
      return;
    }
    offboardMut.mutate({
      onboardingId:    onboarding._id,
      vacatingDate,
      deductions:      ded,
      deductionNotes,
      pendingRent:     rent,
      netRefund,
      settleReference,
    });
  };

  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Offboard Tenant" size="lg">
      {onboarding && (
        <div className="flex flex-col gap-5">
          {/* Header info */}
          <div className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a855f7] flex items-center justify-center text-white font-black text-base shrink-0">
                {onboarding.userId?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-bold dark:text-[#f0f0f8] text-gray-900">{onboarding.userId?.name}</p>
                <p className="text-sm dark:text-[#6b6e82] text-gray-500">{onboarding.pgId?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Bed size={13} className="dark:text-[#6b6e82] text-gray-400" />
                <span className="dark:text-[#a0a3b1] text-gray-600">
                  Bed {onboarding.currentBedId?.bedNumber || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Home size={13} className="dark:text-[#6b6e82] text-gray-400" />
                <span className="dark:text-[#a0a3b1] text-gray-600">
                  Room {onboarding.currentBedId?.roomId?.roomNumber || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={13} className="dark:text-[#6b6e82] text-gray-400" />
                <span className="dark:text-[#a0a3b1] text-gray-600">
                  Joined {formatDate(onboarding.joiningDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Vacating date */}
          <div>
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-2">
              Vacating Date
            </h4>
            <div className="max-w-xs">
              <Input
                label="Date of Vacating"
                required
                type="date"
                name="vacatingDate"
                value={vacatingDate}
                onChange={e => setVacatingDate(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Final Settlement Calculator */}
          <div>
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3">
              Final Settlement Calculator
            </h4>
            <div className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200 flex flex-col gap-3">
              {/* Security deposit display */}
              <div className="flex justify-between items-center text-sm">
                <span className="dark:text-[#a0a3b1] text-gray-600 flex items-center gap-1.5">
                  <IndianRupee size={13} /> Security Deposit Paid
                </span>
                <span className="font-bold dark:text-[#f0f0f8] text-gray-900">{f(deposit)}</span>
              </div>

              {/* Deductions input */}
              <div>
                <Input
                  label="Deductions (₹)"
                  type="number"
                  min="0"
                  value={deductions}
                  onChange={e => setDeductions(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Input
                  label="Deduction Notes"
                  as="textarea"
                  rows={2}
                  value={deductionNotes}
                  onChange={e => setDeductionNotes(e.target.value)}
                  placeholder="e.g. Broken furniture, overdue bills..."
                />
              </div>

              {/* Pending rent */}
              <div>
                <Input
                  label="Pending Rent Due (₹)"
                  type="number"
                  min="0"
                  value={pendingRent}
                  onChange={e => setPendingRent(e.target.value)}
                  placeholder="Auto-calculated or enter manually"
                />
                <p className="text-xs dark:text-[#6b6e82] text-gray-400 mt-1">
                  Check Rent Tracker for outstanding rent balances.
                </p>
              </div>

              {/* Net refundable */}
              <div className="border-t dark:border-[#2d3052] border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm dark:text-[#a0a3b1] text-gray-600">
                    Net Refundable
                  </span>
                  <span
                    className="text-xl font-black"
                    style={{ color: netRefund >= 0 ? '#51cf66' : '#ff4d6d' }}
                  >
                    {netRefund >= 0 ? '' : '- '}
                    {f(Math.abs(netRefund))}
                  </span>
                </div>
                <p className="text-xs dark:text-[#6b6e82] text-gray-400 mt-0.5 text-right">
                  = Deposit ({f(deposit)}) − Deductions ({f(ded)}) − Pending Rent ({f(rent)})
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Settlement confirmation */}
          <div>
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-2">
              Settlement Confirmation
            </h4>
            <div className="flex flex-col gap-3">
              <Input
                label="Settlement Reference (Txn ID / Notes)"
                value={settleReference}
                onChange={e => setSettleReference(e.target.value)}
                placeholder="e.g. IMPS1234567890 or 'Cash paid to tenant'"
              />
              <label className="flex items-start gap-3 p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200 cursor-pointer hover:border-[#6c63ff]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-[#6c63ff] cursor-pointer shrink-0"
                />
                <div>
                  <span className="font-semibold dark:text-[#f0f0f8] text-gray-900 text-sm">
                    I confirm the net refundable amount ({f(netRefund)}) has been paid to the tenant
                  </span>
                  <p className="text-xs dark:text-[#6b6e82] text-gray-500 mt-0.5">
                    This is a required acknowledgement before completing offboarding.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Danger warning */}
          <div className="flex items-start gap-2 p-3.5 dark:bg-[#ff4d6d]/10 bg-[#ff4d6d]/5 border border-[#ff4d6d]/30 rounded-lg">
            <AlertTriangle size={16} className="text-[#ff4d6d] mt-0.5 shrink-0" />
            <p className="text-sm text-[#ff4d6d] font-medium">
              This action will remove the tenant and free up the bed. This cannot be undone.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 flex-col-reverse sm:flex-row justify-end pt-2 border-t dark:border-[#2d3052] border-gray-200">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirm}
              loading={offboardMut.isPending}
              disabled={!confirmed || !vacatingDate}
            >
              Confirm Offboarding
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
