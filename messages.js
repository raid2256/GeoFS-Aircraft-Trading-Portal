// Firebase config and initialization
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

// Load messages for the signed-in user
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const container = document.getElementById("messages-container");
  container.innerHTML = "<p>Loading messages...</p>";

  db.collection("messages")
    .where("receiverId", "==", user.uid)
    .orderBy("timestamp", "desc")
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = "<p>No messages yet.</p>";
        return;
      }

      container.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();

        Promise.all([
          db.collection("users").doc(msg.senderId).get(),
          db.collection("listings").doc(msg.listingId).get()
        ])
        .then(([senderDoc, listingDoc]) => {
          const senderName = senderDoc.exists
            ? senderDoc.data().nickname || senderDoc.data().username || "Unnamed"
            : "Unknown";

          const listingTitle = listingDoc.exists
            ? listingDoc.data().title || "Untitled Listing"
            : "Unknown Listing";

          const messageText = msg.text || "<em>No content</em>";

          let timestamp = "Just now";
          try {
            if (msg.timestamp && typeof msg.timestamp.toDate === "function") {
              timestamp = msg.timestamp.toDate().toLocaleString();
            } else if (msg.timestamp && msg.timestamp.seconds) {
              // fallback if timestamp is a plain object with seconds
              timestamp = new Date(msg.timestamp.seconds * 1000).toLocaleString();
            }
          } catch (e) {
            console.warn("Invalid timestamp format:", msg.timestamp);
          }

          const card = document.createElement("div");
          card.className = "message-card";
          card.innerHTML = `
            <p><strong>From:</strong> ${senderName}</p>
            <p><strong>Listing:</strong> ${listingTitle}</p>
            <p><strong>Message:</strong> ${messageText}</p>
            <p><em>${timestamp}</em></p>
          `;
          container.appendChild(card);
        })
        .catch(err => {
          console.error("Error loading sender/listing:", err);
          const fallbackCard = document.createElement("div");
          fallbackCard.className = "message-card";
          fallbackCard.innerHTML = `
            <p><strong>Message:</strong> ${msg.text || "<em>No content</em>"}</p>
            <p><em>⚠️ Failed to load sender or listing info</em></p>
          `;
          container.appendChild(fallbackCard);
        });
      });
    })
    .catch(err => {
      console.error("Error loading messages:", err);
      container.innerHTML = "<p>Error loading messages.</p>";
    });
});
