import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { searchPostsApi } from '../../api/post.api';
import { createEnquiryApi, updateEnquiryApi } from '../../api/enquiry.api';
import { Search, MapPin, Bed, Filter, Phone, User as UserIcon } from 'lucide-react';
import { Button, Card, Badge, Spinner, EmptyState, Input } from '../../components/common';
import { getErrorMessage, formatPrice } from '../../utils/helpers';

export default function BrowsePosts() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '' });
  const [activeFilters, setActiveFilters] = useState({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '' });

  useEffect(() => {
    const handler = setTimeout(() => {
      setActiveFilters(filters);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['browse-posts', activeFilters],
    queryFn: async () => (await searchPostsApi(activeFilters)).data?.data,
  });

  const enquiryMut = useMutation({
    mutationFn: createEnquiryApi,
    onSuccess: (res, variables) => {
      toast.success('Enquiry sent successfully!');
      qc.setQueryData(['browse-posts', activeFilters], (oldData) => {
        if (!oldData) return oldData;
        const newPosts = oldData.posts.map(p => {
          if (p._id === variables.postId) {
            return {
              ...p,
              enquiryData: { 
                owner: res.data?.data?.owner, 
                manager: res.data?.data?.manager,
                enquiryId: res.data?.data?.enquiryId,
                status: res.data?.data?.status
              }
            };
          }
          return p;
        });
        return { ...oldData, posts: newPosts };
      });
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
            />
            <Input 
              name="maxPrice" type="number" value={filters.maxPrice}
              onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
              placeholder="₹ Max"
              style={{ height: 40 }}
            />
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner center /> : posts.length === 0 ? (
        <EmptyState icon={<Search size={64} />} title="No PGs found" 
          description="Try adjusting your filters to find more results." />
      ) : (
        <div className="grid-3" style={{ gap: 12 }}>
          {posts.map(post => (
            <Card key={post._id} hover style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', overflow: 'hidden', position: 'relative' }}>
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
                <div className="chip" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--warning-light)', color: 'var(--warning)', border: 'none', fontWeight: 600 }}>
                  <Bed size={12} style={{ display: 'inline', marginRight: 2 }} /> {post.vacancyCount} Left
                </div>
              </div>

              <div className="text-xs text-secondary flex-1" style={{ lineHeight: 1.5, marginBottom: 16 }}>
                {post.description?.length > 80 ? `${post.description.substring(0, 80)}...` : post.description}
              </div>

              <div style={{ marginTop: 'auto' }}>
                {!post.enquiryData ? (
                  <div style={{ position: 'relative', width: '100%' }} className="interest-btn-wrapper">
                    <Button 
                      onClick={() => handleEnquire(post._id)}
                      loading={enquiryMut.isPending && enquiryMut.variables?.postId === post._id}
                      style={{ width: '100%', padding: '8px', fontSize: 13, fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
                    >
                      Show Interest
                    </Button>
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                      fontSize: 10, padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)',
                      pointerEvents: 'none', opacity: 0,
                      transition: 'opacity 0.2s ease',
                      zIndex: 10
                    }} className="interest-tooltip">
                      📋 Contact info will be shared
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: 'var(--bg-elevated)', 
                    borderRadius: 'var(--radius-sm)', 
                    borderLeft: '3px solid var(--success)',
                    padding: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckCircle2 size={14} className="text-success" />
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)', letterSpacing: '0.5px' }}>
                        Requested
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {post.enquiryData.owner && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Owner</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.enquiryData.owner.name}</div>
                          </div>
                          {post.enquiryData.status === 'contacted' ? (
                            <a 
                              href={`tel:${post.enquiryData.owner.mobNo1}`}
                              style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-light)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                            >
                              <Phone size={11} /> {post.enquiryData.owner.mobNo1}
                            </a>
                          ) : (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={(e) => handleRevealNumber(e, post.enquiryData.enquiryId)}
                              loading={updateEnquiryMut.isPending && updateEnquiryMut.variables?.id === post.enquiryData.enquiryId}
                              style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px' }}
                            >
                              Reveal
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
