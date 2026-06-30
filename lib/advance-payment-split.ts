export interface AdvancePaymentSplit {
  totalPayments: number;
  cashPercent: number;
  onlinePercent: number;
  cashBarPercent: number;
  onlineBarPercent: number;
}

function toPercent(part: number, total: number) {
  if (!total || total <= 0 || part <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

export function getAdvancePaymentSplit(
  totalAmount: number,
  cashAmount: number,
  cashCount: number,
  onlineAmount: number,
  onlineCount: number,
): AdvancePaymentSplit {
  const amountTotal = totalAmount > 0 ? totalAmount : cashAmount + onlineAmount;
  const cashPercent = toPercent(cashAmount, amountTotal);
  const onlinePercent = amountTotal > 0 ? Math.max(0, 100 - cashPercent) : 0;

  return {
    totalPayments: cashCount + onlineCount,
    cashPercent,
    onlinePercent,
    cashBarPercent: cashAmount > 0 ? Math.max(cashPercent, 8) : 0,
    onlineBarPercent: onlineAmount > 0 ? Math.max(onlinePercent, 8) : 0,
  };
}
