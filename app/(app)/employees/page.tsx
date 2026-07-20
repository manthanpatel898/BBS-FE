'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { CompanyAdminRoute } from '@/components/auth/company-admin-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  createEmployee,
  deleteEmployee,
  fetchEmployeePermissions,
  fetchEmployeeSignature,
  fetchEmployees,
  saveEmployeeSignature,
  updateEmployee,
  updateEmployeePermissions,
} from '@/lib/auth/api';
import { Employee, PermissionModuleDefinition, UserSignature } from '@/lib/auth/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { cropSignatureCanvasToDataUrl } from '@/lib/signature-crop';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';
import { useToast } from '@/components/ui/toast';
import {
  buildEmployeeCreatePayload,
  buildEmployeeUpdatePayload,
} from '@/lib/employees/employee-payload';

// Display labels → actual UserRole mapping
type DisplayRole = 'Company Admin' | 'Manager';
const DISPLAY_ROLE_OPTIONS: DisplayRole[] = ['Company Admin', 'Manager'];
function toDisplayRole(role: string): DisplayRole {
  return role === 'company_admin' ? 'Company Admin' : 'Manager';
}

function canManagePassword(displayRole: DisplayRole) {
  return displayRole === 'Manager';
}

function employeeName(employee: Employee) {
  return `${employee.firstName} ${employee.lastName}`.trim() || employee.username;
}

function formatSignatureDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  username: string;
  displayRole: DisplayRole;
  contactNo: string;
  password: string;
  isActive: boolean;
  canAccessOdc: boolean;
  permissions: string[];
};

type SignatureModalState = {
  employee: Employee;
  signature: UserSignature | null;
  mode: 'loading' | 'view' | 'edit';
  hasDrawnSignature: boolean;
};

type PermissionEditorState = {
  employee: Employee;
  permissions: string[];
  effectivePermissions: string[];
  registry: PermissionModuleDefinition[];
};

const initialFormState: EmployeeFormState = {
  firstName: '',
  lastName: '',
  username: '',
  displayRole: 'Manager',
  contactNo: '',
  password: '',
  isActive: true,
  canAccessOdc: false,
  permissions: [],
};

const inputCls =
  'light-form-field w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

