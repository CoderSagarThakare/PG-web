import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { searchPostsApi } from '../../api/post.api';
import { createEnquiryApi, updateEnquiryApi } from '../../api/enquiry.api';
import { Search, MapPin, Bed, Filter, Phone, User as UserIcon, CheckCircle2, Building2 } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, Pagination } from '../../components/common';
import { getErrorMessage, formatPrice } from '../../utils/helpers';

export default function BrowsePosts() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [filters, setFilters] = useState({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '', facilities: [] });
  const [activeFilters, setActiveFilters] = useState({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '', facilities: [] });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewPost, setViewPost] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveFilters(filters);
      setPage(1); // Reset to first page when filters change
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['browse-posts', activeFilters, page, limit],
    queryFn: async () => (await searchPostsApi({ ...activeFilters, page, limit })).data?.data,
  });

  const enquiryMut = useMutation({
    mutationFn: createEnquiryApi,
    onSuccess: (res, variables) => {
      toast.success('Enquiry sent successfully!');
      const newEnquiryData = { 
        owner: res.data?.data?.owner, 
        manager: res.data?.data?.manager,
        enquiryId: res.data?.data?.enquiryId,
        status: res.data?.data?.status
      };

      // Update the main list cache — key must match exactly what useQuery uses
      qc.setQueryData(['browse-posts', activeFilters, page, limit], (oldData) => {
        if (!oldData) return oldData;
        const newPosts = oldData.posts.map(p => {
          if (p._id === variables.postId) {
            return { ...p, enquiryData: newEnquiryData };
          }
          return p;
        });
        return { ...oldData, posts: newPosts };
      });

      // Update the current modal view state
      if (viewPost?._id === variables.postId) {
        setViewPost(prev => ({ ...prev, enquiryData: newEnquiryData }));
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateEnquiryMut = useMutation({
    mutationFn: ({ id, data }) => updateEnquiryApi(id, data),
    onSuccess: (res, variables) => {
      // Update the main list cache — key must match exactly what useQuery uses
      qc.setQueryData(['browse-posts', activeFilters, page, limit], (oldData) => {
        if (!oldData) return oldData;
        const newPosts = oldData.posts.map(p => {
          if (p.enquiryData?.enquiryId === variables.id) {
            return {
              ...p,
              enquiryData: { ...p.enquiryData, status: 'contacted' }
            };
          }
          return p;
        });
        return { ...oldData, posts: newPosts };
      });

      // Update the current modal view state
      if (viewPost?.enquiryData?.enquiryId === variables.id) {
        setViewPost(prev => ({
          ...prev,
          enquiryData: { ...prev.enquiryData, status: 'contacted' }
        }));
      }
    },
    onError: (e) => console.error("Failed to update status", e),
  });

  const { data: facilitiesList } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => (await getFacilitiesApi()).data?.data?.facilities || [],
  });

  const handleFacilityToggle = (id) => {
    setFilters(prev => {
      const current = prev.facilities || [];
      const updated = current.includes(id) 
        ? current.filter(f => f !== id) 
        : [...current, id];
      return { ...prev, facilities: updated };
    });
  };

  const posts = data?.posts || [];

  const handleEnquire = (postId) => {
    enquiryMut.mutate({ postId });
  };

  const handleRevealNumber = (e, enquiryId) => {
    e.preventDefault();
    if (enquiryId) {
      updateEnquiryMut.mutate({ id: enquiryId, data: { status: 'contacted' } });
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Find Your Next Home</h1>
          <p className="page-subtitle">Browse available PG rooms based on your preferences</p>
        </div>
        {Object.values(filters).some(v => v !== '') && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '' })}>
            Clear Filters
          </Button>
        )}
      </div>

      <div className="search-bar-inline">
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingLeft: 12 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by area, PG name..."
            value={filters.title}
            onChange={e => setFilters(f => ({ ...f, title: e.target.value }))}
          />
        </div>
        
        <div className="divider" />
        
        <input
          style={{ width: 120 }}
          placeholder="City..."
          value={filters.city}
          onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
        />

        <div className="divider" />

        <select 
          className="pill-select"
          value={filters.pgType}
          onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
        >
          <option value="">Any Type</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unisex">Unisex</option>
          <option value="coLiving">Co-Living</option>
        </select>

        <div className="divider" />

        <select 
          className="pill-select"
          value={filters.occupancyType}
          onChange={e => setFilters(f => ({ ...f, occupancyType: e.target.value }))}
        >
          <option value="">Sharing</option>
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="triple">Triple</option>
        </select>

        <Button 
          variant="primary" 
          onClick={() => setShowAdvancedFilters(true)}
          style={{ borderRadius: 99, height: 32, padding: '0 16px', fontSize: 12, marginRight: 4 }}
        >
          <Filter size={14} style={{ marginRight: 6 }} /> Filters
        </Button>
      </div>

      {isLoading ? <Spinner center /> : posts.length === 0 ? (
        <EmptyState icon={<Search size={64} />} title="No PGs found" 
          description="Try adjusting your filters to find more results." />
      ) : (
        <>
          <div className="browse-grid">
            {posts.map(post => (
              <div key={post._id} className="sleek-card" onClick={() => setViewPost(post)} style={{ cursor: 'pointer' }}>
                <div className="sleek-card-img">
                  <Building2 size={40} style={{ opacity: 0.1 }} />
                  <div className="sleek-card-price" style={{ fontSize: 13, padding: '4px 10px' }}>{formatPrice(post.minPrice)} - {formatPrice(post.maxPrice)}</div>
                  <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                    <Badge variant={post.pgType === 'male' ? 'info' : post.pgType === 'female' ? 'danger' : 'accent'}>
                      {post.pgType}
                    </Badge>
                  </div>
                </div>

                <div className="sleek-card-body">
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>{post.pgId?.name}</div>
                  <h3 className="sleek-card-title truncate">{post.title}</h3>
                  <div className="property-location" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                    <MapPin size={12} className="text-primary" /> {post.pgId?.address?.city}
                  </div>

                  <div className="property-tags" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <Badge variant="accent" style={{ fontSize: 9 }}>{post.occupancyType}</Badge>
                    <Badge variant="warning" style={{ fontSize: 9 }}>{post.vacancyCount} Left</Badge>
                  </div>

                  <p style={{ 
                    fontSize: 11.5, 
                    color: 'var(--text-muted)', 
                    marginBottom: 14,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.4',
                    height: '2.8em'
                  }}>
                    {post.description}
                  </p>

                  <div style={{ marginTop: 'auto' }}>
                    {!post.enquiryData ? (
                      <Button 
                        size="sm"
                        style={{ width: '100%', fontWeight: 700 }}
                        onClick={(e) => { e.stopPropagation(); handleEnquire(post._id); }}
                        loading={enquiryMut.isPending && enquiryMut.variables?.postId === post._id}
                      >
                        Show Interest
                      </Button>
                    ) : (
                      <div style={{ 
                        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', 
                        padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, color: 'var(--success)', border: '1px solid var(--success-light)'
                      }}>
                        <CheckCircle2 size={14} />
                        <span style={{ fontSize: 10, fontWeight: 800 }}>REQUESTED</span>
                      </div>
                    )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 12 }}>
          <div className="detail-section">
            <div className="detail-section-title">Budget Range</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Input 
                label="Min Price" type="number" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                placeholder="₹ 0"
              />
              <Input 
                label="Max Price" type="number" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                placeholder="₹ 20000"
              />
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Amenities & Facilities</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {facilitiesList?.map(fac => (
                <label key={fac._id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px', background: filters.facilities.includes(fac._id) ? 'var(--primary-light)' : 'transparent', borderRadius: 'var(--radius-sm)', transition: '0.2s' }}>
                  <input 
                    type="checkbox" 
                    checked={filters.facilities.includes(fac._id)}
                    onChange={() => handleFacilityToggle(fac._id)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: 14, color: filters.facilities.includes(fac._id) ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: filters.facilities.includes(fac._id) ? 700 : 500 }}>{fac.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <Button variant="ghost" className="flex-1" onClick={() => { setFilters({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '', facilities: [] }); setShowAdvancedFilters(false); }}>
              Reset All
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setShowAdvancedFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>

      {/* Post Details Modal */}
      <Modal 
        isOpen={!!viewPost} 
        onClose={() => setViewPost(null)} 
        title={viewPost?.title || 'Post Details'}
        size="lg"
      >
        {viewPost && (
          <div className="fade-in">
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ position: 'relative', height: 200, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <Building2 size={64} style={{ opacity: 0.1 }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8 }}>
                    <Badge variant="primary">{viewPost.pgType}</Badge>
                    <Badge variant="accent">{viewPost.occupancyType}</Badge>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{viewPost.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', marginBottom: 16 }}>
                  <MapPin size={16} /> {viewPost.pgId?.name}, {viewPost.pgId?.address?.city}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>{formatPrice(viewPost.minPrice)} - {formatPrice(viewPost.maxPrice)}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ month</div>
                </div>

                <div className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--radius-sm)', fontWeight: 800 }}>
                  <Bed size={18} /> {viewPost.vacancyCount} Beds Remaining
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">About this Property</div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                {viewPost.description}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="detail-row">
                  <span className="detail-key">Exact Location</span>
                  <span className="detail-value">{viewPost.pgId?.address?.landmark}, {viewPost.pgId?.address?.city}, {viewPost.pgId?.address?.state}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Available From</span>
                  <span className="detail-value">{new Date(viewPost.availableFrom || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Check-In Time</span>
                  <span className="detail-value">{viewPost.pgId?.checkInTime || 'Anytime'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Check-Out Time</span>
                  <span className="detail-value">{viewPost.pgId?.checkOutTime || 'Morning'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Property Rating</span>
                  <span className="detail-value" style={{ color: 'var(--warning)', fontWeight: 700 }}>★ {viewPost.pgId?.rating || 0}</span>
                </div>
              </div>
            </div>

            {viewPost.pgId?.facilities?.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Amenities & Facilities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {viewPost.pgId.facilities.map(f => (
                    <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: '99px', fontSize: 12, border: '1px solid var(--border)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              {!viewPost.enquiryData ? (
                <Button 
                  onClick={() => handleEnquire(viewPost._id)}
                  loading={enquiryMut.isPending && enquiryMut.variables?.postId === viewPost._id}
                  style={{ width: '100%', height: 52, fontSize: 16, fontWeight: 800 }}
                >
                  Show Interest & Connect
                </Button>
              ) : (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-light)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--success)' }}>
                    <CheckCircle2 size={20} />
                    <span style={{ fontSize: 16, fontWeight: 800 }}>Enquiry Active!</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                    {viewPost.enquiryData.owner && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 2 }}>Property Owner</div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{viewPost.enquiryData.owner.name}</div>
                        </div>
                        
                        {viewPost.enquiryData.status === 'contacted' ? (
                          <a 
                            href={`tel:${viewPost.enquiryData.owner.mobNo1}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-light)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 800 }}
                          >
                            <Phone size={16} /> {viewPost.enquiryData.owner.mobNo1}
                          </a>
                        ) : (
                          <Button 
                            variant="primary" 
                            onClick={(e) => handleRevealNumber(e, viewPost.enquiryData.enquiryId)}
                            loading={updateEnquiryMut.isPending && updateEnquiryMut.variables?.id === viewPost.enquiryData.enquiryId}
                          >
                            Reveal Phone Number
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
