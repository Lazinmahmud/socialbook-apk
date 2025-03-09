// firebaseConfig.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBYC0Z_pFue4VDkwat4pRUz71_VmL3xI3Q",
  authDomain: "test-socialbook.firebaseapp.com",
  databaseURL: "https://test-socialbook-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-socialbook",
  storageBucket: "test-socialbook.appspot.com",
  messagingSenderId: "504297655058",
  appId: "1:504297655058:web:b18fd06b52a2a8e4dbc1cb"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const database = firebase.database();
export const storage = firebase.storage();