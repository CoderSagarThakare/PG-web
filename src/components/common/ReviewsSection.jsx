import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrUpdateReviewApi, getPGReviewsApi, getMyReviewApi, deleteReviewApi } from '../../api/review.api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Badge, Spinner } from './index';
import { Star, MessageSquare, Trash2, Edit2, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/helpers';

const renderStars = (score, size = 16) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((starVal) => {
        const diff = score - (starVal - 1);
        let fillPercent = 0;
        if (diff >= 1) fillPercent = 100;
        else if (diff > 0) fillPercent = Math.round(diff * 100);

        return (
          <div key={starVal} className="relative select-none" style={{ width: size, height: size }}>
            <Star
              size={size}
              className="text-gray-200 dark:text-[#2d3052] absolute top-0 left-0 stroke-[1.5]"
            />
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 overflow-hidden h-full"
                style={{ width: `${fillPercent}%` }}
              >
                <Star
                  size={size}
                  className="fill-[#ffa94d] text-[#ffa94d] stroke-[1.5]"
                  style={{ minWidth: size }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function ReviewsSection({ pgId }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  // Form states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Query 1: Get all reviews for this PG
  const { data: reviewsData, isLoading: loadingReviews, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', pgId, page],
    queryFn: async () => (await getPGReviewsApi(pgId, { page, limit: 5 })).data?.data,
  });

  // Query 2: Get my review status (only if logged in and role is 'user' or 'employee')
  const canReviewRole = user && (user.role === 'user' || user.role === 'employee');
  const { data: myReviewData, isLoading: loadingMyReview } = useQuery({
    queryKey: ['my-review', pgId],
    queryFn: async () => (await getMyReviewApi(pgId)).data?.data,
    enabled: !!canReviewRole && !!pgId,
  });

  const review = myReviewData?.review;
  const isEligible = myReviewData?.isEligible;

  // Sync edit form with existing review
  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setComment(review.comment || '');
    } else {
      setRating(5.0);
      setComment('');
    }
  }, [review]);

  // Mutation: Create or update review
  const submitMutation = useMutation({
    mutationFn: createOrUpdateReviewApi,
    onSuccess: () => {
      toast.success(review ? 'Review updated!' : 'Review submitted!');
      qc.invalidateQueries({ queryKey: ['reviews', pgId] });
      qc.invalidateQueries({ queryKey: ['my-review', pgId] });
      qc.invalidateQueries({ queryKey: ['pg-detail', pgId] });
      qc.invalidateQueries({ queryKey: ['pg', pgId] });
      qc.invalidateQueries({ queryKey: ['discover-pgs'] });
      qc.invalidateQueries({ queryKey: ['browse-posts'] });
      setIsEditing(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Mutation: Delete review
  const deleteMutation = useMutation({
    mutationFn: deleteReviewApi,
    onSuccess: () => {
      toast.success('Review deleted!');
      qc.invalidateQueries({ queryKey: ['reviews', pgId] });
      qc.invalidateQueries({ queryKey: ['my-review', pgId] });
      qc.invalidateQueries({ queryKey: ['pg-detail', pgId] });
      qc.invalidateQueries({ queryKey: ['pg', pgId] });
      qc.invalidateQueries({ queryKey: ['discover-pgs'] });
      qc.invalidateQueries({ queryKey: ['browse-posts'] });
      setRating(5.0);
      setComment('');
      setIsEditing(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    submitMutation.mutate({ pgId, rating, comment });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete your review?')) {
      deleteMutation.mutate(review._id);
    }
  };

  return (
    <div className="flex flex-col gap-6 mt-2">
      <div className="h-px dark:bg-[#2d3052] bg-gray-200" />
      
      <h2 className="text-lg font-bold flex items-center gap-2 dark:text-[#f0f0f8] text-gray-900">
        <MessageSquare size={18} className="text-[#6c63ff]" /> Stays Reviews
      </h2>

      {/* Review Form - Verified Residents & Staff Only */}
      {canReviewRole && isEligible && (
        <Card className="p-4 border border-[#6c63ff]/15 dark:bg-[#242740]/10 bg-gray-50/50">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold dark:text-[#f0f0f8] text-gray-800">
                {review ? 'Your Review' : 'Rate your stay'}
              </span>
              {review && !isEditing && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={12} className="mr-1" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-[11px] font-bold text-red-500 hover:text-red-600"
                    onClick={handleDelete}
                    loading={deleteMutation.isPending}
                  >
                    <Trash2 size={12} className="mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>

            {(!review || isEditing) ? (
              <div className="flex flex-col gap-3.5">
                {/* Stars Selector (Visual + Precise Slider Input) */}
                <div className="flex flex-col gap-2.5 bg-white dark:bg-[#1a1d2e] p-3 rounded-xl border border-gray-100 dark:border-[#2d3052]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500 dark:text-[#6b6e82] font-semibold">Your Score:</span>
                    {renderStars(rating, 24)}
                    <span className="text-sm font-black text-[#ffa94d] ml-1">
                      {rating > 0 ? rating.toFixed(1) : '0.0'} / 5.0
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={rating || 3.0}
                      onChange={(e) => setRating(parseFloat(e.target.value))}
                      className="flex-1 accent-[#6c63ff] h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-[#2d3052]"
                    />
                    <input
                      type="number"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={rating || ''}
                      onChange={(e) => {
                        let val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          val = Math.max(1, Math.min(5, val));
                          setRating(parseFloat(val.toFixed(1)));
                        } else {
                          setRating(0);
                        }
                      }}
                      placeholder="3.5"
                      className="w-16 h-8 text-center rounded-lg border border-gray-200 dark:border-[#2d3052] bg-white dark:bg-[#1a1d2e] text-[13px] font-black text-[#ffa94d] outline-none focus:border-[#6c63ff]"
                    />
                  </div>
                </div>

                {/* Comment Textarea */}
                <textarea
                  placeholder="Share your experience (cleanliness, facilities, food quality, owner behavior...)"
                  className="w-full min-h-[80px] p-3 rounded-xl border border-gray-200 dark:border-[#2d3052] bg-white dark:bg-[#1a1d2e] dark:text-[#f0f0f8] text-gray-900 text-[13px] outline-none focus:border-[#6c63ff] transition-colors resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                />

                {/* Submit Actions */}
                <div className="flex gap-2 justify-end">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="font-bold text-[12px] h-9 px-4"
                      onClick={() => {
                        setIsEditing(false);
                        setRating(review?.rating || 0);
                        setComment(review?.comment || '');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="font-bold text-[12px] h-9 px-5 bg-[#6c63ff] hover:bg-[#5b52e0] text-white"
                    loading={submitMutation.isPending}
                  >
                    <Send size={12} className="mr-1.5" /> Submit Review
                  </Button>
                </div>
              </div>
            ) : (
              // Display mode (when they have already rated and aren't actively editing)
              <div className="flex flex-col gap-2 bg-white dark:bg-[#1a1d2e] p-3 rounded-xl border border-gray-100 dark:border-[#2d3052]/40">
                <div className="flex items-center gap-1.5">
                  {renderStars(review.rating, 14)}
                  <span className="text-[11px] font-bold text-[#ffa94d]">{review.rating.toFixed(1)}</span>
                  <span className="text-[11px] dark:text-[#6b6e82] text-gray-400 font-semibold ml-1">
                    {new Date(review.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-[12.5px] dark:text-[#a0a3b1] text-gray-600 leading-relaxed italic">
                    "{review.comment}"
                  </p>
                )}
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Eligible but not logged in widget */}
      {!user && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#242740]/10 border border-dashed border-gray-200 dark:border-[#2d3052] rounded-xl text-[12px] dark:text-[#a0a3b1] text-gray-500">
          <AlertCircle size={14} className="text-[#6c63ff] shrink-0" />
          <span>Please log in to rate this property.</span>
        </div>
      )}

      {/* Reviews List */}
      {loadingReviews ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : !reviewsData?.reviews || reviewsData.reviews.length === 0 ? (
        <div className="text-center py-8 dark:bg-[#242740]/10 bg-gray-50/20 rounded-2xl border border-dashed border-gray-200 dark:border-[#2d3052]/50">
          <div className="text-2xl mb-1">💬</div>
          <h4 className="text-[14px] font-bold dark:text-[#f0f0f8] text-gray-800">No reviews yet</h4>
          <p className="text-[11px] dark:text-[#6b6e82] text-gray-500 mt-0.5">Be the first to share your experience about this stay!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviewsData.reviews.filter((rev) => !review || rev._id !== review._id).length === 0 ? (
            <div className="text-center py-6 dark:bg-[#242740]/10 bg-gray-50/20 rounded-2xl border border-dashed border-gray-200 dark:border-[#2d3052]/50 text-[12px] font-semibold dark:text-[#6b6e82] text-gray-500">
              💬 No other reviews yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reviewsData.reviews
                .filter((rev) => !review || rev._id !== review._id)
                .map((rev) => (
              <div 
                key={rev._id} 
                className="p-3.5 rounded-xl border border-gray-200 dark:border-[#2d3052] bg-white dark:bg-[#1a1d2e] flex flex-col gap-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* User profile initial avatar */}
                    <div className="w-8 h-8 rounded-full bg-[#6c63ff]/10 border border-[#6c63ff]/20 text-[#6c63ff] font-extrabold flex items-center justify-center text-[12px] uppercase select-none">
                      {rev.userId?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold dark:text-[#f0f0f8] text-gray-800 leading-snug">
                        {rev.userId?.name || 'Unknown User'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {renderStars(rev.rating, 12)}
                        <span className="text-[10px] font-black text-[#ffa94d]">{rev.rating.toFixed(1)}</span>
                        <span className="text-[10px] dark:text-[#6b6e82] text-gray-400 font-medium">
                          • {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-[12.5px] dark:text-[#a0a3b1] text-gray-600 leading-relaxed bg-gray-50/50 dark:bg-[#242740]/10 p-2.5 rounded-lg border-l-2 border-[#ffa94d]/40">
                    {rev.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

          {/* Pagination */}
          {reviewsData.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] font-bold px-3"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="flex items-center text-[11px] dark:text-[#a0a3b1] text-gray-500 font-semibold px-2">
                Page {page} of {reviewsData.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] font-bold px-3"
                disabled={page === reviewsData.totalPages}
                onClick={() => setPage(p => Math.min(p + 1, reviewsData.totalPages))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
