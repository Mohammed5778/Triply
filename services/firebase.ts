
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '../types';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDBpYxSx0MYQ6c_RRSOLvqEEWkKOMq5Zg0",
    authDomain: "sign-b2acd.firebaseapp.com",
    databaseURL: "https://sign-b2acd-default-rtdb.firebaseio.com",
    projectId: "sign-b2acd",
    storageBucket: "sign-b2acd.appspot.com",
    messagingSenderId: "1039449385751",
    appId: "1:1039449385751:web:e63d9b04d5698595922552",
    measurementId: "G-6D6JECNJ2Q"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = getFirestore(app);
const googleProvider = new firebase.auth.GoogleAuthProvider();

const createOrUpdateUser = async (firebaseUser: firebase.User): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
    };

    if (!userDoc.exists()) {
        // New user, create the document
        await setDoc(userRef, {
            name: userData.name,
            email: userData.email,
            photoURL: userData.photoURL,
            createdAt: new Date(),
        });
    }
    // For existing users, their profile is already in sync with provider data upon login
    // but we could add update logic here if needed.
    return userData;
};

export const signInWithGoogle = async (): Promise<User> => {
    const result = await auth.signInWithPopup(googleProvider);
    // result.user is guaranteed to be non-null on success in v8/compat.
    const user = await createOrUpdateUser(result.user!);
    return user;
};

export { auth, db };
