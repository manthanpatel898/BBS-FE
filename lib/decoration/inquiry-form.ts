import { canCreateDecorationInquiry, decorationBusinessDate } from './booking-date-policy';

export const OTHER_DECORATION_OPTION = '__OTHER__';

export type DecorationInquiryValues = {
  customerName:string; mobile:string; alternativeMobile:string; customerAddress:string;
  eventTypeId:string; customEventTypeName:string;
  venueId:string; customVenueName:string; customVenueType:'HOTEL'|'VENUE'; customVenueAddress:string;
  hallId:string; customHallName:string; address:string;
  timeSlot:'MORNING'|'AFTERNOON'|'EVENING'; startTime:string; endTime:string; startDate:string; packageRate:string; notes:string;
};

export function createDecorationInquiryValues(date = ''): DecorationInquiryValues {
  return { customerName:'',mobile:'',alternativeMobile:'',customerAddress:'',eventTypeId:'',customEventTypeName:'',venueId:'',customVenueName:'',customVenueType:'VENUE',customVenueAddress:'',hallId:'',customHallName:'',address:'',timeSlot:'MORNING',startTime:'',endTime:'',startDate:date,packageRate:'',notes:'' };
}

export function changeInquiryLocation(values:DecorationInquiryValues,venueId:string):DecorationInquiryValues {
  return { ...values, venueId, hallId:'', customHallName:'', ...(venueId!==OTHER_DECORATION_OPTION?{customVenueName:'',customVenueAddress:''}:{}) };
}

export function validateDecorationInquiry(values: DecorationInquiryValues, options: { mode?: 'create'|'edit'; todayKey?: string } = {}) {
  const errors: Partial<Record<keyof DecorationInquiryValues,string>> = {};
  if (!values.customerName.trim()) errors.customerName='Customer name is required';
  if (!/^\d{10}$/.test(values.mobile)) errors.mobile='Enter a valid 10-digit mobile number';
  if (values.alternativeMobile && !/^\d{10}$/.test(values.alternativeMobile)) errors.alternativeMobile='Enter a valid 10-digit alternative mobile number';
  if (values.customerAddress.length>1000) errors.customerAddress='Customer address cannot exceed 1000 characters';
  if (!values.eventTypeId) errors.eventTypeId='Select an event type';
  if (values.eventTypeId===OTHER_DECORATION_OPTION&&!values.customEventTypeName.trim()) errors.customEventTypeName='Enter an event type';
  if (!values.venueId) errors.venueId='Select a hotel or venue';
  if (values.venueId===OTHER_DECORATION_OPTION&&!values.customVenueName.trim()) errors.customVenueName='Enter a hotel or venue name';
  if (values.hallId===OTHER_DECORATION_OPTION&&!values.customHallName.trim()) errors.customHallName='Enter a hall name or number';
  if (!values.startDate) errors.startDate='Event date is required';
  else if (options.mode!=='edit'&&!canCreateDecorationInquiry(values.startDate,options.todayKey??decorationBusinessDate())) errors.startDate='New inquiries cannot be created for a previous date.';
  if (values.packageRate!==''&&(!Number.isFinite(Number(values.packageRate))||Number(values.packageRate)<0)) errors.packageRate='Enter a valid package rate';
  if (!values.startTime) errors.startTime='Start time is required';
  if (!values.endTime) errors.endTime='End time is required';
  if (values.startTime&&values.endTime&&values.startTime===values.endTime) errors.endTime='End time must be different from start time';
  return errors;
}

function normalize(values:DecorationInquiryValues){return {customerName:values.customerName.trim(),mobile:values.mobile,alternativeMobile:values.alternativeMobile||null,customerAddress:values.customerAddress.trim()||null,eventTypeId:values.eventTypeId,venueId:values.venueId,hallId:values.hallId||null,address:values.address.trim()||null,timeSlot:values.timeSlot,startTime:values.startTime,endTime:values.endTime,startDate:values.startDate,...(values.packageRate!==''?{packageRate:Number(values.packageRate)}:{}),notes:values.notes.trim()||null}}

export function buildDecorationBookingPatch(original:DecorationInquiryValues|null,current:DecorationInquiryValues){const next=normalize(current);if(!original)return next;const before=normalize(original);return Object.fromEntries(Object.entries(next).filter(([key,value])=>before[key as keyof typeof before]!==value))}
