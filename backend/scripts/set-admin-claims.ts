/**
 * Script: set-admin-claims.ts
 * Sets admin role and clientId as custom claims on a Firebase user.
 *
 * Usage:
 *   npx ts-node scripts/set-admin-claims.ts <email> <clientId>
 *
 * Example:
 *   npx ts-node scripts/set-admin-claims.ts admin@imettrics.com imettrics
 */

import * as admin from 'firebase-admin';

const [email, clientId] = process.argv.slice(2);

if (!email || !clientId) {
  console.error('❌ Usage: npx ts-node scripts/set-admin-claims.ts <email> <clientId>');
  process.exit(1);
}

admin.initializeApp();

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    role: 'admin',
    clientId,
  });
  console.log(`✅ Claims set for ${email}:`);
  console.log(`   role: admin`);
  console.log(`   clientId: ${clientId}`);
  console.log(`\nℹ️  The user needs to sign out and sign back in for the new token to take effect.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
