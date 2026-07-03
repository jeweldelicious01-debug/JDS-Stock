// js/firebase.js
import { firebaseConfig } from "./firebaseConfig.js";

// Import dynamic core library bundles from official structural Google CDNs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let app, auth, db;
let isOnlineMode = navigator.onLine;

// Initialize connection instances safely
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Initialization failure mapping network configuration modules:", e);
    isOnlineMode = false;
}

export { auth, db, isOnlineMode };

/* ==========================================================================
   IDENTITY SERVICES INTERFACE WRAPPERS LAYER (AUTH MANAGEMENT MIDDLEWARE)
   ========================================================================== */

export async function executeSessionLogin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function executeSessionLogout() {
    return signOut(auth);
}

export async function createNewUserCredentials(email, password, role) {
    // 1. Provision Auth instance via standard authentication loops
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // 2. Set role rules map document data inside firestore database path profile mapping
    await setDoc(doc(db, "users", uid), {
        email: email,
        role: role,
        timestamp: Date.now()
    });
    return uid;
}

export async function fetchUserProfileRecord(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? docSnap.data() : null;
}

export async function fetchUsersDirectoryList() {
    const querySnapshot = await getDocs(collection(db, "users"));
    let output = [];
    querySnapshot.forEach(doc => {
        output.push({ uid: doc.id, ...doc.data() });
    });
    return output;
}

export async function deleteUserAccountRecord(uid) {
    // Note: Free-tier client SDK constraints restrict total removal via runtime scripts natively without admin auth.
    // This removes the role data document validation file path mapping reference node securely.
    return deleteDoc(doc(db, "users", uid));
}

/* ==========================================================================
   MASTER INVENTORY BUSINESS RULE LOGIC MUTATIONS (FIRESTORE DATA CONTROLLERS)
   ========================================================================== */

export async function fetchMasterCollection(collectionName) {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    let output = [];
    querySnapshot.forEach((doc) => {
        output.push({ id: doc.id, ...doc.data() });
    });
    return output;
}

export async function writeDocumentToCollection(collectionName, payload) {
    return addDoc(collection(db, collectionName), payload);
}

export async function setDocumentPathData(collectionName, docId, payload) {
    return setDoc(doc(db, collectionName, docId), payload, { merge: true });
}

export async function updateDocumentField(collectionName, docId, payload) {
    return updateDoc(doc(db, collectionName, docId), payload);
}

export async function removeDocumentFromCollection(collectionName, docId) {
    return deleteDoc(doc(db, collectionName, docId));
}