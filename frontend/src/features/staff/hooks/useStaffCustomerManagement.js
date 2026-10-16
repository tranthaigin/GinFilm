import { useState, useEffect, useCallback } from 'react';
import { staffCustomerApi } from '../api/staffCustomerApi';
import { useToastStore } from '../../admin/hooks/useToastStore';

export function useStaffCustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [lockedCustomers, setLockedCustomers] = useState([]);
  const [isViewLocked, setIsViewLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { addToast } = useToastStore();

  const fetchCustomers = useCallback(() => {
    return staffCustomerApi
      .fetchCustomers()
      .then((data) => {
        setCustomers(data);
      })
      .catch((err) => {
        addToast({
          type: 'error',
          message: err.message || 'Lỗi khi tải danh sách khách hàng',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [addToast]);

  const fetchLockedCustomers = useCallback(() => {
    return staffCustomerApi
      .fetchLockedCustomers()
      .then((data) => {
        setLockedCustomers(data);
      })
      .catch((err) => {
        addToast({
          type: 'error',
          message: err.message || 'Lỗi khi tải danh sách khách hàng đã khoá',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [addToast]);

  const loadKey1 = JSON.stringify([isViewLocked, addToast]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setIsLoading(true);
  }

  useEffect(() => {
    if (isViewLocked) {
      fetchLockedCustomers();
    } else {
      fetchCustomers();
    }
  }, [isViewLocked, fetchCustomers, fetchLockedCustomers]);

  /**
   * Tạo tài khoản user mới thay mặt khách hàng (staff-assisted).
   */
  const createCustomer = async (formData) => {
    try {
      const newUser = await staffCustomerApi.createCustomer(formData);
      setCustomers((prev) => [newUser, ...prev]);
      addToast({
        type: 'success',
        message: `Đã tạo tài khoản "${newUser.username}" thành công!`,
      });
      return true;
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Lỗi khi tạo tài khoản',
      });
      return false;
    }
  };

  /**
   * Cập nhật thông tin khách hàng.
   */
  const updateCustomer = async (id, updateData) => {
    try {
      const updatedUser = await staffCustomerApi.updateCustomer(id, updateData);
      setCustomers((prev) => prev.map((c) => (c.id === id ? updatedUser : c)));
      addToast({
        type: 'success',
        message: 'Đã cập nhật thông tin khách hàng thành công!',
      });
      return true;
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Lỗi khi cập nhật khách hàng',
      });
      return false;
    }
  };

  /**
   * Khoá hoặc mở khoá tài khoản khách hàng.
   */
  const toggleLock = async (id) => {
    try {
      const result = await staffCustomerApi.toggleLock(id);
      const updatedUser = result.user;

      if (updatedUser.status === 'LOCKED') {
        // Xoá khỏi danh sách active, thêm vào locked
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        setLockedCustomers((prev) => {
          if (!prev.find((c) => c.id === id)) return [updatedUser, ...prev];
          return prev.map((c) => (c.id === id ? updatedUser : c));
        });
      } else {
        // Mở khoá: xoá khỏi locked, thêm vào active
        setLockedCustomers((prev) => prev.filter((c) => c.id !== id));
        setCustomers((prev) => {
          if (!prev.find((c) => c.id === id)) return [updatedUser, ...prev];
          return prev.map((c) => (c.id === id ? updatedUser : c));
        });
      }

      addToast({ type: 'success', message: result.message });
      return true;
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Lỗi khi thay đổi trạng thái khoá',
      });
      return false;
    }
  };

  const refreshList = isViewLocked
    ? (...args) => {
        setIsLoading(true);
        return fetchLockedCustomers(...args);
      }
    : (...args) => {
        setIsLoading(true);
        return fetchCustomers(...args);
      };

  return {
    customers,
    lockedCustomers,
    isViewLocked,
    setIsViewLocked,
    isLoading,
    createCustomer,
    updateCustomer,
    toggleLock,
    refreshList,
  };
}
