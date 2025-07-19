
import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL?: string | null;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Trip {
  id: string;
  userId: string;
  pickup: Location;
  dropoff: Location;
  status: 'searching' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  price?: number;
  finalPrice?: number;
  vehicleType?: VehicleType;
  driverId?: string;
  driverInfo?: Driver;
  cancellationReason?: string;
}

export interface Place {
  id: string;
  userId: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  type: 'home' | 'work' | 'gym' | 'generic';
}

export interface Driver {
  id: string;
  name: string;
  vehicle: {
    model: string;
    plate: string;
  };
  rating: number;
  location?: Location;
  eta?: string;
}

export type VehicleType = 'car' | 'motorcycle' | 'scooter';

export interface VehicleOption {
  id: VehicleType;
  name: string;
  icon: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  minFare: number;
}

export interface Suggestion {
  title: string;
  subtitle: string;
  icon: string;
  location: Location;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}
