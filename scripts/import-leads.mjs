/**
 * Bulk Import Leads from CSV to Production Firestore (leadflow-cde37)
 *
 * Usage: node scripts/import-leads.mjs
 *
 * Loads .env.production for Firebase Admin credentials, reads the CSV,
 * maps columns to Lead fields + workspace custom fields, and writes
 * in bulk to Firestore.
 */

import { readFileSync, existsSync } from "fs";
import { parse } from "csv-parse/sync";
import admin from "firebase-admin";

// ── 1. Load env ────────────────────────────────────────────────────

const envPath = new URL("../.env.production", import.meta.url).pathname;
if (!existsSync(envPath)) {
  console.error("❌ .env.production not found at", envPath);
  process.exit(1);
}

const envRaw = readFileSync(envPath, "utf-8");
for (const line of envRaw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  // Remove surrounding quotes if any
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error("❌ FIREBASE_ADMIN_* env vars not found in .env.production");
  process.exit(1);
}

console.log(`✅ Loaded Firebase Admin credentials for project: ${PROJECT_ID}`);

// ── 2. Init Firebase Admin ─────────────────────────────────────────

const privateKey = PRIVATE_KEY.replace(/\\n/g, "\n");

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: PROJECT_ID,
    credential: admin.credential.cert({
      projectId: PROJECT_ID,
      clientEmail: CLIENT_EMAIL,
      privateKey,
    }),
  });
}
const db = admin.firestore();

// ── 3. Find user ───────────────────────────────────────────────────

const USER_EMAIL = "tabishbinishfaq1122@gmail.com";

let userId;
try {
  const userRecord = await admin.auth().getUserByEmail(USER_EMAIL);
  userId = userRecord.uid;
  console.log(`✅ Found user: ${USER_EMAIL} (uid: ${userId})`);
} catch (err) {
  console.error(`❌ Failed to find user ${USER_EMAIL}:`, err.message);
  process.exit(1);
}

// ── 4. Find workspace ──────────────────────────────────────────────

let workspaceId;
let customFields = [];

try {
  const workspacesSnap = await db
    .collection("workspaces")
    .where("memberIds", "array-contains", userId)
    .limit(1)
    .get();

  if (workspacesSnap.empty) {
    console.error("❌ No workspace found for user");
    process.exit(1);
  }

  const wsDoc = workspacesSnap.docs[0];
  workspaceId = wsDoc.id;
  const wsData = wsDoc.data();
  customFields = wsData.customFields || [];

  console.log(`✅ Found workspace: "${wsData.name}" (id: ${workspaceId})`);
  console.log(`   Custom fields defined: ${customFields.length}`);
  for (const cf of customFields) {
    console.log(`   - ${cf.id}: "${cf.name}" (${cf.type})`);
  }
} catch (err) {
  console.error("❌ Failed to find workspace:", err.message);
  process.exit(1);
}

// ── 5. Map CSV columns to Custom Field IDs ─────────────────────────
// Build a map from custom field NAME → custom field ID

const cfNameToId = {};
for (const cf of customFields) {
  cfNameToId[cf.name.toLowerCase().trim()] = cf.id;
}

console.log("\n📋 Custom field mapping:");
console.log("   GMB Profile →", cfNameToId["gmb profile"] || "❌ NOT FOUND");
console.log("   Preferred Contact →", cfNameToId["preferred contact"] || "❌ NOT FOUND");
console.log("   Any SM (If Needed) →", cfNameToId["any sm (if needed)"] || "❌ NOT FOUND");
console.log("   Qualification Reason →", cfNameToId["qualification reason"] || "❌ NOT FOUND");
console.log("   Message 01 →", cfNameToId["message 01"] || "❌ NOT FOUND");
console.log("   Follow Up 01 (→ Message 02) →", cfNameToId["message 02"] || "❌ NOT FOUND");
console.log("   Follow Up 02 (→ Message 03) →", cfNameToId["message 03"] || "❌ NOT FOUND");

// ── 6. Read & parse CSV ────────────────────────────────────────────

const csvPath = "/Users/mac/Desktop/CRM/Lead Flow - Outreach - Sheet1 (6).csv";
if (!existsSync(csvPath)) {
  console.error("❌ CSV not found at", csvPath);
  process.exit(1);
}

const csvRaw = readFileSync(csvPath, "utf-8");
const records = parse(csvRaw, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
});

console.log(`\n📄 CSV parsed: ${records.length} rows`);

// ── 7. Build Firestore batch writes ────────────────────────────────

const now = admin.firestore.Timestamp.now();
const BATCH_SIZE = 500;
let imported = 0;
let errors = 0;
let skipped = 0;
const errorDetails = [];

