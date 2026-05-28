import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { searchPostsApi } from '../../api/post.api';
import { getFacilitiesApi } from '../../api/pg.api';
import { createEnquiryApi, updateEnquiryApi } from '../../api/enquiry.api';
import { Search, MapPin, Bed, Filter, Phone, User as UserIcon, CheckCircle2, Building2 } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, Input, Pagination } from '../../components/common';
import { getErrorMessage, formatPrice } from '../../utils/helpers';

export default function BrowsePosts() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
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
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">Find Your Next Home</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Browse available PG rooms based on your preferences</p>
        </div>
        {Object.values(filters).some(v => v !== '') && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ title: '', city: '', pgType: '', occupancyType: '', minPrice: '', maxPrice: '' })}>
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex items-center bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-full px-2 py-1 gap-2.5 mb-6 flex-wrap">
        <div className="flex items-center flex-1 pl-3">
          <Search size={16} className="dark:text-[#6b6e82] text-gray-400 shrink-0" />
          <input
            className="bg-transparent border-none outline-none ml-2 text-[13px] dark:text-[#f0f0f8] text-gray-900 placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] w-full"
            placeholder="Search by area, PG name..."
            value={filters.title}
            onChange={e => setFilters(f => ({ ...f, title: e.target.value }))}
          />
        </div>
        
        <div className="w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />
        
        <input
          className="bg-transparent border-none outline-none text-[13px] dark:text-[#f0f0f8] text-gray-900 placeholder:text-gray-400 dark:placeholder:text-[#6b6e82] w-[120px]"
          placeholder="City..."
          value={filters.city}
          onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
        />

        <div className="w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

        <select 
          className="bg-transparent border-none dark:text-[#a0a3b1] text-gray-600 text-[13px] font-semibold px-3 py-2 cursor-pointer outline-none rounded-full hover:bg-[#2d3052]/20 dark:hover:bg-[#2d3052] hover:text-[#f0f0f8]"
          value={filters.pgType}
          onChange={e => setFilters(f => ({ ...f, pgType: e.target.value }))}
        >
          <option value="">Any Type</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unisex">Unisex</option>
          <option value="coLiving">Co-Living</option>
        </select>

        <div className="w-px h-5 bg-gray-200 dark:bg-[#2d3052]" />

        <select 
          className="bg-transparent border-none dark:text-[#a0a3b1] text-gray-600 text-[13px] font-semibold px-3 py-2 cursor-pointer outline-none rounded-full hover:bg-[#2d3052]/20 dark:hover:bg-[#2d3052] hover:text-[#f0f0f8]"
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
          className="rounded-full h-8 px-4 text-[12px] mr-1"
        >
          <Filter size={14} className="mr-1.5" /> Filters
        </Button>
      </div>

      {isLoading ? <Spinner center /> : posts.length === 0 ? (
        <EmptyState icon={<Search size={64} />} title="No PGs found" 
          description="Try adjusting your filters to find more results." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {posts.map(post => (
              <div key={post._id} className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl overflow-hidden transition-all duration-200 flex flex-col hover:border-[#6c63ff] hover:shadow-md cursor-pointer" onClick={() => setViewPost(post)}>
                <div className="h-[120px] bg-[#242740] dark:bg-[#242740] relative flex items-center justify-center overflow-hidden">
                  {post.images && post.images.length > 0 ? (
                    <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                  ) : (
                    <Building2 size={40} className="opacity-10" />
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-[#6c63ff] text-white px-2.5 py-1 rounded-md font-black text-[13px]">{formatPrice(post.minPrice)} - {formatPrice(post.maxPrice)}</div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <Badge variant={post.pgType === 'male' ? 'info' : post.pgType === 'female' ? 'danger' : 'accent'}>
                      {post.pgType}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 flex flex-col flex-1">
                  <div className="text-[10px] font-bold text-[#00d4aa] uppercase mb-0.5">{post.pgId?.name}</div>
                  <h3 className="text-[15px] font-bold dark:text-[#f0f0f8] text-gray-900 mb-1 leading-snug truncate">{post.title}</h3>
                  <div className="flex items-center gap-1 text-[11px] dark:text-[#6b6e82] text-gray-500 mb-3">
                    <MapPin size={12} className="text-[#6c63ff]" /> {post.pgId?.address?.city}
                  </div>

                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {post.occupancyTypes?.map(type => (
                      <Badge key={type} variant="accent" className="text-[9px] py-0.5 capitalize">{type}</Badge>
                    ))}
                    {post.pgType === 'unisex' ? (
                      <Badge variant="warning" className="text-[9px] py-0.5">
                        ♂ {post.maleVacancyCount ?? 0} M · ♀ {post.femaleVacancyCount ?? 0} F
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[9px] py-0.5">{post.vacancyCount} Left</Badge>
                    )}
                  </div>

                  <p className="text-[11.5px] dark:text-[#6b6e82] text-gray-500 mb-3.5 line-clamp-2 leading-[1.4] h-[2.8em] overflow-hidden">
                    {post.description}
                  </p>

                  <div className="mt-auto">
                    {!post.enquiryData ? (
                      <Button 
                        size="sm"
                        className="w-full font-bold"
                        onClick={(e) => { e.stopPropagation(); handleEnquire(post._id); }}
                        loading={enquiryMut.isPending && enquiryMut.variables?.postId === post._id}
                      >
                        Show Interest
                      </Button>
                    ) : (
                      <div className="bg-[#242740] dark:bg-[#242740] rounded-lg px-2 py-2 flex items-center justify-center gap-1.5 text-[#51cf66] border border-[#51cf66]/30">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-extrabold">REQUESTED</span>
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
        <div className="flex flex-col gap-6 pb-3">
          <div className="detail-section">
            <div className="detail-section-title">Budget Range</div>
            <div className="flex gap-3">
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
                  <span className={`text-[14px] ${filters.facilities.includes(fac._id) ? 'text-[#6c63ff] font-bold' : 'dark:text-[#a0a3b1] text-gray-600 font-medium'}`}>{fac.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-3">
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
            <div className="flex gap-6 mb-6 flex-col sm:flex-row">
              <div className="flex-1">
                <div className="relative h-[200px] dark:bg-[#242740] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-[#2d3052]">
                  {viewPost.images && viewPost.images.length > 0 ? (
                    <img src={viewPost.images[0]} alt={viewPost.title} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={64} className="opacity-10" />
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                    <Badge variant="primary">{viewPost.pgType}</Badge>
                    {viewPost.occupancyTypes?.map(type => (
                      <Badge key={type} variant="accent" className="capitalize">{type}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold dark:text-[#f0f0f8] text-gray-900 mb-2">{viewPost.title}</h2>
                <div className="flex items-center gap-2 dark:text-[#6b6e82] text-gray-500 mb-4">
                  <MapPin size={16} /> {viewPost.pgId?.name}, {viewPost.pgId?.address?.city}
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-2xl font-black text-[#6c63ff]">{formatPrice(viewPost.minPrice)} - {formatPrice(viewPost.maxPrice)}</div>
                  <div className="text-[14px] dark:text-[#6b6e82] text-gray-500">/ month</div>
                </div>

                {viewPost.pgType === 'unisex' ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ffa94d]/10 text-[#ffa94d] rounded-lg font-extrabold text-sm self-start">
                      <Bed size={18} /> {viewPost.vacancyCount} Beds Remaining
                    </div>
                    <div className="text-[12px] dark:text-[#a0a3b1] text-gray-600 font-bold px-1">
                      (♂ {viewPost.maleVacancyCount ?? 0} Male · ♀ {viewPost.femaleVacancyCount ?? 0} Female)
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ffa94d]/10 text-[#ffa94d] rounded-lg font-extrabold self-start">
                    <Bed size={18} /> {viewPost.vacancyCount} Beds Remaining
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">About this Property</div>
              <p className="text-[14px] dark:text-[#a0a3b1] text-gray-600 leading-[1.6] mb-5">
                {viewPost.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
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
                  <span className="detail-value text-[#ffa94d] font-bold">★ {viewPost.pgId?.rating || 0}</span>
                </div>
              </div>
            </div>

            {viewPost.pgId?.facilities?.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Amenities &amp; Facilities</div>
                <div className="flex flex-wrap gap-2.5">
                  {viewPost.pgId.facilities.map(f => (
                    <div key={f._id} className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-[#242740] bg-gray-100 rounded-full text-[12px] border border-gray-200 dark:border-[#2d3052]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewPost.images && viewPost.images.length > 0 && (
              <div className="detail-section mt-5">
                <div className="detail-section-title">Vacancy Gallery</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {viewPost.images.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2d3052] block hover:border-[#6c63ff] transition-all">
                      <img src={img} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-gray-200 dark:border-[#2d3052] pt-6">
              {!viewPost.enquiryData ? (
                <Button 
                  onClick={() => handleEnquire(viewPost._id)}
                  loading={enquiryMut.isPending && enquiryMut.variables?.postId === viewPost._id}
                  className="w-full h-[52px] text-[16px] font-extrabold"
                >
                  Show Interest &amp; Connect
                </Button>
              ) : (
                <div className="dark:bg-[#242740] bg-gray-50 rounded-xl border border-[#51cf66]/30 p-5">
                  <div className="flex items-center gap-2 mb-4 text-[#51cf66]">
                    <CheckCircle2 size={20} />
                    <span className="text-[16px] font-extrabold">Enquiry Active!</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {viewPost.enquiryData.owner && (
                      <div className="flex justify-between items-center p-3 dark:bg-[#1a1d2e] bg-white rounded-lg">
                        <div>
                          <div className="text-[10px] dark:text-[#6b6e82] text-gray-500 uppercase font-extrabold mb-0.5">Property Owner</div>
                          <div className="text-[15px] font-bold dark:text-[#f0f0f8] text-gray-900">{viewPost.enquiryData.owner.name}</div>
                        </div>
                        
                        {viewPost.enquiryData.status === 'contacted' ? (
                          <a 
                            href={`tel:${viewPost.enquiryData.owner.mobNo1}`}
                            className="flex items-center gap-2 text-[#6c63ff] no-underline bg-[#6c63ff]/15 px-4 py-2 rounded-lg font-extrabold"
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
