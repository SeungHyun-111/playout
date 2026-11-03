import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAxSMNYEKHgQz6bMAt4gtPfyxL7OCy3q2s",
  authDomain: "playout-d77d0.firebaseapp.com",
  databaseURL: "https://playout-d77d0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "playout-d77d0",
  storageBucket: "playout-d77d0.firebasestorage.app",
  messagingSenderId: "802054395007",
  appId: "1:802054395007:web:2040b024aadc05e96a9b4a",
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