// Get default pipeline stage — first stage is "new"
const defaultStatus = "new";

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = db.batch();
  const chunk = records.slice(i, i + BATCH_SIZE);

  for (const row of chunk) {
    try {
      const firstName = (row["First Name"] || "").trim();
      const lastName = (row["Last Name"] || "").trim();
      const email = (row["Email"] || "").trim();
      const company = (row["Company Name"] || "").trim();

      // Map social media
      const smRaw = (row["Any SM (If Needed)"] || "").trim();
      let linkedin = "";
      let facebook = "";
      let instagram = "";

      if (smRaw) {
        const lower = smRaw.toLowerCase();
        if (lower.includes("linkedin")) linkedin = smRaw;
        else if (lower.includes("facebook")) facebook = smRaw;
        else if (lower.includes("instagram")) instagram = smRaw;
        // If it doesn't match known patterns, put in linkedin as fallback
        else if (smRaw.startsWith("http")) linkedin = smRaw;
      }

      // Build custom fields map
      const customFieldsData = {};

      // GMB Profile
      const gmbKey = cfNameToId["gmb profile"] || cfNameToId["gmb profile url"] || null;
      if (gmbKey && row["GMB Profile"]) {
        customFieldsData[gmbKey] = row["GMB Profile"].trim();
      }

      // Preferred Contact
      const prefKey = cfNameToId["preferred contact"] || null;
      if (prefKey && row["Preferred Contact"]) {
        customFieldsData[prefKey] = row["Preferred Contact"].trim();
      }

      // Any SM / Social Media — maps to "Any SM (If Needed)" custom field
      const smKey = cfNameToId["any sm (if needed)"] || null;
      if (smKey && smRaw) {
        customFieldsData[smKey] = smRaw;
      }

      // Qualification Reason
      const qualKey = cfNameToId["qualification reason"] || null;
      if (qualKey && row["Qualification Reason"]) {
        customFieldsData[qualKey] = row["Qualification Reason"].trim();
      }

      // Message 01
      const msg1Key = cfNameToId["message 01"] || null;
      if (msg1Key && row["Message 01"]) {
        customFieldsData[msg1Key] = row["Message 01"].trim();
      }

      // Follow Up 01 → Message 02
      const fu1Key = cfNameToId["message 02"] || null;
      if (fu1Key && row["Follow Up 01"]) {
        customFieldsData[fu1Key] = row["Follow Up 01"].trim();
      }

      // Follow Up 02 → Message 03
      const fu2Key = cfNameToId["message 03"] || null;
      if (fu2Key && row["Follow Up 02"]) {
        customFieldsData[fu2Key] = row["Follow Up 02"].trim();
      }

      // Notes — combine CSV notes with any overflow from outreach notes
      let notes = (row["Notes (if/any - For Outreach Only)"] || "").trim();
      if (!notes && row["Qualification Reason"]) {
        notes = `Qualification: ${row["Qualification Reason"].trim()}`;
      }

      // SR. custom field
      const srKey = cfNameToId["sr."] || null;
      if (srKey && row["SR."]) {
        customFieldsData[srKey] = row["SR."].trim();
      }

      // Build lead document — use company name as fallback if no name/email
      const safeFirstName = firstName || company || "Unknown";
      const safeLastName = lastName || "";
      const safeEmail = email || `${(safeFirstName).toLowerCase().replace(/[^a-z0-9]/g, "")}@placeholder.local`;

      const leadDoc = {
        workspaceId,
        firstName: safeFirstName,
        lastName: safeLastName,
        email: safeEmail,
        phone: (row["Phone"] || "").trim() || null,
        company: (row["Company Name"] || "").trim() || null,
        jobTitle: (row["Job Title"] || "").trim() || null,
        status: defaultStatus,
        source: "cold_outreach",
        niche: (row["Niche"] || "").trim() || null,
        country: (row["Country"] || "").trim() || null,
        city: (row["City"] || "").trim() || null,
        website: (row["Website"] || "").trim() || null,
        linkedin: linkedin || null,
        value: null,
        currency: "USD",
        assignedTo: null,
        tags: ["cold_outreach", "nl_med_spa"],
        notes: notes || null,
        customFields: customFieldsData,
        socialProfiles: {
          ...(facebook ? { facebook } : {}),
          ...(instagram ? { instagram } : {}),
        },
        avatarUrl: null,
        attachments: [],
        lastContactedAt: null,
        nextFollowUpAt: null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = db.collection("leads").doc();
      batch.set(docRef, leadDoc);
      imported++;
    } catch (rowErr) {
      errors++;
      errorDetails.push(`Row ${i + 1 + imported + errors + skipped}: ${rowErr.message}`);
    }
  }

  await batch.commit();
  const total = Math.min(i + BATCH_SIZE, records.length);
  console.log(`   ✅ Batch ${Math.ceil((i + 1) / BATCH_SIZE)}: ${total}/${records.length} (${imported} imported, ${errors} errors, ${skipped} skipped)`);
}

// ── 8. Results ──────────────────────────────────────────────────────

console.log("\n" + "=".repeat(50));
console.log("📊 IMPORT COMPLETE");
console.log("=".repeat(50));
console.log(`   Total CSV rows:     ${records.length}`);
console.log(`   Successfully imported: ${imported}`);
console.log(`   Skipped (no name/email): ${skipped}`);
console.log(`   Errors:              ${errors}`);

if (errorDetails.length > 0) {
  console.log("\n⚠️  Error details:");
  for (const e of errorDetails.slice(0, 10)) {
    console.log(`   ${e}`);
  }
  if (errorDetails.length > 10) {
    console.log(`   ... and ${errorDetails.length - 10} more`);
  }
}

// Also print custom field mapping for verification
console.log("\n📋 Custom fields used in imported leads:");
for (const [name, id] of Object.entries(cfNameToId)) {
  const used = Object.keys(
    records.slice(0, 3).reduce((acc, r) => {
      if (r[name]?.trim()) acc[name] = true;
      return acc;
    }, {})
  ).length > 0;
  console.log(`   ${name} → ${id} ${used ? "✅" : "⚠️  (no data in first 3 rows)"}`);
}

process.exit(0);
