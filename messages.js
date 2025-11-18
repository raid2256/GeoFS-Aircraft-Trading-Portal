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

        const senderRef = db.collection("users").doc(msg.senderId);
        const listingRef = db.collection("listings").doc(msg.listingId);

        Promise.all([senderRef.get(), listingRef.get()])
          .then(([senderDoc, listingDoc]) => {
            const senderName = senderDoc.exists
              ? senderDoc.data().nickname || senderDoc.data().username || "Unnamed"
              : "Unknown";

            const listingTitle = listingDoc.exists
              ? listingDoc.data().title || "Untitled Listing"
              : "Unknown Listing";

            const messageText = msg.text || "<em>No content</em>";
            const timestamp = msg.timestamp?.toDate().toLocaleString() || "Just now";

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
              <p><em>${msg.timestamp?.toDate().toLocaleString() || "Just now"}</em></p>
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
