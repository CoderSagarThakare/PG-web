import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPGByIdApi, updatePGApi, getManagersApi, getFacilitiesApi } from '../../api/pg.api';
import { Spinner, Card, Badge, EmptyState, Button, StatCard, Modal } from '../../components/common';
import PGForm from '../../components/owner/PGForm';
import { Building2, MapPin, ArrowLeft, Bed, Users, FileText, CheckCircle, Clock, Edit2 } from 'lucide-react';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const defaultForm = {
  name: '', address: { landmark: '', city: '', state: '', country: 'India', pincode: '' },
  pgType: 'unisex', totalRooms: '', description: '', managerId: '',
  checkInTime: '', checkOutTime: '', facilities: []
};

export default function PGDetails() {
  const { pgId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['pg', pgId],
    queryFn: async () => {
      const res = await getPGByIdApi(pgId);
      return res.data?.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePGApi(id, data),
    onSuccess: () => { 
      toast.success('PG updated!'); 
      qc.invalidateQueries(['pg', pgId]);
      qc.invalidateQueries(['my-pgs']);
      setModalOpen(false); 
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => { const r = await getManagersApi(); return r.data?.data; },
    enabled: modalOpen,
  });

  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => { const r = await getFacilitiesApi(); return r.data?.data; },
    enabled: modalOpen,
  });

  const pg = response?.pg;
  const managers = managersData?.managers || [];
  const facilitiesList = facilitiesData?.facilities || [];

  if (isLoading) return <Spinner center />;
  if (isError) {
    toast.error(getErrorMessage(error));
    return <EmptyState icon={<Building2 size={48} />} title="PG Not Found" description="Could not load the details." action={<Button onClick={() => navigate('/pg')}>Back to PGs</Button>} />;
  }
  if (!pg) return <EmptyState icon={<Building2 size={48} />} title="PG Not Found" action={<Button onClick={() => navigate('/pg')}>Back to PGs</Button>} />;

  const pgTypeLabels = { male: 'Male', female: 'Female', unisex: 'Unisex', coLiving: 'Co-Living' };
  const pgTypeColors = { male: 'info', female: 'purple', unisex: 'accent', coLiving: 'warning' };

  const onSubmit = (formData) => {
    const payload = { ...formData, totalRooms: Number(formData.totalRooms) };
    updateMutation.mutate({ id: pgId, data: payload });
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button variant="ghost" className="btn-icon" onClick={() => navigate('/pg')}>
          <ArrowLeft size={20} />
        </Button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title">{pg.name}</h1>
            <Badge variant={pgTypeColors[pg.pgType] || 'default'}>{pgTypeLabels[pg.pgType] || pg.pgType}</Badge>
          </div>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <MapPin size={14} /> {pg.address?.city}, {pg.address?.state} - {pg.address?.pincode}
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 12 }}>
          <Button 
            variant="primary" 
            onClick={() => navigate(`/pg/${pgId}/inventory`)}
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--purple))', border: 'none', boxShadow: 'var(--shadow-md)' }}
          >
            <Building2 size={16} /> Manage Inventory
          </Button>
          <Button variant="accent" onClick={() => setModalOpen(true)}>
            <Edit2 size={16} /> Edit PG
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Rooms" value={pg.totalRooms} color="primary" icon={<Bed size={24} />} />
        <StatCard label="Occupied Beds" value={pg.occupiedBeds || 0} color="warning" icon={<Users size={24} />} />
        <StatCard label="Empty Beds" value={pg.emptyBeds || 0} color="success" icon={<CheckCircle size={24} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} className="text-primary" /> About PG
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {pg.description || 'No description provided.'}
            </p>
          </Card>

          <Card>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} className="text-primary" /> Facilities
            </h2>
            {pg.facilities?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pg.facilities.map(f => (
                  <Badge key={f._id || f} variant="outline" style={{ padding: '6px 12px' }}>{f.name || f}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted">No facilities listed.</p>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Operational Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Check In</span>
                <span className="font-semibold">{pg.checkInTime || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Check Out</span>
                <span className="font-semibold">{pg.checkOutTime || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Rating</span>
                <span className="font-semibold">⭐ {pg.rating || 'N/A'}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Owner</span>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{pg.ownerId?.name || 'Unknown'}</div>
                <div className="text-sm text-muted">{pg.ownerId?.mobNo1}</div>
              </div>
              {pg.managerId && (
                <>
                  <div style={{ height: 1, background: 'var(--border-light)' }} />
                  <div>
                    <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Manager</span>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{pg.managerId?.name}</div>
                    <div className="text-sm text-muted">{pg.managerId?.mobNo1}</div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit PG Details" size="lg">
        <PGForm
          initialData={pg}
          onSubmit={onSubmit}
          loading={updateMutation.isPending}
          managers={managers}
          facilitiesList={facilitiesList}
          buttonText="Save Changes"
        />
      </Modal>
    </div>
  );
}
