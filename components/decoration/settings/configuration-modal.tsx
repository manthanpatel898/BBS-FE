'use client';
import { CommonModal } from '@/components/ui/common-modal';
export const decorationSettingsInput='w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
export function ConfigurationModal({title,description,onClose,children}:{title:string;description?:string;onClose:()=>void;children:React.ReactNode}){return <CommonModal title={title} description={description} onClose={onClose} widthClassName="max-w-lg">{children}</CommonModal>}
