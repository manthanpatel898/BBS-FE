'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { CompanyAdminRoute } from '@/components/auth/company-admin-route';
import { useAuth } from '@/components/auth/auth-provider';
import { PageLoader } from '@/components/ui/page-loader';
import { useToast } from '@/components/ui/toast';
import {
  createAddonService,
  createBanquetRule,
  createEventOption,
  createHallDetail,
  createPaymentOption,
  deleteAddonService,
  deleteBanquetRule,
  deleteEventOption,
  deleteHallDetail,
  deletePaymentOption,
  fetchMyRestaurant,
  fetchSettings,
  updateAddonService,
  updateBanquetRule,
  updateEventOption,
  updateHallDetail,
  updateMyRestaurantBranding,
  updatePaymentOption,
  uploadLogo,
} from '@/lib/auth/api';
import { AppSettings, Restaurant, SettingOption } from '@/lib/auth/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

type SettingsTabKey =
  | 'paymentOptions'
  | 'eventOptions'
  | 'hallDetails'
  | 'banquetRules'
  | 'addonServices';

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
        className="mt-5 flex flex-col gap-3 sm:flex-row"
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
        <button
          type="submit"
          disabled={isSaving}
          aria-label={addButtonLabel}
          title={addButtonLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-white transition hover:bg-amber-500 disabled:opacity-60"
        >
          <AddIcon />
        </button>
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
                            <IconButton label="Save" onClick={onSaveEdit} disabled={isSaving} tone="dark">
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

function IconButton({
  label,
  onClick,
  disabled,
  tone = 'default',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
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
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:opacity-60 ${toneClass}`}
    >
      {children}
    </button>
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
    { key: 'hallDetails', label: 'Hall Details' },
    { key: 'banquetRules', label: 'Banquet Rules' },
    { key: 'addonServices', label: 'Addon Services' },
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
  }
}

export default function SettingsPage() {
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
  const [hallDetailValue, setHallDetailValue] = useState('');
  const [banquetRuleValue, setBanquetRuleValue] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentValue, setEditingPaymentValue] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventValue, setEditingEventValue] = useState('');
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

  async function handleHallDetailDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteHallDetail(token, id),
      'Hall detail deleted successfully.',
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
                <button
                  type="button"
                  onClick={() => void handleBrandingSave()}
                  disabled={isBrandingSaving}
                  className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {isBrandingSaving ? 'Saving…' : 'Save branding'}
                </button>
              </div>
            </section>
            <SettingsTabs activeTab={activeTab} onChange={setActiveTab} />
            <TabularOptionsSection
              {...getTabMeta(activeTab)}
              options={
                activeTab === 'paymentOptions'
                  ? settings.paymentOptions
                  : activeTab === 'eventOptions'
                    ? settings.eventOptions
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
