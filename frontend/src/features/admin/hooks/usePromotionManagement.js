import { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { promotionApi } from '../api';
import { useToastStore } from './useToastStore';

export function usePromotionManagement() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToastStore();

  const fetchPromotions = useCallback(() => {
    return promotionApi
      .getAll()
      .then((data) => {
        const sortedData = Array.isArray(data)
          ? [...data].sort((a, b) => b.id - a.id)
          : data;
        setPromotions(sortedData);
      })
      .catch((error) => {
        console.error('Error fetching promotions:', error);
        addToast({
          type: 'error',
          message: error.message || 'Lỗi khi tải danh sách ưu đãi',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [addToast]);

  const loadKey301 = JSON.stringify([addToast]);
  const [previousLoadKey301, setPreviousLoadKey301] = useState(null);
  if (previousLoadKey301 !== loadKey301) {
    setPreviousLoadKey301(loadKey301);
    setLoading(true);
  }

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const addPromotion = async (formData) => {
    try {
      await promotionApi.create(formData);
      await ((...args) => {
        setLoading(true);
        return fetchPromotions(...args);
      })();
      addToast({ type: 'success', message: 'Thêm ưu đãi mới thành công!' });
      return { success: true };
    } catch (error) {
      console.error('Error adding promotion:', error);
      addToast({
        type: 'error',
        message: error.message || 'Lỗi khi thêm ưu đãi',
      });
      return { success: false, message: error.message };
    }
  };

  const editPromotion = async (id, formData) => {
    try {
      await promotionApi.update(id, formData);
      await ((...args) => {
        setLoading(true);
        return fetchPromotions(...args);
      })();
      addToast({ type: 'success', message: 'Cập nhật ưu đãi thành công!' });
      return { success: true };
    } catch (error) {
      console.error('Error updating promotion:', error);
      addToast({
        type: 'error',
        message: error.message || 'Lỗi khi cập nhật ưu đãi',
      });
      return { success: false, message: error.message };
    }
  };

  const togglePromotionVisibility = async (id) => {
    try {
      const result = await promotionApi.toggleVisibility(id);
      setPromotions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isHidden: result.isHidden } : p))
      );
      addToast({
        type: 'success',
        message: result.message || 'Cập nhật trạng thái thành công!',
      });
      return { success: true };
    } catch (error) {
      console.error('Error toggling promotion visibility:', error);
      addToast({
        type: 'error',
        message: error.message || 'Lỗi khi cập nhật trạng thái',
      });
      return { success: false, message: error.message };
    }
  };

  return {
    promotions,
    loading,
    fetchPromotions: (...args) => {
      setLoading(true);
      return fetchPromotions(...args);
    },
    addPromotion,
    editPromotion,
    togglePromotionVisibility,
  };
}
