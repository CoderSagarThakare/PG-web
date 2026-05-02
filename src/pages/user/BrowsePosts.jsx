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
  const [filters, setFilters] = useState({ city: '', pgType: '', occupancyType: '', maxPrice: '' });
  const [activeFilters, setActiveFilters] = useState({ city: '', pgType: '', occupancyType: '', maxPrice: '' });

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
      </div>

      <Card className="mb-6">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Input 
              label="City" name="city" value={filters.city} 
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Pune, Mumbai" 
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Input 
              label="PG Type" name="pgType" as="select" value={filters.pgType}
              onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
              options={[
                { value: '', label: 'All Types' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'unisex', label: 'Unisex' },
                { value: 'coLiving', label: 'Co-Living' }
              ]}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Input 
              label="Sharing" name="occupancyType" as="select" value={filters.occupancyType}
              onChange={e => setFilters(f => ({ ...f, occupancyType: e.target.value }))}
              options={[
                { value: '', label: 'Any Sharing' },
                { value: 'single', label: 'Single Room' },
                { value: 'double', label: 'Double Sharing' },
                { value: 'triple', label: 'Triple Sharing' },
                { value: 'four', label: 'Four Sharing' }
              ]}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Input 
              label="Max Price" name="maxPrice" type="number" value={filters.maxPrice}
              onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
              placeholder="Budget Limit" 
            />
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner center /> : posts.length === 0 ? (
        <EmptyState icon={<Search size={64} />} title="No PGs found" 
          description="Try adjusting your filters to find more results." />
      ) : (
        <div className="grid-3">
          {posts.map(post => (
            <Card key={post._id} hover style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: 6, width: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
              
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4, marginBottom: 8, color: 'var(--text-primary)' }}>{post.title}</h3>
                    <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <MapPin size={14} className="text-primary" /> {post.pgId?.address?.city || 'Location unavailable'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)' }}>{formatPrice(post.pricePerBed)}</div>
                    <div className="text-xs text-primary" style={{ opacity: 0.8, fontWeight: 600 }}>/ month</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  <Badge variant="accent"><span style={{ textTransform: 'capitalize' }}>{post.pgType}</span></Badge>
                  <div className="chip chip-primary" style={{ textTransform: 'capitalize' }}>{post.occupancyType}</div>
                  <div className="chip" style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: 'none', fontWeight: 600 }}>
                    <Bed size={14} style={{ display: 'inline', marginRight: 4 }} /> {post.vacancyCount} Beds Left
                  </div>
                </div>

                <div className="text-sm text-secondary flex-1" style={{ lineHeight: 1.6, marginBottom: 24 }}>
                  {post.description?.length > 120 ? `${post.description.substring(0, 120)}...` : post.description}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {!post.enquiryData ? (
                    <Button 
                      onClick={() => handleEnquire(post._id)}
                      loading={enquiryMut.isPending && enquiryMut.variables?.postId === post._id}
                      style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 'var(--radius-md)' }}
                    >
                      Show Interest
                    </Button>
                  ) : (
                    <div style={{ 
                      background: 'var(--bg-elevated)', 
                      borderRadius: 'var(--radius-md)', 
                      borderLeft: '4px solid var(--success)',
                      padding: '16px',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ background: 'var(--success)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 900 }}>✓</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--success)', letterSpacing: '0.5px' }}>
                          Request Sent
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {post.enquiryData.owner && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: 8, borderRadius: '50%' }}>
                                <UserIcon size={16} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Owner</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{post.enquiryData.owner.name}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                              {post.enquiryData.status === 'contacted' ? (
                                <a 
                                  href={`tel:${post.enquiryData.owner.mobNo1}`}
                                  style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}
                                >
                                  <Phone size={14} /> {post.enquiryData.owner.mobNo1}
                                </a>
                              ) : (
                                <Button 
                                  variant="primary" 
                                  size="sm" 
                                  onClick={(e) => handleRevealNumber(e, post.enquiryData.enquiryId)}
                                  loading={updateEnquiryMut.isPending && updateEnquiryMut.variables?.id === post.enquiryData.enquiryId}
                                  style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px' }}
                                >
                                  <Phone size={14} style={{ marginRight: 6 }} /> Reveal Number
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {post.enquiryData.manager && (
                          <>
                            <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: 8, borderRadius: '50%' }}>
                                  <UserIcon size={16} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Manager</div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{post.enquiryData.manager.name}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                {post.enquiryData.status === 'contacted' ? (
                                  <a 
                                    href={`tel:${post.enquiryData.manager.mobNo1}`}
                                    style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}
                                  >
                                    <Phone size={14} /> {post.enquiryData.manager.mobNo1}
                                  </a>
                                ) : (
                                  <Button 
                                    variant="primary" 
                                    size="sm" 
                                    onClick={(e) => handleRevealNumber(e, post.enquiryData.enquiryId)}
                                    loading={updateEnquiryMut.isPending && updateEnquiryMut.variables?.id === post.enquiryData.enquiryId}
                                    style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px' }}
                                  >
                                    <Phone size={14} style={{ marginRight: 6 }} /> Reveal Number
                                  </Button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
