import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomsApi, createRoomApi, updateRoomApi, deleteRoomApi, assignTenantApi, unassignTenantApi, updateBedApi, getEligibleTenantsApi } from '../../api/room.api';
import { getPGByIdApi } from '../../api/pg.api';
import { setVacatingNoticeApi, clearVacatingNoticeApi, createPreBookingApi, cancelPreBookingApi } from '../../api/preBooking.api';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, SelectDropdown } from '../../components/common';
import { Building2, Plus, Bed, Users, Trash2, Edit2, ArrowLeft, Search, UserPlus, LogOut, Clock, CalendarCheck, Lock, AlertTriangle, Phone, UserCheck } from 'lucide-react';
import { getErrorMessage, formatPrice } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm, useFieldArray, Controller } from 'react-hook-form';

export default function ManageRooms() {
  const { pgId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // { bedId, roomNumber }

  // New Modals State
  const [vacatingModal, setVacatingModal] = useState(null); // { bedId, userName }
  const [preBookModal, setPreBookModal] = useState(null); // { bedId, roomId, roomNumber, bedNum, pgId }
  const [reservationModal, setReservationModal] = useState(null); // preBooking details + currentTenant info

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', pgId],
    queryFn: async () => (await getRoomsApi(pgId)).data?.data,
  });

  const { data: pg } = useQuery({
    queryKey: ['pg-info', pgId],
    queryFn: async () => (await getPGByIdApi(pgId)).data?.data?.pg,
    enabled: !!pgId,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, occupied, available, vacating_soon, reserved
  const [typeFilter, setTypeFilter] = useState('all'); // all, AC, Non-AC

  const filteredRooms = rooms.filter(room => {
    // Type Filter
    if (typeFilter !== 'all' && room.roomType !== typeFilter) return false;

    // Search Filter
    const searchLower = searchTerm.toLowerCase();
    const roomMatch = room.roomNumber.toString().toLowerCase().includes(searchLower);
    const bedMatch = room.beds?.some(bed => 
      bed.bedNumber.toLowerCase().includes(searchLower) ||
      bed.userId?.name?.toLowerCase().includes(searchLower) ||
      bed.userId?.mobNo1?.toLowerCase().includes(searchLower) ||
      bed.userId?.vehicleNumber?.toLowerCase().includes(searchLower) ||
      bed.activePreBookingId?.guestDetails?.name?.toLowerCase().includes(searchLower) ||
      bed.activePreBookingId?.guestDetails?.phone?.toLowerCase().includes(searchLower)
    );

    if (searchTerm && !roomMatch && !bedMatch) return false;

    // Status Filter (Occupancy / Reservation / Vacating)
    if (statusFilter === 'occupied') {
      return room.beds?.some(bed => bed.status === 'occupied');
    }
    if (statusFilter === 'available') {
      return room.beds?.some(bed => bed.status === 'available');
    }
    if (statusFilter === 'vacating_soon') {
      return room.beds?.some(bed => bed.status === 'vacating_soon');
    }
    if (statusFilter === 'reserved') {
      return room.beds?.some(bed => bed.status === 'reserved');
    }

    return true;
  }).sort((a, b) => {
    return a.roomNumber.toString().localeCompare(b.roomNumber.toString(), undefined, { numeric: true });
  });

  const createRoomMut = useMutation({
    mutationFn: createRoomApi,
    onSuccess: () => {
      toast.success('Room created!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['my-pgs']);
      setModalOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateRoomMut = useMutation({
    mutationFn: ({ id, data }) => updateRoomApi(id, data),
    onSuccess: () => {
      toast.success('Room updated!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['my-pgs']);
      setEditRoom(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteRoomMut = useMutation({
    mutationFn: deleteRoomApi,
    onSuccess: () => {
      toast.success('Room deleted!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['my-pgs']);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const assignMut = useMutation({
    mutationFn: ({ bedId, userId, joiningDate }) => assignTenantApi(bedId, userId, joiningDate),
    onSuccess: () => {
      toast.success('Tenant assigned!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['my-pgs']);
      setAssignModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const unassignMut = useMutation({
    mutationFn: unassignTenantApi,
    onSuccess: () => {
      toast.success('Bed vacated!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['my-pgs']);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const setVacatingMut = useMutation({
    mutationFn: setVacatingNoticeApi,
    onSuccess: () => {
      toast.success('Vacating notice set!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['vacating-beds-dashboard']);
      setVacatingModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const clearVacatingMut = useMutation({
    mutationFn: clearVacatingNoticeApi,
    onSuccess: () => {
      toast.success('Vacating notice cleared!');
      qc.invalidateQueries(['rooms', pgId]);
      qc.invalidateQueries(['vacating-beds-dashboard']);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const preBookMut = useMutation({
    mutationFn: createPreBookingApi,
    onSuccess: () => {
      toast.success('Bed pre-booked successfully!');
      qc.invalidateQueries(['rooms', pgId]);
      setPreBookModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cancelPreBookMut = useMutation({
    mutationFn: ({ id, data }) => cancelPreBookingApi(id, data),
    onSuccess: () => {
      toast.success('Pre-booking cancelled!');
      qc.invalidateQueries(['rooms', pgId]);
      setReservationModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDeleteRoom = (roomId) => {
    if (window.confirm('Are you sure you want to delete this room and all its beds?')) {
      deleteRoomMut.mutate(roomId);
    }
  };

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in min-h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900 flex items-center gap-2 flex-wrap">
              Inventory Management
              {pg?.name && (
                <span className="text-[13px] bg-[#6c63ff]/15 text-[#6c63ff] px-2.5 py-0.5 rounded-full font-semibold border border-[#6c63ff]/20">
                  {pg.name}
                </span>
              )}
            </h1>
            <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Track occupancy, rooms, and beds for this property</p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Room
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 mb-6 dark:bg-[#242740] bg-gray-50 border border-[#2d3052]/50 dark:border-[#2d3052]/50 rounded-xl">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search Input */}
          <div className="relative flex-1 basis-[200px] min-w-0">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-[#6b6e82] text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by Room No, Bed No, Tenant Name or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 dark:bg-[#0f1117] bg-white border border-[#2d3052] dark:border-[#2d3052] rounded-lg px-3 py-2.5 text-sm dark:text-[#f0f0f8] text-gray-900 outline-none focus:border-[#6c63ff] h-11"
            />
          </div>

          {/* Select Filters */}
          <div className="flex gap-2 flex-wrap">
            <SelectDropdown
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'AC', label: 'AC' },
                { value: 'Non-AC', label: 'Non-AC' }
              ]}
              className="min-w-[120px]"
            />

            <SelectDropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'occupied', label: 'Has Occupancy' },
                { value: 'available', label: 'Has Vacancy' },
                { value: 'vacating_soon', label: 'Vacating Soon' },
                { value: 'reserved', label: 'Reserved' },
              ]}
              className="min-w-[140px]"
            />
          </div>

          {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all'); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <EmptyState
          icon={<Search size={48} className="opacity-50" />}
          title={rooms.length === 0 ? "No rooms added yet" : "No results found"}
          description={rooms.length === 0 ? "Start by adding rooms and configuring sharing types." : "Try adjusting your filters or search query."}
          action={rooms.length === 0 ? <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add First Room</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {filteredRooms.map(room => (
            <Card key={room._id} className="hover-container p-3">
              {/* Hover action buttons */}
              <div className="hover-actions top-2 right-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-icon dark:bg-[#242740] bg-gray-100 p-1"
                  onClick={() => setEditRoom(room)}
                >
                  <Edit2 size={12} className="text-[#6c63ff]" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-icon dark:bg-[#242740] bg-gray-100 p-1"
                  onClick={() => handleDeleteRoom(room._id)}
                >
                  <Trash2 size={12} className="text-[#ff4d6d]" />
                </Button>
              </div>

              {/* Room Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2d3052]/50 dark:border-[#2d3052]/50">
                <div>
                  <span className="text-base font-black dark:text-[#f0f0f8] text-gray-900">Room {room.roomNumber}</span>
                  <span className="text-[11px] dark:text-[#6b6e82] text-gray-400 ml-2">F{room.floor} · {room.unitType || 'Single Room'} · {room.roomType}</span>
                </div>
                <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">{room.sharingType} Beds</Badge>
              </div>

              {/* Bed List */}
              <div className="flex flex-col gap-1">
                {room.beds?.map(bed => {
                  const isVacating = bed.status === 'vacating_soon';
                  const isReserved = bed.status === 'reserved';
                  const isOccupied = bed.status === 'occupied';
                  const isAvailable = bed.status === 'available';
                  const preBooking = bed.activePreBookingId;
                  const bedSuffix = bed.bedNumber.includes('-') ? bed.bedNumber.split('-')[1] : bed.bedNumber;

                  let bgClass = 'bg-transparent';
                  let iconColor = 'text-[#51cf66]';
                  if (isOccupied) { bgClass = 'dark:bg-[#242740] bg-gray-100'; iconColor = 'text-[#ffa94d]'; }
                  if (isVacating) { bgClass = 'dark:bg-[#ff4d6d]/5 bg-[#ff4d6d]/5 border-[#ff4d6d]/30'; iconColor = 'text-[#ff4d6d]'; }
                  if (isReserved) { bgClass = 'dark:bg-[#a855f7]/5 bg-[#a855f7]/5 border-[#a855f7]/30'; iconColor = 'text-[#a855f7]'; }

                  return (
                    <div
                      key={bed._id}
                      className={`px-2 py-1.5 rounded-lg border border-[#2d3052]/30 dark:border-[#2d3052]/30 grid grid-cols-[30px_1fr_auto] items-center gap-2 text-xs ${bgClass}`}
                    >
                      {/* Bed Icon */}
                      <div className={`${iconColor} flex`}>
                        {isReserved ? <Lock size={14} /> : <Bed size={14} />}
                      </div>

                      {/* Info Area */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold dark:text-[#f0f0f8] text-gray-900">
                            Bed {bedSuffix}
                          </span>
                          <span className="text-[10px] dark:text-[#6b6e82] text-gray-400">
                            ({bed.position || 'No Pos'} · {formatPrice(bed.price)})
                          </span>
                          {isVacating && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#ff4d6d]/15 text-[#ff4d6d] rounded text-[9px] font-bold border border-[#ff4d6d]/20">
                              ⚠️ Leaving {bed.vacatingDetails?.vacatingDate ? new Date(bed.vacatingDetails.vacatingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </span>
                          )}
                          {isReserved && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#a855f7]/15 text-[#a855f7] rounded text-[9px] font-bold border border-[#a855f7]/20">
                              🔒 Reserved
                              {preBooking?.isRefundable === false && ' · Non-Refundable'}
                            </span>
                          )}
                        </div>

                        {/* Tenant / Reservation Sub-Text */}
                        {isOccupied && (
                          <div className="text-[11px] text-[#6c63ff] font-semibold truncate flex items-center gap-1.5 flex-wrap">
                            <span>{bed.userId?.name || 'Assigned'} {bed.userId?.mobNo1 && `· ${bed.userId.mobNo1}`}</span>
                            {bed.userId?.vehicleType && bed.userId.vehicleType !== 'none' && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-gray-100 dark:bg-[#1a1d2e] text-gray-600 dark:text-[#a0a3b1] rounded text-[9px] font-bold border border-gray-200 dark:border-[#2d3052]">
                                {bed.userId.vehicleType === 'bike' ? '🏍️' : '🚗'} {bed.userId.vehicleNumber}
                              </span>
                            )}
                          </div>
                        )}
                        {isVacating && bed.userId && (
                          <div className="text-[11px] text-[#ff4d6d] font-semibold truncate">
                            Leaving: {bed.userId?.name || 'Tenant'} {bed.userId?.mobNo1 && `· ${bed.userId.mobNo1}`}
                          </div>
                        )}
                        {isReserved && (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {bed.userId && (
                              <div className="text-[11px] text-[#ff4d6d] font-semibold truncate flex items-center gap-1">
                                <span>Current: {bed.userId.name} {bed.userId.mobNo1 && `(${bed.userId.mobNo1})`}</span>
                                {bed.vacatingDetails?.vacatingDate && (
                                  <span className="text-[9px] text-[#ff4d6d] bg-[#ff4d6d]/10 px-1 rounded font-bold border border-[#ff4d6d]/20">
                                    Leaving {new Date(bed.vacatingDetails.vacatingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            )}
                            {preBooking && (
                              <div className="text-[11px] text-[#a855f7] font-semibold truncate">
                                For: {preBooking.guestDetails?.name || preBooking.userId?.name || '—'} {preBooking.guestDetails?.phone ? `(${preBooking.guestDetails.phone})` : ''} · Move-in: {preBooking.expectedMoveInDate ? new Date(preBooking.expectedMoveInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'} · Advance: ₹{Number(preBooking.advanceAmount || 0).toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        )}
                        {isAvailable && (
                          <div className="text-[10px] text-[#51cf66]">Available</div>
                        )}
                      </div>

                      {/* Bed Action Buttons */}
                      <div className="flex items-center gap-1">
                        {isOccupied && (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#ffa94d] text-[10px] px-1.5 py-0.5 h-auto hover:bg-[#ffa94d]/10"
                              onClick={() => setVacatingModal({ bedId: bed._id, userName: bed.userId?.name })}
                            >
                              Set Notice
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#ff4d6d] text-[10px] px-1 py-0.5 h-auto hover:bg-[#ff4d6d]/10"
                              onClick={() => unassignMut.mutate(bed._id)}
                              loading={unassignMut.isPending && unassignMut.variables === bed._id}
                            >
                              Vacate
                            </Button>
                          </>
                        )}
                        {isVacating && (
                          <>
                            <Button
                              variant="outline" size="sm"
                              className="text-[#a855f7] text-[10px] px-1.5 py-0.5 h-auto border-[#a855f7]/30 hover:bg-[#a855f7]/10"
                              onClick={() => setPreBookModal({ bedId: bed._id, roomId: room._id, roomNumber: room.roomNumber, bedNum: bedSuffix, pgId })}
                            >
                              Pre-Book
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#ffa94d] text-[10px] px-1 py-0.5 h-auto hover:bg-[#ffa94d]/10"
                              onClick={() => setVacatingModal({
                                bedId: bed._id,
                                userName: bed.userId?.name,
                                existingDate: bed.vacatingDetails?.vacatingDate,
                                existingReason: bed.vacatingDetails?.reason
                              })}
                            >
                              Edit Notice
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#6b6e82] text-[10px] px-1 py-0.5 h-auto hover:bg-gray-100 dark:hover:bg-[#2d3052]"
                              onClick={() => clearVacatingMut.mutate(bed._id)}
                            >
                              Clear
                            </Button>
                          </>
                        )}
                        {isReserved && (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#a855f7] text-[10px] px-1.5 py-0.5 h-auto hover:bg-[#a855f7]/10"
                              onClick={() => setReservationModal({ ...preBooking, currentTenant: bed.userId, vacatingDetails: bed.vacatingDetails, bedId: bed._id })}
                            >
                              View
                            </Button>
                          </>
                        )}
                        {isAvailable && (
                          <>
                            <Button
                              variant="outline" size="sm"
                              className="text-[10px] px-1.5 py-0.5 h-auto"
                              onClick={() => setAssignModal({ bedId: bed._id, roomNumber: room.roomNumber, bedNum: bedSuffix })}
                            >
                              Assign
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#a855f7] text-[10px] px-1.5 py-0.5 h-auto hover:bg-[#a855f7]/10"
                              onClick={() => setPreBookModal({ bedId: bed._id, roomId: room._id, roomNumber: room.roomNumber, bedNum: bedSuffix, pgId })}
                            >
                              Pre-Book
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Room Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={pg?.name ? `Add New Room to ${pg.name}` : "Add New Room"} size="lg">
        <RoomForm onSubmit={(data) => createRoomMut.mutate({ ...data, pgId })} loading={createRoomMut.isPending} onCancel={() => setModalOpen(false)} />
      </Modal>

      {/* Edit Room Modal */}
      <Modal isOpen={!!editRoom} onClose={() => setEditRoom(null)} title={pg?.name ? `Edit Room Details - ${pg.name}` : "Edit Room Details"} size="lg">
        {editRoom && (
          <RoomForm
            initialData={editRoom}
            onSubmit={(data) => updateRoomMut.mutate({ id: editRoom._id, data })}
            loading={updateRoomMut.isPending}
            isEdit
            onCancel={() => setEditRoom(null)}
          />
        )}
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal isOpen={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Tenant">
        <AssignForm
          bedInfo={assignModal}
          pgId={pgId}
          pgName={pg?.name}
          onSubmit={(userId, joiningDate) => assignMut.mutate({ bedId: assignModal.bedId, userId, joiningDate })}
          loading={assignMut.isPending}
        />
      </Modal>

      {/* Vacating Notice Modal */}
      <Modal isOpen={!!vacatingModal} onClose={() => setVacatingModal(null)} title="Set Vacating Notice">
        {vacatingModal && (
          <VacatingNoticeForm
            bedInfo={vacatingModal}
            onSubmit={(data) => setVacatingMut.mutate(data)}
            loading={setVacatingMut.isPending}
            onCancel={() => setVacatingModal(null)}
          />
        )}
      </Modal>

      {/* Pre-Booking Modal */}
      <Modal isOpen={!!preBookModal} onClose={() => setPreBookModal(null)} title="Pre-Book Bed">
        {preBookModal && (
          <PreBookForm
            bedInfo={preBookModal}
            onSubmit={(data) => preBookMut.mutate(data)}
            loading={preBookMut.isPending}
            onCancel={() => setPreBookModal(null)}
          />
        )}
      </Modal>

      {/* Reservation Details Modal */}
      <Modal isOpen={!!reservationModal} onClose={() => setReservationModal(null)} title="Pre-Booking & Occupancy Details">
        {reservationModal && (
          <ReservationDetailsForm
            reservation={reservationModal}
            onCancelPreBooking={(cancelData) => cancelPreBookMut.mutate({ id: reservationModal._id, data: cancelData })}
            onVacateTenant={(bedId) => unassignMut.mutate(bedId)}
            loading={cancelPreBookMut.isPending}
            onClose={() => setReservationModal(null)}
            onEditVacatingNotice={() => {
              const bedId = reservationModal.bedId;
              const userName = reservationModal.currentTenant?.name;
              const existingDate = reservationModal.vacatingDetails?.vacatingDate;
              const existingReason = reservationModal.vacatingDetails?.reason;
              setReservationModal(null);
              setVacatingModal({ bedId, userName, existingDate, existingReason });
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// ── Room Form ──────────────────────────────────────────────────────────────────
const presetUnitTypes = ['Single Room', '1 RK', '1 BHK', '2 BHK', '3 BHK',];

function RoomForm({ onSubmit, loading, initialData, isEdit, onCancel }) {
  const getInitialUnitType = () => {
    if (!initialData?.unitType) return 'Single Room';
    return presetUnitTypes.includes(initialData.unitType) ? initialData.unitType : 'Other';
  };

  const getInitialCustomUnitType = () => {
    if (!initialData?.unitType) return '';
    return presetUnitTypes.includes(initialData.unitType) ? '' : initialData.unitType;
  };

  const { register, control, handleSubmit, watch, trigger, formState: { errors } } = useForm({
    mode: 'onChange',
    defaultValues: {
      roomNumber: initialData?.roomNumber || '',
      floor: initialData?.floor ?? '',
      unitType: getInitialUnitType(),
      customUnitType: getInitialCustomUnitType(),
      sharingType: initialData?.sharingType || 2,
      roomType: initialData?.roomType || 'Non-AC',
      beds: initialData?.beds || [
        { bedNumber: 'A', price: '', position: 'Window Side' },
        { bedNumber: 'B', price: '', position: 'Entrance Side' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "beds"
  });

  const handleFormSubmit = (data) => {
    const cleaned = {
      roomNumber: data.roomNumber,
      floor: Number(data.floor),
      sharingType: Number(data.sharingType),
      roomType: data.roomType,
      unitType: data.unitType === 'Other' ? (data.customUnitType?.trim() || 'Custom Room') : data.unitType,
      beds: data.beds?.map(b => ({
        ...(b._id ? { _id: b._id } : {}),
        bedNumber: b.bedNumber,
        price: Number(b.price || 0),
        position: b.position || '',
      }))
    };
    onSubmit(cleaned);
  };

  const handleSharingChange = (e) => {
    const val = parseInt(e.target.value);
    trigger('sharingType');
    if (isNaN(val) || val < 1 || val > 20) return;

    const currentCount = fields.length;
    if (val > currentCount) {
      for (let i = currentCount; i < val; i++) {
        const bedLetter = i < 26 
          ? String.fromCharCode(65 + i) 
          : `${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`;
        append({ bedNumber: bedLetter, price: '', position: '' });
      }
    } else if (val < currentCount) {
      for (let i = currentCount - 1; i >= val; i--) {
        remove(i);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="max-h-[420px] overflow-y-auto pr-1 flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            label="Room Number" required
            {...register('roomNumber', { required: 'Required' })}
            error={errors.roomNumber?.message}
            placeholder="e.g. 101"
          />
          <Input
            label="Floor" type="number" required min={0}
            {...register('floor', { required: 'Required', min: { value: 0, message: 'Min 0' } })}
            error={errors.floor?.message}
            placeholder="0"
          />
          <Controller
            name="roomType"
            control={control}
            render={({ field }) => (
              <Input
                label="Room AC Type"
                as="select"
                value={field.value}
                onChange={field.onChange}
                ref={field.ref}
                options={[{ value: 'AC', label: 'AC' }, { value: 'Non-AC', label: 'Non-AC' }]}
              />
            )}
          />
          <Input
            label="Occupancy (Beds)" type="number" required min={1} max={20}
            {...register('sharingType', { 
              required: 'Required', 
              min: { value: 1, message: 'Min 1' },
              max: { value: 20, message: 'Max 20' }
            })}
            onChange={handleSharingChange}
            error={errors.sharingType?.message}
            placeholder="2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={watch('unitType') === 'Other' ? 'col-span-1' : 'col-span-1 sm:col-span-2'}>
            <Controller
              name="unitType"
              control={control}
              render={({ field }) => (
                <Input
                  label="Unit / Layout Type"
                  as="select"
                  value={field.value}
                  onChange={field.onChange}
                  ref={field.ref}
                  options={[
                    { value: 'Single Room', label: 'Single Room' },
                    { value: '1 RK', label: '1 RK' },
                    { value: '1 BHK', label: '1 BHK' },
                    { value: '2 BHK', label: '2 BHK' },
                    { value: '3 BHK', label: '3 BHK' },
                    { value: 'Studio', label: 'Studio Apartment' },
                    { value: 'Shared Room', label: 'Shared Room' },
                    { value: 'Other', label: 'Other / Custom...' },
                  ]}
                />
              )}
            />
          </div>

          {watch('unitType') === 'Other' && (
            <Input
              label="Custom Layout Name" required
              placeholder="e.g. 4 BHK, Penthouse, Duplex"
              {...register('customUnitType', { required: 'Required' })}
              error={errors.customUnitType?.message}
            />
          )}
        </div>

        <div className="mt-1">
          <h3 className="text-[13px] font-bold mb-2 pb-1.5 border-b dark:border-[#2d3052] border-gray-200 dark:text-[#f0f0f8] text-gray-900">
            Bed Configurations
          </h3>
          <div className="flex flex-col gap-2.5">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[70px_1fr_1fr] items-end gap-2.5">
                <Input label={`Bed ${field.bedNumber}`} disabled value={field.bedNumber} />
                <Input
                  label="Price" type="number" required min={0}
                  {...register(`beds.${index}.price`, { required: 'Required', min: { value: 0, message: 'Cannot be negative' } })}
                  placeholder="Price"
                  error={errors.beds?.[index]?.price?.message}
                />
                <Input
                  label="Position"
                  {...register(`beds.${index}.position`)}
                  placeholder="e.g. Window"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-5 border-t dark:border-[#2d3052] border-gray-200 flex-col-reverse sm:flex-row">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" loading={loading} className="flex-[2]">
          {isEdit ? 'Update Room' : 'Create Room & Beds'}
        </Button>
      </div>
    </form>
  );
}

// ── Assign Form ────────────────────────────────────────────────────────────────
function AssignForm({ bedInfo, onSubmit, loading, pgId, pgName }) {
  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['eligible-tenants', pgId],
    queryFn: async () => (await getEligibleTenantsApi(pgId)).data?.data,
  });
  const tenants = tenantData?.users ?? [];
  const genderMismatchCount = tenantData?.genderMismatchCount ?? 0;

  const [selectedUser, setSelectedUser] = useState(null);
  const [joiningDate, setJoiningDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#6c63ff]/15 px-3 py-2.5 rounded-xl text-[#6c63ff] text-[13px] flex items-center justify-between flex-wrap gap-2">
        <span>
          Assigning tenant to <strong>Room {bedInfo?.roomNumber} - Bed {bedInfo?.bedNum}</strong>
        </span>
        {pgName && (
          <span className="text-[11px] dark:bg-[#242740] bg-white text-[#6c63ff] px-2 py-0.5 rounded-full font-bold border border-[#6c63ff]/20">
            {pgName}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-[13px] font-bold mb-2.5 dark:text-[#f0f0f8] text-gray-900">
          Select Tenant (with "Deal Done" status)
        </h4>

        {isLoading ? (
          <Spinner />
        ) : tenants.length === 0 ? (
          <div className="text-center py-4 dark:text-[#6b6e82] text-gray-500">
            <Users size={32} className="opacity-30 mb-2 mx-auto" />
            {genderMismatchCount > 0 ? (
              <p>
                No eligible tenants found.<br />
                <small>
                  {genderMismatchCount} onboarded tenant{genderMismatchCount > 1 ? 's are' : ' is'} excluded
                  due to gender mismatch with this PG type.
                </small>
              </p>
            ) : (
              <p>No eligible tenants found.<br /><small>Users must have completed onboarding for this PG.</small></p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto p-1">
            {tenants.map(user => (
              <div
                key={user._id}
                onClick={() => setSelectedUser(user._id)}
                className={[
                  'px-3 py-2 rounded-lg border cursor-pointer flex justify-between items-center transition-all duration-200',
                  selectedUser === user._id
                    ? 'border-[#6c63ff] bg-[#6c63ff]/15'
                    : 'dark:border-[#2d3052] border-gray-200 dark:bg-[#242740] bg-gray-50',
                ].join(' ')}
              >
                <div>
                  <div className="font-semibold text-sm dark:text-[#f0f0f8] text-gray-900">{user.name}</div>
                  <div className="text-[11px] dark:text-[#6b6e82] text-gray-400">{user.mobNo1} · {user.email}</div>
                </div>
                {selectedUser === user._id && <Badge variant="primary">Selected</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Input
          label="Check-in / Joining Date"
          type="date"
          required
          value={joiningDate}
          onChange={e => setJoiningDate(e.target.value)}
        />
      </div>

      <div className="border-t dark:border-[#2d3052] border-gray-200 pt-4">
        <Button
          onClick={() => onSubmit(selectedUser, joiningDate)}
          loading={loading}
          disabled={!selectedUser || !joiningDate}
          className="w-full"
        >
          Confirm Assignment
        </Button>
      </div>
    </div>
  );
}

// ── Vacating Notice Form ───────────────────────────────────────────────────────
function VacatingNoticeForm({ bedInfo, onSubmit, loading, onCancel }) {
  const [vacatingDate, setVacatingDate] = useState(() => {
    if (bedInfo?.existingDate) {
      try {
        return new Date(bedInfo.existingDate).toISOString().split('T')[0];
      } catch (e) {
        return bedInfo.existingDate;
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState(bedInfo?.existingReason || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vacatingDate) {
      toast.error('Please select a vacating date');
      return;
    }
    onSubmit({
      bedId: bedInfo.bedId,
      vacatingDate,
      reason,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="bg-[#ff4d6d]/10 p-3 rounded-xl border border-[#ff4d6d]/20 flex items-center justify-between text-xs text-[#ff4d6d] font-bold">
        <span>Setting Vacating Notice for Tenant</span>
        {bedInfo.userName && <Badge variant="danger">{bedInfo.userName}</Badge>}
      </div>

      <Input
        label="Expected Vacating Date"
        type="date"
        required
        value={vacatingDate}
        onChange={(e) => setVacatingDate(e.target.value)}
      />

      <Input
        label="Reason for Leaving (Optional)"
        placeholder="e.g. Relocating to another city, job change"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <div className="flex gap-3 justify-end pt-3 border-t dark:border-[#2d3052] border-gray-200">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={loading} className="flex-[2] bg-[#ff4d6d] hover:bg-[#ff4d6d]/90 text-white">
          Confirm Vacating Notice
        </Button>
      </div>
    </form>
  );
}

// ── Pre-Book Form ──────────────────────────────────────────────────────────────
function PreBookForm({ bedInfo, onSubmit, loading, onCancel }) {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [moveInDate, setMoveInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [paymentRef, setPaymentRef] = useState('');
  const [isRefundable, setIsRefundable] = useState(true);

  const handlePhoneChange = (e) => {
    // Only allow digits and cap at 10 numbers
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setGuestPhone(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('Incoming tenant name is required');
      return;
    }
    if (!/^\d{10}$/.test(guestPhone.trim())) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }
    if (!advanceAmount || Number(advanceAmount) < 0) {
      toast.error('Advance amount must be a positive number');
      return;
    }

    onSubmit({
      pgId: bedInfo.pgId,
      roomId: bedInfo.roomId,
      bedId: bedInfo.bedId,
      guestDetails: {
        name: guestName.trim(),
        phone: guestPhone.trim(),
        email: guestEmail.trim() || undefined,
      },
      expectedMoveInDate: moveInDate,
      advanceAmount: Number(advanceAmount),
      paymentMode,
      paymentReference: paymentRef.trim() || undefined,
      isRefundable,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="bg-[#a855f7]/15 p-3 rounded-xl border border-[#a855f7]/20 flex items-center justify-between text-xs text-[#a855f7] font-bold">
        <span>Pre-Booking for Room {bedInfo.roomNumber} - Bed {bedInfo.bedNum}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Incoming Tenant Name"
          required
          placeholder="e.g. Rahul Sharma"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
        <div>
          <Input
            label="Mobile Phone (10 digits)"
            required
            type="text"
            maxLength={10}
            placeholder="e.g. 9876543210"
            value={guestPhone}
            onChange={handlePhoneChange}
          />
          <span className="text-[10px] dark:text-[#6b6e82] text-gray-400 mt-0.5 block">
            {guestPhone.length}/10 digits
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Email Address (Optional)"
          type="email"
          placeholder="rahul@example.com"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
        />
        <Input
          label="Expected Move-in Date"
          type="date"
          required
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Advance Amount Paid (₹)"
          type="number"
          required
          min="0"
          placeholder="e.g. 2000"
          value={advanceAmount}
          onChange={(e) => setAdvanceAmount(e.target.value)}
        />
        <SelectDropdown
          label="Payment Mode"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          options={[
            { value: 'upi', label: 'UPI' },
            { value: 'cash', label: 'Cash' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'online', label: 'Online' },
          ]}
        />
      </div>

      <Input
        label="Payment Reference / Txn ID (Optional)"
        placeholder="e.g. UPI/123456789"
        value={paymentRef}
        onChange={(e) => setPaymentRef(e.target.value)}
      />

      {/* Refundable Policy Radio Toggle */}
      <div>
        <label className="text-xs font-bold dark:text-[#f0f0f8] text-gray-900 block mb-2">
          Advance Refund Policy
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            onClick={() => setIsRefundable(true)}
            className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
              isRefundable
                ? 'border-[#51cf66] bg-[#51cf66]/10 text-[#51cf66]'
                : 'dark:border-[#2d3052] border-gray-200 dark:bg-[#1a1d2e] bg-gray-50 dark:text-[#a0a3b1] text-gray-600'
            }`}
          >
            <input type="radio" checked={isRefundable} onChange={() => setIsRefundable(true)} className="accent-[#51cf66]" />
            <div className="text-xs">
              <span className="font-bold block">Refundable</span>
              <span className="text-[10px] opacity-75">Returned if cancelled</span>
            </div>
          </label>

          <label
            onClick={() => setIsRefundable(false)}
            className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
              !isRefundable
                ? 'border-[#ff4d6d] bg-[#ff4d6d]/10 text-[#ff4d6d]'
                : 'dark:border-[#2d3052] border-gray-200 dark:bg-[#1a1d2e] bg-gray-50 dark:text-[#a0a3b1] text-gray-600'
            }`}
          >
            <input type="radio" checked={!isRefundable} onChange={() => setIsRefundable(false)} className="accent-[#ff4d6d]" />
            <div className="text-xs">
              <span className="font-bold block">Non-Refundable</span>
              <span className="text-[10px] opacity-75">Forfeited if cancelled</span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-3 border-t dark:border-[#2d3052] border-gray-200">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={loading} className="flex-[2] bg-[#a855f7] hover:bg-[#a855f7]/90 text-white">
          Confirm Pre-Booking
        </Button>
      </div>
    </form>
  );
}

// ── Reservation Details Form ───────────────────────────────────────────────────
function ReservationDetailsForm({ reservation, onCancelPreBooking, loading, onClose, onEditVacatingNotice }) {
  const [showCancel, setShowCancel] = useState(false);
  const [refundStatus, setRefundStatus] = useState(reservation?.isRefundable === false ? 'forfeited' : 'refunded');
  const [reason, setReason] = useState('');
  const [refundRef, setRefundRef] = useState('');

  if (!reservation) return null;

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    onCancelPreBooking({
      reason,
      refundStatus,
      refundReference: refundRef,
    });
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      {!showCancel ? (
        <>
          {/* Current Vacating Resident Info Banner (if bed was previously occupied) */}
          {reservation.currentTenant && (
            <div className="bg-[#ff4d6d]/10 p-3.5 rounded-xl border border-[#ff4d6d]/25 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#ff4d6d] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} /> Current Vacating Tenant
                </span>
                {reservation.vacatingDetails?.vacatingDate && (
                  <Badge variant="danger" className="text-[10px] px-2 py-0.5 font-extrabold flex items-center gap-1 border border-[#ff4d6d]/30">
                    <Clock size={11} /> Leaving {new Date(reservation.vacatingDetails.vacatingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
                <div className="text-sm font-bold dark:text-[#f0f0f8] text-gray-900">
                  {reservation.currentTenant.name || 'Tenant'}
                </div>
                {onEditVacatingNotice && (
                  <button
                    type="button"
                    onClick={onEditVacatingNotice}
                    className="text-[10px] font-black bg-gradient-to-r from-[#ff4d6d] to-[#ff758f] hover:from-[#ff335c] hover:to-[#ff5c7a] text-white px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all transform active:scale-95 duration-200"
                  >
                    <Edit2 size={11} /> Edit Date
                  </button>
                )}
              </div>
              <div className="text-xs dark:text-[#a0a3b1] text-gray-500 flex items-center gap-3">
                {reservation.currentTenant.mobNo1 && (
                  <span>Phone: <a href={`tel:${reservation.currentTenant.mobNo1}`} className="text-[#6c63ff] font-semibold">{reservation.currentTenant.mobNo1}</a></span>
                )}
                {reservation.vacatingDetails?.reason && (
                  <span>Reason: {reservation.vacatingDetails.reason}</span>
                )}
              </div>
            </div>
          )}

          {/* Reserved Incoming Guest Banner */}
          <div className="bg-[#a855f7]/15 p-4 rounded-xl border border-[#a855f7]/20 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs dark:text-[#a0a3b1] text-gray-600 uppercase font-bold flex items-center gap-1.5">
                <Lock size={13} className="text-[#a855f7]" /> Reserved Incoming Guest
              </span>
              <Badge variant={reservation.isRefundable === false ? 'danger' : 'purple'}>
                {reservation.isRefundable === false ? 'Non-Refundable' : 'Refundable Advance'}
              </Badge>
            </div>
            <div className="text-lg font-black dark:text-[#f0f0f8] text-gray-900">
              {reservation.guestDetails?.name || reservation.userId?.name || '—'}
            </div>
            <div className="text-xs dark:text-[#a0a3b1] text-gray-500 flex items-center gap-3">
              {reservation.guestDetails?.phone || reservation.userId?.mobNo1 ? (
                <span>Phone: <a href={`tel:${reservation.guestDetails?.phone || reservation.userId?.mobNo1}`} className="text-[#a855f7] font-bold">{reservation.guestDetails?.phone || reservation.userId?.mobNo1}</a></span>
              ) : null}
              {reservation.guestDetails?.email && <span>Email: {reservation.guestDetails.email}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 dark:bg-[#242740] bg-gray-50 rounded-xl border dark:border-[#2d3052] border-gray-200">
            <div>
              <span className="text-xs dark:text-[#6b6e82] text-gray-500">Advance Paid</span>
              <div className="text-base font-black text-[#00d4aa]">₹{Number(reservation.advanceAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span className="text-xs dark:text-[#6b6e82] text-gray-500">Expected Move-in</span>
              <div className="text-sm font-bold dark:text-[#f0f0f8] text-gray-900">
                {reservation.expectedMoveInDate ? new Date(reservation.expectedMoveInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </div>
            </div>
            <div>
              <span className="text-xs dark:text-[#6b6e82] text-gray-500">Payment Mode</span>
              <div className="text-sm font-semibold dark:text-[#f0f0f8] text-gray-900 uppercase">{reservation.paymentMode || 'cash'}</div>
            </div>
            <div>
              <span className="text-xs dark:text-[#6b6e82] text-gray-500">Payment Ref</span>
              <div className="text-xs font-mono dark:text-[#a0a3b1] text-gray-600 truncate">{reservation.paymentReference || '—'}</div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t dark:border-[#2d3052] border-gray-200">
            <Button variant="ghost" onClick={onClose} className="flex-1">Close</Button>
            <Button variant="danger" onClick={() => setShowCancel(true)} className="flex-1">
              Cancel Pre-Booking
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleCancelSubmit} className="flex flex-col gap-4">
          <div className="bg-[#ff4d6d]/10 p-3 rounded-xl border border-[#ff4d6d]/20 text-xs text-[#ff4d6d] font-bold">
            Cancel Pre-Booking for {reservation.guestDetails?.name || 'Tenant'}
          </div>

          <div>
            <label className="text-xs font-bold dark:text-[#f0f0f8] text-gray-900 block mb-2">
              Refund Resolution
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setRefundStatus('refunded')}
                className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  refundStatus === 'refunded'
                    ? 'border-[#51cf66] bg-[#51cf66]/10 text-[#51cf66]'
                    : 'dark:border-[#2d3052] border-gray-200 dark:bg-[#1a1d2e] bg-gray-50 dark:text-[#a0a3b1] text-gray-600'
                }`}
              >
                <input type="radio" checked={refundStatus === 'refunded'} onChange={() => setRefundStatus('refunded')} className="accent-[#51cf66]" />
                <div className="text-xs">
                  <span className="font-bold block">Refunded</span>
                  <span className="text-[10px] opacity-75">Returned advance</span>
                </div>
              </label>

              <label
                onClick={() => setRefundStatus('forfeited')}
                className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  refundStatus === 'forfeited'
                    ? 'border-[#ff4d6d] bg-[#ff4d6d]/10 text-[#ff4d6d]'
                    : 'dark:border-[#2d3052] border-gray-200 dark:bg-[#1a1d2e] bg-gray-50 dark:text-[#a0a3b1] text-gray-600'
                }`}
              >
                <input type="radio" checked={refundStatus === 'forfeited'} onChange={() => setRefundStatus('forfeited')} className="accent-[#ff4d6d]" />
                <div className="text-xs">
                  <span className="font-bold block">Forfeited</span>
                  <span className="text-[10px] opacity-75">Non-refundable income</span>
                </div>
              </label>
            </div>
          </div>

          {refundStatus === 'refunded' && (
            <Input
              label="Refund Transaction Reference"
              placeholder="e.g. REF-UPI-998877"
              value={refundRef}
              onChange={(e) => setRefundRef(e.target.value)}
            />
          )}

          <Input
            label="Cancellation Reason (Optional)"
            placeholder="e.g. Tenant changed mind, plans cancelled"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-3 border-t dark:border-[#2d3052] border-gray-200">
            <Button variant="ghost" type="button" onClick={() => setShowCancel(false)} className="flex-1">
              Back
            </Button>
            <Button type="submit" loading={loading} variant="danger" className="flex-[2]">
              Confirm Cancellation
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
