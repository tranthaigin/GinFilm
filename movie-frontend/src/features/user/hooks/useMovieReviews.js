import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../../../shared/api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import env from '../../../shared/config/env';

export function useMovieReviews(movieId) {
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const showToast = useToastStore(state => state.showToast);

  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const [expandedReviews, setExpandedReviews] = useState({});

  const toggleReviewExpand = (reviewId, content) => {
    setExpandedReviews(prev => {
      const currentLimit = prev[reviewId] || 200;
      if (currentLimit >= content.length) {
        return { ...prev, [reviewId]: 200 };
      }
      return { ...prev, [reviewId]: currentLimit + 500 };
    });
  };

  const handleReaction = async (reviewId, isLike) => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để phản hồi đánh giá", "error");
      return;
    }
    try {
      const res = await apiPost('/reviews/react', { reviewId, isLike });
      setReviews(prev => prev.map(r => r.id === reviewId ? res : r));
    } catch (err) {
      showToast(err.message || 'Lỗi khi phản hồi đánh giá', "error");
    }
  };

  const handleReportReview = async (reviewId, reason, subReason, details) => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để báo cáo đánh giá", "error");
      return false;
    }
    try {
      let finalReason = reason;
      if (['HARASSMENT', 'SPAM', 'IRRELEVANT'].includes(reason)) {
        finalReason = subReason;
      }
      const data = {
        reviewId: reviewId,
        reason: finalReason,
        details: details.trim()
      };
      await apiPost(`/reviews/report`, data);
      
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      return true;
    } catch (err) {
      console.error('Lỗi khi báo cáo:', err);
      return false;
    }
  };

  // Fetch reviews
  useEffect(() => {
    if (!movieId) return;
    const fetchReviews = async () => {
      try {
        const data = await apiGet(`/reviews/movie/${movieId}?page=${currentPage - 1}`);
        if (data && data.content) {
          setReviews(data.content);
          setTotalPages(data.totalPages);
          setTotalReviews(data.totalElements);
        } else if (Array.isArray(data)) {
          setReviews(data);
          setTotalPages(Math.max(1, Math.ceil(data.length / 10)));
          setTotalReviews(data.length);
        }
      } catch (err) {
        console.error('Lỗi khi tải đánh giá:', err);
      }
    };
    fetchReviews();
  }, [movieId, currentPage]);

  // Fetch myReviews and canReview
  useEffect(() => {
    if (!movieId || !isAuthenticated) return;
    const fetchMyReviews = async () => {
      try {
        const data = await apiGet(`/reviews/my/${movieId}`);
        if (data) {
          setMyReviews(data.reviews || []);
          setCanReview(data.canReview || false);
        } else {
          setMyReviews([]);
          setCanReview(false);
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra lượt đánh giá:', err);
        setMyReviews([]);
        setCanReview(false);
      }
    };
    fetchMyReviews();
  }, [movieId, isAuthenticated]);

  // WebSocket
  useEffect(() => {
    if (!movieId) return;

    const wsUrl = env.wsUrl;
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      onConnect: () => {
        client.subscribe(`/topic/reviews/${movieId}`, (message) => {
          if (message.body) {
            const updatedReview = JSON.parse(message.body);

            setReviews(prevReviews => {
              if (updatedReview.status === 'DELETED' || updatedReview.status === 'HIDDEN') {
                return prevReviews.filter(r => r.id !== updatedReview.id);
              }
              const exists = prevReviews.some(r => r.id === updatedReview.id);
              if (exists) {
                return prevReviews.map(r => {
                  if (r.id === updatedReview.id) {
                    return {
                      ...updatedReview,
                      likedByMe: r.likedByMe,
                      dislikedByMe: r.dislikedByMe,
                      reportedByMe: r.reportedByMe
                    };
                  }
                  return r;
                });
              }
              return [updatedReview, ...prevReviews];
            });

            const currentUserState = useAuthStore.getState().user;
            if (currentUserState && currentUserState.username === updatedReview.username) {
              if (updatedReview.status === 'DELETED') {
                setMyReviews(prev => prev.filter(r => r.id !== updatedReview.id));
              } else {
                setMyReviews(prev => {
                  if (prev.some(r => r.id === updatedReview.id)) {
                    return prev.map(r => r.id === updatedReview.id ? updatedReview : r);
                  }
                  return [updatedReview, ...prev];
                });
              }
            }
          }
        });
      },
      onStompError: (err) => {
        console.error('WebSocket connection error:', err);
      },
      debug: () => { }
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [movieId]);

  const totalVerifiedReviews = reviews.length; // Existing logic
  let avgRating = 0;
  let starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (totalVerifiedReviews > 0) {
    let sum = 0;
    reviews.forEach(r => {
      sum += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        starCounts[Math.floor(r.rating)]++;
      }
    });
    avgRating = (sum / totalVerifiedReviews).toFixed(1);
  }

  return {
    reviews, setReviews,
    myReviews, setMyReviews,
    canReview, setCanReview,
    currentPage, setCurrentPage,
    totalPages,
    totalReviews,
    revealedSpoilers, setRevealedSpoilers,
    expandedReviews, toggleReviewExpand,
    handleReaction,
    handleReportReview,
    totalVerifiedReviews,
    avgRating,
    starCounts,
    currentUser,
    isAuthenticated
  };
}
