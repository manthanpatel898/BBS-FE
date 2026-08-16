import { BusinessType } from '@/lib/auth/types';

export function normalizeFlexibleMenuBuilderFlag(
  businessType: BusinessType,
  enabled: boolean,
): boolean {
  return businessType === 'BANQUET' && enabled;
}
