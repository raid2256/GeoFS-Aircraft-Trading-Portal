// Firebase config (same as marketplace.js)
const firebaseConfig = { /* your config */ };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentAirlineDocRef = null;

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
    }
  });

  loadAirline();
});

function createAirline() {
  const user = auth.currentUser;
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
  });
}

function loadAirline() {
  const user = auth.currentUser;
  db.collection("airlines").where("ownerId", "==", user.uid).get().then(snapshot => {
    if (snapshot.empty) {
      document.getElementById("airline-form").style.display = "block";
      document.getElementById("airline-dashboard").style.display = "none";
      return;
    }

    const doc = snapshot.docs[0];
    currentAirlineDocRef = doc.ref;
    const airline = doc.data();

    document.getElementById("airline-form").style.display = "none";
    document.getElementById("airline-dashboard").style.display = "block";
    document.getElementById("airline-info").innerHTML =
      `<strong>${airline.name}</strong><br>${airline.description || ""}`;

    document.getElementById("airline-name-edit").value = airline.name || "";
    document.getElementById("airline-description-edit").value = airline.description || "";

    const staffList = document.getElementById("staff-list");
    const members = airline.staff && airline.staff.length ? airline.staff : [];
    staffList.innerHTML = `
      <h4>Staff Members:</h4>
      ${members.length ? members.map(uid => `<code>${uid}</code>`).join(", ") : "None yet"}
    `;
  });
}

function addStaff() {
  const newStaff = document.getElementById("new-staff").value.trim();
  if (!newStaff || !currentAirlineDocRef) return;

  currentAirlineDocRef.update({
    staff: firebase.firestore.FieldValue.arrayUnion(newStaff)
  }).then(() => {
    alert("Staff added!");
    document.getElementById("new-staff").value = "";
    loadAirline();
  });
}

function updateAirline() {
  if (!currentAirlineDocRef) return;
  const name = document.getElementById("airline-name-edit").value.trim();
  const description = document.getElementById("airline-description-edit").value.trim();

  if (!name) {
    alert("Enter an airline name.");
    return;
  }

  currentAirlineDocRef.update({ name, description }).then(() => {
    alert("Airline updated!");
    loadAirline();
  });
}
