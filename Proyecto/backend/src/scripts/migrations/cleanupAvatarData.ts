import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../db";
import { User, normalizeAvatarUrl } from "../../models/User";

/**
 * Migración puntual para limpiar restos de avatars almacenados como dataURL/base64.
 * Ejecutar una sola vez: `ts-node src/scripts/migrations/cleanupAvatarData.ts`
 */

const FIELDS_TO_UNSET = ["avatar", "photo", "picture"] as const;

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI no definido. Aborta migración.");
    process.exit(1);
  }

  await connectDB(uri);

  const bulk = User.collection.initializeUnorderedBulkOp();
  let operations = 0;

  const cursor = User.find()
    .select(["avatarUrl", ...FIELDS_TO_UNSET])
    .cursor();

  for await (const doc of cursor) {
    const unset: Record<string, ""> = {};
    let nextAvatar: string | null | undefined;
    let needsUpdate = false;

    for (const field of FIELDS_TO_UNSET) {
      if (doc.get(field) !== undefined) {
        unset[field] = "";
        needsUpdate = true;
      }
    }

    const currentAvatar = doc.get("avatarUrl") as unknown;
    const normalized = normalizeAvatarUrl(currentAvatar);
    if (normalized !== currentAvatar) {
      needsUpdate = true;
      nextAvatar = normalized;
    }

    if (!needsUpdate) continue;

    const updateOps: Record<string, unknown> = {};
    if (Object.keys(unset).length) {
      updateOps.$unset = unset;
    }
    if (nextAvatar !== undefined) {
      updateOps.$set = { avatarUrl: nextAvatar ?? null };
    }

    if (Object.keys(updateOps).length) {
      bulk.find({ _id: doc._id }).updateOne(updateOps);
      operations += 1;
    }
  }

  if (operations > 0) {
    await bulk.execute();
  }

  await mongoose.connection.close();
  console.log(`✅ Migración completada. Registros modificados: ${operations}`);
}

run().catch((error) => {
  console.error("Error ejecutando la migración de avatar", error);
  mongoose.connection.close().catch(() => {});
  process.exit(1);
});
