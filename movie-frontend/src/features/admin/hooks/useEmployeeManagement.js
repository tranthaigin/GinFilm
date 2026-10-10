import { useState, useEffect, useCallback } from 'react';
import { employeeApi } from '../api/employeeApi';
import { useToastStore } from './useToastStore';

export function useEmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [deletedEmployees, setDeletedEmployees] = useState([]);
  const [isViewDeleted, setIsViewDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { addToast } = useToastStore();

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await employeeApi.fetchEmployees();
      setEmployees(data);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách nhân viên' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const fetchDeletedEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await employeeApi.fetchDeletedEmployees();
      setDeletedEmployees(data);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách nhân viên đã xoá' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isViewDeleted) {
      fetchDeletedEmployees();
    } else {
      fetchEmployees();
    }
  }, [isViewDeleted, fetchEmployees, fetchDeletedEmployees]);

  const createEmployee = async (employeeData) => {
    try {
      const newEmployee = await employeeApi.createEmployee(employeeData);
      setEmployees((prev) => [...prev, newEmployee]);
      addToast({ type: 'success', message: 'Đã tạo nhân viên thành công!' });
      return true;
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi tạo nhân viên' });
      return false;
    }
  };

  const updateEmployee = async (id, updateData) => {
    try {
      const updatedEmployee = await employeeApi.updateEmployee(id, updateData);
      if (updatedEmployee.status === 'LOCKED') {
        // Xóa khỏi danh sách hoạt động
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        // Thêm vào danh sách đã xoá
        setDeletedEmployees((prev) => {
          if (!prev.find((e) => e.id === id)) return [...prev, updatedEmployee];
          return prev.map((e) => (e.id === id ? updatedEmployee : e));
        });
      } else {
        setEmployees((prev) => prev.map((e) => (e.id === id ? updatedEmployee : e)));
      }
      addToast({ type: 'success', message: 'Đã cập nhật thông tin nhân viên thành công!' });
      return true;
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi cập nhật nhân viên' });
      return false;
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await employeeApi.deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      addToast({ type: 'success', message: 'Đã xoá / khoá nhân viên thành công!' });
      return true;
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi xoá nhân viên' });
      return false;
    }
  };

  const restoreEmployee = async (id) => {
    try {
      await employeeApi.restoreEmployee(id);
      setDeletedEmployees((prev) => prev.filter((e) => e.id !== id));
      addToast({ type: 'success', message: 'Đã khôi phục nhân viên thành công!' });
      return true;
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi khôi phục nhân viên' });
      return false;
    }
  };

  const toggleEmployeeStatus = async (id) => {
    try {
      await employeeApi.toggleEmployeeStatus(id);
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            return { ...e, status: e.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' };
          }
          return e;
        })
      );
      addToast({ type: 'success', message: 'Đã thay đổi trạng thái nhân viên thành công!' });
      return true;
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Lỗi khi thay đổi trạng thái nhân viên' });
      return false;
    }
  };

  return {
    employees,
    deletedEmployees,
    isViewDeleted,
    setIsViewDeleted,
    isLoading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    restoreEmployee,
    toggleEmployeeStatus,
    refreshEmployees: isViewDeleted ? fetchDeletedEmployees : fetchEmployees,
  };
}
