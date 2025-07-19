
import { VehicleOption, VehicleType } from './types';

export const PRICING_CONFIG: Record<VehicleType, VehicleOption> = {
  car: { id: 'car', name: 'سيارة', icon: '🚗', baseFare: 5, perKm: 5.0, perMin: 0.30, minFare: 15 },
  motorcycle: { id: 'motorcycle', name: 'دراجة نارية', icon: '🏍️', baseFare: 3, perKm: 2.5, perMin: 0.20, minFare: 10 },
  scooter: { id: 'scooter', name: 'سكوتر', icon: '🛵', baseFare: 2, perKm: 1.5, perMin: 0.15, minFare: 8 }
};

export const PLACE_ICONS: Record<string, string> = {
  home: '🏠',
  work: '🏢',
  gym: '🏋️',
  generic: '📍',
};
