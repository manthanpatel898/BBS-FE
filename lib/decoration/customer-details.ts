export type DecorationCustomerDetails = {
  name: string;
  mobile: string;
  alternativeMobile?: string | null;
  address?: string | null;
};

export function decorationCustomerRows(
  customer: DecorationCustomerDetails,
): Array<[string, string]> {
  const address = customer.address?.trim();
  return [
    ['Name', customer.name],
    ['Mobile', customer.mobile],
    ...(customer.alternativeMobile
      ? ([['Alternative mobile', customer.alternativeMobile]] as Array<
          [string, string]
        >)
      : []),
    ...(address
      ? ([['Address', address]] as Array<[string, string]>)
      : []),
  ];
}
