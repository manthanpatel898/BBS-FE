'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CompanyAdminRoute } from '@/components/auth/company-admin-route';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
} from '@/lib/auth/api';
import { Employee } from '@/lib/auth/types';

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  email: string;
  contactNo: string;
  designation: string;
  password: string;
  isActive: boolean;
};

const initialFormState: EmployeeFormState = {
  firstName: '',
  lastName: '',
  email: '',
  contactNo: '',
  designation: '',
  password: '',
  isActive: true,
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

export default function EmployeesPage() {
  const { accessToken } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token: string = accessToken;

    async function loadEmployees() {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchEmployees(token, { page, limit, search });
        setEmployees(response.items);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch employees.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEmployees();
  }, [accessToken, limit, page, search]);

  function openCreateModal() {
    setEditingEmployee(null);
    setFormState(initialFormState);
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployee(employee);
    setFormState({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      contactNo: employee.contactNo,
      designation: employee.designation ?? '',
      password: '',
      isActive: employee.isActive,
    });
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  async function reloadEmployees(token: string, nextPage: number) {
    const response = await fetchEmployees(token, {
      page: nextPage,
      limit,
      search,
    });
    setEmployees(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    const token: string = accessToken;

    try {
      setIsSubmitting(true);
      setError('');

      if (editingEmployee) {
        await updateEmployee(token, editingEmployee.id, formState);
        setSuccessMessage('Employee updated successfully.');
      } else {
        await createEmployee(token, formState);
        setSuccessMessage('Employee created successfully.');
      }

      setIsModalOpen(false);
      const nextPage = editingEmployee ? page : 1;
      setPage(nextPage);
      await reloadEmployees(token, nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save employee.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !employeeToDelete) {
      return;
    }

    const token: string = accessToken;

    try {
      setIsDeleting(true);
      setError('');
      await deleteEmployee(token, employeeToDelete.id);
      setEmployeeToDelete(null);
      setSuccessMessage('Employee deleted successfully.');
      await reloadEmployees(token, page);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete employee.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <CompanyAdminRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Company Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Employees</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Company admins can create and manage employee login access for this restaurant.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((current) => !current)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {isFiltersOpen ? 'Hide search' : 'Search'}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            >
              + Add employee
            </button>
          </div>
        </div>

        {isFiltersOpen ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-slate-500">Total employees</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
          </div>
          <form
            className="flex w-full max-w-xl gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email, or contact number"
              className={inputCls}
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
            >
              Search
            </button>
          </form>
        </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Designation</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={5}>
                      Loading employees…
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={5}>
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="mt-1 text-slate-500">{employee.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {employee.contactNo}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {employee.designation || 'Not set'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            employee.isActive
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(employee)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmployeeToDelete(employee)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400 shadow-sm">
              Loading employees…
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400 shadow-sm">
              No employees found.
            </div>
          ) : (
            employees.map((employee) => (
              <article
                key={`mobile-${employee.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {employee.firstName} {employee.lastName}
                </p>
                <p className="mt-1 text-xs text-slate-500">{employee.email}</p>
                <p className="mt-1 text-xs text-slate-700">{employee.contactNo}</p>
                <p className="mt-1 text-xs text-slate-700">{employee.designation || 'Not set'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(employee)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeToDelete(employee)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <p>
            <span className="text-slate-500">Page {page} of {totalPages} · {totalItems} total</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {isModalOpen ? (
          <CommonModal
            title={editingEmployee ? 'Update employee details' : 'Create employee access'}
            description="Only company admins can create employees. Set the login email and password here, then share those credentials directly with the employee."
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-2xl"
          >
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <input
                  value={formState.firstName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  placeholder="First name"
                  className={inputCls}
                />
                <input
                  value={formState.lastName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  placeholder="Last name"
                  className={inputCls}
                />
                <input
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email"
                  className={inputCls}
                />
                <input
                  value={formState.contactNo}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      contactNo: event.target.value,
                    }))
                  }
                  placeholder="Contact number"
                  className={inputCls}
                />
                <input
                  value={formState.designation}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      designation: event.target.value,
                    }))
                  }
                  placeholder="Designation"
                  className={inputCls}
                />
                {!editingEmployee ? (
                  <input
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Password"
                    className={inputCls}
                  />
                ) : null}
                {editingEmployee ? (
                  <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formState.isActive}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    Employee is active
                  </label>
                ) : null}
                <div className="md:col-span-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60"
                  >
                    {isSubmitting
                      ? 'Saving…'
                      : editingEmployee
                        ? 'Save changes'
                        : 'Create employee'}
                  </button>
                </div>
            </form>
          </CommonModal>
        ) : null}

        {employeeToDelete ? (
          <ConfirmModal
            title={`Delete ${employeeToDelete.firstName} ${employeeToDelete.lastName}?`}
            message="This removes the employee account from your restaurant."
            confirmLabel="Delete"
            isLoading={isDeleting}
            onCancel={() => setEmployeeToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        ) : null}
      </section>
    </CompanyAdminRoute>
  );
}
