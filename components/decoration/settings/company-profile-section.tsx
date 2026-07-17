'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LoadingButton } from '@/components/ui/loading-button';
import { fetchMyRestaurant, updateMyRestaurantBranding, uploadLogo } from '@/lib/auth/api';
import type { Restaurant } from '@/lib/auth/types';
import { parseCompanyContactNumbers, validateCompanyProfile } from '@/lib/decoration/settings-view';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50 disabled:text-slate-500';

export function CompanyProfileSection() {
  const { accessToken, user, setSession } = useAuth();
  const canEdit = user?.role === 'company_admin';
  const [company, setCompany] = useState<Restaurant | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactNumbers, setContactNumbers] = useState('');
  const [errors, setErrors] = useState<{ name?: string; contactNumbers?: string }>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try {
      const result = await fetchMyRestaurant(accessToken);
      setCompany(result); setName(result.name); setLogoUrl(result.logoUrl ?? ''); setContactNumbers((result.contactNumbers ?? []).join('\n'));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load company profile'); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!accessToken || !user || !canEdit) return;
    const nextErrors = validateCompanyProfile({ name, contactNumbers });
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const updated = await updateMyRestaurantBranding(accessToken, { name: name.trim(), logoUrl: logoUrl.trim() || null, contactNumbers: parseCompanyContactNumbers(contactNumbers) });
      setCompany(updated); setName(updated.name); setLogoUrl(updated.logoUrl ?? ''); setContactNumbers(updated.contactNumbers.join('\n'));
      setSession({ accessToken, user: { ...user, restaurantLogoUrl: updated.logoUrl ?? null } });
      setMessage('Company profile updated successfully.');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update company profile'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading company profile…</div>;
  if (!company) return <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || 'Company profile is unavailable.'}<button onClick={() => void load()} className="ml-2 font-bold underline">Retry</button></div>;

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Company Branding</p>
    <h2 className="mt-1 text-xl font-semibold text-slate-900">Branding & Contacts</h2>
    <p className="mt-1 text-sm text-slate-500">Update the company identity used in decoration event documents and print layouts.</p>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company Name</span><input disabled={!canEdit} value={name} onChange={(event) => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })); }} className={inputClass}/>{errors.name ? <span className="block text-xs font-semibold text-red-600">{errors.name}</span> : null}</label>
      <div className="space-y-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Logo Image</span><div className="flex flex-wrap items-center gap-3">{canEdit ? <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 hover:border-amber-400 hover:text-amber-600 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>{uploading ? 'Uploading…' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={async(event)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;if(file.size>5*1024*1024){setError('Image must be under 5 MB.');return}try{setUploading(true);setError('');setLogoUrl(await uploadLogo(accessToken!,file))}catch(requestError){setError(requestError instanceof Error?requestError.message:'Upload failed')}finally{setUploading(false)}}}/></label> : null}{canEdit && logoUrl ? <button type="button" onClick={()=>setLogoUrl('')} className="text-xs text-slate-500 hover:text-red-600">Remove</button> : null}</div><p className="text-xs text-slate-400">JPEG, PNG, WebP or GIF · max 5 MB</p></div>
      <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Numbers</span><textarea disabled={!canEdit} value={contactNumbers} onChange={(event)=>{setContactNumbers(event.target.value);setErrors(current=>({...current,contactNumbers:undefined}))}} className={`${inputClass} min-h-28 resize-none`} placeholder={'One number per line\n9876543210'}/>{errors.contactNumbers ? <span className="block text-xs font-semibold text-red-600">{errors.contactNumbers}</span> : null}</label>
    </div>
    <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{logoUrl ? <img src={logoUrl} alt={name || 'Company logo'} className="h-14 w-14 rounded-xl border border-slate-200 object-contain p-2"/> : <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-400">Logo</div>}<div><p className="font-semibold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-500">{parseCompanyContactNumbers(contactNumbers).join(' • ') || 'No contact numbers'}</p></div></div>{canEdit ? <LoadingButton type="button" onClick={()=>void save()} isLoading={saving} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-500">Save branding</LoadingButton> : <span className="text-xs font-semibold text-slate-500">Company admin can update this profile</span>}</div>
  </section>;
}
