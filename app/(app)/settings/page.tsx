'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CompanyAdminRoute } from '@/components/auth/company-admin-route';
import { useAuth } from '@/components/auth/auth-provider';
import { PageLoader } from '@/components/ui/page-loader';
import { useToast } from '@/components/ui/toast';
import {
  createBanquetRule,
  createEventOption,
  createPaymentOption,
  deleteBanquetRule,
  deleteEventOption,
  deletePaymentOption,
  fetchSettings,
  updateBanquetRule,
  updateEventOption,
  updatePaymentOption,
} from '@/lib/auth/api';
import { AppSettings, SettingOption } from '@/lib/auth/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

type OptionSectionProps = {
  title: string;
  description: string;
  options: SettingOption[];
  newValue: string;
  editingId: string | null;
  editingValue: string;
  isSaving: boolean;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onStartEdit: (option: SettingOption) => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

function OptionSection({
  title,
  description,
  options,
  newValue,
  editingId,
  editingValue,
  isSaving,
  onNewValueChange,
  onAdd,
  onStartEdit,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: OptionSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
            Settings
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <input
          value={newValue}
          onChange={(event) => onNewValueChange(event.target.value)}
          placeholder={`Add ${title.toLowerCase().slice(0, -1)}`}
          className={inputCls}
        />
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
        >
          Add option
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {options.map((option) => {
          const isEditing = editingId === option.id;

          return (
            <div
              key={option.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
            >
              {isEditing ? (
                <input
                  value={editingValue}
                  onChange={(event) => onEditValueChange(event.target.value)}
                  className={`${inputCls} flex-1 bg-white`}
                />
              ) : (
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                </div>
              )}

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={onSaveEdit}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onStartEdit(option)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDelete(option.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentValue, setPaymentValue] = useState('');
  const [eventValue, setEventValue] = useState('');
  const [banquetRuleValue, setBanquetRuleValue] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentValue, setEditingPaymentValue] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventValue, setEditingEventValue] = useState('');
  const [editingBanquetRuleId, setEditingBanquetRuleId] = useState<string | null>(null);
  const [editingBanquetRuleValue, setEditingBanquetRuleValue] = useState('');

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;

    async function loadSettings() {
      try {
        setIsLoading(true);
        const response = await fetchSettings(token);
        setSettings(response);
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

  async function handleBanquetRuleDelete(id: string) {
    const token = requireToken();
    if (!token) return;

    await mutateSettings(
      () => deleteBanquetRule(token, id),
      'Banquet rule deleted successfully.',
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
          <div className="grid gap-6 xl:grid-cols-2">
            <OptionSection
              title="Payment Options"
              description="These values appear anywhere the team records or confirms payments."
              options={settings.paymentOptions}
              newValue={paymentValue}
              editingId={editingPaymentId}
              editingValue={editingPaymentValue}
              isSaving={isSaving}
              onNewValueChange={setPaymentValue}
              onAdd={() => void handlePaymentAdd()}
              onStartEdit={(option) => {
                setEditingPaymentId(option.id);
                setEditingPaymentValue(option.label);
              }}
              onEditValueChange={setEditingPaymentValue}
              onSaveEdit={() => void handlePaymentSave()}
              onCancelEdit={() => {
                setEditingPaymentId(null);
                setEditingPaymentValue('');
              }}
              onDelete={(id) => void handlePaymentDelete(id)}
            />
            <OptionSection
              title="Event Options"
              description="These values appear in inquiry event selection and booking details."
              options={settings.eventOptions}
              newValue={eventValue}
              editingId={editingEventId}
              editingValue={editingEventValue}
              isSaving={isSaving}
              onNewValueChange={setEventValue}
              onAdd={() => void handleEventAdd()}
              onStartEdit={(option) => {
                setEditingEventId(option.id);
                setEditingEventValue(option.label);
              }}
              onEditValueChange={setEditingEventValue}
              onSaveEdit={() => void handleEventSave()}
              onCancelEdit={() => {
                setEditingEventId(null);
                setEditingEventValue('');
              }}
              onDelete={(id) => void handleEventDelete(id)}
            />
            <OptionSection
              title="Banquet Rules"
              description="Add and maintain your venue-specific banquet rules for future use."
              options={settings.banquetRules}
              newValue={banquetRuleValue}
              editingId={editingBanquetRuleId}
              editingValue={editingBanquetRuleValue}
              isSaving={isSaving}
              onNewValueChange={setBanquetRuleValue}
              onAdd={() => void handleBanquetRuleAdd()}
              onStartEdit={(option) => {
                setEditingBanquetRuleId(option.id);
                setEditingBanquetRuleValue(option.label);
              }}
              onEditValueChange={setEditingBanquetRuleValue}
              onSaveEdit={() => void handleBanquetRuleSave()}
              onCancelEdit={() => {
                setEditingBanquetRuleId(null);
                setEditingBanquetRuleValue('');
              }}
              onDelete={(id) => void handleBanquetRuleDelete(id)}
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
