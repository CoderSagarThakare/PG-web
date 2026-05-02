import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyPGsApi, createPGApi, updatePGApi, deletePGApi, getFacilitiesApi, getManagersApi } from '../../api/pg.api';
import { Building2, Plus, Edit2, Trash2, MapPin, Users, Bed } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Spinner, EmptyState, ConfirmModal, StatCard } from '../../components/common';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const defaultForm = {
  name: '', address: { landmark: '', city: '', state: '', country: 'India', pincode: '' },
  pgType: 'unisex', totalRooms: '', description: '', managerId: '',
  checkInTime: '', checkOutTime: '',
};

export default function ManagePGs() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPG, setEditPG] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const { data, isLoading } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => { const r = await getMyPGsApi(); return r.data?.data; },
  });

  // Only fetch managers if the user is an owner and the modal is open
  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => { const r = await getManagersApi(); return r.data?.data; },
    enabled: isOwner && modalOpen,
  });

  const pgs = data?.pgs || [];
  const managers = managersData?.managers || [];

  const createMutation = useMutation({
    mutationFn: createPGApi,
    onSuccess: () => { toast.success('PG created!'); qc.invalidateQueries(['my-pgs']); closeModal(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePGApi(id, data),
    onSuccess: () => { toast.success('PG updated!'); qc.invalidateQueries(['my-pgs']); closeModal(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePGApi,
    onSuccess: () => { toast.success('PG deleted!'); qc.invalidateQueries(['my-pgs']); setConfirmId(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const closeModal = () => { setModalOpen(false); setEditPG(null); setForm(defaultForm); };

  const openEdit = (pg) => {
    setEditPG(pg);
    setForm({
      name: pg.name || '',
      address: { ...defaultForm.address, ...pg.address },
      pgType: pg.pgType || 'unisex',
      totalRooms: pg.totalRooms || '',
      description: pg.description || '',
      managerId: pg.managerId?._id || pg.managerId || '',
      checkInTime: pg.checkInTime || '',
      checkOutTime: pg.checkOutTime || '',
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Validate pincode to max 6 digits
    if (name === 'address.pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(f => ({ ...f, address: { ...f.address, [key]: value } }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, totalRooms: Number(form.totalRooms) };
    if (editPG) updateMutation.mutate({ id: editPG._id, data: payload });
    else createMutation.mutate(payload);
  };

  const pgTypeLabels = { male: 'Male', female: 'Female', unisex: 'Unisex', coLiving: 'Co-Living' };
  const pgTypeColors = { male: 'info', female: 'purple', unisex: 'accent', coLiving: 'warning' };

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My PGs</h1>
          <p className="page-subtitle">Manage all your PG properties</p>
        </div>
        <div className="page-actions">
          {isOwner && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add PG
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total PGs" value={pgs.length} color="primary" icon={<Building2 size={40} />} />
        <StatCard label="Total Rooms" value={pgs.reduce((s, p) => s + (p.totalRooms || 0), 0)} color="accent" icon={<Bed size={40} />} />
        <StatCard label="Occupied Beds" value={pgs.reduce((s, p) => s + (p.occupiedBeds || 0), 0)} color="warning" />
        <StatCard label="Empty Beds" value={pgs.reduce((s, p) => s + (p.emptyBeds || 0), 0)} color="success" />
      </div>

      {pgs.length === 0 ? (
        <EmptyState
          icon={<Building2 size={64} />}
          title="No PGs yet"
          description="Add your first PG property to get started."
          action={isOwner ? <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add PG</Button> : null}
        />
      ) : (
        <div className="grid-3">
          {pgs.map(pg => (
            <Card key={pg._id} hover>
              <div className="card-header">
                <div>
                  <div className="card-title">{pg.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs text-muted">{pg.address?.city}, {pg.address?.state}</span>
                  </div>
                </div>
                <Badge variant={pgTypeColors[pg.pgType] || 'default'}>{pgTypeLabels[pg.pgType] || pg.pgType}</Badge>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{pg.totalRooms}</div>
                  <div className="text-xs text-muted">Rooms</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{pg.emptyBeds || 0}</div>
                  <div className="text-xs text-muted">Empty Beds</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)' }}>{pg.occupiedBeds || 0}</div>
                  <div className="text-xs text-muted">Occupied</div>
                </div>
              </div>

              {pg.managerId && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                  <span className="text-xs text-muted">Manager: </span>
                  <span className="text-sm font-semibold">{pg.managerId?.name || 'Assigned'}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(pg)}>
                  <Edit2 size={14} /> Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmId(pg._id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editPG ? 'Edit PG' : 'Add New PG'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="full">
              <Input label="PG Name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <Input label="Landmark" name="address.landmark" value={form.address.landmark} onChange={handleChange} required />
            <Input label="City" name="address.city" value={form.address.city} onChange={handleChange} required />
            <Input label="State" name="address.state" value={form.address.state} onChange={handleChange} required />
            <Input label="Country" name="address.country" value={form.address.country} onChange={handleChange} />
            <Input label="Pincode" name="address.pincode" type="tel" value={form.address.pincode} onChange={handleChange} minLength={6} maxLength={6} />
            <Input
              label="PG Type" name="pgType" as="select" value={form.pgType} onChange={handleChange}
              options={[
                { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
                { value: 'unisex', label: 'Unisex' }, { value: 'coLiving', label: 'Co-Living' },
              ]}
            />
            <Input label="Total Rooms" name="totalRooms" type="number" value={form.totalRooms} onChange={handleChange} required />
            <Input label="Check-In Time" name="checkInTime" type="time" value={form.checkInTime} onChange={handleChange} />
            <Input label="Check-Out Time" name="checkOutTime" type="time" value={form.checkOutTime} onChange={handleChange} />
            {managers.length > 0 && (
              <Input
                label="Assign Manager" name="managerId" as="select"
                value={form.managerId} onChange={handleChange}
                options={[
                  { value: '', label: '— No Manager —' },
                  ...managers.map(m => ({ 
                    value: m._id, 
                    label: m.role === 'owner' ? `${m.name} (Me)` : m.name 
                  })),
                ]}
              />
            )}
            <div className="full">
              <Input label="Description" name="description" as="textarea" value={form.description} onChange={handleChange} />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="ghost" onClick={closeModal} type="button">Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editPG ? 'Update PG' : 'Create PG'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteMutation.mutate(confirmId)}
        loading={deleteMutation.isPending}
        title="Delete PG"
        message="Are you sure you want to delete this PG? This action cannot be undone."
      />
    </div>
  );
}
