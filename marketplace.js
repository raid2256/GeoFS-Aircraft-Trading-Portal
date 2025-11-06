const firebaseConfig = {
  apiKey: "AIzaSyCAoqttx9CDHI_Chmlr1D-cm20g3dXxGHw",
  authDomain: "geofs-aircraft-t.firebaseapp.com",
  projectId: "geofs-aircraft-t",
  storageBucket: "geofs-aircraft-t.firebasestorage.app",
  messagingSenderId: "1047048836841",
  appId: "1:1047048836841:web:4a298d9933a4f8acdd8278",
  measurementId: "G-TR3GX4NWZL"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Attach toggle button after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-listing");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const form = document.getElementById("listing-form");
      form.style.display = form.style.display === "none" ? "block" : "none";
    });
  }
});

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("username").textContent = user.displayName;

  const userRef = db.collection("users").doc(user.uid);
  userRef.get().then(doc => {
    if (doc.exists) {
      document.getElementById("balance").textContent = doc.data().balance;
    }
  });

  loadMarketplace();
});

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
    loadMarketplace();
  });
}

function loadMarketplace() {
  const container = document.getElementById("listings-container");
  container.innerHTML = "";

  db.collection("listings").orderBy("timestamp", "desc").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "listing-card";

      db.collection("users").doc(data.sellerId).get().then(userDoc => {
        const sellerName = userDoc.exists ? userDoc.data().username : "Unknown Seller";

        card.innerHTML = `
          <h3>${data.title} - $${data.price}</h3>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p class="tags"><strong>Tags:</strong> ${data.tags.join(", ")}</p>
          <p><strong>Seller:</strong> ${sellerName}</p>
        `;
        container.appendChild(card);
      });
    });
  });
}
