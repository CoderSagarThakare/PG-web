import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getPostsApi, createPostApi, updatePostApi, deletePostApi } from '../../api/post.api';
import { getMyPGsApi } from '../../api/pg.api';
import { FileText, Plus, Edit2, Trash2, Bed } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, ConfirmModal } from '../../components/common';
import PostForm from '../../components/owner/PostForm';
import { getErrorMessage, formatPrice, formatDate } from '../../utils/helpers';

const defaultForm = {
  pgId: '', title: '', description: '', vacancyCount: '',
  occupancyType: 'single', pgType: 'unisex', pricePerBed: '', availableFrom: '',
};

const occupancyOptions = [
  { value: 'single', label: 'Single' }, { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' }, { value: 'four', label: 'Four' }, { value: 'other', label: 'Other' },
];
const pgTypeOptions = [
  { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' }, { value: 'coLiving', label: 'Co-Living' },
];

export default function ManagePosts() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => (await getPostsApi()).data?.data,
  });

  const { data: pgsData } = useQuery({
    queryKey: ['my-pgs'],
    queryFn: async () => (await getMyPGsApi()).data?.data,
    enabled: modalOpen,
  });

  const posts = postsData?.posts || [];
  const pgs = pgsData?.pgs || [];

  const createMut = useMutation({
    mutationFn: createPostApi,
    onSuccess: () => { toast.success('Post created!'); qc.invalidateQueries(['posts']); closeModal(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updatePostApi(id, data),
    onSuccess: () => { toast.success('Post updated!'); qc.invalidateQueries(['posts']); closeModal(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deletePostApi,
    onSuccess: () => { toast.success('Post deleted!'); qc.invalidateQueries(['posts']); setConfirmId(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const closeModal = () => { setModalOpen(false); setEditPost(null); };

  const openEdit = (post) => {
    setEditPost(post);
    setModalOpen(true);
  };

  const onSubmit = (formData) => {
    const payload = { ...formData, vacancyCount: Number(formData.vacancyCount), pricePerBed: Number(formData.pricePerBed) };
    if (editPost) updateMut.mutate({ id: editPost._id, data: payload });
    else createMut.mutate(payload);
  };

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vacancy Posts</h1>
          <p className="page-subtitle">Manage your vacancy listings</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> New Post</Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<FileText size={64} />} title="No posts yet"
          description="Create a vacancy post to attract tenants."
          action={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> New Post</Button>} />
      ) : (
        <div className="grid-2">
          {posts.map(post => (
            <Card key={post._id} hover>
              <div className="flex items-center justify-between mb-4">
                <Badge variant={post.isActive ? 'success' : 'danger'}>{post.isActive ? 'Active' : 'Inactive'}</Badge>
                <span className="text-xs text-muted">{formatDate(post.createdAt)}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{post.title}</div>
              <div className="text-sm text-muted mb-4">{post.pgId?.name}</div>
              <div className="chips mb-4">
                <span className="chip chip-primary">{post.occupancyType}</span>
                <span className="chip">{post.pgType}</span>
                <span className="chip"><Bed size={11} style={{ display: 'inline' }} /> {post.vacancyCount} vacancies</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>
                {formatPrice(post.pricePerBed)}<span className="text-sm text-muted">/bed</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(post)}><Edit2 size={14} /> Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmId(post._id)}><Trash2 size={14} /> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editPost ? 'Edit Post' : 'New Vacancy Post'} size="lg">
        <PostForm
          initialData={editPost}
          onSubmit={onSubmit}
          loading={createMut.isPending || updateMut.isPending}
          pgs={pgs}
          buttonText={editPost ? 'Update Post' : 'Create Post'}
        />
      </Modal>

      <ConfirmModal isOpen={!!confirmId} onClose={() => setConfirmId(null)}
        onConfirm={() => deleteMut.mutate(confirmId)} loading={deleteMut.isPending}
        title="Delete Post" message="Are you sure you want to delete this post?" />
    </div>
  );
}
