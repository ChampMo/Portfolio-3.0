/**
 * Read-only diagnostic. Reports which database is in use, what collections
 * exist, and — crucially — how many documents are missing the `published`
 * field, since the public queries filter on it.
 *
 *   node --env-file=.env.local scripts/inspect.mjs
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const conn = await mongoose.connect(uri, { family: 4 });
const db = conn.connection.db;

console.log(`\ndatabase in use: ${db.databaseName}\n`);

const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();
console.log("collections:", cols.length ? cols.join(", ") : "(none)");

const OF_INTEREST = ["services", "projects", "experiences", "skills", "identities"];

console.log("\n" + "name".padEnd(14) + "docs".padEnd(7) + "published:true".padEnd(16) + "missing `published`");
console.log("-".repeat(60));

for (const name of OF_INTEREST) {
  if (!cols.includes(name)) {
    console.log(name.padEnd(14) + "— collection does not exist");
    continue;
  }
  const c = db.collection(name);
  const total = await c.countDocuments({});
  const pubTrue = await c.countDocuments({ published: true });
  const missing = await c.countDocuments({ published: { $exists: false } });
  console.log(
    name.padEnd(14) + String(total).padEnd(7) + String(pubTrue).padEnd(16) + String(missing)
  );
}

// Show the field shape of one service doc, if any.
if (cols.includes("services")) {
  const sample = await db.collection("services").findOne({});
  if (sample) {
    console.log("\nsample `services` doc field names:");
    console.log("  " + Object.keys(sample).join(", "));
  }
}
if (cols.includes("experiences")) {
  const sample = await db.collection("experiences").findOne({});
  if (sample) {
    console.log("\nsample `experiences` doc field names:");
    console.log("  " + Object.keys(sample).join(", "));
  }
}

await mongoose.disconnect();
