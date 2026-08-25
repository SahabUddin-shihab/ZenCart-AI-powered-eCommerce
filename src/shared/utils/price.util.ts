export const formatPrice = (amount: number, currency = 'BDT'): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency }).format(amount);
};

export const calculateDiscount = (
  originalPrice: number,
  discountType: 'FIXED' | 'PERCENTAGE',
  discountValue: number,
  maxDiscount?: number,
): number => {
  let discount = discountType === 'PERCENTAGE'
    ? (originalPrice * discountValue) / 100
    : discountValue;
  if (maxDiscount && discount > maxDiscount) discount = maxDiscount;
  return Math.min(discount, originalPrice);
};

export const calculateCommission = (
  amount: number,
  type: 'FIXED' | 'PERCENTAGE',
  rate: number,
): number => type === 'PERCENTAGE' ? (amount * rate) / 100 : rate;

export const roundPrice = (price: number, decimals = 2): number =>
  Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals);
