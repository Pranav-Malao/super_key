const admin = require('firebase-admin');

// Replace with your actual service account path or use env vars
const serviceAccount = require('../super-key-4a382-firebase-adminsdk-fbsvc-84ef0e8e76.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  const snapshot = await db.collection('keyTransactions').get();
  console.log(`Found ${snapshot.size} documents to update`);

  const batchSize = 50; // Firestore batch limit
  let count = 0;

  let batch = db.batch();
  for (const doc of snapshot.docs) {
    const data = doc.data();

    let participants = [];
    if (data.fromUser) participants.push(data.fromUser);
    if (data.toUser) participants.push(data.toUser);

    const ref = doc.ref;

    batch.update(ref, { participants });

    count++;

    // Commit in batches of 500
    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`Committed batch of ${batchSize}`);
      batch = db.batch(); // start new batch
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
    console.log(`Committed final batch of ${count % batchSize}`);
  }

  console.log(`✅ Updated ${count} key transactions with participants`);
})();