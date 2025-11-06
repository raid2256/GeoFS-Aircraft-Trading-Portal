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

document.addEventListener("DOMContentLoaded", () => {
  const toggleListing = document.getElementById("toggle-listing");
  const accountBtn = document.getElementById("account-settings-btn");
  const topupBtn = document.getElementById("topup-toggle-btn");

  if (toggleListing) {
    toggleListing.addEventListener("click", () => {
      const form = document.getElementById("listing-form");
      form.style.display = form.style.display === "none" ? "block" : "none";
    });
  }

  if (accountBtn) {
    accountBtn.addEventListener("click", () => {
      const panel = document.getElementById("account-settings-panel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  }

  if (topupBtn) {
    topupBtn.addEventListener("click", () => {
      const panel = document.getElementById("topup-panel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  }
});

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = db.collection("users").doc(user.uid);
  userRef.get().then(doc => {
    if (doc.exists) {
      document.getElementById("username").textContent = doc.data().nickname || doc.data().username;
      document.getElementById("balance").textContent = doc.data().balance;
    }
  });

  loadMarketplace();
});

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

function customTopUp() {
  const amount = parseInt(document.getElementById("custom-topup").value);
  if (!isNaN(amount) && amount > 0) {
    topUp(amount);
  } else {
    alert("Enter a valid amount.");
  }
}

function changeNickname() {
  const newName = document.getElementById("new-nickname").value.trim();
  if (newName.length > 0) {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    userRef.update({ nickname: newName }).then(() => {
      document.getElementById("username").textContent = newName;
      alert("Nickname updated!");
    });
  } else {
    alert("Enter a valid nickname.");
  }
}

function deleteAccount() {
  if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).delete().then(() => {
      user.delete().then(() => {
        alert("Account deleted.");
        window.location.href = "index.html";
      }).catch(err => {
        alert("Error deleting account: " + err.message);
      });
    });
  }
}

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
        const sellerName = userDoc.exists
          ? userDoc.data().nickname || userDoc.data().username
          : "Unknown Seller";

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
  }).catch(error => {
    console.error("Error loading listings:", error);
    container.innerHTML = "<p>Error loading listings.</p>";
  });
}
