import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getMyPGsApi } from '../../api/pg.api';
import { getPostsApi } from '../../api/post.api';
import { getEnquiriesApi } from '../../api/enquiry.api';
import { Building2, FileText, MessageSquare, TrendingUp, Users, Bed } from 'lucide-react';
import { StatCard, Card, Badge, Spinner } from '../../components/common';
import { formatDate, formatPrice } from '../../utils/helpers';
import { Link } from 'react-router-dom';

const statusVariant = {
  interested: 'info', contacted: 'warning', visited: 'purple',
  dealDone: 'success', rejected: 'danger',
};

export default function Dashboard() {
  const { user, isOwner, isManager } = useAuth();

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

  const recentEnquiries = enquiries.slice(0, 5);
  const recentPosts = posts.slice(0, 4);

  const totalBeds = pgs.reduce((s, p) => s + (p.totalBeds || 0), 0);
  const occupiedBeds = pgs.reduce((s, p) => s + (p.occupiedBeds || 0), 0);
  const emptyBeds = pgs.reduce((s, p) => s + (p.emptyBeds || 0), 0);
  const newEnquiries = enquiries.filter(e => e.status === 'interested').length;

  if (pgsLoading || postsLoading || enqLoading) return <Spinner center />;

  return (
    <div className="fade-in">
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening with your PGs today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {isOwner && (
          <StatCard label="Total PGs" value={pgs.length} color="primary" icon={<Building2 size={40} />} />
        )}
        <StatCard label="Active Posts" value={posts.filter(p => p.isActive).length} color="accent" icon={<FileText size={40} />} />
        <StatCard label="New Enquiries" value={newEnquiries} color="warning" icon={<MessageSquare size={40} />} />
        {isOwner && (
          <>
            <StatCard label="Empty Beds" value={emptyBeds} color="success" icon={<Bed size={40} />} />
            <StatCard label="Occupied Beds" value={occupiedBeds} color="danger" />
          </>
        )}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Recent Enquiries */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Recent Enquiries</div>
              <div className="card-subtitle">{enquiries.length} total leads</div>
            </div>
            <Link to="/enquiries"><button className="btn btn-ghost btn-sm">View All</button></Link>
          </div>

          {recentEnquiries.length === 0 ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>No enquiries yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentEnquiries.map(enq => (
                <div key={enq._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{enq.userId?.name || '—'}</div>
                    <div className="text-xs text-muted">{enq.postId?.title || '—'}</div>
                  </div>
                  <Badge variant={statusVariant[enq.status] || 'default'}>{enq.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Posts */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Vacancy Posts</div>
              <div className="card-subtitle">{posts.length} total posts</div>
            </div>
            <Link to="/posts"><button className="btn btn-ghost btn-sm">View All</button></Link>
          </div>

          {recentPosts.length === 0 ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '20px 0' }}>No posts yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentPosts.map(post => (
                <div key={post._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{post.title}</div>
                    <div className="text-xs text-muted">{post.pgId?.name} · {post.vacancyCount} vacancies</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{formatPrice(post.pricePerBed)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* PG Overview — Owner only */}
      {isOwner && pgs.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <div className="card-header">
            <div className="card-title">PG Overview</div>
            <Link to="/pgs"><button className="btn btn-ghost btn-sm">Manage</button></Link>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>PG Name</th>
                  <th>Location</th>
                  <th>Rooms</th>
                  <th>Empty Beds</th>
                  <th>Occupied</th>
                  <th>Manager</th>
                </tr>
              </thead>
              <tbody>
                {pgs.map(pg => (
                  <tr key={pg._id}>
                    <td style={{ fontWeight: 600 }}>{pg.name}</td>
                    <td className="text-sm text-muted">{pg.address?.city}, {pg.address?.state}</td>
                    <td>{pg.totalRooms}</td>
                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{pg.emptyBeds || 0}</span></td>
                    <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>{pg.occupiedBeds || 0}</span></td>
                    <td className="text-sm">{pg.managerId?.name || <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
