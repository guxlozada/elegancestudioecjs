export const firebaseConfig = {
  apiKey: "AIzaSyCUawgFnD1DXslBt7uqItXYKpD75BuBn_E",
  authDomain: "elegance-studio-ec.firebaseapp.com",
  projectId: "elegance-studio-ec",
  storageBucket: "elegance-studio-ec.appspot.com",
  messagingSenderId: "502159225970",
  appId: "1:502159225970:web:ac8b6ad4ec1728a0ebbeeb",
  measurementId: "G-42DDSC7ZYP"
}

firebase.initializeApp(firebaseConfig)

export const db = firebase.database()
export const dbRef = firebase.database().ref()
