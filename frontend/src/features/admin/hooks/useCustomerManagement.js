import { useState, useEffect, useCallback } from 'react';
import { customerApi } from '../api/customerApi';
import { useToastStore } from './useToastStore';

export function useCustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [isViewDeleted, setIsViewDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { addToast } = useToastStore();

  const fetchCustomers = useCallback(() => {
    return customerApi
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

  const fetchDeletedCustomers = useCallback(() => {
    return customerApi
      .fetchDeletedCustomers()
      .then((data) => {
        setDeletedCustomers(data);
      })
      .catch((err) => {
        addToast({
          type: 'error',
          message: err.message || 'Lỗi khi tải danh sách khách hàng đã xoá',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [addToast]);

  const loadKey1 = JSON.stringify([isViewDeleted, addToast]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setIsLoading(true);
  }

  useEffect(() => {
    if (isViewDeleted) {
      fetchDeletedCustomers();
    } else {
      fetchCustomers();
    }
  }, [isViewDeleted, fetchCustomers, fetchDeletedCustomers]);

  const updateCustomer = async (id, updateData) => {
    try {
      const updatedUser = await customerApi.updateCustomer(id, updateData);
      if (updatedUser.status === 'LOCKED') {
        // Xóa khỏi danh sách hoạt động
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        // Thêm vào danh sách đã xoá
        setDeletedCustomers((prev) => {
          if (!prev.find((c) => c.id === id)) return [...prev, updatedUser];
          return prev.map((c) => (c.id === id ? updatedUser : c));
        });
      } else {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? updatedUser : c))
        );
      }
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

  const deleteCustomer = async (id) => {
    try {
      await customerApi.deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      addToast({
        type: 'success',
        message: 'Đã xoá / khoá khách hàng thành công!',
      });
      return true;
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Lỗi khi xoá khách hàng',
      });
      return false;
    }
  };

  const restoreCustomer = async (id) => {
    try {
      await customerApi.restoreCustomer(id);
      setDeletedCustomers((prev) => prev.filter((c) => c.id !== id));
      addToast({
        type: 'success',
        message: 'Đã khôi phục khách hàng thành công!',
      });
      return true;
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Lỗi khi khôi phục khách hàng',
      });
      return false;
    }
  };

  const createCustomer = async (formData) => {
    try {
      const newUser = await customerApi.createCustomer(formData);
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

  return {
    customers,
    deletedCustomers,
    isViewDeleted,
    setIsViewDeleted,
    isLoading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    restoreCustomer,
    refreshCustomers: isViewDeleted
      ? (...args) => {
          setIsLoading(true);
          return fetchDeletedCustomers(...args);
        }
      : (...args) => {
          setIsLoading(true);
          return fetchCustomers(...args);
        },
  };
}
