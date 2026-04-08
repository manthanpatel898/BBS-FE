'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompanyAdminRoute } from '@/components/auth/company-admin-route';
import { useAuth } from '@/components/auth/auth-provider';
import { HotDatesManager } from '@/components/settings/hot-dates-manager';
import { LoadingButton } from '@/components/ui/loading-button';
import { PageLoader } from '@/components/ui/page-loader';
import { useToast } from '@/components/ui/toast';
import {
  createAddonService,
  createBanquetRule,
  createEventOption,
  createEventPlanner,
  createHallDetail,
  createPaymentOption,
  deleteAddonService,
  deleteBanquetRule,
  deleteEventOption,
  deleteEventPlanner,
  deleteHallDetail,
  deletePaymentOption,
  fetchMyRestaurant,
  fetchSettings,
  hideHallDetailCombination,
  restoreHallDetailCombination,
  updateAddonService,
  updateBanquetRule,
  updateEventOption,
  updateEventPlanner,
  updateHallDetail,
  updateHallBookingInformationVisibility,
  updateMyRestaurantBranding,
  updatePaymentOption,
  uploadLogo,
} from '@/lib/auth/api';
import { AppSettings, Restaurant, SettingOption } from '@/lib/auth/types';
import { buildHallDetailChoices } from '@/lib/hall-detail-combinations';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

type SettingsTabKey =
  | 'paymentOptions'
  | 'eventOptions'
  | 'eventPlanners'
  | 'hallDetails'
  | 'banquetRules'
  | 'addonServices'
  | 'hotDates';

