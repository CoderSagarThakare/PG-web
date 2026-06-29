import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getMyPGsApi, getPGByIdApi, createPGApi, updatePGApi, deletePGApi, getFacilitiesApi, getManagersApi } from '../../api/pg.api';
import { Building2, Plus, Edit2, Trash2, MapPin, Users, Bed } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, QueryError, ConfirmModal, StatCard } from '../../components/common';
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => { const r = await getMyPGsApi(); return r.data?.data; },
    retry: 1,
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
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">My PGs</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Manage all your PG properties</p>
        </div>
        <div className="flex gap-3 items-center">
          {isOwner && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add PG
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total PGs" value={pgs.length} color="primary" icon={<Building2 size={40} />} />
        <StatCard label="Total Rooms" value={pgs.reduce((s, p) => s + (p.totalRooms || 0), 0)} color="accent" icon={<Bed size={40} />} />
        <StatCard label="Occupied Beds" value={pgs.reduce((s, p) => s + (p.occupiedBeds || 0), 0)} color="warning" />
        <StatCard label="Empty Beds" value={pgs.reduce((s, p) => s + (p.emptyBeds || 0), 0)} color="success" />
      </div>

      {isLoading ? <Spinner center /> : isError ? (
        <QueryError onRetry={refetch} error={error} />
      ) : pgs.length === 0 ? (
        <EmptyState
          icon={<Building2 size={64} />}
          title="No PGs yet"
          description="Add your first PG property to get started."
          action={isOwner ? <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add PG</Button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pgs.map(pg => (
            <Card key={pg._id} hover onClick={() => navigate(`/pg/${pg._id}`)}>
              <div className="flex items-start justify-between mb-5">
                <div>
                   <div className="text-base font-bold dark:text-[#f0f0f8] text-gray-900">{pg.name} <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">({pg.pgDisplayId})</span></div>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-[#6b6e82]" />
                    <span className="text-xs dark:text-[#6b6e82] text-gray-500">{pg.address?.city}, {pg.address?.state}</span>
                  </div>
                </div>
                <Badge variant={pgTypeColors[pg.pgType] || 'default'}>{pgTypeLabels[pg.pgType] || pg.pgType}</Badge>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-black text-[#6c63ff]">{pg.totalRooms}</div>
                  <div className="text-xs dark:text-[#6b6e82] text-gray-500">Rooms</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-[#00d4aa]">{pg.emptyBeds || 0}</div>
                  <div className="text-xs dark:text-[#6b6e82] text-gray-500">Empty Beds</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-[#ffa94d]">{pg.occupiedBeds || 0}</div>
                  <div className="text-xs dark:text-[#6b6e82] text-gray-500">Occupied</div>
                </div>
              </div>

              {pg.managerId && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-[#242740] rounded-lg mb-3">
                  <span className="text-xs dark:text-[#6b6e82] text-gray-500">Manager: </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">{pg.managerId?.name || 'Assigned'}</span>
                </div>
              )}

              <div className="flex justify-between items-center" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-[#ffa94d]/12 text-[#ffa94d] px-2 py-1 rounded-lg text-xs font-bold">
                    ★ {pg.rating ? pg.rating.toFixed(1) : '0.0'} ({pg.numReviews ?? 0})
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative inline-flex group">
                    <Button variant="outline" size="sm" className="btn-icon" onClick={() => navigate(`/pg/${pg._id}/inventory`)}>
                      <Bed size={14} />
                    </Button>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1d2e] border border-[#2d3052] text-[#f0f0f8] text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10 pointer-events-none">Inventory Manager</span>
                  </div>
                  
                  <div className="relative inline-flex group">
                    <Button variant="ghost" size="sm" className="btn-icon" onClick={() => openEdit(pg)}>
                      <Edit2 size={14} />
                    </Button>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1d2e] border border-[#2d3052] text-[#f0f0f8] text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10 pointer-events-none">Edit Property</span>
                  </div>
                  
                  <div className="relative inline-flex group">
                    <Button variant="danger" size="sm" className="btn-icon" onClick={() => setConfirmId(pg._id)}>
                      <Trash2 size={14} />
                    </Button>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1d2e] border border-[#2d3052] text-[#f0f0f8] text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-10 pointer-events-none">Delete Property</span>
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
