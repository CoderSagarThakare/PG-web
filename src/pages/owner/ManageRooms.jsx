import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomsApi, createRoomApi, updateRoomApi, deleteRoomApi, assignTenantApi, unassignTenantApi, updateBedApi, getEligibleTenantsApi } from '../../api/room.api';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input } from '../../components/common';
import { Building2, Plus, Bed, Users, Trash2, Edit2, ArrowLeft, Search, UserPlus, LogOut } from 'lucide-react';
import { getErrorMessage, formatPrice } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm, useFieldArray } from 'react-hook-form';

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

  const createRoomMut = useMutation({
    mutationFn: createRoomApi,
    onSuccess: () => {
      toast.success('Room created!');
      qc.invalidateQueries(['rooms', pgId]);
      setModalOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateRoomMut = useMutation({
    mutationFn: ({ id, data }) => updateRoomApi(id, data),
    onSuccess: () => {
      toast.success('Room updated!');
      qc.invalidateQueries(['rooms', pgId]);
      setEditRoom(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteRoomMut = useMutation({
    mutationFn: deleteRoomApi,
    onSuccess: () => {
      toast.success('Room deleted!');
      qc.invalidateQueries(['rooms', pgId]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const assignMut = useMutation({
    mutationFn: ({ bedId, userId }) => assignTenantApi(bedId, userId),
    onSuccess: () => {
      toast.success('Tenant assigned!');
      qc.invalidateQueries(['rooms', pgId]);
      setAssignModal(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const unassignMut = useMutation({
    mutationFn: unassignTenantApi,
    onSuccess: () => {
      toast.success('Bed vacated!');
      qc.invalidateQueries(['rooms', pgId]);
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
    <div className="fade-in" style={{ 
      background: 'radial-gradient(circle at top right, rgba(108, 99, 255, 0.03), transparent 600px)',
      minHeight: '100%',
      margin: '-24px',
      padding: '24px'
    }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="ghost" className="btn-icon" onClick={() => navigate(`/pg/${pgId}`)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="page-title">Manage Rooms & Inventory</h1>
            <p className="page-subtitle">Track occupancy and assign beds</p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState 
          icon={<Building2 size={64} />} 
          title="No rooms added yet" 
          description="Start by adding rooms and configuring sharing types."
          action={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add First Room</Button>}
        />
      ) : (
        <div className="grid-3" style={{ gap: 12 }}>
          {rooms.map(room => (
            <Card key={room._id} className="room-card hover-container" style={{ padding: '12px' }}>
              <div className="hover-actions" style={{ top: 8, right: 8 }}>
                <Button variant="ghost" size="sm" className="btn-icon" onClick={() => setEditRoom(room)} style={{ background: 'var(--bg-surface)', padding: 4 }}>
                  <Edit2 size={12} className="text-primary" />
                </Button>
                <Button variant="ghost" size="sm" className="btn-icon" onClick={() => handleDeleteRoom(room._id)} style={{ background: 'var(--bg-surface)', padding: 4 }}>
                  <Trash2 size={12} className="text-danger" />
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Room {room.roomNumber}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>F{room.floor} · {room.roomType}</span>
                </div>
                <Badge variant="accent" style={{ fontSize: 10, padding: '2px 6px' }}>{room.sharingType} Beds</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {room.beds?.map(bed => (
                  <div key={bed._id} style={{ 
                    padding: '6px 8px', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-light)',
                    background: bed.status === 'occupied' ? 'var(--bg-elevated)' : 'transparent',
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr 80px',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 12
                  }}>
                    <div style={{ color: bed.status === 'occupied' ? 'var(--warning)' : 'var(--success)', display: 'flex' }}>
                      <Bed size={14} />
                    </div>
                    
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>Bed {bed.bedNumber.split('-')[1]}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({bed.position || 'No Pos'})</span>
                      </div>
                      {bed.status === 'occupied' ? (
                        <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {bed.userId?.name || 'Assigned'} {bed.userId?.mobNo1 && `· ${bed.userId.mobNo1}`}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: 'var(--success)' }}>Available</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {bed.status === 'occupied' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-danger" 
                          onClick={() => unassignMut.mutate(bed._id)}
                          loading={unassignMut.isPending && unassignMut.variables === bed._id}
                          style={{ padding: '2px 4px', height: 'auto', fontSize: 10 }}
                        >
                          Vacate
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setAssignModal({ bedId: bed._id, roomNumber: room.roomNumber, bedNum: bed.bedNumber.split('-')[1] })}
                          style={{ padding: '2px 6px', height: 'auto', fontSize: 10, borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Room" size="lg">
        <RoomForm onSubmit={(data) => createRoomMut.mutate({ ...data, pgId })} loading={createRoomMut.isPending} />
      </Modal>

      {/* Edit Room Modal */}
      <Modal isOpen={!!editRoom} onClose={() => setEditRoom(null)} title="Edit Room Details" size="lg">
        {editRoom && (
          <RoomForm 
            initialData={editRoom} 
            onSubmit={(data) => updateRoomMut.mutate({ id: editRoom._id, data })} 
            loading={updateRoomMut.isPending} 
            isEdit 
          />
        )}
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal isOpen={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Tenant">
        <AssignForm 
          bedInfo={assignModal} 
          pgId={pgId}
          onSubmit={(userId) => assignMut.mutate({ bedId: assignModal.bedId, userId })} 
          loading={assignMut.isPending} 
        />
      </Modal>
    </div>
  );
}

function RoomForm({ onSubmit, loading, initialData, isEdit }) {
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
      <div className="form-grid">
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
        <Input 
          label="Room Type" as="select" 
          {...register('roomType')} 
          options={[{ value: 'AC', label: 'AC' }, { value: 'Non-AC', label: 'Non-AC' }]} 
        />
        
        <div className="full" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Bed Configurations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12, alignItems: 'end' }}>
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
      <div className="modal-footer" style={{ marginTop: 24 }}>
        <Button type="submit" loading={loading} style={{ width: '100%' }}>
          {isEdit ? 'Update Room' : 'Create Room & Beds'}
        </Button>
      </div>
    </form>
  );
}

function AssignForm({ bedInfo, onSubmit, loading, pgId }) {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['eligible-tenants', pgId],
    queryFn: async () => (await getEligibleTenantsApi(pgId)).data?.data,
  });

  const [selectedUser, setSelectedUser] = useState(null);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--primary-light)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--primary)', fontSize: 13 }}>
        Assigning tenant to <strong>Room {bedInfo?.roomNumber} - Bed {bedInfo?.bedNum}</strong>
      </div>
      
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Select Tenant (with "Deal Done" status)</h4>
        
        {isLoading ? <Spinner /> : tenants.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>No eligible tenants found.<br/><small>Users must have an enquiry with "Deal Done" status.</small></p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
            {tenants.map(user => (
              <div 
                key={user._id} 
                onClick={() => setSelectedUser(user._id)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-sm)', 
                  border: `1px solid ${selectedUser === user._id ? 'var(--primary)' : 'var(--border-primary)'}`,
                  background: selectedUser === user._id ? 'var(--primary-light)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.mobNo1} · {user.email}</div>
                </div>
                {selectedUser === user._id && <Badge variant="primary">Selected</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
        <Button onClick={() => onSubmit(selectedUser)} loading={loading} disabled={!selectedUser} style={{ width: '100%' }}>
          Confirm Assignment
        </Button>
      </div>
    </div>
  );
}
