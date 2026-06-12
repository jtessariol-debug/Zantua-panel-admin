import { initializeApp, getApps, getApp } from "firebase/app";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
} from "firebase/auth";
import { db, firebaseConfig } from "../firebase/config";
import { USER_ROLES } from "../lib/roles";
import {
  buildInternalEmailFromUsername,
  deriveUsernameFromEmail,
  isEmailLike,
  normalizeUsername,
} from "../lib/auth";

const USERS_COLLECTION = "users";
const SECONDARY_APP_NAME = "zantua-user-management";

function getSecondaryApp() {
  return getApps().find((app) => app.name === SECONDARY_APP_NAME)
    || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getUserProfileByUsername(username) {
  const normalizedUsername = normalizeUsername(username);
  const snap = await getDocs(
    query(collection(db, USERS_COLLECTION), where("username", "==", normalizedUsername), limit(1))
  );

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getUserProfileByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const snap = await getDocs(
    query(collection(db, USERS_COLLECTION), where("email", "==", normalizedEmail), limit(1))
  );

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function resolveLoginEmail(identifier) {
  const normalizedIdentifier = String(identifier || "").trim();
  if (!normalizedIdentifier) return "";

  if (isEmailLike(normalizedIdentifier)) {
    const email = normalizedIdentifier.toLowerCase();
    const profile = await getUserProfileByEmail(email);
    if (!profile) {
      const error = new Error("Account not initialized");
      error.code = "auth/account-not-initialized";
      throw error;
    }
    return email;
  }

  const userProfile = await getUserProfileByUsername(normalizedIdentifier);
  if (!userProfile) {
    const error = new Error("Account not initialized");
    error.code = "auth/account-not-initialized";
    throw error;
  }
  return userProfile.email || buildInternalEmailFromUsername(normalizedIdentifier);
}

export async function bootstrapOwnerProfile(authUser) {
  const usersRef = collection(db, USERS_COLLECTION);
  const existingUsers = await getCountFromServer(query(usersRef, limit(1)));
  if (existingUsers.data().count > 0) return null;

  const email = (authUser.email || "").toLowerCase();
  const ownerProfile = {
    name: authUser.displayName || email || "System Owner",
    username: deriveUsernameFromEmail(email),
    email,
    role: USER_ROLES.OWNER,
    active: true,
    mustChangePassword: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, USERS_COLLECTION, authUser.uid), ownerProfile);
  return { id: authUser.uid, ...ownerProfile };
}

export async function ensureUserProfile(authUser) {
  let profile = await getUserProfile(authUser.uid);
  if (profile) return profile;
  profile = await bootstrapOwnerProfile(authUser);
  return profile;
}

export async function listUsers() {
  const snap = await getDocs(query(collection(db, USERS_COLLECTION), orderBy("name", "asc")));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function createEmployeeUserAccount({ name, username, password, role, active = true }) {
  const normalizedUsername = normalizeUsername(username);
  const email = buildInternalEmailFromUsername(normalizedUsername);
  const secondaryApp = getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

  try {
    const profile = {
      name: name.trim(),
      username: normalizedUsername,
      email,
      role,
      active,
      mustChangePassword: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, USERS_COLLECTION, credential.user.uid), profile);
    return { id: credential.user.uid, ...profile };
  } finally {
    await signOut(secondaryAuth);
  }
}

export async function updateUserProfile(userId, updates) {
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, USERS_COLLECTION, userId), payload);
}

export async function sendUserPasswordReset(email) {
  const app = getApps().find((entry) => entry.name === SECONDARY_APP_NAME) || getApp();
  const auth = getAuth(app);
  await sendPasswordResetEmail(auth, email);
}

export async function changeOwnPassword(currentUser, currentPassword, nextPassword) {
  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, nextPassword);
  await updateUserProfile(currentUser.uid, { mustChangePassword: false });
}
