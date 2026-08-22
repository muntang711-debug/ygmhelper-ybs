import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// 파이어베이스 프로젝트 설정 값 (yonggok-ybs)
const firebaseConfig = {
  apiKey: "AIzaSyAPL6paG8QlGRhbQqN0Bc04G9Nhzqo4dYM",
  authDomain: "yonggok-ybs.firebaseapp.com",
  databaseURL: "https://yonggok-ybs-default-rtdb.firebaseio.com",
  projectId: "yonggok-ybs",
  storageBucket: "yonggok-ybs.firebasestorage.app",
  messagingSenderId: "73606001218",
  appId: "1:73606001218:web:bd5cef9a4dfce911e673db",
  measurementId: "G-Q7JQXE9M90"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);