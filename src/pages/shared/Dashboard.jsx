import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getMyPGsApi } from '../../api/pg.api';
import { getPostsApi } from '../../api/post.api';
import { getEnquiriesApi } from '../../api/enquiry.api';
import { getVacatingBedsApi } from '../../api/preBooking.api';
import { Building2, FileText, MessageSquare, Bed, UserCircle2, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge, Spinner, QueryError } from '../../components/common';
import { formatPrice } from '../../utils/helpers';
import { Link } from 'react-router-dom';

const statusConfig = {
  interested:  { label: 'Interested',  variant: 'info' },
  contacted:   { label: 'Contacted',   variant: 'warning' },
  visited:     { label: 'Visited',     variant: 'purple' },
  dealDone:    { label: 'Deal Done',   variant: 'success' },
  dealdone:    { label: 'Deal Done',   variant: 'success' },
  rejected:    { label: 'Rejected',    variant: 'danger' },
};

const colorMap = {
  primary: '#6c63ff',
  success: '#51cf66',
  warning: '#ffa94d',
  accent:  '#00d4aa',
  danger:  '#ff4d6d',
};

const pgTypeLabels = { male: 'Male', female: 'Female', unisex: 'Unisex', coLiving: 'Co-Living' };
const pgTypeColors = { male: 'info', female: 'purple', unisex: 'accent', coLiving: 'warning' };