export default function EmployeesPage() {
  useAppPageHeader({
    eyebrow: 'Employees',
    title: 'Employees',
  });
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signatureModal, setSignatureModal] = useState<SignatureModalState | null>(null);
  const [isSignatureSaving, setIsSignatureSaving] = useState(false);
  const [permissionEditor, setPermissionEditor] = useState<PermissionEditorState | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [expandedPermissionModules, setExpandedPermissionModules] = useState<Set<string>>(
    () => new Set(['bookings']),
  );
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);
  const [isPermissionSaving, setIsPermissionSaving] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignatureRef = useRef(false);
  const canViewPermissions =
    hasPermission(user, PERMISSIONS.EMPLOYEES_PERMISSIONS_VIEW) ||
    hasPermission(user, PERMISSIONS.EMPLOYEES_PERMISSIONS_MANAGE);
  const canManagePermissions = hasPermission(
    user,
    PERMISSIONS.EMPLOYEES_PERMISSIONS_MANAGE,
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token: string = accessToken;

    async function loadEmployees() {
      try {
        setIsLoading(true);
        const response = await fetchEmployees(token, { page, limit, search });
        setEmployees(response.items);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } catch (requestError) {
        showToast(
          requestError instanceof Error ? requestError.message : 'Unable to fetch employees.',
          'error',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEmployees();
  }, [accessToken, limit, page, search, showToast]);

  useEffect(() => {
    const value = searchInput.trim();

    if (value.length > 0 && value.length < 3) {
      setPage(1);
      setSearch('');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  function openCreateModal() {
    setEditingEmployee(null);
    setFormState(initialFormState);
    setShowPassword(false);
    setIsModalOpen(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployee(employee);
    setFormState({
      firstName: employee.firstName,
      lastName: employee.lastName,
      username: employee.username,
      displayRole: toDisplayRole(employee.role),
      contactNo: employee.contactNo,
      password: '',
      isActive: employee.isActive,
      canAccessOdc: employee.canAccessOdc ?? false,
      permissions: employee.permissions ?? [],
    });
    setIsModalOpen(true);
  }

  async function openPermissionsModal(employee: Employee) {
    if (!accessToken || !canViewPermissions) {
      return;
    }

    try {
      setIsPermissionLoading(true);
      setPermissionSearch('');
      setPermissionEditor({
        employee,
        permissions: employee.permissions ?? [],
        effectivePermissions: employee.effectivePermissions ?? [],
        registry: [],
      });
      const response = await fetchEmployeePermissions(accessToken, employee.id);
      setPermissionEditor({
        employee,
        permissions: response.permissions,
        effectivePermissions: response.effectivePermissions,
        registry: response.registry,
      });
    } catch (requestError) {
      setPermissionEditor(null);
      showToast(
        requestError instanceof Error ? requestError.message : 'Unable to load permissions.',
        'error',
      );
    } finally {
      setIsPermissionLoading(false);
    }
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

  function validateForm(): string | null {
    if (!formState.firstName.trim()) return 'First name is required.';
    if (!formState.lastName.trim()) return 'Last name is required.';
    if (!formState.username.trim()) return 'Username is required.';
    if (!formState.contactNo.trim()) return 'Mobile number is required.';
    if (formState.contactNo.trim().length < 10) return 'Mobile number must be 10 digits.';
    if (!editingEmployee && !formState.password.trim()) return 'Password is required.';
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    if (!accessToken) {
      showToast('Missing session token.', 'error');
      return;
    }

    const token: string = accessToken;

    try {
      setIsSubmitting(true);

      if (editingEmployee) {
        const updatePayload = buildEmployeeUpdatePayload(formState, user?.businessType);
        await updateEmployee(token, editingEmployee.id, updatePayload);
        showToast('Employee updated successfully.', 'success');
      } else {
        await createEmployee(
          token,
          buildEmployeeCreatePayload(formState, user?.businessType),
        );
        showToast('Employee created successfully.', 'success');
      }

      setIsModalOpen(false);
      const nextPage = editingEmployee ? page : 1;
      setPage(nextPage);
      await reloadEmployees(token, nextPage);
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : 'Unable to save employee.',
        'error',
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
      await deleteEmployee(token, employeeToDelete.id);
      setEmployeeToDelete(null);
      showToast('Employee deleted successfully.', 'success');
      await reloadEmployees(token, page);
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : 'Unable to delete employee.',
        'error',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSavePermissions() {
    if (!accessToken || !permissionEditor) {
      return;
    }

    try {
      setIsPermissionSaving(true);
      const response = await updateEmployeePermissions(
        accessToken,
        permissionEditor.employee.id,
        permissionEditor.permissions,
      );
      setPermissionEditor((current) =>
        current
          ? {
              ...current,
              permissions: response.permissions,
              effectivePermissions: response.effectivePermissions,
              registry: response.registry,
            }
          : current,
      );
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === permissionEditor.employee.id
            ? {
                ...employee,
                permissions: response.permissions,
                effectivePermissions: response.effectivePermissions,
              }
            : employee,
        ),
      );
      showToast('Permissions updated successfully.', 'success');
      setPermissionEditor(null);
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : 'Unable to update permissions.',
        'error',
      );
    } finally {
      setIsPermissionSaving(false);
    }
  }

  function permissionKeysForModule(module: PermissionModuleDefinition) {
    return module.groups.flatMap((group) =>
      group.permissions.map((permission) => permission.key),
    );
  }

  function togglePermission(permissionKey: string, checked: boolean) {
    setPermissionEditor((current) => {
      if (!current) return current;
      const next = new Set(current.permissions);
      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return { ...current, permissions: [...next] };
    });
  }

  function togglePermissionModule(module: PermissionModuleDefinition, checked: boolean) {
    const keys = permissionKeysForModule(module);
    setPermissionEditor((current) => {
      if (!current) return current;
      const next = new Set(current.permissions);
      for (const key of keys) {
        const isBasePermission =
          current.effectivePermissions.includes(key) &&
          !current.permissions.includes(key);
        if (isBasePermission) {
          continue;
        }

        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }

      return { ...current, permissions: [...next] };
    });
  }

  function togglePermissionModuleExpanded(moduleKey: string) {
    setExpandedPermissionModules((current) => {
      const next = new Set(current);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }

      return next;
    });
  }

  function filteredPermissionRegistry() {
    const query = permissionSearch.trim().toLowerCase();
    const registry = permissionEditor?.registry ?? [];
    if (!query) {
      return registry;
    }

    return registry
      .map((module) => ({
        ...module,
        groups: module.groups
          .map((group) => ({
            ...group,
            permissions: group.permissions.filter((permission) =>
              [module.label, group.label, permission.label, permission.key]
                .join(' ')
                .toLowerCase()
                .includes(query),
            ),
          }))
          .filter((group) => group.permissions.length > 0),
      }))
      .filter((module) => module.groups.length > 0);
  }

  function renderPermissionAccessPanel() {
    if (!canViewPermissions || !permissionEditor) {
      return null;
    }

    const registry = filteredPermissionRegistry();
    const isSelfEdit = permissionEditor.employee.id === user?.id;
    const isReadOnly = !canManagePermissions || isSelfEdit;
    const overrideSelected = new Set(permissionEditor.permissions);
    const effectiveSelected = new Set([
      ...permissionEditor.effectivePermissions,
      ...permissionEditor.permissions,
    ]);

    return (
      <section>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Access</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Role-default access is checked automatically. Extra checked items are custom overrides.
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {permissionEditor.permissions.length} custom
              </span>
            </div>
            {isReadOnly ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                {isSelfEdit
                  ? 'Another permission manager must change your access.'
                  : 'You can view permissions but cannot change them.'}
              </p>
            ) : null}
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Search permissions"
              className={`${inputCls} mt-4 min-h-12`}
            />
          </div>

          {isPermissionLoading ? (
            <div className="p-4 text-sm text-slate-500">Loading permissions...</div>
          ) : registry.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No permissions found.</div>
          ) : (
            <div className="max-h-[58vh] divide-y divide-slate-100 overflow-y-auto md:max-h-[62vh]">
              {registry.map((module) => {
                const keys = permissionKeysForModule(module);
                const selectedCount = keys.filter((key) => effectiveSelected.has(key)).length;
                const expanded = expandedPermissionModules.has(module.key);

                return (
                  <div key={module.key} className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => togglePermissionModuleExpanded(module.key)}
                        className="min-w-0 flex-1 rounded-xl px-1 py-1 text-left transition hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {module.label}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            {expanded ? 'Hide' : 'Show'}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {selectedCount} of {keys.length} permissions enabled
                        </span>
                      </button>
                      <label className="flex min-h-11 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:min-w-[7rem]">
                        <span>All</span>
                        <input
                          type="checkbox"
                          checked={keys.length > 0 && selectedCount === keys.length}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            togglePermissionModule(module, event.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:opacity-50"
                        />
                      </label>
                    </div>

                    {expanded ? (
                      <div className="mt-4 space-y-5">
                        {module.groups.map((group) => (
                          <div key={group.key}>
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                              {group.label}
                            </p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {group.permissions.map((permission) => {
                                const isBasePermission =
                                  effectiveSelected.has(permission.key) &&
                                  !overrideSelected.has(permission.key);
                                const checked = effectiveSelected.has(permission.key);

                                return (
                                  <label
                                    key={permission.key}
                                    className={`flex min-h-[4.5rem] items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                                      checked
                                        ? 'border-amber-200 bg-amber-50/70 text-slate-800'
                                        : 'border-slate-100 bg-slate-50 text-slate-700'
                                    } ${isReadOnly || isBasePermission ? 'cursor-default' : 'cursor-pointer hover:border-amber-200 hover:bg-amber-50/50'}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={isReadOnly || isBasePermission}
                                      onChange={(event) =>
                                        togglePermission(
                                          permission.key,
                                          event.target.checked,
                                        )
                                      }
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:opacity-50"
                                    />
                                    <span className="min-w-0">
                                      <span className="block font-medium text-slate-800">
                                        {permission.label}
                                      </span>
                                      <span className="mt-0.5 block break-all text-xs text-slate-400">
                                        {isBasePermission ? 'Included by role' : permission.key}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  async function openSignatureModal(employee: Employee) {
    if (!accessToken) {
      showToast('Missing session token.', 'error');
      return;
    }

    setSignatureModal({
      employee,
      signature: null,
      mode: 'loading',
      hasDrawnSignature: false,
    });

    try {
      const signature = await fetchEmployeeSignature(accessToken, employee.id);
      setSignatureModal({
        employee,
        signature,
        mode: signature ? 'view' : 'edit',
        hasDrawnSignature: false,
      });
      if (!signature) {
        window.setTimeout(() => resetSignatureCanvas(), 0);
      }
    } catch (requestError) {
      setSignatureModal(null);
      showToast(
        requestError instanceof Error ? requestError.message : 'Unable to fetch signature.',
        'error',
      );
    }
  }

  function startReplacingSignature() {
    setSignatureModal((current) =>
      current ? { ...current, mode: 'edit', hasDrawnSignature: false } : current,
    );
    window.setTimeout(() => resetSignatureCanvas(), 0);
  }

  function resetSignatureCanvas() {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    prepareSignatureCanvas(canvas, true);
    isDrawingSignatureRef.current = false;
    setSignatureModal((current) =>
      current ? { ...current, hasDrawnSignature: false } : current,
    );
  }

  function prepareSignatureCanvas(canvas: HTMLCanvasElement, forceClear = false) {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const width = Math.max(Math.floor(rect.width * scale), 1);
    const height = Math.max(Math.floor(rect.height * scale), 1);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      forceClear = true;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.5;
    context.strokeStyle = '#0f172a';

    if (forceClear) {
      context.clearRect(0, 0, rect.width, rect.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, rect.width, rect.height);
    }
  }

  function getSignaturePoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleSignaturePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    prepareSignatureCanvas(canvas);
    const point = getSignaturePoint(event);
    const context = canvas.getContext('2d');
    if (!context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingSignatureRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function handleSignaturePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingSignatureRef.current) return;

    const context = signatureCanvasRef.current?.getContext('2d');
    if (!context) return;

    const point = getSignaturePoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setSignatureModal((current) =>
      current?.hasDrawnSignature ? current : current ? { ...current, hasDrawnSignature: true } : current,
    );
  }

  function handleSignaturePointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingSignatureRef.current = false;
  }

  async function handleSaveEmployeeSignature() {
    if (!accessToken || !signatureModal) return;

    if (!signatureModal.hasDrawnSignature) {
      showToast('Add a signature before saving.', 'error');
      return;
    }

    const signatureImage = cropSignatureCanvasToDataUrl(signatureCanvasRef.current);
    if (!signatureImage) {
      showToast('Unable to read signature.', 'error');
      return;
    }

    try {
      setIsSignatureSaving(true);
      const signature = await saveEmployeeSignature(
        accessToken,
        signatureModal.employee.id,
        signatureImage,
      );
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === signatureModal.employee.id
            ? {
                ...employee,
                signatureSummary: {
                  id: signature.id,
                  signedAt: signature.signedAt,
                  signedByName: signature.signedByName,
                  updatedAt: signature.updatedAt,
                },
              }
            : employee,
        ),
      );
      setSignatureModal((current) =>
        current ? { ...current, signature, mode: 'view', hasDrawnSignature: false } : current,
      );
      showToast('Employee signature saved successfully.', 'success');
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : 'Unable to save signature.',
        'error',
      );
    } finally {
      setIsSignatureSaving(false);
    }
  }

  return (
    <CompanyAdminRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Company admins can create and manage employee login access for this restaurant.
            </p>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={openCreateModal}
              className="ml-auto rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            >
              + Add employee
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-slate-500">Total employees</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
          </div>
          <div className="w-full max-w-xl">
            <div className="relative">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, username, or contact number"
                className={`${inputCls} pr-11`}
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear employee search"
                >
                  X
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Search starts after 3 characters. Clear the field to show all employees.
            </p>
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Designation</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableLoader colSpan={6} message="Loading employees…" />
                ) : employees.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={6}>
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
                        <p className="mt-1 text-slate-500">@{employee.username}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          employee.role === 'company_admin'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {toDisplayRole(employee.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {employee.contactNo}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {employee.designation || 'Not set'}
                        {employee.signatureSummary ? (
                          <p className="mt-1 text-xs text-emerald-600">
                            Signature saved {formatSignatureDate(employee.signatureSummary.signedAt)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">Signature not added</p>
                        )}
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
                            onClick={() => void openSignatureModal(employee)}
                            className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                          >
                            {employee.signatureSummary ? 'View signature' : 'Add signature'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(employee)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          {canViewPermissions ? (
                            <button
                              type="button"
                              onClick={() => void openPermissionsModal(employee)}
                              className="rounded-xl border border-cyan-200 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
                            >
                              Permissions
                            </button>
                          ) : null}
                          {user?.id !== employee.id ? (
                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete(employee)}
                              className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:hidden">
          {isLoading ? (
            <PageLoader message="Loading employees…" />
          ) : employees.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400 shadow-sm">
              No employees found.
            </div>
          ) : (
            employees.map((employee) => (
              <article
                key={`mobile-${employee.id}`}
                className="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">@{employee.username}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      employee.role === 'company_admin'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {toDisplayRole(employee.role)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        employee.isActive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Contact</span>
                    <span className="font-semibold text-slate-800">{employee.contactNo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Designation</span>
                    <span className="font-semibold text-slate-800">{employee.designation || 'Not set'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Signature</span>
                    <span className={`text-right font-semibold ${employee.signatureSummary ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {employee.signatureSummary
                        ? formatSignatureDate(employee.signatureSummary.signedAt)
                        : 'Not added'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void openSignatureModal(employee)}
                    className="min-h-11 rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    {employee.signatureSummary ? 'View signature' : 'Add signature'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(employee)}
                    className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  {canViewPermissions ? (
                    <button
                      type="button"
                      onClick={() => void openPermissionsModal(employee)}
                      className="min-h-11 rounded-xl border border-cyan-200 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                    >
                      Permissions
                    </button>
                  ) : null}
                  {user?.id !== employee.id ? (
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(employee)}
                      className="min-h-11 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  ) : null}
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
            description="Only company admins can create employees. Set the login username and password, then share those credentials directly with the employee."
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
                  value={formState.username}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Username"
                  autoComplete="off"
                  className={inputCls}
                />
                {/* Role selector */}
                <select
                  value={formState.displayRole}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      displayRole: event.target.value as DisplayRole,
                      canAccessOdc:
                        event.target.value === 'Manager' ? current.canAccessOdc : false,
                    }))
                  }
                  className={inputCls}
                >
                  {DISPLAY_ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={formState.contactNo}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      contactNo: event.target.value.replace(/\D/g, '').slice(0, 10),
                    }))
                  }
                  placeholder="Mobile number"
                  className={inputCls}
                />
                {!editingEmployee ? (
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formState.password}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Password"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                ) : canManagePassword(formState.displayRole) ? (
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formState.password}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="New password"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      Leave blank to keep the current password.
                    </p>
                  </div>
                ) : null}
                {user?.businessType !== 'EVENT_DECORATION' ? <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm md:col-span-2 ${
                    formState.displayRole === 'Manager'
                      ? 'border-cyan-200 bg-cyan-50 text-slate-700'
                      : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formState.canAccessOdc}
                    disabled={formState.displayRole !== 'Manager'}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        canAccessOdc: event.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
                  />
                  <span>
                    <span className="block font-medium text-slate-800">
                      Allow Outdoor Catering (ODC) access
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      Managers can use ODC only when the restaurant has ODC enabled by super admin.
                    </span>
                  </span>
                </label> : null}
                {editingEmployee ? (
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
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
                <div className="flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60 sm:w-auto"
                  >
                    {editingEmployee ? 'Save changes' : 'Create employee'}
                  </LoadingButton>
                </div>
            </form>
          </CommonModal>
        ) : null}

        {permissionEditor ? (
          <CommonModal
            title={`Permissions - ${employeeName(permissionEditor.employee)}`}
            description="View role-default access and manage custom permission overrides for this user."
            onClose={() => setPermissionEditor(null)}
            widthClassName="max-w-5xl"
            contentClassName="-mx-1 sm:mx-0"
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {employeeName(permissionEditor.employee)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {toDisplayRole(permissionEditor.employee.role)} · @{permissionEditor.employee.username}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {permissionEditor.effectivePermissions.length} effective
                  </span>
                </div>
              </div>

              {renderPermissionAccessPanel()}

              <div className="sticky bottom-0 z-20 -mx-4 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.25rem+var(--zb-safe-bottom))] pt-4 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:px-0 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setPermissionEditor(null)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  Close
                </button>
                {canManagePermissions && permissionEditor.employee.id !== user?.id ? (
                  <LoadingButton
                    type="button"
                    disabled={isPermissionSaving}
                    isLoading={isPermissionSaving}
                    onClick={() => void handleSavePermissions()}
                    className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60 sm:w-auto"
                  >
                    Save permissions
                  </LoadingButton>
                ) : null}
              </div>
            </div>
          </CommonModal>
        ) : null}

        {signatureModal ? (
          <CommonModal
            title={`${signatureModal.signature ? 'Employee signature' : 'Add signature'} - ${employeeName(signatureModal.employee)}`}
            description="Company admins can add or replace an employee signature when the employee is present."
            onClose={() => setSignatureModal(null)}
            widthClassName="max-w-2xl"
          >
            {signatureModal.mode === 'loading' ? (
              <PageLoader message="Loading signature..." />
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {employeeName(signatureModal.employee)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {toDisplayRole(signatureModal.employee.role)} · @{signatureModal.employee.username}
                  </p>
                </div>

                {signatureModal.signature ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Current signature
                      </p>
                      <div className="mt-3 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                        <Image
                          src={
                            signatureModal.signature.signatureUrl ??
                            signatureModal.signature.signatureImage
                          }
                          alt={`${employeeName(signatureModal.employee)} signature`}
                          width={360}
                          height={112}
                          className="h-auto max-h-28 w-auto max-w-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Saved on
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {formatSignatureDate(signatureModal.signature.signedAt)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Signed by
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {signatureModal.signature.signedByName}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {signatureModal.mode === 'view' ? (
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setSignatureModal(null)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={startReplacingSignature}
                      className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 sm:w-auto"
                    >
                      Replace signature
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {signatureModal.signature ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Saving a new signature will replace the current active signature. Previous signature will remain in history.
                      </p>
                    ) : null}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          Draw signature
                        </p>
                        <button
                          type="button"
                          onClick={() => resetSignatureCanvas()}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Clear
                        </button>
                      </div>
                      <canvas
                        ref={signatureCanvasRef}
                        onPointerDown={handleSignaturePointerDown}
                        onPointerMove={handleSignaturePointerMove}
                        onPointerUp={handleSignaturePointerEnd}
                        onPointerCancel={handleSignaturePointerEnd}
                        className="h-44 w-full touch-none rounded-2xl border border-dashed border-slate-300 bg-white sm:h-56"
                      />
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          signatureModal.signature
                            ? setSignatureModal((current) =>
                                current ? { ...current, mode: 'view', hasDrawnSignature: false } : current,
                              )
                            : setSignatureModal(null)
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <LoadingButton
                        type="button"
                        onClick={() => void handleSaveEmployeeSignature()}
                        disabled={isSignatureSaving || !signatureModal.hasDrawnSignature}
                        isLoading={isSignatureSaving}
                        className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60 sm:w-auto"
                      >
                        {signatureModal.signature ? 'Save replacement' : 'Save signature'}
                      </LoadingButton>
                    </div>
                  </div>
                )}
              </div>
            )}
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
