import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPGByIdApi, updatePGApi, getManagersApi, getFacilitiesApi } from '../../api/pg.api';
import { Spinner, Card, Badge, EmptyState, Button, StatCard, Modal } from '../../components/common';
import PGForm from '../../components/owner/PGForm';
import { Building2, MapPin, ArrowLeft, Bed, Users, FileText, CheckCircle, Clock, Edit2, Image as ImageIcon } from 'lucide-react';
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
    <div className="fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <Button variant="ghost" className="btn-icon" onClick={() => navigate('/pg')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">{pg.name}</h1>
            <Badge variant={pgTypeColors[pg.pgType] || 'default'}>{pgTypeLabels[pg.pgType] || pg.pgType}</Badge>
          </div>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <MapPin size={14} /> {pg.address?.landmark && `${pg.address.landmark}, `}{pg.address?.city}, {pg.address?.state} - {pg.address?.pincode}
            {pg.address?.locationDescription && ` (${pg.address.locationDescription})`}
            {pg.locationLink && (
              <a 
                href={pg.locationLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#6c63ff] font-semibold inline-flex items-center gap-1 ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                🗺️ View Map
              </a>
            )}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Button 
            variant="primary" 
            onClick={() => navigate(`/pg/${pgId}/inventory`)}
            className="bg-gradient-to-br from-[#6c63ff] to-[#a855f7] border-0 shadow-md"
          >
            <Building2 size={16} /> Manage Inventory
          </Button>
          <Button variant="accent" onClick={() => setModalOpen(true)}>
            <Edit2 size={16} /> Edit PG
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Rooms" value={pg.totalRooms || 0} color="primary" icon={<Bed size={24} />} />
        <StatCard label="Occupied Beds" value={pg.occupiedBeds || 0} color="warning" icon={<Users size={24} />} />
        <StatCard label="Empty Beds" value={pg.emptyBeds || 0} color="success" icon={<CheckCircle size={24} />} />
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {pg.images && pg.images.length > 0 && (
            <Card>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-[#f0f0f8] text-gray-900">
                <ImageIcon size={18} className="text-[#6c63ff]" /> Property Gallery
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pg.images.map((img, idx) => (
                  <a 
                    key={idx} 
                    href={img} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2d3052] block hover:border-[#6c63ff] hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                  >
                    <img src={img} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-[#f0f0f8] text-gray-900">
              <FileText size={18} className="text-[#6c63ff]" /> About PG
            </h2>
            <p className="dark:text-[#a0a3b1] text-gray-600 leading-relaxed whitespace-pre-wrap">
              {pg.description || 'No description provided.'}
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-[#f0f0f8] text-gray-900">
              <Building2 size={18} className="text-[#6c63ff]" /> Facilities
            </h2>
            {pg.facilities?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pg.facilities.map(f => (
                  <Badge key={f._id || f} variant="outline" className="px-3 py-1.5">{f.name || f}</Badge>
                ))}
              </div>
            ) : (
              <p className="dark:text-[#6b6e82] text-gray-500">No facilities listed.</p>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="text-base font-bold mb-4 dark:text-[#f0f0f8] text-gray-900">Operational Details</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b dark:border-[#2d3052]/40 border-gray-200 pb-2">
                <span className="dark:text-[#6b6e82] text-gray-500 flex items-center gap-1.5 text-sm"><Clock size={14} /> Check In</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{pg.checkInTime || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-[#2d3052]/40 border-gray-200 pb-2">
                <span className="dark:text-[#6b6e82] text-gray-500 flex items-center gap-1.5 text-sm"><Clock size={14} /> Check Out</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{pg.checkOutTime || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-[#2d3052]/40 border-gray-200 pb-2">
                <span className="dark:text-[#6b6e82] text-gray-500 text-sm">Rent Due Day</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{pg.dueDayOfMonth ? `Day ${pg.dueDayOfMonth}` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-[#2d3052]/40 border-gray-200 pb-2">
                <span className="dark:text-[#6b6e82] text-gray-500 text-sm">Late Penalty</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{pg.lateFee ? `₹${pg.lateFee}` : '₹0'}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-[#2d3052]/40 border-gray-200 pb-2">
                <span className="dark:text-[#6b6e82] text-gray-500 text-sm">Contact No</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{pg.landline || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-[#2d3052]/40 border-gray-200 pb-2">
                <span className="dark:text-[#6b6e82] text-gray-500 text-sm">Started Date</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">{pg.pgStartedDate ? new Date(pg.pgStartedDate).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="dark:text-[#6b6e82] text-gray-500 text-sm">Rating</span>
                <span className="font-semibold dark:text-[#f0f0f8] text-gray-900">⭐ {pg.rating ?? 0}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-bold mb-4 dark:text-[#f0f0f8] text-gray-900">Management</h3>
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs dark:text-[#6b6e82] text-gray-500 uppercase tracking-wide font-bold">Owner</span>
                <div className="text-[15px] font-semibold mt-1 dark:text-[#f0f0f8] text-gray-900">{pg.ownerId?.name || 'Unknown'}</div>
                <div className="text-sm dark:text-[#6b6e82] text-gray-500">{pg.ownerId?.mobNo1}</div>
              </div>
              {pg.managerId && (
                <>
                  <div className="h-px dark:bg-[#2d3052] bg-gray-200" />
                  <div>
                    <span className="text-xs dark:text-[#6b6e82] text-gray-500 uppercase tracking-wide font-bold">Manager</span>
                    <div className="text-[15px] font-semibold mt-1 dark:text-[#f0f0f8] text-gray-900">{pg.managerId?.name}</div>
                    <div className="text-sm dark:text-[#6b6e82] text-gray-500">{pg.managerId?.mobNo1}</div>
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
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
