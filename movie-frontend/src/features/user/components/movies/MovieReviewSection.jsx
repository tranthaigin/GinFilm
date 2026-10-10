import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import UserPagination from '../UserPagination';
import ReportReviewModal from './ReportReviewModal';
import { getMembershipTier } from '../../../../shared/constants/membership';
import { useMembershipStore } from '../../../../shared/store/membershipStore';
import { useToastStore } from '../../store/toastStore';

function formatReactionCount(count) {
  if (!count) return '';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + ' Tr';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
  }
  return count.toLocaleString('vi-VN');
}

const getDisplayUsername = (usernameOrEmail) => {
  if (!usernameOrEmail) return 'user';
  return usernameOrEmail.split('@')[0];
};

const getUserAvatarUrl = (username) => {
  const displayUsername = getDisplayUsername(username);
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(displayUsername)}&backgroundColor=transparent`;
};

const getAvatarInitial = (username) => {
  const displayUsername = getDisplayUsername(username);
  return displayUsername.charAt(0).toUpperCase();
};

const getStarColor = (star) => {
  switch (Math.floor(star)) {
    case 5: return 'rgb(16, 185, 129)';
    case 4: return 'rgb(132, 204, 22)';
    case 3: return 'rgb(245, 158, 11)';
    case 2: return 'rgb(249, 115, 22)';
    case 1: return 'rgb(239, 68, 68)';
    default: return '#aaaaaa';
  }
};

export default function MovieReviewSection({
  reviews,
  avgRating,
  totalVerifiedReviews,
  starCounts,
  currentPage,
  totalPages,
  setCurrentPage,
  expandedReviews,
  toggleReviewExpand,
  revealedSpoilers,
  setRevealedSpoilers,
  handleReaction,
  handleReportReview,
  currentUser,
  isAuthenticated,
  highlightReviewId
}) {
  const [reportModalReviewId, setReportModalReviewId] = useState(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const reviewRefs = useRef({});
  const membershipTiers = useMembershipStore((state) => state.tiers);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    if (!highlightReviewId) return;
    // wait for reviews to render
    const timeout = setTimeout(() => {
      const el = reviewRefs.current[highlightReviewId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setIsHighlighting(true), 400);
        setTimeout(() => setIsHighlighting(false), 3000);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [highlightReviewId, reviewRefs.current]);

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-xl mt-6 w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[20px] font-bold text-[#111827] dark:text-white">Đánh Giá Từ Khán Giả</h2>
      </div>

      {/* Obsidian-Style Rating Summary Box */}
      <div className="bg-[#f9f9f9] dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-10 flex flex-col md:flex-row gap-8 mb-10 shadow-lg">
        {/* Left: Overall Rating */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-[12px] font-bold text-[#9D9D9D] uppercase tracking-widest mb-3">Đánh Giá Tổng Quan</span>
          <div className="flex items-end justify-center gap-1 mb-3">
            <span className="text-[72px] font-bold text-[#111827] dark:text-white leading-none tracking-tighter">{avgRating}</span>
            <span className="text-[24px] text-gray-500 font-bold mb-3">/5</span>
          </div>
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(s => {
              const fillPercent = Math.min(100, Math.max(0, (avgRating - (s - 1)) * 100));
              return (
                <div key={s} className="relative inline-flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] text-gray-300 dark:text-gray-600">star</span>
                  <div
                    className="absolute top-0 left-0 overflow-hidden h-full flex items-center"
                    style={{ width: `${fillPercent}%` }}
                  >
                    <span className="material-symbols-outlined text-[28px] text-yellow-500 filled">star</span>
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-[13px] text-[#9D9D9D]">Dựa trên {totalVerifiedReviews} đánh giá đã xác minh</span>
        </div>

        {/* Right: Progress Bars */}
        <div className="flex-1 flex flex-col gap-3 justify-center border-l border-gray-200 dark:border-white/10 pl-0 md:pl-12 pt-8 md:pt-0 border-t md:border-t-0 mt-8 md:mt-0">
          {[5, 4, 3, 2, 1].map(star => {
            const count = starCounts[star] || 0;
            const percent = totalVerifiedReviews > 0 ? (count / totalVerifiedReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-4">
                <span className="text-[13px] font-bold text-[#9D9D9D] w-12 whitespace-nowrap">{star} Sao</span>
                <div className="flex-1 h-2.5 bg-gray-200 dark:bg-[#222] rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%`, backgroundColor: getStarColor(star) }}
                  ></div>
                </div>
                <span className="text-[13px] font-bold text-[#9D9D9D] w-10 text-right">{Math.round(percent)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review List */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
        <h3 className="text-[16px] font-bold text-[#111827] dark:text-white">Đánh giá gần đây</h3>
      </div>

      <div className="flex flex-col gap-5">
        {reviews.length === 0 && (
          <p className="text-[14px] text-gray-500 italic py-4">Chưa có đánh giá nào. Hãy là người đầu tiên viết đánh giá!</p>
        )}
        {reviews.map((review) => {
          const isMyReview = isAuthenticated && currentUser?.username === review.username;
          const isHighlighted = highlightReviewId && review.id === highlightReviewId;
          const membershipTier = getMembershipTier(review.memberPoints, membershipTiers, review.membershipTier);
          const timeAgo = review.createdAt
            ? new Date(review.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'Vừa xong';

          return (
            <div
              key={review.id}
              ref={el => { reviewRefs.current[review.id] = el; }}
              className={`membership-review-card membership-review-card--vip-${membershipTier.level} relative bg-white dark:bg-[#18181B] border rounded-xl p-4 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-[#1E1E22] hover:-translate-y-1 hover:shadow-2xl ${
                isHighlighted && isHighlighting
                  ? 'border-red-500 shadow-[0_0_30px_6px_rgba(239,68,68,0.4)] animate-[reportHighlight_0.6s_ease-in-out_infinite_alternate]'
                  : 'border-gray-200 dark:border-[#27272A] hover:border-gray-300 dark:hover:border-[#3F3F46]'
              }`}
            >
              {isHighlighted && isHighlighting && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Đánh giá này đã bị báo cáo
                </div>
              )}
              <div className="flex flex-col gap-2">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="membership-review-avatar w-12 h-12 rounded-full bg-gray-200 dark:bg-[#333] flex items-center justify-center font-bold text-[#111827] dark:text-white shrink-0 overflow-hidden text-sm border-2 border-gray-300 dark:border-[#3f3f46] shadow-sm">
                      {review.avatar ? (
                        <img
                          src={review.avatar}
                          alt={review.fullName || review.username}
                          className="w-full h-full object-cover rounded-full"
                          onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = getAvatarInitial(review.fullName || review.username); }}
                        />
                      ) : (
                        <img
                          src={getUserAvatarUrl(review.username)}
                          alt={review.fullName || review.username}
                          className="w-full h-full rounded-full"
                          onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = getAvatarInitial(review.fullName || review.username); }}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="membership-review-author font-bold text-[16px] text-[#111827] dark:text-white">
                          {review.fullName || `@${getDisplayUsername(review.username)}`}
                        </span>
                        <span
                          className="membership-review-badge flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide"
                          style={{
                            color: membershipTier.color,
                            backgroundColor: `${membershipTier.color}1A`,
                            borderColor: `${membershipTier.color}33`,
                          }}
                        >
                          {membershipTier.name}
                        </span>
                        {isMyReview && (
                          <span className="bg-[#1877F2]/20 text-[#1877F2] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1877F2]/20 uppercase tracking-wider">CỦA BẠN</span>
                        )}
                        {review.hasSpoiler && !isMyReview && (
                          <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-wider">SPOILER</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className={`material-symbols-outlined text-[16px] ${s <= review.rating ? 'text-yellow-500 filled' : 'text-gray-300 dark:text-gray-600'}`}>star</span>
                          ))}
                        </div>
                        <span className="membership-review-date text-[12px] text-[#9D9D9D] font-medium ml-2">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="membership-review-content text-[15px] text-[#9D9D9D] leading-relaxed whitespace-pre-line break-words font-light">
                  {(review.hasSpoiler || review.reportedSpoilerByMe) && !isMyReview && !revealedSpoilers[review.id] ? (
                    <div
                      className="relative w-fit rounded-md cursor-pointer group mb-1.5 border border-gray-300 dark:border-white/10 bg-gray-200 dark:bg-black/40 hover:bg-gray-300 dark:hover:bg-black/60 transition-colors py-2 px-3"
                      onClick={() => setRevealedSpoilers(prev => ({ ...prev, [review.id]: true }))}
                    >
                      <span className="text-[13px] font-medium text-[#111827] dark:text-white/80 group-hover:invisible">
                        Bài đánh giá này có chứa nội dung tiết lộ cốt truyện, vui lòng cân nhắc trước khi xem.
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[13px] font-bold text-[#111827] dark:text-white">Ấn vào để xem</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {review.content && review.content.length > (expandedReviews[review.id] || 200)
                        ? review.content.slice(0, expandedReviews[review.id] || 200) + '...'
                        : review.content}

                      {review.content && review.content.length > 200 && (
                        <div className="flex items-center gap-4 mt-2">
                          {(expandedReviews[review.id] || 200) < review.content.length && (
                            <button
                              onClick={() => toggleReviewExpand(review.id, review.content)}
                              className="text-yellow-500 hover:underline text-[13px] font-bold transition-colors"
                            >
                              Đọc thêm
                            </button>
                          )}
                          {(expandedReviews[review.id] || 200) > 200 && (
                            <button
                              onClick={() => toggleReviewExpand(review.id, review.content)}
                              className="text-yellow-500 hover:underline text-[13px] font-bold transition-colors"
                            >
                              Ẩn bớt
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="membership-review-footer flex items-center justify-between border-t border-gray-200 dark:border-[#3f3f46] pt-3 mt-1">
                  <div className="flex items-center gap-6 text-[13px] text-[#9D9D9D] font-medium">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleReaction(review.id, true)}
                        data-active={review.likedByMe}
                        className={`membership-review-action membership-review-like flex items-center gap-1.5 transition-all active:scale-90 ${review.likedByMe ? 'text-[#ff4d00]' : 'text-[#9D9D9D] hover:text-[#ff4d00]'}`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${review.likedByMe ? 'filled' : ''}`}>thumb_up</span>
                        <span>{review.likeCount > 0 ? formatReactionCount(review.likeCount) : ''}</span>
                      </button>

                      <button
                        onClick={() => handleReaction(review.id, false)}
                        data-active={review.dislikedByMe}
                        className={`membership-review-action membership-review-dislike flex items-center gap-1.5 transition-all active:scale-90 ${review.dislikedByMe ? 'text-red-500' : 'text-[#9D9D9D] hover:text-red-500'}`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${review.dislikedByMe ? 'filled' : ''}`}>thumb_down</span>
                        <span>{review.dislikeCount > 0 ? formatReactionCount(review.dislikeCount) : ''}</span>
                      </button>
                    </div>
                  </div>

                  {!isMyReview && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            showToast('Vui lòng đăng nhập để báo cáo đánh giá', 'error');
                            return;
                          }
                          setReportModalReviewId(review.id);
                        }}
                        data-active={review.reportedByMe}
                        className={`membership-review-report transition-all active:scale-90 ${review.reportedByMe ? 'text-red-500' : 'text-[#9D9D9D] hover:text-red-500'}`}
                        disabled={review.reportedByMe}
                        title={review.reportedByMe ? 'Đã báo cáo' : 'Báo cáo vi phạm'}
                      >
                        <span className="material-symbols-outlined text-[18px]">report</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

              {/* Pagination */}
              <UserPagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} className="mt-8" />

      <ReportReviewModal
        isOpen={!!reportModalReviewId}
        reviewId={reportModalReviewId}
        onClose={() => setReportModalReviewId(null)}
        onSubmit={handleReportReview}
      />
    </div>
  );
}
