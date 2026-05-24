import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { discoverPGsApi, getFacilitiesApi, getPGByIdApi } from '../../api/pg.api';
import { Search, MapPin, Building2, Star, Users, Filter, ChevronRight, Info } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, Pagination } from '../../components/common';

export default function BrowsePGs() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [filters, setFilters] = useState({ city: '', pgType: '', facilities: [] });
  const [activeFilters, setActiveFilters] = useState({ city: '', pgType: '', facilities: [] });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPGId, setSelectedPGId] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveFilters(filters);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

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

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Explore Properties</h1>
          <p className="page-subtitle">Find the best PG buildings in your favorite cities</p>
        </div>
      </div>

      <div className="search-bar-inline">
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingLeft: 12 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search city or property name..."
            value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          />
        </div>
        
        <div className="divider" />

        <select 
          className="pill-select"
          value={filters.pgType}
          onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
        >
          <option value="">Any Category</option>
          <option value="male">Male Only</option>
          <option value="female">Female Only</option>
          <option value="unisex">Unisex / Co-Living</option>
        </select>

        <Button 
          variant="ghost" 
          onClick={() => setShowAdvancedFilters(true)}
          style={{ borderRadius: 99, height: 32, padding: '0 16px', fontSize: 12, marginRight: 4 }}
        >
          <Filter size={14} style={{ marginRight: 6 }} /> More Filters
        </Button>
      </div>

      {isLoading ? <Spinner center /> : pgs.length === 0 ? (
        <EmptyState icon={<Building2 size={64} />} title="No properties found" 
          description="We couldn't find any PGs in this location. Try a different city." />
      ) : (
        <>
          <div className="browse-grid">
            {pgs.map(pg => (
              <div key={pg._id} className="sleek-card" onClick={() => setSelectedPGId(pg._id)} style={{ cursor: 'pointer' }}>
                <div className="sleek-card-img">
                  <Building2 size={40} style={{ opacity: 0.1 }} />
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontSize: 11 }}>
                    <Star size={12} fill="var(--warning)" color="var(--warning)" /> {pg.rating ?? 0}
                  </div>
                  <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                    <Badge variant={pg.pgType === 'male' ? 'info' : pg.pgType === 'female' ? 'danger' : 'accent'}>
                      {pg.pgType}
                    </Badge>
                  </div>
                </div>

                <div className="sleek-card-body">
                  <h3 className="sleek-card-title truncate" style={{ fontSize: 16 }}>{pg.name}</h3>
                  <div className="property-location" style={{ marginBottom: 12 }}>
                    <MapPin size={12} className="text-primary" /> {pg.address?.city}, {pg.address?.state}
                  </div>

                  <div className="property-tags" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <Badge variant="primary" style={{ fontSize: 9 }}>{pg.emptyBeds} Beds Left</Badge>
                    <Badge variant="ghost" style={{ fontSize: 9 }}>{pg.totalRooms} Rooms</Badge>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Property View</span>
                    <ChevronRight size={16} className="text-primary" />
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

      {/* Filters Modal */}
      <Modal isOpen={showAdvancedFilters} onClose={() => setShowAdvancedFilters(false)} title="Property Amenities">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {facilitiesList?.map(fac => (
              <label key={fac._id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px', background: filters.facilities.includes(fac._id) ? 'var(--primary-light)' : 'transparent', borderRadius: 'var(--radius-sm)' }}>
                <input 
                  type="checkbox" 
                  checked={filters.facilities.includes(fac._id)}
                  onChange={() => handleFacilityToggle(fac._id)}
                />
                <span style={{ fontSize: 13 }}>{fac.name}</span>
              </label>
            ))}
          </div>
          <Button variant="primary" onClick={() => setShowAdvancedFilters(false)}>Apply Amenities</Button>
        </div>
      </Modal>

      {/* Property Details Modal */}
      <Modal isOpen={!!selectedPGId} onClose={() => setSelectedPGId(null)} title={pgDetail?.name || "Loading..."} size="lg">
        {isDetailLoading ? <Spinner center /> : pgDetail && (
          <div className="fade-in" style={{ fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 140, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={48} style={{ opacity: 0.1 }} />
              </div>
              <div style={{ flex: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Badge variant="primary" style={{ fontSize: '10px' }}>{pgDetail.pgType}</Badge>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warning)', fontWeight: 800, fontSize: '12px' }}>
                    <Star size={14} fill="var(--warning)" /> {pgDetail.rating ?? 0}
                  </div>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: 4 }}>{pgDetail.name}</h2>
                <p style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '12px' }}>
                  <MapPin size={14} /> {pgDetail.address?.city}, {pgDetail.address?.state}
                </p>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--bg-base)', padding: '8px 10px', borderRadius: 8 }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>CAPACITY</div>
                    <div style={{ fontSize: '14px', fontWeight: 800 }}>{pgDetail.totalBeds} Beds</div>
                  </div>
                  <div style={{ background: 'var(--bg-base)', padding: '8px 10px', borderRadius: 8 }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>AVAILABLE</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>{pgDetail.emptyBeds} Vacant</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="detail-section" style={{ marginBottom: 0 }}>
                <div className="detail-section-title" style={{ fontSize: '11px', marginBottom: 8 }}>Location Details</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{pgDetail.address?.area}</div>
                  <div>{pgDetail.address?.city}, {pgDetail.address?.state} - {pgDetail.address?.pincode}</div>
                  <div style={{ marginTop: 4, color: 'var(--primary)', fontWeight: 600 }}>{pgDetail.address?.landmark}</div>
                </div>
              </div>
              <div className="detail-section" style={{ marginBottom: 0 }}>
                <div className="detail-section-title" style={{ fontSize: '11px', marginBottom: 8 }}>Management Team</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700 }}>{pgDetail.ownerId?.name} <span style={{ color: 'var(--warning)', fontSize: '9px', textTransform: 'uppercase' }}>• Owner</span></div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pgDetail.ownerId?.mobNo1}</div>
                  </div>
                  {pgDetail.managerId && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700 }}>{pgDetail.managerId?.name} <span style={{ color: 'var(--primary)', fontSize: '9px', textTransform: 'uppercase' }}>• Manager</span></div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pgDetail.managerId?.mobNo1}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-section" style={{ marginBottom: 20 }}>
              <div className="detail-section-title" style={{ fontSize: '11px', marginBottom: 8 }}>Property Inventory</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{pgDetail.totalRooms}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>ROOMS</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{pgDetail.totalBeds}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL BEDS</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{pgDetail.occupiedBeds}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>OCCUPIED</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{pgDetail.emptyBeds}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>VACANT</div>
                </div>
              </div>
            </div>

            {pgDetail.description && (
              <div className="detail-section" style={{ marginBottom: 20 }}>
                <div className="detail-section-title" style={{ fontSize: '11px', marginBottom: 8 }}>About this Property</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-base)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                  {pgDetail.description}
                </div>
              </div>
            )}

            <div className="detail-section" style={{ marginBottom: 20 }}>
              <div className="detail-section-title" style={{ fontSize: '11px', marginBottom: 8 }}>Property Amenities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pgDetail.facilities?.map(f => (
                  <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--bg-elevated)', borderRadius: '99px', fontSize: '10px', border: '1px solid var(--border)', fontWeight: 600 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
                    {f.name}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Info size={20} className="text-primary" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '12px' }}>Interested in this Property?</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Book a specific room in this building via Discover Stays.</div>
              </div>
              <Button size="sm" onClick={() => window.location.href = '/browse'} style={{ fontSize: '11px', padding: '6px 12px' }}>Go to Stays</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
