export enum DeliveryOption {
  STANDARD = 'standard',
  FAST = 'fast',
  URGENT = 'urgent',
}

export interface DeliveryOptionInfo {
  label: string;
  description: string;
  estimatedDays: string;
  fee: number;
}

export const DELIVERY_OPTIONS: Record<DeliveryOption, DeliveryOptionInfo> = {
  [DeliveryOption.STANDARD]: {
    label: 'Standard Delivery',
    description: 'Economy shipping',
    estimatedDays: '3-5 days',
    fee: 2000,
  },
  [DeliveryOption.FAST]: {
    label: 'Fast Delivery',
    description: 'Express shipping',
    estimatedDays: '1-2 days',
    fee: 4000,
  },
  [DeliveryOption.URGENT]: {
    label: 'Urgent Delivery',
    description: 'Same-day delivery',
    estimatedDays: 'Same day',
    fee: 7000,
  },
};

export function getDeliveryFee(option: DeliveryOption): number {
  return DELIVERY_OPTIONS[option].fee;
}
