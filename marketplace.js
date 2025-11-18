// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCAoqttx9CDHI_Chmlr1D-cm20g3dXxGHw",
  authDomain: "geofs-aircraft-t.firebaseapp.com",
  projectId: "geofs-aircraft-t",
  storageBucket: "geofs-aircraft-t.appspot.com",
  messagingSenderId: "1047048836841",
  appId: "1:1047048836841:web:4a298d9933a4f8acdd8278",
  measurementId: "G-TR3GX4NWZL"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("toggle-listing").onclick = () => togglePanel("listing-form");
  document.getElementById("account-settings-btn").onclick = () => togglePanel("account-settings-panel");
  document.getElementById("topup-toggle-btn").onclick = () => togglePanel("topup-panel");
  document.getElementById("staff-login-btn").onclick = () => {
    window.location.href = "airline.html";
  };
});

function togglePanel(id) {
  const panel = document.getElementById(id);
  const isHidden = panel.style.display === "none" || panel.style.display === "";
  panel.style.display = isHidden ? "block" : "none";
}

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = db.collection("users").doc(user.uid);
  userRef.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("username").textContent = data.nickname || data.username || "Pilot";
      document.getElementById("balance").textContent = data.balance ?? 0;
    }
  });

  loadUserAirlines(user.uid);
  loadMarketplace();
});

function loadUserAirlines(uid) {
  const airlineSelect = document.getElementById("airline-id");
  const hubSelect = document.getElementById("hub-selector");

  airlineSelect.innerHTML = `<option value="">Select your airline</option>`;
  hubSelect.innerHTML = `<option value="">Select hub airport</option>`;

  db.collection("airlines").where("ownerId", "==", uid).get().then(ownerSnap => {
    ownerSnap.forEach(doc => {
      const data = doc.data();
      const name = data.name || "Unnamed Airline";
      const hub = data.hubAirport || "Unknown Hub";

      airlineSelect.innerHTML += `<option value="${doc.id}">${name} (Owner)</option>`;
      hubSelect.innerHTML += `<option value="${hub}">${name} - ${hub}</option>`;
    });

    return db.collection("airlines").where("staff", "array-contains", uid).get();
  }).then(staffSnap => {
    staffSnap.forEach(doc => {
      const data = doc.data();
      const name = data.name || "Unnamed Airline";
      const hub = data.hubAirport || "Unknown Hub";

      airlineSelect.innerHTML += `<option value="${doc.id}">${name} (Staff)</option>`;
      hubSelect.innerHTML += `<option value="${hub}">${name} - ${hub}</option>`;
    });

    if (airlineSelect.options.length === 1) {
      document.getElementById("listing-form").innerHTML = `
        <h2>List an Aircraft</h2>
        <p>You must be an airline owner or staff member to post listings.</p>
      `;
    }
  }).catch(err => {
    console.error("Error loading airlines:", err);
  });
}

function topUp(amount) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);
  userRef.update({
    balance: firebase.firestore.FieldValue.increment(amount)
  }).then(() => userRef.get())
    .then(doc => {
      document.getElementById("balance").textContent = doc.data().balance;
      document.getElementById("topup-panel").style.display = "none";
    }).catch(err => {
      alert("Top-up failed: " + err.message);
    });
}

function customTopUp() {
  const val = document.getElementById("custom-topup").value;
  const amount = parseInt(val);
  if (!isNaN(amount) && amount > 0) {
    topUp(amount);
  } else {
    alert("Enter a valid amount.");
  }
}

function changeNickname() {
  const newName = document.getElementById("new-nickname").value.trim();
  if (newName.length === 0) {
    alert("Enter a valid nickname.");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);
  userRef.update({ nickname: newName }).then(() => {
    document.getElementById("username").textContent = newName;
    alert("Nickname updated!");
    document.getElementById("account-settings-panel").style.display = "none";
  }).catch(err => {
    alert("Update failed: " + err.message);
  });
}

function deleteAccount() {
  if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users").doc(user.uid).delete().then(() => user.delete())
    .then(() => {
      alert("Account deleted.");
      window.location.href = "index.html";
    }).catch(err => {
      alert("Error deleting account: " + err.message);
    });
}

function postListing() {
  const user = auth.currentUser;
  const airlineId = document.getElementById("airline-id").value;
  const hub = document.getElementById("hub-selector").value;

  if (!user || !airlineId || !hub) {
    alert("You must select an airline and hub to post listings.");
    return;
  }

  const title = document.getElementById("title").value.trim();
  const price = parseInt(document.getElementById("price").value);
  const type = document.getElementById("type").value.trim();
  const tags = document.getElementById("tags").value.split(",").map(t => t.trim()).filter(Boolean);
  const description = document.getElementById("description").value.trim();

  if (!title || isNaN(price) || price <= 0 || !type || !description) {
    alert("Please fill out all fields with valid values.");
    return;
  }

  const listing = {
    title,
    price,
    type,
    tags,
    description,
    sellerId: user.uid,
    airlineId,
    hub,
    sold: false,
    timestamp: Date.now()
  };

  db.collection("listings").add(listing).then(() => {
    alert("Listing posted!");
    document.getElementById("title").value = "";
    document.getElementById("price").value = "";
    document.getElementById("type").value = "";
    document.getElementById("tags").value = "";
    document.getElementById("description").value = "";
    document.getElementById("airline-id").value = "";
    document.getElementById("hub-selector").value = "";
    document.getElementById("listing-form").style.display = "none";
    loadMarketplace();
  }).catch(err => {
    alert("Failed to post listing: " + err.message);
  });
}

function loadMarketplace() {
  const container = document.getElementById("listings-container");
  container.innerHTML = "";

  db.collection("listings").orderBy("timestamp", "desc").get().then(snapshot => {
    if (snapshot.empty) {
      container.innerHTML = "<p>No listings yet.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "listing-card";

      Promise.all([
        db.collection("users").doc(data.sellerId).get(),
        db.collection("airlines").doc(data.airlineId).get()
      ]).then(([userDoc, airlineDoc]) => {
        const sellerName = userDoc.exists
          ? (userDoc.data().nickname || userDoc.data().username || "Seller")
          : "Unknown Seller";

        const airlineName = airlineDoc.exists
          ? airlineDoc.data().name || "Unnamed Airline"
          : "Unknown Airline";

        card.innerHTML = `
          <h3>${data.title} - $${data.price}</h3>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p class="tags"><strong>Tags:</strong> ${data.tags && data.tags.length ? data.tags.join(", ") : "—"}</p>
          <p><strong>Seller:</strong> ${sellerName}</p>
          <p><strong>Airline:</strong> ${airlineName}</p>
          <p><strong>Hub:</strong> ${data.hub || "N/A"}</p>
          <p><strong>Status:</strong> ${data.sold ? "Sold" : "Available"}</p>
        `;
        container.appendChild(card);
      }).catch(err => {
        console.error("Error loading listing details:", err);
        card.innerHTML = `
          <h3>${data.title} - $${data.price}</h3>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p class="tags"><strong>Tags:</strong> ${data.tags && data.tags.length ? data.tags.join(", ") : "—"}</p>
          <p><strong>Seller:</strong> Unknown</p>
          <p><strong>Airline:</strong> Unknown</p>
          <p><strong>Hub:</strong> ${data.hub || "N/A"}</p>
          <p><strong>Status:</strong> ${data.sold ? "Sold" : "Available"}</p>
        `;
        container.appendChild(card);
      });
    });
  }).catch(error => {
    console.error("Error loading listings:", error);
    container.innerHTML = "<p>Error loading listings.</p>";
  });
}
