import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomsApi, createRoomApi, updateRoomApi, deleteRoomApi, assignTenantApi, unassignTenantApi, updateBedApi, getEligibleTenantsApi } from '../../api/room.api';
import { getPGByIdApi } from '../../api/pg.api';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, SelectDropdown } from '../../components/common';
import { Building2, Plus, Bed, Users, Trash2, Edit2, ArrowLeft, Search, UserPlus, LogOut } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('all'); // all, occupied, available
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
      bed.userId?.vehicleNumber?.toLowerCase().includes(searchLower)
    );

    if (searchTerm && !roomMatch && !bedMatch) return false;

    // Status Filter (Occupancy)
    if (statusFilter === 'occupied') {
      return room.beds?.some(bed => bed.status === 'occupied');
    }
    if (statusFilter === 'available') {
      return room.beds?.some(bed => bed.status === 'available');
    }

    return true;
  }).sort((a, b) => {
    // Natural sort for room numbers (e.g., 101, 102, 201)
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
                { value: 'available', label: 'Has Vacancy' }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  <span className="text-[11px] dark:text-[#6b6e82] text-gray-400 ml-2">F{room.floor} · {room.roomType}</span>
                </div>
                <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">{room.sharingType} Beds</Badge>
              </div>

              {/* Bed List */}
              <div className="flex flex-col gap-1">
                {room.beds?.map(bed => (
                  <div
                    key={bed._id}
                    className={[
                      'px-2 py-1.5 rounded-lg border border-[#2d3052]/30 dark:border-[#2d3052]/30 grid grid-cols-[30px_1fr_80px] items-center gap-2 text-xs',
                      bed.status === 'occupied' ? 'dark:bg-[#242740] bg-gray-100' : 'bg-transparent',
                    ].join(' ')}
                  >
                    {/* Bed Icon */}
                    <div className={bed.status === 'occupied' ? 'text-[#ffa94d] flex' : 'text-[#51cf66] flex'}>
                      <Bed size={14} />
                    </div>

                    {/* Tenant Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold dark:text-[#f0f0f8] text-gray-900">
                          Bed {bed.bedNumber.includes('-') ? bed.bedNumber.split('-')[1] : bed.bedNumber}
                        </span>
                        <span className="text-[10px] dark:text-[#6b6e82] text-gray-400">
                          ({bed.position || 'No Pos'} · {formatPrice(bed.price)})
                        </span>
                      </div>
                      {bed.status === 'occupied' ? (
                        <div className="text-[11px] text-[#6c63ff] font-semibold truncate flex items-center gap-1.5 flex-wrap">
                          <span>{bed.userId?.name || 'Assigned'} {bed.userId?.mobNo1 && `· ${bed.userId.mobNo1}`}</span>
                          {bed.userId?.vehicleType && bed.userId.vehicleType !== 'none' && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-gray-100 dark:bg-[#1a1d2e] text-gray-600 dark:text-[#a0a3b1] rounded text-[9px] font-bold border border-gray-200 dark:border-[#2d3052]">
                              {bed.userId.vehicleType === 'bike' ? '🏍️' : '🚗'} {bed.userId.vehicleNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#51cf66]">Available</div>
                      )}
                    </div>

                    {/* Bed Action Buttons */}
                    <div className="text-right">
                      {bed.status === 'occupied' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#ff4d6d] text-[10px] px-1 py-0.5 h-auto"
                          onClick={() => unassignMut.mutate(bed._id)}
                          loading={unassignMut.isPending && unassignMut.variables === bed._id}
                        >
                          Vacate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] px-1.5 py-0.5 h-auto"
                          onClick={() => setAssignModal({ bedId: bed._id, roomNumber: room.roomNumber, bedNum: bed.bedNumber.split('-')[1] })}
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}

function RoomForm({ onSubmit, loading, initialData, isEdit, onCancel }) {
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      roomNumber: '',
      floor: '',
      sharingType: 2,
      roomType: 'Non-AC',
      beds: [
        { bedNumber: 'A', price: '', position: 'Window Side' },
        { bedNumber: 'B', price: '', position: 'Entrance Side' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "beds"
  });

  const sharingType = watch('sharingType');

  // Adjust beds array when occupancy changes
  const handleSharingChange = (e) => {
    const val = parseInt(e.target.value);
    const currentCount = fields.length;
    if (val > currentCount) {
      for (let i = currentCount; i < val; i++) {
        append({ bedNumber: String.fromCharCode(65 + i), price: '', position: '' });
      }
    } else if (val < currentCount) {
      for (let i = currentCount - 1; i >= val; i--) {
        remove(i);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="max-h-[380px] overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Room Number" required
          {...register('roomNumber', { required: 'Room number is required' })}
          error={errors.roomNumber?.message}
          placeholder="e.g. 101"
        />
        <Input
          label="Floor" type="number" required min={0}
          {...register('floor', { required: 'Floor is required', min: { value: 0, message: 'Cannot be negative' } })}
          error={errors.floor?.message}
        />
        <Input
          label="Occupancy (Beds)" type="number" required min={1}
          {...register('sharingType', { required: 'Occupancy is required', min: { value: 1, message: 'Minimum 1' } })}
          onChange={handleSharingChange}
          error={errors.sharingType?.message}
        />
        <Controller
          name="roomType"
          control={control}
          render={({ field }) => (
            <Input
              label="Room Type"
              as="select"
              value={field.value}
              onChange={field.onChange}
              ref={field.ref}
              options={[{ value: 'AC', label: 'AC' }, { value: 'Non-AC', label: 'Non-AC' }]}
            />
          )}
        />

        {/* Bed Configurations — full-width across both columns */}
        <div className="col-span-1 sm:col-span-2 mt-2">
          <h3 className="text-[14px] font-bold mb-3 pb-2 border-b dark:border-[#2d3052] border-gray-200 dark:text-[#f0f0f8] text-gray-900">
            Bed Configurations
          </h3>
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[80px_1fr_1fr] items-end gap-3">
                <Input label={`Bed ${field.bedNumber}`} disabled value={field.bedNumber} />
                <Input
                  label="Price" type="number" required min={0}
                  {...register(`beds.${index}.price`, { required: 'Price is required', min: { value: 0, message: 'Cannot be negative' } })}
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

      {/* Modal Footer */}
      <div className="flex gap-3 justify-end mt-6 pt-5 border-t dark:border-[#2d3052] border-gray-200 flex-col-reverse sm:flex-row">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" loading={loading} className="flex-[2]">
          {isEdit ? 'Update Room' : 'Create Room & Beds'}
        </Button>
      </div>
    </form>
  );
}

function AssignForm({ bedInfo, onSubmit, loading, pgId, pgName }) {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['eligible-tenants', pgId],
    queryFn: async () => (await getEligibleTenantsApi(pgId)).data?.data,
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [joiningDate, setJoiningDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Bed Info Banner */}
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

      {/* Tenant Selector */}
      <div>
        <h4 className="text-[13px] font-bold mb-2.5 dark:text-[#f0f0f8] text-gray-900">
          Select Tenant (with "Deal Done" status)
        </h4>

        {isLoading ? (
          <Spinner />
        ) : tenants.length === 0 ? (
          <div className="text-center py-4 dark:text-[#6b6e82] text-gray-500">
            <Users size={32} className="opacity-30 mb-2 mx-auto" />
            <p>No eligible tenants found.<br /><small>Users must have an enquiry with "Deal Done" status.</small></p>
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

      {/* Joining Date */}
      <div>
        <Input
          label="Check-in / Joining Date"
          type="date"
          required
          value={joiningDate}
          onChange={e => setJoiningDate(e.target.value)}
        />
      </div>

      {/* Modal Footer */}
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
