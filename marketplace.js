// Firebase config (replace with your project’s config if different)
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
  // Toggle buttons
  document.getElementById("toggle-listing").onclick = () => togglePanel("listing-form");
  document.getElementById("account-settings-btn").onclick = () => togglePanel("account-settings-panel");
  document.getElementById("topup-toggle-btn").onclick = () => togglePanel("topup-panel");

  // Staff login button opens panel and loads airline
  document.getElementById("staff-login-btn").onclick = () => {
    togglePanel("staff-panel");
    loadAirline();
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
  }).catch(err => {
    console.error("Error loading user profile:", err);
  });

  loadMarketplace();
});

/* ---------- Balance / Account ---------- */

function topUp(amount) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);
  userRef.update({
    balance: firebase.firestore.FieldValue.increment(amount)
  }).then(() => {
    return userRef.get();
  }).then(doc => {
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

  db.collection("users").doc(user.uid).delete().then(() => {
    return user.delete();
  }).then(() => {
    alert("Account deleted.");
    window.location.href = "index.html";
  }).catch(err => {
    alert("Error deleting account: " + err.message);
  });
}

/* ---------- Listings ---------- */

function postListing() {
  const user = auth.currentUser;
  if (!user) return;

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

      db.collection("users").doc(data.sellerId).get().then(userDoc => {
        const sellerName = userDoc.exists
          ? (userDoc.data().nickname || userDoc.data().username || "Seller")
          : "Unknown Seller";

        card.innerHTML = `
          <h3>${data.title} - $${data.price}</h3>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p class="tags"><strong>Tags:</strong> ${data.tags && data.tags.length ? data.tags.join(", ") : "—"}</p>
          <p><strong>Seller:</strong> ${sellerName}</p>
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

/* ---------- Staff / Airline management ---------- */

let currentAirlineDocRef = null;

function createAirline() {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("airline-name").value.trim();
  const description = document.getElementById("airline-description").value.trim();

  if (!name) {
    alert("Enter an airline name.");
    return;
  }

  const airline = {
    name,
    description,
    ownerId: user.uid,
    staff: [],
    createdAt: Date.now()
  };

  db.collection("airlines").add(airline).then(() => {
    alert("Airline created!");
    loadAirline();
  }).catch(err => {
    alert("Failed to create airline: " + err.message);
  });
}

function loadAirline() {
  const user = auth.currentUser;
  if (!user) return;

  const form = document.getElementById("airline-form");
  const dash = document.getElementById("airline-dashboard");
  const info = document.getElementById("airline-info");
  const staffList = document.getElementById("staff-list");
  const nameEdit = document.getElementById("airline-name-edit");
  const descEdit = document.getElementById("airline-description-edit");

  info.textContent = "";
  staffList.innerHTML = "";
  nameEdit.value = "";
  descEdit.value = "";
  currentAirlineDocRef = null;

  db.collection("airlines").where("ownerId", "==", user.uid).get().then(snapshot => {
    if (snapshot.empty) {
      form.style.display = "block";
      dash.style.display = "none";
      return;
    }

    const doc = snapshot.docs[0];
    currentAirlineDocRef = doc.ref;
    const airline = doc.data();

    form.style.display = "none";
    dash.style.display = "block";
    info.innerHTML = `<strong>${airline.name}</strong><br>${airline.description || ""}`;

    // Prefill edit inputs
    nameEdit.value = airline.name || "";
    descEdit.value = airline.description || "";

    // Render staff list
    const members = airline.staff && airline.staff.length ? airline.staff : [];
    staffList.innerHTML = `
      <h4>Staff Members:</h4>
      ${members.length ? members.map(uid => `<code>${uid}</code>`).join(", ") : "None yet"}
    `;
  }).catch(err => {
    alert("Failed to load airline: " + err.message);
  });
} // <-- closes loadAirline()

function addStaff() {
  const newStaff = document.getElementById("new-staff").value.trim();
  if (!newStaff) {
    alert("Enter a staff UID.");
    return;
  }
  if (!currentAirlineDocRef) {
    alert("No airline found for this account.");
    return;
  }

  currentAirlineDocRef.update({
    staff: firebase.firestore.FieldValue.arrayUnion(newStaff)
  }).then(() => {
    alert("Staff added!");
    document.getElementById("new-staff").value = "";
    loadAirline();
  }).catch(err => {
    alert("Failed to add staff: " + err.message);
  });
}

function updateAirline() {
  if (!currentAirlineDocRef) {
    alert("No airline to update.");
    return;
  }
  const name = document.getElementById("airline-name-edit").value.trim();
  const description = document.getElementById("airline-description-edit").value.trim();
  if (!name) {
    alert("Enter an airline name.");
    return;
  }

  currentAirlineDocRef.update({ name, description }).then(() => {
    alert("Airline updated!");
    loadAirline();
    // Auto-close staff panel after update
    document.getElementById("staff-panel").style.display = "none";
  }).catch(err => {
    alert("Failed to update airline: " + err.message);
  });
}
