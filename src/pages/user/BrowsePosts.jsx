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
  const [filters, setFilters] = useState({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '' });
  const [activeFilters, setActiveFilters] = useState({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '' });
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

      // Update the main list cache
      qc.setQueryData(['browse-posts', activeFilters], (oldData) => {
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
      qc.setQueryData(['browse-posts', activeFilters], (oldData) => {
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
    // We can silently fail or toast, but since it's just a status update, silent is okay or a toast.
    onError: (e) => console.error("Failed to update status", e),
  });

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

      <Card className="mb-6" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Main Search */}
          <div style={{ position: 'relative', flex: '2 1 300px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 36, height: 40 }}
              placeholder="Search by title..."
              value={filters.title}
              onChange={e => setFilters(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* City */}
          <div style={{ flex: '1 1 150px' }}>
            <Input 
              name="city" value={filters.city} 
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              placeholder="City..."
              style={{ height: 40 }}
            />
          </div>

          {/* PG Type */}
          <div style={{ flex: '1 1 120px' }}>
            <Input 
              name="pgType" as="select" value={filters.pgType}
              onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
              options={[
                { value: '', label: 'PG Type' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'unisex', label: 'Unisex' },
                { value: 'coLiving', label: 'Co-Living' }
              ]}
              style={{ height: 40 }}
            />
          </div>

          {/* Sharing */}
          <div style={{ flex: '1 1 120px' }}>
            <Input 
              name="occupancyType" as="select" value={filters.occupancyType}
              onChange={e => setFilters(f => ({ ...f, occupancyType: e.target.value }))}
              options={[
                { value: '', label: 'Sharing' },
                { value: 'single', label: 'Single' },
                { value: 'double', label: 'Double' },
                { value: 'triple', label: 'Triple' },
                { value: 'four', label: 'Four' }
              ]}
              style={{ height: 40 }}
            />
          </div>

          {/* Price Range */}
          <div style={{ display: 'flex', gap: 4, flex: '1 1 180px' }}>
            <Input 
              name="minPrice" type="number" value={filters.minPrice}
              onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
              placeholder="₹ Min"
              style={{ height: 40 }}
              min={0}
            />
            <Input 
              name="maxPrice" type="number" value={filters.maxPrice}
              onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
              placeholder="₹ Max"
              style={{ height: 40 }}
              min={0}
            />
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner center /> : posts.length === 0 ? (
        <EmptyState icon={<Search size={64} />} title="No PGs found" 
          description="Try adjusting your filters to find more results." />
      ) : (
        <>
          <div className="grid-3" style={{ gap: 12 }}>
            {posts.map(post => (
              <Card key={post._id} hover onClick={() => setViewPost(post)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', overflow: 'hidden', position: 'relative' }}>
                {/* ... card content ... */}
                <div style={{ position: 'absolute', top: 0, left: 0, height: 4, width: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.title}</h3>
                    <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} className="text-primary" /> {post.pgId?.address?.city || 'Location'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, background: 'var(--primary-light)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)' }}>{formatPrice(post.pricePerBed)}</div>
                    <div style={{ fontSize: 10, color: 'var(--primary)', opacity: 0.8, fontWeight: 600 }}>/ month</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <Badge variant="accent" style={{ fontSize: 10, padding: '2px 6px' }}><span style={{ textTransform: 'capitalize' }}>{post.pgType}</span></Badge>
                  <div className="chip chip-primary" style={{ fontSize: 10, padding: '2px 6px', textTransform: 'capitalize' }}>{post.occupancyType}</div>
                  <div className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', background: 'var(--warning-light)', color: 'var(--warning)', border: 'none', fontWeight: 700 }}>
                    <Bed size={12} /> {post.vacancyCount} Left
                  </div>
                </div>

                <div className="text-xs text-secondary flex-1" style={{ lineHeight: 1.5, marginBottom: 16 }}>
                  {post.description?.length > 80 ? `${post.description.substring(0, 80)}...` : post.description}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {!post.enquiryData ? (
                    <div style={{ position: 'relative', width: '100%' }} className="interest-btn-wrapper">
                      <Button 
                        onClick={(e) => { e.stopPropagation(); handleEnquire(post._id); }}
                        loading={enquiryMut.isPending && enquiryMut.variables?.postId === post._id}
                        style={{ width: '100%', padding: '8px', fontSize: 13, fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
                      >
                        Show Interest
                      </Button>
                    </div>
                  ) : (
                    <div style={{ 
                      background: 'var(--bg-elevated)', 
                      borderRadius: 'var(--radius-sm)', 
                      borderLeft: '3px solid var(--success)',
                      padding: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} className="text-success" />
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)' }}>
                          Requested
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
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
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)' }}>{formatPrice(viewPost.pricePerBed)}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ month per bed</div>
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
