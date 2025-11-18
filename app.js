// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCAoqttx9CDHI_Chmlr1D-cm20g3dXxGHw",
  authDomain: "geofs-aircraft-t.firebaseapp.com",
  projectId: "geofs-aircraft-t",
  storageBucket: "geofs-aircraft-t.firebasestorage.app", // your original value
  messagingSenderId: "1047048836841",
  appId: "1:1047048836841:web:4a298d9933a4f8acdd8278",
  measurementId: "G-TR3GX4NWZL"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🔹 Google Sign-In
document.getElementById("login-google").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      console.log("Signed in with Google:", result.user.displayName);
    })
    .catch(error => {
      alert("Google sign-in failed: " + error.message);
    });
};

// 🔹 GitHub Sign-In
document.getElementById("login-github").onclick = () => {
  const provider = new firebase.auth.GithubAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      console.log("Signed in with GitHub:", result.user.displayName);
    })
    .catch(error => {
      alert("GitHub sign-in failed: " + error.message);
    });
};

// 🔹 Auth State Listener
auth.onAuthStateChanged(user => {
  if (user) {
    const userRef = db.collection("users").doc(user.uid);

    userRef.get().then(doc => {
      if (!doc.exists || !doc.data().nickname) {
        const nickname = prompt("Choose a nickname for the marketplace:");
        userRef.set({
          username: user.displayName,
          nickname: nickname,
          balance: 0
        });
        document.getElementById("username").textContent = nickname;
        document.getElementById("balance").textContent = "0";
      } else {
        document.getElementById("username").textContent = doc.data().nickname;
        document.getElementById("balance").textContent = doc.data().balance;
      }

      document.getElementById("auth").style.display = "none";
      document.getElementById("dashboard").style.display = "block";

      setTimeout(() => {
        window.location.href = "marketplace.html";
      }, 1500);
    });
  }
});

// 🔹 Top-Up Function
function topUp(amount) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);
  userRef.update({
    balance: firebase.firestore.FieldValue.increment(amount)
  }).then(() => {
    userRef.get().then(doc => {
      document.getElementById("balance").textContent = doc.data().balance;
    });
  });
}
