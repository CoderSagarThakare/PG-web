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
  occupancyType: 'single', pgType: 'unisex', minPrice: '', maxPrice: '', availableFrom: '',
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
    const payload = { ...formData, vacancyCount: Number(formData.vacancyCount), minPrice: Number(formData.minPrice), maxPrice: Number(formData.maxPrice) };
    if (editPost) updateMut.mutate({ id: editPost._id, data: payload });
    else createMut.mutate(payload);
  };

  if (isLoading) return <Spinner center />;

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-[#f0f0f8] text-gray-900">Vacancy Posts</h1>
          <p className="text-sm dark:text-[#6b6e82] text-gray-500 mt-1">Manage your vacancy listings</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> New Post</Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<FileText size={64} />} title="No posts yet"
          description="Create a vacancy post to attract tenants."
          action={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> New Post</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {posts.map(post => (
            <Card key={post._id} hover className="p-3 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={post.isActive ? 'success' : 'danger'} style={{ fontSize: 9, padding: '2px 6px' }}>{post.isActive ? 'Active' : 'Inactive'}</Badge>
                <span className="text-[10px] dark:text-[#6b6e82] text-gray-500">{formatDate(post.createdAt)}</span>
              </div>

              <div className="text-sm font-bold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis dark:text-[#f0f0f8] text-gray-900">{post.title}</div>
              <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-2.5 whitespace-nowrap overflow-hidden text-ellipsis">{post.pgId?.name}</div>

              <div className="flex flex-wrap gap-1 mb-2.5">
                <Badge variant="accent">{post.occupancyType}</Badge>
                <Badge variant={post.pgType === 'male' ? 'info' : post.pgType === 'female' ? 'danger' : 'accent'}>
                  {post.pgType}
                </Badge>
                <Badge variant="default" className="flex items-center gap-1">
                  <Bed size={10} /> {post.vacancyCount} Left
                </Badge>
              </div>

              <p
                className="text-[11.5px] dark:text-[#6b6e82] text-gray-500 mb-2.5 overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.4',
                  height: '2.8em',
                }}
              >
                {post.description}
              </p>

              <div className="text-lg font-extrabold text-[#00d4aa] mb-3">
                {formatPrice(post.minPrice)} - {formatPrice(post.maxPrice)}<span className="text-[10px] dark:text-[#6b6e82] text-gray-500 font-normal">/mo</span>
              </div>

              <div className="flex gap-2 justify-end border-t dark:border-[#2d3052]/50 border-gray-200 pt-2.5">
                <Button variant="ghost" size="sm" onClick={() => openEdit(post)} className="p-1.5 h-auto" title="Edit">
                  <Edit2 size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmId(post._id)} className="p-1.5 h-auto text-[#ff4d6d]" title="Delete">
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editPost ? 'Edit Post' : 'New Vacancy Post'} size="lg">
        {pgsData ? (
          <PostForm
            initialData={editPost}
            onSubmit={onSubmit}
            loading={createMut.isPending || updateMut.isPending}
            pgs={pgs}
            buttonText={editPost ? 'Update Post' : 'Create Post'}
            onCancel={closeModal}
          />
        ) : (
          <Spinner center />
        )}
      </Modal>

      <ConfirmModal isOpen={!!confirmId} onClose={() => setConfirmId(null)}
        onConfirm={() => deleteMut.mutate(confirmId)} loading={deleteMut.isPending}
        title="Delete Post" message="Are you sure you want to delete this post?" />
    </div>
  );
}
