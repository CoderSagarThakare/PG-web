import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getPostsApi, createPostApi, updatePostApi, deletePostApi } from '../../api/post.api';
import { getMyPGsApi } from '../../api/pg.api';
import { FileText, Plus, Edit2, Trash2, Bed, ChevronLeft, ChevronRight, X, Image as ImageIcon, ZoomIn, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, Modal, Spinner, EmptyState, ConfirmModal } from '../../components/common';
import PostForm from '../../components/owner/PostForm';
import { getErrorMessage, formatPrice, formatDate } from '../../utils/helpers';

const occupancyOptions = [
  { value: 'single', label: 'Single' }, { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' }, { value: 'four', label: 'Four' }, { value: 'other', label: 'Other' },
];
const pgTypeOptions = [
  { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
  { value: 'unisex', label: 'Unisex' }, { value: 'coLiving', label: 'Co-Living' },
];

// ── Image Collage Strip (inline carousel on card) ──────────────────────────────
function PostImageStrip({ images, onOpenLightbox }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const stripRef = useRef(null);

  if (!images || images.length === 0) return null;

  const prev = (e) => {
    e.stopPropagation();
    setActiveIdx(i => (i - 1 + images.length) % images.length);
  };
  const next = (e) => {
    e.stopPropagation();
    setActiveIdx(i => (i + 1) % images.length);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden mb-3 group/strip" style={{ aspectRatio: '16/7' }}>
      {/* Main Image */}
      <img
        src={images[activeIdx]}
        alt={`Post image ${activeIdx + 1}`}
        className="w-full h-full object-cover transition-all duration-300"
        style={{ cursor: 'zoom-in' }}
        onClick={(e) => { e.stopPropagation(); onOpenLightbox(activeIdx); }}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Zoom hint */}
      <div className="absolute top-2 right-2 opacity-0 group-hover/strip:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
          <ZoomIn size={11} className="text-white" />
          <span className="text-[10px] text-white font-semibold">View</span>
        </div>
      </div>

      {/* Prev/Next buttons — only if multiple images */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/75 active:scale-90 transition-all opacity-0 group-hover/strip:opacity-100 z-10"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/75 active:scale-90 transition-all opacity-0 group-hover/strip:opacity-100 z-10"
          >
            <ChevronRight size={15} />
          </button>
        </>
      )}

      {/* Dot indicators + count badge */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
        {images.length > 1 && images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
            className={`rounded-full transition-all duration-200 ${
              i === activeIdx
                ? 'w-4 h-1.5 bg-white'
                : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

      {/* Image count badge */}
      {images.length > 1 && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white font-bold flex items-center gap-1 z-10">
          <ImageIcon size={10} />
          {images.length}
        </div>
      )}
    </div>
  );
}

// ── Lightbox / Fullscreen Viewer ───────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  const prev = useCallback((e) => {
    e.stopPropagation();
    setIdx(i => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback((e) => {
    e.stopPropagation();
    setIdx(i => (i + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation
  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length);
    if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
    if (e.key === 'Escape') onClose();
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
      onKeyDown={handleKey}
      tabIndex={0}
      ref={el => el?.focus()}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-10 border border-white/20"
      >
        <X size={18} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-[13px] font-semibold z-10 border border-white/10">
        {idx + 1} / {images.length}
      </div>

      {/* Main image */}
      <div
        className="relative w-full max-w-5xl max-h-[80vh] flex items-center justify-center px-14 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[idx]}
          alt={`Image ${idx + 1}`}
          className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl select-none"
          style={{ transition: 'opacity 0.2s ease' }}
        />
      </div>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-10"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-10"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10 px-4">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                i === idx
                  ? 'border-[#6c63ff] scale-110 shadow-lg shadow-[#6c63ff]/30'
                  : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ManagePosts Component ─────────────────────────────────────────────────
export default function ManagePosts() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { images: [], startIndex: 0 }

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

  const availablePgsForForm = editPost
    ? pgs
    : pgs.filter(pg => !posts.some(post => (post.pgId?._id || post.pgId) === pg._id));

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
    if (editPost) {
      payload.pgId = editPost.pgId?._id || editPost.pgId;
      updateMut.mutate({ id: editPost._id, data: payload });
    } else {
      createMut.mutate(payload);
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => {
            const hasImages = post.images && post.images.length > 0;
            return (
              <Card key={post._id} hover className="p-3 min-w-0 flex flex-col">
                {/* Image Collage Strip */}
                {hasImages && (
                  <PostImageStrip
                    images={post.images}
                    onOpenLightbox={(startIdx) => setLightbox({ images: post.images, startIndex: startIdx })}
                  />
                )}

                {/* No-image placeholder */}
                {!hasImages && (
                  <div className="w-full rounded-xl mb-3 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-[#242740] dark:to-[#1a1d2e] flex items-center justify-center border border-dashed border-gray-200 dark:border-[#2d3052]" style={{ aspectRatio: '16/7' }}>
                    <div className="flex flex-col items-center gap-1 opacity-30">
                      <ImageIcon size={28} className="dark:text-[#6b6e82] text-gray-400" />
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-[#6b6e82] uppercase tracking-wide">No Images</span>
                    </div>
                  </div>
                )}

                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={post.isActive ? 'success' : 'danger'} className="text-[10px] px-1.5 py-0.5">{post.isActive ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-[10px] dark:text-[#6b6e82] text-gray-500">{formatDate(post.createdAt)}</span>
                </div>

                <div className="text-sm font-bold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis dark:text-[#f0f0f8] text-gray-900">{post.title}</div>
                <div className="text-[11px] dark:text-[#6b6e82] text-gray-500 mb-2.5 whitespace-nowrap overflow-hidden text-ellipsis">{post.pgId?.name}</div>

                <div className="flex flex-wrap gap-1 mb-2.5">
                  {post.occupancyTypes?.map(type => (
                    <Badge key={type} variant="accent">{type}</Badge>
                  ))}
                  <Badge variant={post.pgType === 'male' ? 'info' : post.pgType === 'female' ? 'danger' : 'accent'}>
                    {post.pgType}
                  </Badge>

                  {/* Vacancy badge — gender split for unisex, single count otherwise */}
                  {post.pgType === 'unisex' ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      ♂ {post.maleVacancyCount ?? '?'} Male · ♀ {post.femaleVacancyCount ?? '?'} Female
                    </Badge>
                  ) : (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Bed size={10} /> {post.vacancyCount} Left
                    </Badge>
                  )}
                </div>

                {/* Warning: unisex post with null gender counts */}
                {post.pgType === 'unisex' && (post.maleVacancyCount === null || post.femaleVacancyCount === null) && (
                  <div className="flex items-center gap-1.5 text-[#ffa94d] bg-[#ffa94d]/8 border border-[#ffa94d]/25 rounded-lg px-2.5 py-1.5 mb-2 text-[11px] font-semibold">
                    <AlertTriangle size={11} className="shrink-0" />
                    Set ♂/♀ vacancy split — edit this post
                  </div>
                )}

                {/* Warning: manually deactivated but still has vacancies */}
                {!post.isActive && post.vacancyCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[#6b6e82] bg-gray-100 dark:bg-[#242740] border border-gray-200 dark:border-[#2d3052] rounded-lg px-2.5 py-1.5 mb-2 text-[11px] font-semibold">
                    <AlertTriangle size={11} className="shrink-0 text-[#ffa94d]" />
                    Deactivated — {post.vacancyCount} vacancies still available
                  </div>
                )}

                <p
                  className="text-[11.5px] dark:text-[#6b6e82] text-gray-500 mb-2.5 overflow-hidden flex-1"
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

                <div className="flex gap-2 justify-end border-t dark:border-[#2d3052]/50 border-gray-200 pt-2.5 mt-auto">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(post)} className="p-1.5 h-auto" title="Edit">
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(post._id)} className="p-1.5 h-auto text-[#ff4d6d]" title="Delete">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editPost ? 'Edit Post' : 'New Vacancy Post'} size="lg">
        {pgsData ? (
          <PostForm
            initialData={editPost}
            onSubmit={onSubmit}
            loading={createMut.isPending || updateMut.isPending}
            pgs={availablePgsForForm}
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

      {/* Fullscreen Lightbox */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