type TabularOptionsSectionProps = {
  title: string;
  description: string;
  options: SettingOption[];
  addPlaceholder: string;
  addButtonLabel: string;
  emptyMessage: string;
  value: string;
  editingId: string | null;
  editingValue: string;
  isSaving: boolean;
  onValueChange: (value: string) => void;
  onAdd: () => void;
  onStartEdit: (option: SettingOption) => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

function TabularOptionsSection({
  title,
  description,
  options,
  addPlaceholder,
  addButtonLabel,
  emptyMessage,
  value,
  editingId,
  editingValue,
  isSaving,
  onValueChange,
  onAdd,
  onStartEdit,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: TabularOptionsSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
          Settings
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={addPlaceholder}
          className={inputCls}
        />
        <LoadingButton
          type="submit"
          disabled={isSaving}
          isLoading={isSaving}
          aria-label={addButtonLabel}
          title={addButtonLabel}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60 sm:ml-auto"
        >
          <span className="inline-flex items-center gap-2">
            <AddIcon />
            {addButtonLabel}
          </span>
        </LoadingButton>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Value
              </th>
              <th className="w-32 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {options.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              options.map((option) => {
                const isEditing = editingId === option.id;

                return (
                  <tr key={option.id}>
                    <td className="px-4 py-3 align-middle">
                      {isEditing ? (
                        <input
                          value={editingValue}
                          onChange={(event) => onEditValueChange(event.target.value)}
                          className={`${inputCls} bg-white`}
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-900">{option.label}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <IconButton label="Save" onClick={onSaveEdit} disabled={isSaving} isLoading={isSaving} tone="dark">
                              <CheckIcon />
                            </IconButton>
                            <IconButton label="Cancel" onClick={onCancelEdit}>
                              <CloseIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton label={`Edit ${option.label}`} onClick={() => onStartEdit(option)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              label={`Delete ${option.label}`}
                              onClick={() => onDelete(option.id)}
                              disabled={isSaving}
                              isLoading={isSaving}
                              tone="danger"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ToggleSettingCard({
  title,
  description,
  checked,
  isSaving,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  isSaving: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
            Visibility
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            {checked ? 'Enabled' : 'Disabled'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={isSaving}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              checked ? 'bg-amber-400' : 'bg-slate-300'
            } ${isSaving ? 'opacity-60' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                checked ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>
    </section>
  );
}

function HallDetailCombinationsSection({
  hallOptions,
  hiddenCombinations,
  isSaving,
  onHide,
  onRestore,
}: {
  hallOptions: SettingOption[];
  hiddenCombinations: string[];
  isSaving: boolean;
  onHide: (label: string) => void;
  onRestore: (label: string) => void;
}) {
  const allCombinations = useMemo(
    () => buildHallDetailChoices(hallOptions.map((option) => option.label)),
    [hallOptions],
  );
  const hiddenSet = useMemo(
    () => new Set(hiddenCombinations.map((value) => value.trim().toLowerCase())),
    [hiddenCombinations],
  );
  const activeCombinations = allCombinations.filter(
    (value) => !hiddenSet.has(value.trim().toLowerCase()),
  );
  const hiddenVisibleCombinations = allCombinations.filter((value) =>
    hiddenSet.has(value.trim().toLowerCase()),
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
          System Generated
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Hall Combinations
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review every hall combination generated from your base hall list. Hide any
          combination to remove it from the inquiry dropdown, then restore it here later
          if needed.
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Visible In Dropdown
            </p>
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {activeCombinations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No visible combinations are available right now.
              </p>
            ) : (
              activeCombinations.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <LoadingButton
                    type="button"
                    disabled={isSaving}
                    isLoading={isSaving}
                    onClick={() => onHide(label)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Hide
                  </LoadingButton>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Hidden Combinations
            </p>
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {hiddenVisibleCombinations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                Hidden combinations will appear here for recreation.
              </p>
            ) : (
              hiddenVisibleCombinations.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <LoadingButton
                    type="button"
                    disabled={isSaving}
                    isLoading={isSaving}
                    onClick={() => onRestore(label)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                  >
                    Recreate
                  </LoadingButton>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  isLoading,
  tone = 'default',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  tone?: 'default' | 'danger' | 'dark';
  children: ReactNode;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : tone === 'dark'
        ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
        : 'border-slate-300 text-slate-700 hover:bg-white';

  return (
    <LoadingButton
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      isLoading={isLoading}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:opacity-60 ${toneClass}`}
    >
      {children}
    </LoadingButton>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L8.25 18.462 3 20.25l1.788-5.25L16.862 3.487z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V4h6v3m-7 4v6m4-6v6m4-6v6M8 20h8a1 1 0 001-1V7H7v12a1 1 0 001 1z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function SettingsTabs({
  activeTab,
  onChange,
}: {
  activeTab: SettingsTabKey;
  onChange: (tab: SettingsTabKey) => void;
}) {
  const tabs: Array<{ key: SettingsTabKey; label: string }> = [
    { key: 'paymentOptions', label: 'Payment Options' },
    { key: 'eventOptions', label: 'Event Options' },
    { key: 'eventPlanners', label: 'Event Planners' },
    { key: 'hallDetails', label: 'Hall Details' },
    { key: 'banquetRules', label: 'Banquet Rules' },
    { key: 'addonServices', label: 'Addon Services' },
    { key: 'hotDates', label: 'Hot Dates' },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getTabMeta(tab: SettingsTabKey) {
  switch (tab) {
    case 'paymentOptions':
      return {
        title: 'Payment Options',
        description: 'These values appear anywhere the team records or confirms payments.',
        addPlaceholder: 'Add payment option',
        addButtonLabel: 'Add payment',
        emptyMessage: 'No payment options configured yet.',
      };
    case 'eventOptions':
      return {
        title: 'Event Options',
        description: 'These values appear in inquiry event selection and booking details.',
        addPlaceholder: 'Add event option',
        addButtonLabel: 'Add event',
        emptyMessage: 'No event options configured yet.',
      };
    case 'eventPlanners':
      return {
        title: 'Event Planners',
        description: 'Manage the event planner names available for confirmed booking assignment.',
        addPlaceholder: 'Add event planner',
        addButtonLabel: 'Add planner',
        emptyMessage: 'No event planners configured yet.',
      };
    case 'hallDetails':
      return {
        title: 'Hall Details',
        description: 'Manage reusable hall names or hall-detail text suggestions for the booking form.',
        addPlaceholder: 'Add hall detail',
        addButtonLabel: 'Add hall',
        emptyMessage: 'No hall details configured yet.',
      };
    case 'banquetRules':
      return {
        title: 'Banquet Rules',
        description: 'Add and maintain your venue-specific banquet rules for future use.',
        addPlaceholder: 'Add banquet rule',
        addButtonLabel: 'Add rule',
        emptyMessage: 'No banquet rules configured yet.',
      };
    case 'addonServices':
      return {
        title: 'Addon Services',
        description: 'Configure addon service names like projector, decoration, LED wall, music, or similar extras.',
        addPlaceholder: 'Add addon service',
        addButtonLabel: 'Add addon',
        emptyMessage: 'No addon services configured yet.',
      };
    case 'hotDates':
      return {
        title: 'Hot Dates',
        description: 'Manage high-demand dates that affect booking demand and planning.',
        addPlaceholder: '',
        addButtonLabel: '',
        emptyMessage: '',
      };
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, setSession, user } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBrandingSaving, setIsBrandingSaving] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('paymentOptions');
  const [paymentValue, setPaymentValue] = useState('');
  const [eventValue, setEventValue] = useState('');
  const [eventPlannerValue, setEventPlannerValue] = useState('');
  const [hallDetailValue, setHallDetailValue] = useState('');
  const [banquetRuleValue, setBanquetRuleValue] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentValue, setEditingPaymentValue] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventValue, setEditingEventValue] = useState('');
  const [editingEventPlannerId, setEditingEventPlannerId] = useState<string | null>(null);
  const [editingEventPlannerValue, setEditingEventPlannerValue] = useState('');
  const [editingHallDetailId, setEditingHallDetailId] = useState<string | null>(null);
  const [editingHallDetailValue, setEditingHallDetailValue] = useState('');
  const [editingBanquetRuleId, setEditingBanquetRuleId] = useState<string | null>(null);
  const [editingBanquetRuleValue, setEditingBanquetRuleValue] = useState('');
  const [addonValue, setAddonValue] = useState('');
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editingAddonValue, setEditingAddonValue] = useState('');
  const [brandingName, setBrandingName] = useState('');
  const [brandingLogoUrl, setBrandingLogoUrl] = useState('');
  const [brandingContactNumbers, setBrandingContactNumbers] = useState('');

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const validTabs: SettingsTabKey[] = [
      'paymentOptions',
      'eventOptions',
      'eventPlanners',
      'hallDetails',
      'banquetRules',
      'addonServices',
      'hotDates',
    ];

    if (requestedTab && validTabs.includes(requestedTab as SettingsTabKey)) {
      setActiveTab(requestedTab as SettingsTabKey);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;

    async function loadSettings() {
      try {
        setIsLoading(true);
        const [response, restaurantResponse] = await Promise.all([
          fetchSettings(token),
          fetchMyRestaurant(token),
        ]);
        setSettings(response);
        setRestaurant(restaurantResponse);
        setBrandingName(restaurantResponse.name);
        setBrandingLogoUrl(restaurantResponse.logoUrl ?? '');
        setBrandingContactNumbers((restaurantResponse.contactNumbers ?? []).join('\n'));
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Unable to load settings.',
          'error',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, [accessToken, showToast]);

  async function mutateSettings(request: () => Promise<AppSettings>, successMessage: string) {
    try {
      setIsSaving(true);
      const nextSettings = await request();
      setSettings(nextSettings);
      showToast(successMessage, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to save settings.',
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBrandingSave() {
    const token = requireToken();
    if (!token) return;

    const contactNumbers = parseContactNumbers(brandingContactNumbers);

    if (!brandingName.trim()) {
      showToast('Restaurant name is required.', 'error');
      return;
    }

    if (contactNumbers.length === 0) {
      showToast('Add at least one restaurant contact number.', 'error');
      return;
    }

    try {
      setIsBrandingSaving(true);
      const updatedRestaurant = await updateMyRestaurantBranding(token, {
        name: brandingName.trim(),
        logoUrl: brandingLogoUrl.trim() || null,
        contactNumbers,
      });
      setRestaurant(updatedRestaurant);
      setBrandingName(updatedRestaurant.name);
      setBrandingLogoUrl(updatedRestaurant.logoUrl ?? '');
      setBrandingContactNumbers((updatedRestaurant.contactNumbers ?? []).join('\n'));
      if (accessToken && user) {
        setSession({
          accessToken,
          user: {
            ...user,
            restaurantLogoUrl: updatedRestaurant.logoUrl ?? null,
          },
        });
      }
      showToast('Restaurant branding updated successfully.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to update restaurant branding.',
        'error',
      );
    } finally {
      setIsBrandingSaving(false);
    }
  }

  function requireToken() {
    if (!accessToken) {
      showToast('Missing session token.', 'error');
      return null;
    }

    return accessToken;
  }

  async function handlePaymentAdd() {
    const token = requireToken();
    if (!token) return;

    const label = paymentValue.trim();
    if (!label) {
      showToast('Payment option is required.', 'error');
      return;
    }

    await mutateSettings(
      () => createPaymentOption(token, label),
      'Payment option added successfully.',
    );
    setPaymentValue('');
  }

  async function handleEventAdd() {
    const token = requireToken();
    if (!token) return;

    const label = eventValue.trim();
    if (!label) {
      showToast('Event option is required.', 'error');
      return;
    }

    await mutateSettings(
      () => createEventOption(token, label),
      'Event option added successfully.',
    );
    setEventValue('');
  }

  async function handleBanquetRuleAdd() {
    const token = requireToken();
    if (!token) return;

    const label = banquetRuleValue.trim();
    if (!label) {
      showToast('Banquet rule is required.', 'error');
      return;
    }

    await mutateSettings(
      () => createBanquetRule(token, label),
      'Banquet rule added successfully.',
    );
    setBanquetRuleValue('');
  }

  async function handleEventPlannerAdd() {
    const token = requireToken();
    if (!token) return;

    const label = eventPlannerValue.trim();
    if (!label) {
      showToast('Event planner name is required.', 'error');
      return;
    }

    await mutateSettings(
      () => createEventPlanner(token, label),
      'Event planner added successfully.',
    );
    setEventPlannerValue('');
  }

  async function handleHallDetailAdd() {
    const token = requireToken();
    if (!token) return;

    const label = hallDetailValue.trim();
    if (!label) {
      showToast('Hall detail is required.', 'error');
      return;
    }

    await mutateSettings(
      () => createHallDetail(token, label),
      'Hall detail added successfully.',
    );
    setHallDetailValue('');
  }

  async function handleAddonAdd() {
    const token = requireToken();
    if (!token) return;

    const label = addonValue.trim();
    if (!label) {
      showToast('Addon service name is required.', 'error');
      return;
    }

    await mutateSettings(
      () => createAddonService(token, label),
      'Addon service added successfully.',
    );
    setAddonValue('');
  }

  async function handlePaymentSave() {
    const token = requireToken();
    if (!token || !editingPaymentId) return;

    const label = editingPaymentValue.trim();
    if (!label) {
      showToast('Payment option is required.', 'error');
      return;
    }

    await mutateSettings(
      () => updatePaymentOption(token, editingPaymentId, label),
      'Payment option updated successfully.',
    );
    setEditingPaymentId(null);
    setEditingPaymentValue('');
  }

  async function handleEventSave() {
    const token = requireToken();
    if (!token || !editingEventId) return;

    const label = editingEventValue.trim();
    if (!label) {
      showToast('Event option is required.', 'error');
      return;
    }

    await mutateSettings(
      () => updateEventOption(token, editingEventId, label),
      'Event option updated successfully.',
    );
    setEditingEventId(null);
    setEditingEventValue('');
  }

  async function handleHallDetailSave() {
    const token = requireToken();
    if (!token || !editingHallDetailId) return;

    const label = editingHallDetailValue.trim();
    if (!label) {
      showToast('Hall detail is required.', 'error');
      return;
    }

    await mutateSettings(
      () => updateHallDetail(token, editingHallDetailId, label),
      'Hall detail updated successfully.',
    );
    setEditingHallDetailId(null);
    setEditingHallDetailValue('');
  }

  async function handleEventPlannerSave() {
    const token = requireToken();
    if (!token || !editingEventPlannerId) return;

    const label = editingEventPlannerValue.trim();
    if (!label) {
      showToast('Event planner name is required.', 'error');
      return;
    }

    await mutateSettings(
      () => updateEventPlanner(token, editingEventPlannerId, label),
      'Event planner updated successfully.',
    );
    setEditingEventPlannerId(null);
    setEditingEventPlannerValue('');
  }

  async function handlePaymentDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deletePaymentOption(token, id),
      'Payment option deleted successfully.',
    );
  }

  async function handleEventDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteEventOption(token, id),
      'Event option deleted successfully.',
    );
  }

  async function handleEventPlannerDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteEventPlanner(token, id),
      'Event planner deleted successfully.',
    );
  }

  async function handleHallDetailDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteHallDetail(token, id),
      'Hall detail deleted successfully.',
    );
  }

  async function handleHallBookingInformationVisibilityChange(enabled: boolean) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => updateHallBookingInformationVisibility(token, enabled),
      `Hall booking information ${enabled ? 'enabled' : 'disabled'} successfully.`,
    );
  }

  async function handleHideHallDetailCombination(label: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => hideHallDetailCombination(token, label),
      'Hall combination hidden successfully.',
    );
  }

  async function handleRestoreHallDetailCombination(label: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => restoreHallDetailCombination(token, label),
      'Hall combination recreated successfully.',
    );
  }

  async function handleBanquetRuleSave() {
    const token = requireToken();
    if (!token || !editingBanquetRuleId) return;

    const label = editingBanquetRuleValue.trim();
    if (!label) {
      showToast('Banquet rule is required.', 'error');
      return;
    }

    await mutateSettings(
      () => updateBanquetRule(token, editingBanquetRuleId, label),
      'Banquet rule updated successfully.',
    );
    setEditingBanquetRuleId(null);
    setEditingBanquetRuleValue('');
  }

  async function handleAddonSave() {
    const token = requireToken();
    if (!token || !editingAddonId) return;

    const label = editingAddonValue.trim();
    if (!label) {
      showToast('Addon service name is required.', 'error');
      return;
    }

    await mutateSettings(
      () => updateAddonService(token, editingAddonId, label),
      'Addon service updated successfully.',
    );
    setEditingAddonId(null);
    setEditingAddonValue('');
  }

  async function handleBanquetRuleDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteBanquetRule(token, id),
      'Banquet rule deleted successfully.',
    );
  }

  async function handleAddonDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteAddonService(token, id),
      'Addon service deleted successfully.',
    );
  }

  function handleTabChange(tab: SettingsTabKey) {
    setActiveTab(tab);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === 'paymentOptions') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }

    const query = nextParams.toString();
    router.replace(query ? `/settings?${query}` : '/settings', { scroll: false });
  }

  return (
    <CompanyAdminRoute>
      <section className="space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
            Company Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Configure the payment, event, and banquet rule options used by your inquiry and booking flows.
          </p>
        </div>

        {isLoading && !settings ? (
          <PageLoader message="Loading settings..." />
        ) : settings ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                Restaurant Branding
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Branding & Contacts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your restaurant name, logo, and contact numbers. These details are used in the booking summary print layout.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Restaurant Name
                  </label>
                  <input
                    value={brandingName}
                    onChange={(event) => setBrandingName(event.target.value)}
                    className={inputCls}
                    placeholder="Restaurant name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Logo Image
                  </label>
                  <div className="flex items-center gap-3">
                    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-amber-400 hover:text-amber-600 ${isLogoUploading ? 'pointer-events-none opacity-60' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                      </svg>
                      {isLogoUploading ? 'Uploading…' : 'Choose image'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={isLogoUploading}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            showToast('Image must be under 5 MB.', 'error');
                            return;
                          }
                          const token = requireToken();
                          if (!token) return;
                          try {
                            setIsLogoUploading(true);
                            const url = await uploadLogo(token, file);
                            setBrandingLogoUrl(url);
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
                          } finally {
                            setIsLogoUploading(false);
                          }
                        }}
                      />
                    </label>
                    {brandingLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setBrandingLogoUrl('')}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">JPEG, PNG, WebP or GIF · max 5 MB</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact Numbers
                  </label>
                  <textarea
                    value={brandingContactNumbers}
                    onChange={(event) => setBrandingContactNumbers(event.target.value)}
                    className={`${inputCls} min-h-28 resize-none`}
                    placeholder={'Add one number per line\n8980938142\n9876543210'}
                  />
                  <p className="text-xs text-slate-500">
                    Multiple numbers are supported. One number per line or separated by commas.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {brandingLogoUrl.trim() ? (
                    <img
                      src={brandingLogoUrl.trim()}
                      alt={brandingName || 'Restaurant logo'}
                      className="h-14 w-14 rounded-xl border border-slate-200 object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-400">
                      Logo
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {brandingName || restaurant?.name || 'Restaurant name'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {parseContactNumbers(brandingContactNumbers).join(' • ') || 'No public contact numbers added yet'}
                    </p>
                  </div>
                </div>
                <LoadingButton
                  type="button"
                  onClick={() => void handleBrandingSave()}
                  disabled={isBrandingSaving}
                  isLoading={isBrandingSaving}
                  className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Save branding
                </LoadingButton>
              </div>
            </section>
            <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />
            {activeTab === 'hotDates' ? (
              <HotDatesManager />
            ) : (
              <div className="space-y-5">
                {activeTab === 'hallDetails' ? (
                  <ToggleSettingCard
                    title="Hall Booking Information"
                    description="Show hall-wise booking availability in the booking day side panel."
                    checked={Boolean(settings.showHallBookingInformation)}
                    isSaving={isSaving}
                    onChange={(nextValue) => void handleHallBookingInformationVisibilityChange(nextValue)}
                  />
                ) : null}
                <TabularOptionsSection
                  {...getTabMeta(activeTab)}
                  options={
                    activeTab === 'paymentOptions'
                      ? settings.paymentOptions
                      : activeTab === 'eventOptions'
                        ? settings.eventOptions
                        : activeTab === 'eventPlanners'
                          ? settings.eventPlanners
                        : activeTab === 'hallDetails'
                          ? settings.hallDetails
                          : activeTab === 'banquetRules'
                            ? settings.banquetRules
                            : settings.addonServices
                  }
                  value={
                    activeTab === 'paymentOptions'
                      ? paymentValue
                      : activeTab === 'eventOptions'
                        ? eventValue
                        : activeTab === 'eventPlanners'
                          ? eventPlannerValue
                        : activeTab === 'hallDetails'
                          ? hallDetailValue
                          : activeTab === 'banquetRules'
                            ? banquetRuleValue
                            : addonValue
                  }
                  editingId={
                    activeTab === 'paymentOptions'
                      ? editingPaymentId
                      : activeTab === 'eventOptions'
                        ? editingEventId
                        : activeTab === 'eventPlanners'
                          ? editingEventPlannerId
                        : activeTab === 'hallDetails'
                          ? editingHallDetailId
                          : activeTab === 'banquetRules'
                            ? editingBanquetRuleId
                            : editingAddonId
                  }
                  editingValue={
                    activeTab === 'paymentOptions'
                      ? editingPaymentValue
                      : activeTab === 'eventOptions'
                        ? editingEventValue
                        : activeTab === 'eventPlanners'
                          ? editingEventPlannerValue
                        : activeTab === 'hallDetails'
                          ? editingHallDetailValue
                          : activeTab === 'banquetRules'
                            ? editingBanquetRuleValue
                            : editingAddonValue
                  }
                  isSaving={isSaving}
                  onValueChange={
                    activeTab === 'paymentOptions'
                      ? setPaymentValue
                      : activeTab === 'eventOptions'
                        ? setEventValue
                        : activeTab === 'eventPlanners'
                          ? setEventPlannerValue
                        : activeTab === 'hallDetails'
                          ? setHallDetailValue
                          : activeTab === 'banquetRules'
                            ? setBanquetRuleValue
                            : setAddonValue
                  }
                  onAdd={
                    activeTab === 'paymentOptions'
                      ? () => void handlePaymentAdd()
                      : activeTab === 'eventOptions'
                        ? () => void handleEventAdd()
                        : activeTab === 'eventPlanners'
                          ? () => void handleEventPlannerAdd()
                        : activeTab === 'hallDetails'
                          ? () => void handleHallDetailAdd()
                          : activeTab === 'banquetRules'
                            ? () => void handleBanquetRuleAdd()
                            : () => void handleAddonAdd()
                  }
                  onStartEdit={(option) => {
                    if (activeTab === 'paymentOptions') {
                      setEditingPaymentId(option.id);
                      setEditingPaymentValue(option.label);
                      return;
                    }
                    if (activeTab === 'eventOptions') {
                      setEditingEventId(option.id);
                      setEditingEventValue(option.label);
                      return;
                    }
                    if (activeTab === 'eventPlanners') {
                      setEditingEventPlannerId(option.id);
                      setEditingEventPlannerValue(option.label);
                      return;
                    }
                    if (activeTab === 'hallDetails') {
                      setEditingHallDetailId(option.id);
                      setEditingHallDetailValue(option.label);
                      return;
                    }
                    if (activeTab === 'banquetRules') {
                      setEditingBanquetRuleId(option.id);
                      setEditingBanquetRuleValue(option.label);
                      return;
                    }
                    setEditingAddonId(option.id);
                    setEditingAddonValue(option.label);
                  }}
                  onEditValueChange={
                    activeTab === 'paymentOptions'
                      ? setEditingPaymentValue
                      : activeTab === 'eventOptions'
                        ? setEditingEventValue
                        : activeTab === 'eventPlanners'
                          ? setEditingEventPlannerValue
                        : activeTab === 'hallDetails'
                          ? setEditingHallDetailValue
                          : activeTab === 'banquetRules'
                            ? setEditingBanquetRuleValue
                            : setEditingAddonValue
                  }
                  onSaveEdit={
                    activeTab === 'paymentOptions'
                      ? () => void handlePaymentSave()
                      : activeTab === 'eventOptions'
                        ? () => void handleEventSave()
                        : activeTab === 'eventPlanners'
                          ? () => void handleEventPlannerSave()
                        : activeTab === 'hallDetails'
                          ? () => void handleHallDetailSave()
                          : activeTab === 'banquetRules'
                            ? () => void handleBanquetRuleSave()
                            : () => void handleAddonSave()
                  }
                  onCancelEdit={() => {
                    if (activeTab === 'paymentOptions') {
                      setEditingPaymentId(null);
                      setEditingPaymentValue('');
                      return;
                    }
                    if (activeTab === 'eventOptions') {
                      setEditingEventId(null);
                      setEditingEventValue('');
                      return;
                    }
                    if (activeTab === 'eventPlanners') {
                      setEditingEventPlannerId(null);
                      setEditingEventPlannerValue('');
                      return;
                    }
                    if (activeTab === 'hallDetails') {
                      setEditingHallDetailId(null);
                      setEditingHallDetailValue('');
                      return;
                    }
                    if (activeTab === 'banquetRules') {
                      setEditingBanquetRuleId(null);
                      setEditingBanquetRuleValue('');
                      return;
                    }
                    setEditingAddonId(null);
                    setEditingAddonValue('');
                  }}
                  onDelete={(id) => {
                    if (activeTab === 'paymentOptions') {
                      void handlePaymentDelete(id);
                      return;
                    }
                    if (activeTab === 'eventOptions') {
                      void handleEventDelete(id);
                      return;
                    }
                    if (activeTab === 'eventPlanners') {
                      void handleEventPlannerDelete(id);
                      return;
                    }
                    if (activeTab === 'hallDetails') {
                      void handleHallDetailDelete(id);
                      return;
                    }
                    if (activeTab === 'banquetRules') {
                      void handleBanquetRuleDelete(id);
                      return;
                    }
                    void handleAddonDelete(id);
                  }}
                />
                {activeTab === 'hallDetails' ? (
                  <HallDetailCombinationsSection
                    hallOptions={settings.hallDetails}
                    hiddenCombinations={settings.hiddenHallDetailCombinations ?? []}
                    isSaving={isSaving}
                    onHide={(label) => void handleHideHallDetailCombination(label)}
                    onRestore={(label) => void handleRestoreHallDetailCombination(label)}
                  />
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Unable to load settings.
          </div>
        )}
      </section>
    </CompanyAdminRoute>
  );
}

function parseContactNumbers(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