function MiniStatCard({ label, value, color }) {
  const barColor = colorMap[color] || '#6c63ff';
  const valueColor = colorMap[color] || '#6c63ff';
  return (
    <div className="relative bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-4 overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-xl" style={{ background: barColor }} />
      <span className="block text-[10px] font-bold uppercase tracking-[0.9px] dark:text-[#6b6e82] text-gray-500 mb-2.5">{label}</span>
      <span className="block text-[28px] font-black leading-none" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user, isOwner } = useAuth();

  const { data: pgsData, isLoading: pgsLoading } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
    enabled: isOwner,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => (await getPostsApi()).data?.data,
  });

  const { data: enquiriesData, isLoading: enqLoading, isError: enqError, error: enqErrObj, refetch: enqRefetch } = useQuery({
    queryKey: ['enquiries', ''],
    queryFn: async () => (await getEnquiriesApi()).data?.data,
    retry: 1,
  });

  const pgs = pgsData?.pgs || [];
  const posts = postsData?.posts || [];
  const enquiries = enquiriesData?.enquiries || [];

  const { data: vacatingData } = useQuery({
    queryKey: ['vacating-beds-dashboard'],
    queryFn: async () => {
      if (!pgs.length) return [];
      const results = await Promise.all(pgs.map(pg => getVacatingBedsApi(pg._id).then(r => r.data?.data || []).catch(() => [])));
      return results.flat();
    },
    enabled: isOwner && pgs.length > 0,
  });
  const vacatingBeds = vacatingData || [];

  const totalBeds     = pgs.reduce((s, p) => s + (p.totalBeds || 0), 0);
  const occupiedBeds  = pgs.reduce((s, p) => s + (p.occupiedBeds || 0), 0);
  const emptyBeds     = pgs.reduce((s, p) => s + (p.emptyBeds || 0), 0);
  const activePosts   = posts.filter(p => p.isActive).length;
  const newEnquiries  = enquiries.filter(e => e.status === 'interested').length;
  const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

  const recentPosts     = posts.slice(0, 4);
  const recentEnquiries = enquiries.slice(0, 5);
  const recentPGs       = pgs.slice(0, 5);

  if (pgsLoading || postsLoading || enqLoading) return <Spinner center />;
  if (enqError) return <QueryError onRetry={enqRefetch} error={enqErrObj} />;

  return (
    <div className="fade-in flex flex-col gap-3.5">

      {/* ───── Welcome ───── */}
      <div className="mb-1.5">
        <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900 leading-tight mb-1">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm dark:text-[#6b6e82] text-gray-500">Here's what's happening with your PGs today.</p>
      </div>

      {/* ───── Stats Grid ───── */}
      <div className={isOwner ? "grid grid-cols-2 md:grid-cols-5 gap-3" : "grid grid-cols-2 gap-3"}>
        {isOwner && <MiniStatCard label="TOTAL PGS"      value={pgs.length}   color="primary" />}
        <MiniStatCard             label="ACTIVE POSTS"   value={activePosts}  color="success" />
        <MiniStatCard             label="NEW ENQUIRIES"  value={newEnquiries} color="warning" />
        {isOwner && <MiniStatCard label="EMPTY BEDS"     value={emptyBeds}    color="accent"  />}
        {isOwner && (
          <div className="relative bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-4 flex flex-row md:flex-col lg:flex-row items-center md:items-start lg:items-center justify-between gap-3 overflow-hidden col-span-2 md:col-span-1 transition-transform hover:-translate-y-0.5">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#ff4d6d] rounded-t-xl" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.9px] dark:text-[#6b6e82] text-gray-500 mb-2.5">OCCUPIED BEDS</span>
              <span className="block text-[28px] font-black leading-none text-[#ff4d6d]">{occupiedBeds}</span>
            </div>
            <span className="text-[11px] font-bold text-[#ff4d6d] bg-[#ff4d6d]/12 border border-[#ff4d6d]/20 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 md:mt-2 lg:mt-0">{occupancyRate}% Occupancy</span>
          </div>
        )}
      </div>

      {isOwner && vacatingBeds.length > 0 && (
        <div className="bg-[#ff4d6d]/5 dark:bg-[#ff4d6d]/8 border border-[#ff4d6d]/20 rounded-xl p-4 transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#ff4d6d]" />
              <h2 className="text-base font-black text-[#ff4d6d]">Vacating Soon</h2>
              <Badge variant="danger" className="text-[10px]">{vacatingBeds.length}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {vacatingBeds.slice(0, 5).map(bed => (
              <div key={bed._id} className="flex items-center justify-between py-2 border-b border-[#ff4d6d]/10 last:border-0 text-sm">
                <div>
                  <span className="font-bold dark:text-[#f0f0f8] text-gray-900">{bed.userId?.name || 'Tenant'}</span>
                  <span className="text-[11px] dark:text-[#6b6e82] text-gray-500 ml-2">Room {bed.roomId?.roomNumber} · Bed {bed.bedNumber?.split('-')?.[1] || bed.bedNumber}</span>
                </div>
                <span className="text-xs font-bold text-[#ff4d6d]">
                  {bed.vacatingDetails?.vacatingDate ? new Date(bed.vacatingDetails.vacatingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── Vacancy Posts & Recent Enquiries (50-50 desktop view, stacked mobile) ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ───── Vacancy Posts ───── */}
        <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-4 transition-shadow hover:shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <div>
              <h2 className="text-base font-black dark:text-[#f0f0f8] text-gray-900 leading-tight mb-0.5">Vacancy Posts</h2>
              <p className="text-xs dark:text-[#6b6e82] text-gray-500">{posts.length} total posts</p>
            </div>
            <Link to="/posts" className="flex-shrink-0 text-xs font-bold text-[#6c63ff] bg-[#6c63ff]/15 px-3 py-1.5 rounded-full transition-all hover:bg-[#6c63ff] hover:text-white whitespace-nowrap">View All</Link>
          </div>

          {recentPosts.length === 0 ? (
            <p className="text-center dark:text-[#6b6e82] text-gray-400 text-sm py-5">No posts yet.</p>
          ) : (
            <div className="flex flex-col">
              {recentPosts.map(post => (
                <div key={post._id} className="flex items-start justify-between gap-3 py-3 border-b border-[#2d3052]/50 dark:border-[#2d3052]/50 last:border-0">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900 leading-snug line-clamp-2">{post.title}</span>
                    <span className="text-[11px] dark:text-[#6b6e82] text-gray-400 truncate">
                      {post.pgId?.name} · {post.vacancyCount} {post.vacancyCount === 1 ? 'vacancy' : 'vacancies'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end md:flex-row md:items-center md:gap-1 flex-shrink-0 text-xs font-bold">
                    <span className="text-[#00d4aa]">{formatPrice(post.minPrice)}<span className="md:hidden"> –</span></span>
                    <span className="hidden md:inline dark:text-[#a0a3b1] text-gray-500">–</span>
                    <span className="dark:text-[#a0a3b1] text-gray-500">{formatPrice(post.maxPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ───── Recent Enquiries ───── */}
        <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-4 transition-shadow hover:shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <div>
              <h2 className="text-base font-black dark:text-[#f0f0f8] text-gray-900 leading-tight mb-0.5">Recent Enquiries</h2>
              <p className="text-xs dark:text-[#6b6e82] text-gray-500">{enquiries.length} total leads</p>
            </div>
            <Link to="/enquiries" className="flex-shrink-0 text-xs font-bold text-[#6c63ff] bg-[#6c63ff]/15 px-3 py-1.5 rounded-full transition-all hover:bg-[#6c63ff] hover:text-white whitespace-nowrap">View All</Link>
          </div>

          {recentEnquiries.length === 0 ? (
            <p className="text-center dark:text-[#6b6e82] text-gray-400 text-sm py-5">No enquiries yet.</p>
          ) : (
            <div className="flex flex-col">
              {recentEnquiries.map(enq => {
                const cfg = statusConfig[enq.status?.toLowerCase()] || statusConfig[enq.status] || { label: enq.status, variant: 'default' };
                return (
                  <div key={enq._id} className="flex items-center gap-3 py-2.5 border-b border-[#2d3052]/50 dark:border-[#2d3052]/50 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-[#6b6e82]">
                      <UserCircle2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-900 truncate">{enq.userId?.name || '—'}</span>
                      <span className="text-[11px] dark:text-[#6b6e82] text-gray-400 truncate">{enq.postId?.title || '—'}</span>
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ───── PG Overview — Owner only ───── */}
      {isOwner && recentPGs.length > 0 && (
        <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-xl p-4 transition-shadow hover:shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <h2 className="text-base font-black dark:text-[#f0f0f8] text-gray-900 leading-tight mb-0.5">PG Overview</h2>
            <Link to="/pg" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-[#242740] text-gray-900 dark:text-[#f0f0f8] hover:bg-gray-200 dark:hover:bg-[#2d3052] transition-colors">Manage</Link>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1.4fr_0.6fr] md:grid-cols-[2.5fr_1.5fr_1fr_0.8fr_1.2fr_0.8fr] py-2 pb-2.5 border-b border-gray-200 dark:border-[#2d3052] mb-1">
            <span className="text-[10px] font-bold dark:text-[#6b6e82] text-gray-400 uppercase tracking-[0.8px]">PG NAME</span>
            <span className="text-[10px] font-bold dark:text-[#6b6e82] text-gray-400 uppercase tracking-[0.8px]">LOCATION</span>
            <span className="hidden md:inline text-[10px] font-bold dark:text-[#6b6e82] text-gray-400 uppercase tracking-[0.8px]">TYPE</span>
            <span className="hidden md:inline text-[10px] font-bold dark:text-[#6b6e82] text-gray-400 uppercase tracking-[0.8px]">ROOMS</span>
            <span className="hidden md:inline text-[10px] font-bold dark:text-[#6b6e82] text-gray-400 uppercase tracking-[0.8px]">VACANT BEDS</span>
            <span className="hidden md:inline text-[10px] font-bold dark:text-[#6b6e82] text-gray-400 uppercase tracking-[0.8px]">RATING</span>
          </div>

          <div className="flex flex-col">
            {recentPGs.map(pg => (
              <div key={pg._id} className="grid grid-cols-[1.4fr_0.6fr] md:grid-cols-[2.5fr_1.5fr_1fr_0.8fr_1.2fr_0.8fr] py-3 border-b border-[#2d3052]/50 dark:border-[#2d3052]/50 gap-2 last:border-0 items-center">
                <span className="text-[13px] font-semibold dark:text-[#f0f0f8] text-gray-900 leading-snug">{pg.name}</span>
                <span className="text-[13px] dark:text-[#a0a3b1] text-gray-500 leading-snug">
                  {pg.address?.city}{pg.address?.state ? `, ${pg.address.state}` : ''}
                </span>
                <span className="hidden md:inline text-[13px] leading-snug">
                  <Badge variant={pgTypeColors[pg.pgType] || 'default'}>{pgTypeLabels[pg.pgType] || pg.pgType}</Badge>
                </span>
                <span className="hidden md:inline text-[13px] font-medium dark:text-[#f0f0f8] text-gray-900 leading-snug">{pg.totalRooms}</span>
                <span className="hidden md:inline text-[13px] font-bold text-[#00d4aa] leading-snug">{pg.emptyBeds ?? 0}</span>
                <span className="hidden md:inline text-[13px] font-semibold text-[#ffa94d] leading-snug">★ {pg.rating ? pg.rating.toFixed(1) : '0.0'} ({pg.numReviews ?? 0})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer so last card clears the bottom nav on mobile */}
      <div className="h-2" />
    </div>
  );
}
