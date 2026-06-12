require("dotenv").config();

const admin = require("firebase-admin");

const INTERNAL_DOMAIN = "zantua.internal";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizePrivateKey(value) {
  return value.replace(/\\n/g, "\n");
}

function buildEmail(username) {
  return `${username}@${INTERNAL_DOMAIN}`;
}

function getSeedUsers() {
  return [
    {
      name: "Anneris Melenciano",
      username: "anneris.owner",
      email: buildEmail("anneris.owner"),
      password: requiredEnv("SEED_USER_ANNERIS_PASSWORD"),
      role: "owner",
    },
    {
      name: "Leidy Hernandez",
      username: "leidy.hernandez",
      email: buildEmail("leidy.hernandez"),
      password: requiredEnv("SEED_USER_LEIDY_PASSWORD"),
      role: "employee",
    },
    {
      name: "Marjan Peña",
      username: "marjan.pena",
      email: buildEmail("marjan.pena"),
      password: requiredEnv("SEED_USER_MARJAN_PASSWORD"),
      role: "employee",
    },
    {
      name: "Rut Vericut",
      username: "rut.vericut",
      email: buildEmail("rut.vericut"),
      password: requiredEnv("SEED_USER_RUT_PASSWORD"),
      role: "employee",
    },
  ];
}

function initAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: normalizePrivateKey(requiredEnv("FIREBASE_PRIVATE_KEY")),
    }),
  });
}

async function ensureAuthUser(auth, seedUser) {
  try {
    const existing = await auth.getUserByEmail(seedUser.email);
    await auth.updateUser(existing.uid, {
      displayName: seedUser.name,
      password: seedUser.password,
      disabled: false,
    });
    return existing.uid;
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    const created = await auth.createUser({
      email: seedUser.email,
      password: seedUser.password,
      displayName: seedUser.name,
      disabled: false,
    });
    return created.uid;
  }
}

async function upsertUserProfile(db, uid, seedUser) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();

  const basePayload = {
    name: seedUser.name,
    username: seedUser.username,
    email: seedUser.email,
    role: seedUser.role,
    active: true,
    mustChangePassword: true,
    updatedAt: now,
  };

  if (existing.exists) {
    await userRef.set(basePayload, { merge: true });
    return "updated";
  }

  await userRef.set({
    ...basePayload,
    createdAt: now,
  });
  return "created";
}

async function run() {
  initAdmin();
  const auth = admin.auth();
  const db = admin.firestore();
  const seedUsers = getSeedUsers();

  console.log(`Seeding ${seedUsers.length} users...`);

  for (const seedUser of seedUsers) {
    const uid = await ensureAuthUser(auth, seedUser);
    const profileStatus = await upsertUserProfile(db, uid, seedUser);
    console.log(`${seedUser.username} -> auth ok, profile ${profileStatus}, uid=${uid}`);
  }

  console.log("User seed completed successfully.");
}

run().catch((error) => {
  console.error("User seed failed.");
  console.error(error);
  process.exit(1);
});
