import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { discoverPGsApi, getFacilitiesApi, getPGByIdApi } from '../../api/pg.api';
import { Search, MapPin, Building2, Star, Users, Filter, ChevronRight, Info } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, Pagination, SelectDropdown } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

export default function BrowsePGs() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const STORAGE_KEY = `staysync_pgs_filters_${user?._id || 'guest'}`;

  const getInitialFilters = () => {
    const defaults = {
      city: '', 
      pgType: '', 
      facilities: [],
      minRating: '',
      onlyWithVacancy: false
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to parse stored PG filters", e);
    }
    return defaults;
  };

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [filters, setFilters] = useState(getInitialFilters);
  const [activeFilters, setActiveFilters] = useState(getInitialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPGId, setSelectedPGId] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveFilters(filters);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, STORAGE_KEY]);

  const hasActiveFilters = () => {
    return (
      filters.city !== '' ||
      filters.pgType !== '' ||
      filters.facilities?.length > 0 ||
      filters.minRating !== '' ||
      filters.onlyWithVacancy === true
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.city) count++;
    if (filters.pgType) count++;
    if (filters.facilities && filters.facilities.length > 0) count += filters.facilities.length;
    if (filters.minRating) count++;
    if (filters.onlyWithVacancy) count++;
    return count;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['discover-pgs', activeFilters, page, limit],
    queryFn: async () => (await discoverPGsApi({ ...activeFilters, page, limit })).data?.data,
  });

  const { data: facilitiesList } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => (await getFacilitiesApi()).data?.data?.facilities || [],
  });

  const { data: pgDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['pg-detail', selectedPGId],
    queryFn: async () => (await getPGByIdApi(selectedPGId)).data?.data?.pg,
    enabled: !!selectedPGId,
  });

  const pgs = data?.pgs || [];

  const handleFacilityToggle = (id) => {
    setFilters(prev => {
      const current = prev.facilities || [];
      const updated = current.includes(id) ? current.filter(f => f !== id) : [...current, id];
      return { ...prev, facilities: updated };
    });
  };

  const handleClearFilters = () => {
    setFilters({ city: '', pgType: '', facilities: [], minRating: '', onlyWithVacancy: false });
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">Explore Properties</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Find the best PG buildings in your favorite cities</p>
        </div>
        {hasActiveFilters() && (
          <Button 
            variant="danger" 
            size="sm" 
            className="rounded-full font-bold px-4 h-9" 
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex items-center bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-full px-2 py-1 gap-2.5 mb-6 flex-wrap">
        <div className="flex items-center flex-1 pl-3">
          <Search size={16} className="dark:text-[#6b6e82] text-gray-400 shrink-0" />
          <input
            className="bg-transparent border-none outline-none ml-2 text-[13px] dark:text-[#f0f0f8] text-gray-900 placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] w-full"
            placeholder="Search city or property name..."
            value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          />
        </div>
        
        <div className="w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

        <SelectDropdown
          value={filters.pgType}
          onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
          options={[
            { value: '', label: 'Any Category' },
            { value: 'male', label: 'Male Only' },
            { value: 'female', label: 'Female Only' },
            { value: 'unisex', label: 'Unisex / Co-Living' }
          ]}
          styles={{
            control: (base) => ({
              ...base,
              border: 0,
              backgroundColor: 'transparent',
              minHeight: 'auto',
              boxShadow: 'none',
              '&:hover': { border: 0 }
            })
          }}
          className="min-w-[150px]"
        />

        <Button 
          variant={getActiveFiltersCount() > 0 ? "accent" : "ghost"} 
          onClick={() => setShowAdvancedFilters(true)}
          className="rounded-full h-8 px-4 text-[12px] mr-1 font-bold transition-all duration-200"
        >
          <Filter size={14} className="mr-1.5" /> 
          {getActiveFiltersCount() > 0 ? `Filters (${getActiveFiltersCount()})` : 'More Filters'}
        </Button>
      </div>

      {isLoading ? <Spinner center /> : pgs.length === 0 ? (
        <EmptyState 
          icon={<Building2 size={64} />} 
          title="No properties found" 
          description="We couldn't find any PGs in this location. Try adjusting your filters." 
          action={hasActiveFilters() ? (
            <Button 
              variant="danger" 
              size="sm" 
              className="font-bold px-5" 
              onClick={handleClearFilters}
            >
              Reset Filters
            </Button>
          ) : null}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pgs.map(pg => (
              <div key={pg._id} className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl overflow-hidden transition-all duration-200 flex flex-col hover:border-[#6c63ff] hover:shadow-md cursor-pointer" onClick={() => setSelectedPGId(pg._id)}>
                <div className="h-[120px] bg-[#242740] dark:bg-[#242740] relative flex items-center justify-center overflow-hidden">
                  {pg.images && pg.images.length > 0 ? (
                    <img src={pg.images[0]} alt={pg.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                  ) : (
                    <Building2 size={40} className="opacity-10" />
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-black/50 px-2 py-0.5 rounded flex items-center gap-1 text-white text-[11px] backdrop-blur-sm">
                    <Star size={12} fill="#ffa94d" color="#ffa94d" /> {pg.rating ?? 0}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <Badge variant={pg.pgType === 'male' ? 'info' : pg.pgType === 'female' ? 'danger' : 'accent'}>
                      {pg.pgType}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 flex flex-col flex-1">
                  <h3 className="text-[16px] font-bold dark:text-[#f0f0f8] text-gray-900 mb-1 leading-snug truncate">{pg.name}</h3>
                  <div className="flex items-center gap-1 text-[12px] dark:text-[#6b6e82] text-gray-500 mb-3">
                    <MapPin size={12} className="text-[#6c63ff]" /> {pg.address?.city}, {pg.address?.state}
                  </div>

                  <div className="flex gap-1.5 mb-3">
                    <Badge variant="info" className="text-[9px] py-0.5">{pg.emptyBeds} Beds Left</Badge>
                    <Badge variant="ghost" className="text-[9px] py-0.5">{pg.totalRooms} Rooms</Badge>
                  </div>

                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-[11px] dark:text-[#6b6e82] text-gray-500 font-semibold">Property View</span>
                    <ChevronRight size={16} className="text-[#6c63ff]" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination 
            currentPage={page} 
            totalResults={data?.total || 0} 
            limit={limit}
            onPageChange={setPage} 
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        </>
      )}

      {/* Advanced Filters Modal */}
      <Modal 
        isOpen={showAdvancedFilters} 
        onClose={() => setShowAdvancedFilters(false)} 
        title="Advanced Filters"
      >
        <div className="flex flex-col gap-6 pb-3">
          <div className="detail-section">
            <div className="detail-section-title">Property Rating</div>
            <div className="flex gap-2">
              {[
                { value: '', label: 'Any' },
                { value: '3', label: '3★ & above' },
                { value: '4', label: '4★ & above' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters(f => ({ ...f, minRating: opt.value }))}
                  className={`flex-1 py-1.5 rounded-lg border text-[13px] font-bold transition-all duration-200 ${
                    filters.minRating === opt.value
                      ? 'border-[#6c63ff] bg-[#6c63ff]/15 text-[#6c63ff]'
                      : 'border-gray-200 dark:border-[#2d3052] dark:text-[#a0a3b1] text-gray-600 hover:bg-gray-50 dark:hover:bg-[#242740]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Availability</div>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-[#6c63ff]/5">
              <input
                type="checkbox"
                checked={filters.onlyWithVacancy}
                onChange={e => setFilters(f => ({ ...f, onlyWithVacancy: e.target.checked }))}
                className="w-4 h-4 accent-[#6c63ff]"
              />
              <span className={`text-[13px] ${filters.onlyWithVacancy ? 'text-[#6c63ff] font-bold' : 'dark:text-[#a0a3b1] text-gray-600 font-medium'}`}>
                Only show properties with vacant beds (beds left &gt; 0)
              </span>
            </label>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Amenities &amp; Facilities</div>
            <div className="grid grid-cols-2 gap-3">
              {facilitiesList?.map(fac => (
                <label
                  key={fac._id}
                  className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-all duration-200 ${filters.facilities.includes(fac._id) ? 'bg-[#6c63ff]/15' : 'bg-transparent'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={filters.facilities.includes(fac._id)}
                    onChange={() => handleFacilityToggle(fac._id)}
                    className="w-4 h-4 accent-[#6c63ff]"
                  />
                  <span className={`text-[13px] ${filters.facilities.includes(fac._id) ? 'text-[#6c63ff] font-bold' : 'dark:text-[#a0a3b1] text-gray-600 font-medium'}`}>{fac.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-3">
            <Button 
              variant="danger" 
              className="flex-1" 
              onClick={() => { handleClearFilters(); setShowAdvancedFilters(false); }}
            >
              Reset All
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAdvancedFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>

      {/* Property Details Modal */}
      <Modal isOpen={!!selectedPGId} onClose={() => setSelectedPGId(null)} title={pgDetail?.name || "Loading..."} size="lg">
        {isDetailLoading ? <Spinner center /> : pgDetail && (
          <div className="fade-in text-[13px]">
            <div className="flex gap-5 mb-5 flex-col sm:flex-row">
              <div className="flex-1 h-[140px] dark:bg-[#242740] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                {pgDetail.images && pgDetail.images.length > 0 ? (
                  <img src={pgDetail.images[0]} alt={pgDetail.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={48} className="opacity-10" />
                )}
              </div>
              <div className="flex-[1.5]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="info" className="text-[10px] py-0.5">{pgDetail.pgType}</Badge>
                  <div className="flex items-center gap-1 text-[#ffa94d] font-extrabold text-[12px]">
                    <Star size={14} fill="#ffa94d" /> {pgDetail.rating ?? 0}
                  </div>
                </div>
                <h2 className="text-[20px] font-extrabold dark:text-[#f0f0f8] text-gray-900 mb-1">{pgDetail.name}</h2>
                <p className="flex items-center gap-1 dark:text-[#6b6e82] text-gray-500 text-[12px]">
                  <MapPin size={14} /> {pgDetail.address?.city}, {pgDetail.address?.state}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="dark:bg-[#1a1d2e] bg-white px-2.5 py-2 rounded-lg">
                    <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold">CAPACITY</div>
                    <div className="text-[14px] font-extrabold dark:text-[#f0f0f8] text-gray-900">{pgDetail.totalBeds} Beds</div>
                  </div>
                  <div className="dark:bg-[#1a1d2e] bg-white px-2.5 py-2 rounded-lg">
                    <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold">AVAILABLE</div>
                    <div className="text-[14px] font-extrabold text-[#00d4aa]">{pgDetail.emptyBeds} Vacant</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-5">
              <div className="detail-section mb-0">
                <div className="detail-section-title text-[11px] mb-2">Location Details</div>
                <div className="text-[12px] dark:text-[#a0a3b1] text-gray-600 leading-[1.4]">
                  <div className="font-bold dark:text-[#f0f0f8] text-gray-900 mb-0.5">{pgDetail.address?.area}</div>
                  <div>{pgDetail.address?.city}, {pgDetail.address?.state} - {pgDetail.address?.pincode}</div>
                  <div className="mt-1 text-[#6c63ff] font-semibold">{pgDetail.address?.landmark}</div>
                </div>
              </div>
              <div className="detail-section mb-0">
                <div className="detail-section-title text-[11px] mb-2">Management Team</div>
                <div className="flex flex-col gap-2.5">
                  <div>
                    <div className="text-[11px] font-bold dark:text-[#f0f0f8] text-gray-900">{pgDetail.ownerId?.name} <span className="text-[#ffa94d] text-[9px] uppercase">• Owner</span></div>
                    <div className="text-[10px] dark:text-[#6b6e82] text-gray-500">{pgDetail.ownerId?.mobNo1}</div>
                  </div>
                  {pgDetail.managerId && (
                    <div>
                      <div className="text-[11px] font-bold dark:text-[#f0f0f8] text-gray-900">{pgDetail.managerId?.name} <span className="text-[#6c63ff] text-[9px] uppercase">• Manager</span></div>
                      <div className="text-[10px] dark:text-[#6b6e82] text-gray-500">{pgDetail.managerId?.mobNo1}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section mb-5">
              <div className="detail-section-title text-[11px] mb-2">Property Inventory</div>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="dark:bg-[#242740] bg-gray-100 p-2.5 rounded-lg text-center">
                  <div className="text-[18px] font-extrabold dark:text-[#f0f0f8] text-gray-900">{pgDetail.totalRooms}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold">ROOMS</div>
                </div>
                <div className="dark:bg-[#242740] bg-gray-100 p-2.5 rounded-lg text-center">
                  <div className="text-[18px] font-extrabold dark:text-[#f0f0f8] text-gray-900">{pgDetail.totalBeds}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold">TOTAL BEDS</div>
                </div>
                <div className="dark:bg-[#242740] bg-gray-100 p-2.5 rounded-lg text-center">
                  <div className="text-[18px] font-extrabold text-[#ff4d6d]">{pgDetail.occupiedBeds}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold">OCCUPIED</div>
                </div>
                <div className="dark:bg-[#242740] bg-gray-100 p-2.5 rounded-lg text-center">
                  <div className="text-[18px] font-extrabold text-[#00d4aa]">{pgDetail.emptyBeds}</div>
                  <div className="text-[9px] dark:text-[#6b6e82] text-gray-500 font-bold">VACANT</div>
                </div>
              </div>
            </div>

            {pgDetail.description && (
              <div className="detail-section mb-5">
                <div className="detail-section-title text-[11px] mb-2">About this Property</div>
                <div className="text-[12px] dark:text-[#a0a3b1] text-gray-600 leading-[1.6] dark:bg-[#1a1d2e] bg-white p-3 rounded-lg border-l-[3px] border-[#6c63ff]">
                  {pgDetail.description}
                </div>
              </div>
            )}

            <div className="detail-section mb-5">
              <div className="detail-section-title text-[11px] mb-2">Property Amenities</div>
              <div className="flex flex-wrap gap-1.5">
                {pgDetail.facilities?.map(f => (
                  <div key={f._id} className="flex items-center gap-1 px-2 py-1 dark:bg-[#242740] bg-gray-100 rounded-full text-[10px] border border-gray-200 dark:border-[#2d3052] font-semibold dark:text-[#f0f0f8] text-gray-700">
                    <div className="w-1 h-1 rounded-full bg-[#00d4aa]" />
                    {f.name}
                  </div>
                ))}
              </div>
            </div>

            {pgDetail.images && pgDetail.images.length > 0 && (
              <div className="detail-section mb-5">
                <div className="detail-section-title text-[11px] mb-2">Property Gallery</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {pgDetail.images.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2d3052] block hover:border-[#6c63ff] transition-all">
                      <img src={img} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-[#6c63ff]/15 rounded-[10px] flex items-center gap-2.5">
              <Info size={20} className="text-[#6c63ff]" />
              <div className="flex-1">
                <div className="font-extrabold text-[#6c63ff] text-[12px]">Interested in this Property?</div>
                <div className="text-[11px] dark:text-[#a0a3b1] text-gray-600">Explore and book available rooms in this building via Discover Stays.</div>
              </div>
              <Button size="sm" onClick={() => navigate('/browse', { state: { pgId: pgDetail._id, pgName: pgDetail.name } })} className="text-[11px] px-3 py-1.5">Go to Stays</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
