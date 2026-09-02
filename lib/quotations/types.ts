export type InquiryQuotationTaxTreatment =
  | 'EXCLUDE_TAX'
  | 'ADD_CONFIGURED_GST'
  | 'TAX_INCLUDED';

export interface InquiryQuotationSettings {
  enableInquiryQuotations: boolean;
  validityDays: number;
  taxTreatment: InquiryQuotationTaxTreatment;
  gstPercentage: number;
  terms: string;
  paymentTerms: string;
  cancellationPolicy: string;
  footer: string;
}

export interface QuotationDraftPayload {
  categoryId: string;
  pax: number;
  customPricePerPlate?: number | null;
  selectedMenus?: Array<{
    menuId: string;
    directItems?: string[];
    sections?: Array<{ sectionTitle: string; items: string[] }>;
  }>;
  menuComment?: string;
  additionalPackages?: Array<{
    categoryId: string;
    pax: number;
    customPricePerPlate?: number | null;
    selectedMenus?: QuotationDraftPayload['selectedMenus'];
    menuComment?: string;
    serviceSlot?: string;
    startTime?: string;
    endTime?: string;
  }>;
  addonServices?: Array<{ id?: string; label: string; price: number }>;
  discountAmount?: number;
  taxTreatment: InquiryQuotationTaxTreatment;
  gstPercentage: number;
  validityDays?: number;
  terms: string;
  paymentTerms: string;
  cancellationPolicy: string;
  footer: string;
}

export interface BanquetQuotation {
  id: string;
  quotationNumber: string;
  version: number;
  status: 'GENERATED' | 'ACCEPTED' | 'SUPERSEDED' | 'CANCELLED';
  validUntil: string;
  generatedAt: string;
  generatedBy?: { userId: string; name: string };
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  customerSnapshot: Record<string, unknown>;
  eventSnapshot: Record<string, unknown>;
  packages: QuotationPackageSnapshot[];
  addOns: QuotationAddonSnapshot[];
  tax: Record<string, unknown>;
  totals: Record<string, unknown>;
}

export interface QuotationPackageSnapshot {
  packageType: 'PRIMARY' | 'ADDITIONAL';
  label: string;
  categoryId: string;
  categoryName: string;
  pax: number;
  configuredRatePaise: number;
  customRatePaise: number | null;
  effectiveRatePaise: number;
  subtotalPaise: number;
  serviceSlot: string;
  startTime: string;
  endTime: string;
  menuSelections: Array<{
    menuId: string;
    title: string;
    directItems?: string[];
    sections: Array<{ sectionTitle: string; items: string[] }>;
  }>;
  menuComment: string;
}

export interface QuotationAddonSnapshot {
  id: string | null;
  label: string;
  amountPaise: number;
}
