// keys.js route's methods

// 5. Extend Key Validity (Retailer or Admin)
// Extend Validity by X Months (Retailer or Super Admin)
// router.post('/extend-validity', authenticateToken, async (req, res) => {
//   try {
//     const { keyId, months } = req.body;
//     if (!keyId || !months || months <= 0) {
//       return res.status(400).json({ error: 'Missing or invalid keyId/months' });
//     }

//     // Get user info
//     const userDoc = await db.collection('users').doc(req.user.uid).get();
//     if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
//     const user = userDoc.data();

//     // Get key
//     const keyRef = db.collection('keys').doc(keyId);
//     const keyDoc = await keyRef.get();
//     if (!keyDoc.exists) return res.status(404).json({ error: 'Key not found' });
//     const key = keyDoc.data();

//     // Authorization: must be Super Admin or the assigned owner (typically a retailer)
//     const isOwner = key.assignedTo === req.user.uid;
//     const isSuperAdmin = user.role === "super_admin";
//     if (!isOwner && !isSuperAdmin) {
//       return res.status(403).json({ error: 'Not authorized to extend validity' });
//     }

//     // Determine base date to extend from (validUntil or now)
//     const baseDate = key.validUntil ? new Date(key.validUntil) : new Date();
//     const newValidUntil = new Date(baseDate.setMonth(baseDate.getMonth() + months));

//     await keyRef.update({
//       validUntil: new ValidUntil
//     });

//     res.json({
//       success: true,
//       message: `Key validity extended by ${months} month(s)`,
//       newValidUntil
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });