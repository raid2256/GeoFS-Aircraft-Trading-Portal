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
        ]).then(([senderDoc, listingDoc]) => {
          const senderName = senderDoc.exists ? senderDoc.data().nickname || senderDoc.data().username : "Unknown";
          const listingTitle = listingDoc.exists ? listingDoc.data().title : "Unknown Listing";

          const card = document.createElement("div");
          card.className = "message-card";
          card.innerHTML = `
            <p><strong>From:</strong> ${senderName}</p>
            <p><strong>Listing:</strong> ${listingTitle}</p>
            <p><strong>Message:</strong> ${msg.text}</p>
            <p><em>${msg.timestamp?.toDate().toLocaleString() || "Just now"}</em></p>
          `;
          container.appendChild(card);
        });
      });
    })
    .catch(err => {
      console.error("Error loading messages:", err);
      container.innerHTML = "<p>Error loading messages.</p>";
    });
});
