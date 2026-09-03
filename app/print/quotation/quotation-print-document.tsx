import type { AppSettings, Order, Restaurant } from '@/lib/auth/types';
import type { BanquetQuotation } from '@/lib/quotations/types';
import { buildPackageDocumentSections } from '@/lib/bookings/package-document-view';
import { formatPrintEventDateTime } from '@/lib/print-date';

type MenuSectionBox = { key: string; section: string; items: string[] };

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fullName(order: Order) {
  return `${order.customer.firstName} ${order.customer.lastName}`.trim();
}

function menuSections(order: Pick<Order, 'menuSelectionSnapshot'>): MenuSectionBox[] {
  return order.menuSelectionSnapshot.flatMap((menu) => {
    const direct =
      menu.directItems && menu.directItems.length
        ? [{
            key: `${menu.menuId}-direct`,
            section: menu.title,
            items: menu.directItems,
          }]
        : [];
    return [
      ...direct,
      ...menu.sections.map((section) => ({
        key: `${menu.menuId}-${section.sectionTitle}`,
        section: section.sectionTitle,
        items: section.items,
      })),
    ];
  });
}

function chunk<T>(items: T[], size: number) {
  const rows: Array<Array<T | null>> = [];
  for (let index = 0; index < items.length; index += size) {
    const row = items.slice(index, index + size) as Array<T | null>;
    while (row.length < size) row.push(null);
    rows.push(row);
  }
  return rows;
}

function CompactTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-stone-400">
      <div className="border-b border-stone-400 bg-stone-100 px-3 py-1.5">
        <p className="text-[12px] font-black uppercase text-stone-950">{title}</p>
      </div>
      <table className="w-full border-collapse text-[12px] font-bold text-stone-950">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-stone-300 last:border-b-0">
              <td className="w-2/5 bg-stone-50 px-2 py-1 font-black uppercase text-stone-800">
                {label}
              </td>
              <td className="px-2 py-1">{value || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MenuGrid({ sections }: { sections: MenuSectionBox[] }) {
  const rows = chunk(sections, 3);
  return (
    <section className="mt-3 overflow-hidden rounded-[10px] border border-stone-400 print:mt-2">
      <div className="border-b border-stone-400 bg-stone-100 px-3 py-1.5">
        <p className="text-[12px] font-bold uppercase text-stone-950">Selected Menu Snapshot</p>
      </div>
      <table className="min-w-full table-fixed border-collapse text-[12px] leading-tight text-stone-950 print:text-[12px]">
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((section, cellIndex) => (
                <td key={section?.key ?? `empty-${rowIndex}-${cellIndex}`} className="w-1/3 border-b border-r border-stone-400 align-top last:border-r-0">
                  {section ? (
                    <div>
                      <div className="border-b border-stone-300 bg-stone-100 px-1.5 py-0.5 font-black uppercase text-stone-950">
                        {section.section} - {section.items.length}
                      </div>
                      <div className="px-1.5 py-1">
                        {section.items.map((item, index) => (
                          <div key={`${section.key}-${index}-${item}`} className="border-b border-dotted border-stone-300 py-0.5 font-semibold text-stone-900 last:border-b-0">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          )) : (
            <tr><td className="px-3 py-3 text-center font-bold text-stone-700">Menu selection pending</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function QuotationPrintDocument({
  order,
  quotation,
  restaurant,
  settings,
}: {
  order: Order;
  quotation: BanquetQuotation;
  restaurant: Restaurant | null;
  settings: AppSettings | null;
}) {
  const packages = buildPackageDocumentSections(order);
  const primarySections = menuSections(order);
  const contacts =
    restaurant?.contactNumbers?.filter(Boolean).length
      ? restaurant.contactNumbers.filter(Boolean)
      : restaurant?.contactPersonNumber
        ? [restaurant.contactPersonNumber]
        : [];

  return (
    <article className="mx-auto max-w-[210mm] bg-white px-[7mm] py-[6mm] text-[11px] text-stone-900 shadow-sm print:max-w-none print:px-[4mm] print:pb-[10mm] print:pt-[3mm] print:shadow-none">
      <header className="border-b border-stone-400 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {restaurant?.logoUrl ? (
              <div className="flex h-16 w-16 items-center justify-center p-1 print:h-14 print:w-14">
                <img src={restaurant.logoUrl} alt={restaurant.name} className="max-h-full max-w-full object-contain" />
              </div>
            ) : null}
            <div className="w-px self-stretch bg-stone-300" />
            <div className="pt-1">
              {restaurant?.name ? <p className="text-[19px] font-bold tracking-[0.08em] text-stone-950 print:text-[16px]">{restaurant.name}</p> : null}
              {contacts.length ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-stone-900 print:text-[10px]">
                  <span>Contact:</span>
                  {contacts.map((contact) => <span key={contact} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-950">{contact}</span>)}
                </div>
              ) : null}
            </div>
          </div>
          <div className="pt-3 text-right">
            <p className="text-base font-bold uppercase tracking-[0.14em] text-stone-950 print:text-[15px]">Quotation</p>
            <p className="mt-1 text-[11px] font-bold text-stone-700">{quotation.quotationNumber} / V{quotation.version}</p>
          </div>
        </div>
      </header>

      <section className="mt-3 grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
        <CompactTable
          title="Event Details"
          rows={[
            ['Date and Time', formatPrintEventDateTime(order)],
            ['Slot Type', order.serviceSlot || 'Pending'],
            ['Event Type', order.eventType || order.functionName || 'Pending'],
            ['Hall NO', order.hallDetails || 'Pending'],
            ['Customer Name', fullName(order)],
            ['Customer Mo.', order.customer.phone],
            ['Pax', order.pax ? `${order.pax} Person` : 'Pending'],
            ['Menu and Price', order.categorySnapshot ? `${order.categorySnapshot.name} (${money(order.pricePerPlate)})` : 'Pending'],
          ]}
        />
        <CompactTable
          title="Quotation Details"
          rows={[
            ['Quotation No.', `${quotation.quotationNumber} / V${quotation.version}`],
            ['Status', quotation.status],
            ['Valid Until', quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-IN') : 'N/A'],
            ['Package Total', money(Number(quotation.totals.packageSubtotalPaise ?? 0) / 100)],
            ['GST', money(Number(quotation.tax.totalTaxPaise ?? 0) / 100)],
            ['Grand Total', money(Number(quotation.totals.grandTotalPaise ?? 0) / 100)],
          ]}
        />
      </section>

      <MenuGrid sections={primarySections} />

      {packages.filter((item) => item.kind === 'ADDITIONAL').map((packageSection) => (
        <section key={packageSection.key} className="mt-3 break-inside-avoid-page overflow-hidden rounded-[10px] border border-stone-400 print:mt-2">
          <div className="break-after-avoid border-b border-stone-400 bg-stone-100 px-3 py-1.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-stone-700">{packageSection.label}</p>
            <p className="text-[13px] font-black text-stone-950">
              {packageSection.categoryName} · {packageSection.pax} Person · {packageSection.time}
            </p>
            <p className="text-[11px] font-bold text-stone-800">{money(packageSection.rate)} per plate · {money(packageSection.subtotal)}</p>
          </div>
          <MenuGrid sections={menuSections({ menuSelectionSnapshot: packageSection.menus })} />
          {packageSection.comment ? (
            <div className="border-t border-stone-400 px-3 py-2 text-[12px] font-bold text-stone-950">Menu Comment: {packageSection.comment}</div>
          ) : null}
        </section>
      ))}

      <section className="mt-3 grid gap-3 print:mt-2">
        <CompactTable
          title="Quotation Terms"
          rows={[
            ['Terms', quotation.terms || settings?.inquiryQuotationSettings?.terms || 'N/A'],
            ['Payment', quotation.paymentTerms || settings?.inquiryQuotationSettings?.paymentTerms || 'N/A'],
            ['Cancellation', quotation.cancellationPolicy || settings?.inquiryQuotationSettings?.cancellationPolicy || 'N/A'],
            ['Note', quotation.footer || settings?.inquiryQuotationSettings?.footer || 'This is a quotation and not a tax invoice.'],
          ]}
        />
      </section>
    </article>
  );
}
