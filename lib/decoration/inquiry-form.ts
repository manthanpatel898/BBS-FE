import { canCreateDecorationInquiry, decorationBusinessDate } from './booking-date-policy';

export const OTHER_DECORATION_OPTION = '__OTHER__';

export type DecorationInquiryValues = {
  customerName:string; mobile:string;
  eventTypeId:string; customEventTypeName:string;
  venueId:string; customVenueName:string; customVenueType:'HOTEL'|'VENUE'; customVenueAddress:string;
  hallId:string; customHallName:string; address:string;
  timeSlot:'MORNING'|'AFTERNOON'|'EVENING'; startDate:string; endDate:string; packageRate:string; notes:string;
};

export function createDecorationInquiryValues(date = ''): DecorationInquiryValues {
  return { customerName:'',mobile:'',eventTypeId:'',customEventTypeName:'',venueId:'',customVenueName:'',customVenueType:'VENUE',customVenueAddress:'',hallId:'',customHallName:'',address:'',timeSlot:'MORNING',startDate:date,endDate:date,packageRate:'',notes:'' };
}

export function changeInquiryLocation(values:DecorationInquiryValues,venueId:string):DecorationInquiryValues {
  return { ...values, venueId, hallId:'', customHallName:'', ...(venueId!==OTHER_DECORATION_OPTION?{customVenueName:'',customVenueAddress:''}:{}) };
}

export function validateDecorationInquiry(values: DecorationInquiryValues, options: { mode?: 'create'|'edit'; todayKey?: string } = {}) {
  const errors: Partial<Record<keyof DecorationInquiryValues,string>> = {};
  if (!values.customerName.trim()) errors.customerName='Customer name is required';
  if (!/^\d{10}$/.test(values.mobile)) errors.mobile='Enter a valid 10-digit mobile number';
  if (!values.eventTypeId) errors.eventTypeId='Select an event type';
  if (values.eventTypeId===OTHER_DECORATION_OPTION&&!values.customEventTypeName.trim()) errors.customEventTypeName='Enter an event type';
  if (!values.venueId) errors.venueId='Select a hotel or venue';
  if (values.venueId===OTHER_DECORATION_OPTION&&!values.customVenueName.trim()) errors.customVenueName='Enter a hotel or venue name';
  if (values.hallId===OTHER_DECORATION_OPTION&&!values.customHallName.trim()) errors.customHallName='Enter a hall name or number';
  if (!values.startDate) errors.startDate='Start date is required';
  else if (options.mode!=='edit'&&!canCreateDecorationInquiry(values.startDate,options.todayKey??decorationBusinessDate())) errors.startDate='New inquiries cannot be created for a previous date.';
  if (!values.endDate) errors.endDate='End date is required';
  else if (values.startDate&&values.endDate<values.startDate) errors.endDate='End date cannot be before start date';
  if (values.packageRate===''||!Number.isFinite(Number(values.packageRate))||Number(values.packageRate)<0) errors.packageRate='Enter a valid package rate';
  return errors;
}

function normalize(values:DecorationInquiryValues){return {customerName:values.customerName.trim(),mobile:values.mobile,eventTypeId:values.eventTypeId,venueId:values.venueId,hallId:values.hallId||null,address:values.address.trim()||null,timeSlot:values.timeSlot,startDate:values.startDate,endDate:values.endDate,packageRate:Number(values.packageRate),notes:values.notes.trim()||null}}

export function buildDecorationBookingPatch(original:DecorationInquiryValues|null,current:DecorationInquiryValues){const next=normalize(current);if(!original)return next;const before=normalize(original);return Object.fromEntries(Object.entries(next).filter(([key,value])=>before[key as keyof typeof before]!==value))}
