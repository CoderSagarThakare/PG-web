import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getMyPGsApi } from '../../api/pg.api';
import { getPostsApi } from '../../api/post.api';
import { getEnquiriesApi } from '../../api/enquiry.api';
import { Building2, FileText, MessageSquare, Bed, UserCircle2, ChevronRight, TrendingUp } from 'lucide-react';
import { Badge, Spinner } from '../../components/common';
import { formatPrice } from '../../utils/helpers';
import { Link } from 'react-router-dom';

const statusConfig = {
  interested:  { label: 'Interested',  variant: 'info' },
  contacted:   { label: 'Contacted',   variant: 'warning' },
  visited:     { label: 'Visited',     variant: 'purple' },
  dealDone:    { label: 'Deal Done',   variant: 'success' },
  rejected:    { label: 'Rejected',    variant: 'danger' },
};

function MiniStatCard({ label, value, color }) {
  return (
    <div className={`dash-stat-card dash-stat-${color}`}>
      <span className="dash-stat-label">{label}</span>
      <span className="dash-stat-value">{value}</span>
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

  const { data: enquiriesData, isLoading: enqLoading } = useQuery({
    queryKey: ['enquiries', ''],
    queryFn: async () => (await getEnquiriesApi()).data?.data,
  });

  const pgs = pgsData?.pgs || [];
  const posts = postsData?.posts || [];
  const enquiries = enquiriesData?.enquiries || [];

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

  return (
    <div className="dash-page fade-in">

      {/* ───── Welcome ───── */}
      <div className="dash-welcome">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening with your PGs today.</p>
      </div>

      {/* ───── Stats 2×2 Grid ───── */}
      <div className="dash-stats-grid">
        {isOwner && <MiniStatCard label="TOTAL PGS"      value={pgs.length}   color="primary" />}
        <MiniStatCard             label="ACTIVE POSTS"   value={activePosts}  color="success" />
        <MiniStatCard             label="NEW ENQUIRIES"  value={newEnquiries} color="warning" />
        {isOwner && <MiniStatCard label="EMPTY BEDS"     value={emptyBeds}    color="accent"  />}
      </div>

      {/* ───── Occupied Beds — full-width accent card ───── */}
      {isOwner && (
        <div className="dash-wide-stat dash-stat-danger">
          <div>
            <span className="dash-stat-label">OCCUPIED BEDS</span>
            <span className="dash-stat-value">{occupiedBeds}</span>
          </div>
          <span className="dash-occupancy-pill">{occupancyRate}% Occupancy</span>
        </div>
      )}

      {/* ───── Vacancy Posts ───── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Vacancy Posts</h2>
            <p className="dash-card-sub">{posts.length} total posts</p>
          </div>
          <Link to="/posts" className="dash-view-all">View All</Link>
        </div>

        {recentPosts.length === 0 ? (
          <p className="dash-empty">No posts yet.</p>
        ) : (
          <div className="dash-list">
            {recentPosts.map(post => (
              <div key={post._id} className="dash-post-row">
                <div className="dash-post-info">
                  <span className="dash-post-title">{post.title}</span>
                  <span className="dash-post-meta">
                    {post.pgId?.name} · {post.vacancyCount} {post.vacancyCount === 1 ? 'vacancy' : 'vacancies'}
                  </span>
                </div>
                <div className="dash-post-price">
                  <span className="dash-price-min">{formatPrice(post.minPrice)} –</span>
                  <span className="dash-price-max">{formatPrice(post.maxPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ───── Recent Enquiries ───── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Recent Enquiries</h2>
            <p className="dash-card-sub">{enquiries.length} total leads</p>
          </div>
          <Link to="/enquiries" className="dash-view-all">View All</Link>
        </div>

        {recentEnquiries.length === 0 ? (
          <p className="dash-empty">No enquiries yet.</p>
        ) : (
          <div className="dash-list">
            {recentEnquiries.map(enq => {
              const cfg = statusConfig[enq.status] || { label: enq.status, variant: 'default' };
              return (
                <div key={enq._id} className="dash-enq-row">
                  <div className="dash-enq-avatar">
                    <UserCircle2 size={20} />
                  </div>
                  <div className="dash-enq-info">
                    <span className="dash-enq-name">{enq.userId?.name || '—'}</span>
                    <span className="dash-enq-post">{enq.postId?.title || '—'}</span>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───── PG Overview — Owner only ───── */}
      {isOwner && recentPGs.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">PG Overview</h2>
            <Link to="/pg" className="btn btn-ghost btn-sm">Manage</Link>
          </div>

          {/* Column headers */}
          <div className="dash-pg-header">
            <span>PG NAME</span>
            <span>LOCATION</span>
          </div>

          <div className="dash-list">
            {recentPGs.map(pg => (
              <div key={pg._id} className="dash-pg-row">
                <span className="dash-pg-name">{pg.name}</span>
                <span className="dash-pg-location">
                  {pg.address?.city}{pg.address?.state ? `, ${pg.address.state}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacer so last card clears the bottom nav on mobile */}
      <div style={{ height: 8 }} />
    </div>
  );
}
