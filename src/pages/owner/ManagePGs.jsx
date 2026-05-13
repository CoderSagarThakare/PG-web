import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyPGsApi, getPGByIdApi, createPGApi, updatePGApi, deletePGApi, getFacilitiesApi, getManagersApi } from '../../api/pg.api';
import { Building2, Plus, Edit2, Trash2, MapPin, Users, Bed } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, ConfirmModal, StatCard } from '../../components/common';
import PGForm from '../../components/owner/PGForm';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const defaultForm = {
  name: '', address: { landmark: '', city: '', state: '', country: 'India', pincode: '' },
  pgType: 'unisex', totalRooms: '', description: '', managerId: '',
  checkInTime: '', checkOutTime: '', facilities: []
};

export default function ManagePGs() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPG, setEditPG] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

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

  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => { const r = await getFacilitiesApi(); return r.data?.data; },
    enabled: modalOpen,
  });

  const pgs = data?.pgs || [];
  const managers = managersData?.managers || [];
  const facilitiesList = facilitiesData?.facilities || [];

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

  const closeModal = () => { setModalOpen(false); setEditPG(null); };

  const openEdit = (pg) => {
    setEditPG(pg);
    setModalOpen(true);
  };



  const onSubmit = (formData) => {
    if (editPG) updateMutation.mutate({ id: editPG._id, data: formData });
    else createMutation.mutate(formData);
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
            <Card key={pg._id} hover onClick={() => navigate(`/pg/${pg._id}`)}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--warning-light)', color: 'var(--warning)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700 }}>
                    ★ {pg.rating || 0}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="tooltip-wrapper">
                    <Button variant="outline" size="sm" className="btn-icon" onClick={() => navigate(`/pg/${pg._id}/inventory`)}>
                      <Bed size={14} />
                    </Button>
                    <span className="tooltip-content">Inventory Manager</span>
                  </div>
                  
                  <div className="tooltip-wrapper">
                    <Button variant="ghost" size="sm" className="btn-icon" onClick={() => openEdit(pg)}>
                      <Edit2 size={14} />
                    </Button>
                    <span className="tooltip-content">Edit Property</span>
                  </div>
                  
                  <div className="tooltip-wrapper">
                    <Button variant="danger" size="sm" className="btn-icon" onClick={() => setConfirmId(pg._id)}>
                      <Trash2 size={14} />
                    </Button>
                    <span className="tooltip-content">Delete Property</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editPG ? 'Edit PG' : 'Add New PG'} size="lg">
        <PGForm
          initialData={editPG}
          onSubmit={onSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
          managers={managers}
          facilitiesList={facilitiesList}
          buttonText={editPG ? 'Update PG' : 'Create PG'}
          onCancel={closeModal}
        />
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
