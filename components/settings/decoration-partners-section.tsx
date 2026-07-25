'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  fetchPartnerCompanies,
  fetchPartnerInquiryConfig,
  fetchPartnerInquiryPolicy,
  updatePartnerInquiryConfig,
} from '@/lib/auth/api';
import type { PartnerCompany, PartnerInquiryConfig, PartnerInquiryPolicy } from '@/lib/auth/types';

export function DecorationPartnersSection() {
  const { accessToken } = useAuth();
  const [config, setConfig] = useState<PartnerInquiryConfig | null>(null);
  const [policy, setPolicy] = useState<PartnerInquiryPolicy | null>(null);
  const [partners, setPartners] = useState<PartnerCompany[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    Promise.all([
      fetchPartnerInquiryConfig(accessToken),
      fetchPartnerInquiryPolicy(accessToken),
      fetchPartnerCompanies(accessToken),
    ])
      .then(([nextConfig, nextPolicy, nextPartners]) => {
        if (!active) return;
        setConfig(nextConfig);
        setPolicy(nextPolicy);
        setPartners(nextPartners);
        setEnabled(nextConfig.enabled);
        setSelected(nextConfig.partnerRestaurantIds);
      })
      .catch((error) => active && setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load decoration partners.' }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [accessToken]);

  function togglePartner(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function save() {
    if (!accessToken) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updatePartnerInquiryConfig(accessToken, {
        enabled,
        partnerRestaurantIds: selected,
        acceptCurrentPolicy: acceptPolicy,
      });
      setConfig(updated);
      setAcceptPolicy(false);
      setMessage({ type: 'success', text: 'Decoration partner sharing settings saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save settings.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Loading decoration partners…</div>;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Automated inquiry pipeline</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Decoration Partners</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Share eligible confirmed banquet bookings with selected event-decoration companies already using the platform.
          </p>
        </div>
        <label className="flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 sm:min-w-56">
          Enable feature
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
        </label>
      </div>

      {message ? <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.text}</div> : null}

      <div>
        <h3 className="text-sm font-semibold text-slate-950">Companies to notify</h3>
        <p className="mt-1 text-sm text-slate-600">Each company receives an independent incoming inquiry and may accept or decline it.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {partners.map((partner) => {
            const checked = selected.includes(partner.id);
            return (
              <label key={partner.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input type="checkbox" checked={checked} onChange={() => togglePartner(partner.id)} className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-950">{partner.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{partner.address || 'Address not provided'}</span>
                  <span className="block text-xs text-slate-500">{partner.contactNumber}</span>
                </span>
              </label>
            );
          })}
          {!partners.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No active event-decoration companies are available.</div> : null}
        </div>
      </div>

      {policy ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-950">{policy.title}</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Version {policy.version}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{policy.summary}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {policy.dataFields.map((field) => <li key={field} className="flex gap-2"><span className="text-emerald-600">✓</span><span>{field}</span></li>)}
          </ul>
          {config?.currentPolicyAccepted || policy.accepted ? (
            <p className="mt-4 text-sm font-semibold text-emerald-700">Current policy acknowledged.</p>
          ) : (
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-slate-900">
              <input type="checkbox" checked={acceptPolicy} onChange={(event) => setAcceptPolicy(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
              I am authorized to enable this company-to-company data sharing and acknowledge the current policy.
            </label>
          )}
        </div>
      ) : null}

      <div className="flex justify-end">
        <LoadingButton type="button" onClick={() => void save()} isLoading={saving} disabled={saving} className="w-full rounded-xl bg-amber-400 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-500 sm:w-auto">
          Save partner settings
        </LoadingButton>
      </div>
    </section>
  );
}
