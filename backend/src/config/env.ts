// src/config/env.ts

export const env = {
  NODE_ENV: "development",

  // Backend Port (hardcoded since you don't want env)
  PORT: "5000",

  // Firebase Web Config for FRONTEND usage.
  // Backend DOES NOT EVER use these values.
  FIREBASE_WEB_API_KEY: "AIzaSyBXB_LTQUhPjV_SqTv6QIFEOmvPIuvcxzE",
  FIREBASE_WEB_AUTH_DOMAIN: "codesync-bf41e.firebaseapp.com",
  FIREBASE_WEB_PROJECT_ID: "codesync-bf41e",
  FIREBASE_WEB_STORAGE_BUCKET: "codesync-bf41e.firebasestorage.app",
  FIREBASE_WEB_MESSAGING_SENDER_ID: "709966735436",
  FIREBASE_WEB_APP_ID: "1:709966735436:web:467ff94553a4ba7e3eace9",

  // Backend Firebase Admin Setup — YOU ARE NOT USING THESE ANYMORE
  FIREBASE_PROJECT_ID: "codesync-bf41e",

  // These remain empty because you don't want env variables
  FIREBASE_CLIENT_EMAIL: "",
  FIREBASE_PRIVATE_KEY: ""
};
