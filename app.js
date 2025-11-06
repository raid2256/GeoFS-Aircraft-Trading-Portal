// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCAoqttx9CDHI_Chmlr1D-cm20g3dXxGHw",
  authDomain: "geofs-aircraft-t.firebaseapp.com",
  projectId: "geofs-aircraft-t",
  storageBucket: "geofs-aircraft-t.firebasestorage.app",
  messagingSenderId: "1047048836841",
  appId: "1:1047048836841:web:4a298d9933a4f8acdd8278",
  measurementId: "G-TR3GX4NWZL"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Google login
document.getElementById("login-google").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

// ✅ GitHub login
document.getElementById("login-github").onclick = () => {
  const provider = new firebase.auth.GithubAuthProvider();
  auth.signInWithPopup(provider);
};

// ✅ Auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("auth").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("listing-form").style.display = "block";
    document.getElementById("username").textContent = user.displayName;

    const userRef = db.collection("users").doc(user.uid);
    userRef.get().then(doc => {
      if (!doc.exists) {
        userRef.set({ username: user.displayName, balance: 0 });
        document.getElementById("balance").textContent = "0";
      } else {
        document.getElementById("balance").textContent = doc.data().balance;
      }
    });
  }
});

// ✅ Top-up function
function topUp(amount) {
  const user = auth.currentUser;
  const userRef = db.collection("users").doc(user.uid);
  userRef.update({
    balance: firebase.firestore.FieldValue.increment(amount)
  }).then(() => {
    userRef.get().then(doc => {
      document.getElementById("balance").textContent = doc.data().balance;
    });
  });
}

// ✅ Post aircraft listing
function postListing() {
  const user = auth.currentUser;
  const listing = {
    title: document.getElementById("title").value,
    price: parseInt(document.getElementById("price").value),
    type: document.getElementById("type").value,
    tags: document.getElementById("tags").value.split(",").map(tag => tag.trim()),
    description: document.getElementById("description").value,
    sellerId: user.uid,
    timestamp: Date.now()
  };

  db.collection("listings").add(listing).then(() => {
    alert("Listing posted!");
    document.getElementById("title").value = "";
    document.getElementById("price").value = "";
    document.getElementById("type").value = "";
    document.getElementById("tags").value = "";
    document.getElementById("description").value = "";
  });
}
