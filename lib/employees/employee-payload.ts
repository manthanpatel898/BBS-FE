import type { BusinessType } from '@/lib/auth/types';

export type EmployeeDisplayRole = 'Company Admin' | 'Manager';

export type EmployeePayloadForm = {
  firstName: string;
  lastName: string;
  username: string;
  displayRole: EmployeeDisplayRole;
  contactNo: string;
  password: string;
  isActive: boolean;
  canAccessOdc: boolean;
  permissions: string[];
};

function roleFor(displayRole: EmployeeDisplayRole): 'company_admin' | 'employee' {
  return displayRole === 'Company Admin' ? 'company_admin' : 'employee';
}

function commonPayload(form: EmployeePayloadForm, businessType?: BusinessType | null) {
  const { displayRole, password: _password, canAccessOdc, ...values } = form;
  const role = roleFor(displayRole);
  return {
    ...values,
    role,
    designation: displayRole,
    ...(businessType === 'EVENT_DECORATION'
      ? {}
      : { canAccessOdc: role === 'employee' ? canAccessOdc : false }),
  };
}

export function buildEmployeeUpdatePayload(
  form: EmployeePayloadForm,
  businessType?: BusinessType | null,
) {
  const password = form.password.trim();
  return {
    ...commonPayload(form, businessType),
    ...(form.displayRole === 'Manager' && password ? { password } : {}),
  };
}

export function buildEmployeeCreatePayload(
  form: EmployeePayloadForm,
  businessType?: BusinessType | null,
) {
  return {
    ...commonPayload(form, businessType),
    password: form.password.trim(),
  };
}
