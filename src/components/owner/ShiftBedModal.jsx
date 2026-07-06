import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { shiftBedApi } from '../../api/onboarding.api';
import { getRoomsApi } from '../../api/room.api';
import { Modal, Button, Input, Badge, Spinner } from '../common';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { Bed, ArrowRight, AlertCircle } from 'lucide-react';

/**
 * ShiftBedModal
 * Shifts a tenant from one bed to another within the same PG.
 *
 * Props:
 *  - isOpen     {boolean}
 *  - onClose    {function}
 *  - onboarding {object}  — active onboarding with userId, pgId, currentBedId
 */
export default function ShiftBedModal({ isOpen, onClose, onboarding }) {
  const qc = useQueryClient();

  // Default effective date = 1st of next month
  const defaultEffectiveDate = useMemo(() => {
    const now   = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const y     = first.getFullYear();
    const m     = String(first.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, []);

  const [selectedBed,    setSelectedBed]    = useState(null);
  const [effectiveDate,  setEffectiveDate]  = useState(defaultEffectiveDate);
  const [shiftNote,      setShiftNote]      = useState('');

  const pgId = onboarding?.pgId?._id || onboarding?.pgId;

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms', pgId],
    queryFn:  async () => (await getRoomsApi(pgId)).data?.data,
    enabled:  !!pgId && isOpen,
  });

  const rooms   = roomsData?.rooms || [];
  const allBeds = rooms.flatMap(room =>
    (room.beds || []).map(bed => ({ ...bed, room }))
  );
  const currentBedId  = onboarding?.currentBedId?._id || onboarding?.currentBedId;
  const availableBeds = allBeds.filter(b => b.status === 'available' && b._id !== currentBedId);

  const handleClose = () => {
    setSelectedBed(null);
    setEffectiveDate(defaultEffectiveDate);
    setShiftNote('');
    onClose();
  };

  const shiftMut = useMutation({
    mutationFn: (data) => shiftBedApi(data),
    onSuccess: () => {
      toast.success('Bed shifted successfully! Rent will update from next month.');
      qc.invalidateQueries(['onboardings']);
      qc.invalidateQueries(['rooms']);
      handleClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleConfirm = () => {
    if (!selectedBed) {
      toast.error('Please select a new bed');
      return;
    }
    if (!effectiveDate) {
      toast.error('Please set an effective date');
      return;
    }
    shiftMut.mutate({
      onboardingId: onboarding._id,
      newBedId:     selectedBed._id,
      effectiveDate,
      note:         shiftNote,
    });
  };

  const f = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Shift Bed" size="lg">
      {onboarding && (
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
            <h4 className="font-bold dark:text-[#f0f0f8] text-gray-900 mb-2">
              Shift Bed for <span className="text-[#6c63ff]">{onboarding.userId?.name}</span>
            </h4>
            {/* Current bed info */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 dark:bg-[#1a1d2e] bg-white rounded-lg border dark:border-[#2d3052] border-gray-200">
                <Bed size={13} className="dark:text-[#6b6e82] text-gray-400" />
                <span className="dark:text-[#a0a3b1] text-gray-600">
                  Current: Bed {onboarding.currentBedId?.bedNumber || '—'}
                  {onboarding.currentBedId?.roomId?.roomNumber && (
                    <> · Room {onboarding.currentBedId.roomId.roomNumber}</>
                  )}
                </span>
              </div>
              <ArrowRight size={16} className="dark:text-[#6b6e82] text-gray-400 shrink-0" />
              <div className="flex items-center gap-2 px-3 py-1.5 dark:bg-[#6c63ff]/10 bg-[#6c63ff]/5 rounded-lg border border-[#6c63ff]/30">
                <Bed size={13} className="text-[#6c63ff]" />
                <span className="text-[#6c63ff] font-medium">
                  {selectedBed ? `Bed ${selectedBed.bedNumber} · Room ${selectedBed.room?.roomNumber}` : 'Select new bed →'}
                </span>
              </div>
            </div>
          </div>

          {/* Available beds grid */}
          <div>
            <h4 className="text-xs font-extrabold dark:text-[#6b6e82] text-gray-500 uppercase tracking-wider mb-3">
              Available Beds ({availableBeds.length})
            </h4>
            {isLoading ? (
              <Spinner center />
            ) : availableBeds.length === 0 ? (
              <div className="flex items-center gap-2 p-4 dark:bg-[#fcc419]/10 bg-[#fcc419]/5 border border-[#fcc419]/30 rounded-lg">
                <AlertCircle size={16} className="text-[#fcc419] shrink-0" />
                <p className="text-sm text-[#fcc419]">No other available beds in this PG.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {availableBeds.map(bed => (
                  <button
                    key={bed._id}
                    type="button"
                    onClick={() => setSelectedBed(bed)}
                    className={[
                      'w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200',
                      selectedBed?._id === bed._id
                        ? 'border-[#6c63ff] dark:bg-[#6c63ff]/10 bg-[#6c63ff]/5'
                        : 'dark:border-[#2d3052] border-gray-200 dark:bg-[#1a1d2e] bg-white hover:border-[#6c63ff]/50',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold dark:text-[#f0f0f8] text-gray-900 text-sm">
                        Bed {bed.bedNumber}
                      </span>
                      <Badge variant="success">Available</Badge>
                    </div>
                    <p className="text-xs dark:text-[#6b6e82] text-gray-500">
                      Room {bed.room?.roomNumber} · Floor {bed.room?.floor ?? '—'}
                    </p>
                    <p className="text-sm font-bold text-[#6c63ff] mt-1">
                      {f(bed.price)}/mo
                    </p>
                    {bed.position && (
                      <p className="text-xs dark:text-[#6b6e82] text-gray-400 capitalize">{bed.position}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Effective date and note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Effective Date"
              required
              type="date"
              name="effectiveDate"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
            />
            <Input
              label="Note (Optional)"
              value={shiftNote}
              onChange={e => setShiftNote(e.target.value)}
              placeholder="Reason for shift..."
            />
          </div>

          {/* Info note */}
          <p className="text-xs dark:text-[#6b6e82] text-gray-400 flex items-center gap-1.5">
            <AlertCircle size={12} className="shrink-0" />
            Rent billing updates from next month based on the new bed's price.
          </p>

          {/* Footer */}
          <div className="flex gap-3 flex-col-reverse sm:flex-row justify-end pt-2 border-t dark:border-[#2d3052] border-gray-200">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              loading={shiftMut.isPending}
              disabled={!selectedBed}
            >
              Confirm Shift
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
