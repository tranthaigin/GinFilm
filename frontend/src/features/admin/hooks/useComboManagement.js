import { useState, useEffect } from 'react';
import { comboApi } from '../api/comboApi';

export function useComboManagement() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCombos = () => {
    return comboApi
      .getAll()
      .then((data) => {
        setCombos(data);
      })
      .catch((error) => {
        console.error('Failed to fetch combos:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadKey1 = JSON.stringify([]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setLoading(true);
  }

  useEffect(() => {
    fetchCombos();
  }, []);

  const toggleComboHide = async (id) => {
    try {
      const updatedCombo = await comboApi.toggleHide(id);
      setCombos((prev) => prev.map((c) => (c.id === id ? updatedCombo : c)));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const deleteCombo = async (id) => {
    try {
      await comboApi.delete(id);
      setCombos((prev) => prev.filter((c) => c.id !== id));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const addCombo = async (data, imageFile) => {
    try {
      const newCombo = await comboApi.create(data, imageFile);
      setCombos((prev) => [...prev, newCombo]);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const editCombo = async (id, data, imageFile) => {
    try {
      const updatedCombo = await comboApi.update(id, data, imageFile);
      setCombos((prev) => prev.map((c) => (c.id === id ? updatedCombo : c)));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  return {
    combos,
    loading,
    toggleComboHide,
    deleteCombo,
    addCombo,
    editCombo,
    refreshCombos: (...args) => {
      setLoading(true);
      return fetchCombos(...args);
    },
  };
}
