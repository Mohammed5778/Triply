
import { db, auth } from './firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { Trip, Place, Suggestion, User, Location } from '../types';

// --- Firestore Service ---

export async function getUserProfile(uid: string): Promise<User | null> {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        return {
            uid,
            name: data.name || auth.currentUser?.displayName,
            email: data.email || auth.currentUser?.email,
            photoURL: data.photoURL || auth.currentUser?.photoURL
        };
    }
    return null;
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

export async function getRecentTrips(uid: string, count: number = 2): Promise<Trip[]> {
  const ridesRef = collection(db, 'rides');
  const q = query(
    ridesRef,
    where('userId', '==', uid),
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
}

export async function getAllUserTrips(uid: string): Promise<Trip[]> {
  const ridesRef = collection(db, 'rides');
  const q = query(
    ridesRef,
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
}

export async function getTripById(tripId: string): Promise<Trip | null> {
    const tripRef = doc(db, 'rides', tripId);
    const tripDoc = await getDoc(tripRef);
    if (tripDoc.exists()) {
        return { id: tripDoc.id, ...tripDoc.data() } as Trip;
    }
    return null;
}

export async function createTrip(tripDetails: Omit<Trip, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const tripRef = await addDoc(collection(db, 'rides'), {
        ...tripDetails,
        status: 'searching',
        createdAt: serverTimestamp(),
    });
    return tripRef.id;
}


export async function getSavedPlaces(uid: string, count: number = 2): Promise<Place[]> {
  const placesRef = collection(db, 'users', uid, 'saved_places');
  const q = query(placesRef, orderBy('name'), limit(count));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Place));
}

export async function getAllSavedPlaces(uid: string): Promise<Place[]> {
  const placesRef = collection(db, 'users', uid, 'saved_places');
  const q = query(placesRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Place));
}

export async function addSavedPlace(uid: string, place: Omit<Place, 'id' | 'userId'>): Promise<string> {
    const placesRef = collection(db, 'users', uid, 'saved_places');
    const docRef = await addDoc(placesRef, place);
    return docRef.id;
}

export async function deleteSavedPlace(uid: string, placeId: string): Promise<void> {
    const placeRef = doc(db, 'users', uid, 'saved_places', placeId);
    await deleteDoc(placeRef);
}


export function listenForActiveRide(uid: string, callback: (trip: Trip | null) => void) {
    const ridesRef = collection(db, 'rides');
    const q = query(
        ridesRef,
        where('userId', '==', uid),
        where('status', 'in', ['searching', 'accepted', 'arrived', 'started'])
    );
    return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const rideDoc = snapshot.docs[0];
            callback({ id: rideDoc.id, ...rideDoc.data() } as Trip);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error listening for active ride:", error);
        callback(null);
    });
}


// --- Gemini API Service ---

export async function getSmartSuggestions(trips: Trip[], places: Place[]): Promise<Suggestion[]> {
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
    return [];
  }
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const prompt = `
    You are an AI assistant for a ride-sharing app called Triply, for an Arabic-speaking user.
    Your goal is to provide helpful, context-aware suggestions for the user's next trip.
    Based on the user's recent trips and saved places, generate 2 smart suggestions.
    The response must be in Arabic.

    Context:
    - Current time: ${new Date().toLocaleString('ar-EG', { weekday: 'long', hour: 'numeric', hour12: true })}
    - User's recent trips (last 2): ${JSON.stringify(trips.map(t => ({to: t.dropoff.address, when: t.createdAt?.toDate().toLocaleDateString('ar-EG')}))) }
    - User's saved places: ${JSON.stringify(places.map(p => ({name: p.name, type: p.type, address: p.address, location: p.location})))}

    Suggestion ideas:
    - "اذهب إلى العمل": If it's a weekday morning and they have a 'work' place saved.
    - "اذهب إلى المنزل": If it's a weekday evening and they have a 'home' place saved.
    - "كرر الرحلة الأخيرة": If the last trip was recent and relevant.
    - Suggest a trip to a frequently visited place, or a saved place like 'Gym' at a typical time.

    Analyze the provided data and generate relevant, actionable suggestions.
    Only suggest a destination if you have its full location data from the saved places.
    The location data MUST come from the "location" field of the provided saved places. Do not invent coordinates.
    Return the suggestions in a JSON array format. If no good suggestions can be made, return an empty array.
  `;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'In Arabic. Short, catchy title for the suggestion (e.g., "العودة للمنزل", "مشوار للنادي").' },
        subtitle: { type: Type.STRING, description: 'In Arabic. Brief explanation for the suggestion (e.g., "حان وقت العودة.", "بناءً على زيارتك الأخيرة").' },
        icon: { type: Type.STRING, description: 'An appropriate emoji for the suggestion (e.g., "🏠", "🏢", "🔁", "🏋️").' },
        location: {
            type: Type.OBJECT,
            properties: {
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                address: { type: Type.STRING }
            },
            required: ['lat', 'lng', 'address'],
        }
      },
      required: ['title', 'subtitle', 'icon', 'location'],
    }
  };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
    });
    
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3);
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3, -3);
    }
    
    const suggestions = JSON.parse(jsonStr) as Suggestion[];
    return suggestions;

  } catch (error) {
    console.error("Error generating smart suggestions from Gemini:", error);
    return [];
  }
}

// --- Location Service ---

export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by this browser."));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.display_name || 'موقع غير معروف';
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        return 'لا يمكن تحديد العنوان';
    }
}

export async function searchLocations(query: string): Promise<Location[]> {
  if (!query) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&addressdetails=1&accept-language=ar&limit=5`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && Array.isArray(data)) {
      return data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
      }));
    }
    return [];
  } catch (error) {
    console.error("Location search failed:", error);
    return [];
  }
}
