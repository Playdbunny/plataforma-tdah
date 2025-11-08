/* eslint-disable no-undef */
(function () {
  const envDbName =
    (typeof process !== "undefined" && process?.env?.DB_NAME) ||
    (typeof globalThis !== "undefined" && (globalThis.DB_NAME || globalThis.dbName)) ||
    null;
  const currentDb = typeof db !== "undefined" ? db : null;
  const databaseName = envDbName || (currentDb ? currentDb.getName() : null);

  if (!databaseName) {
    throw new Error(
      "No se pudo determinar la base de datos. Conéctate con mongosh a la DB deseada o define DB_NAME.",
    );
  }

  const database = currentDb && typeof currentDb.getSiblingDB === "function"
    ? currentDb.getSiblingDB(databaseName)
    : currentDb;

  if (!database) {
    throw new Error("No se pudo obtener el manejador de la base de datos.");
  }

  const activities = database.getCollection
    ? database.getCollection("activities")
    : database.activities;

  if (!activities) {
    throw new Error("No se encontró la colección activities.");
  }

  print(`Usando base de datos: ${databaseName}`);

  const removedDataUrls = activities.updateMany(
    { bannerUrl: { $type: "string", $regex: /^data:/i } },
    { $unset: { bannerUrl: "" } },
  );
  printjson({ removedDataUrls: removedDataUrls?.modifiedCount ?? 0 });

  const removedTooLong = activities.updateMany(
    { $expr: { $gt: [{ $strLenCP: "$bannerUrl" }, 512] } },
    { $unset: { bannerUrl: "" } },
  );
  printjson({ removedTooLong: removedTooLong?.modifiedCount ?? 0 });

  const cursor = activities.find({ bannerUrl: { $type: "string" } });
  let normalized = 0;

  cursor.forEach((doc) => {
    let url = doc.bannerUrl;
    if (typeof url !== "string") return;
    const original = url;
    url = url.trim();
    if (!url) {
      url = null;
    } else {
      url = url.split("#")[0].split("?")[0];
      url = url.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i, "");
      if (url.length > 512 || !/^(https?:\/\/|\/uploads\/)/i.test(url)) {
        url = null;
      }
    }

    if (url !== original) {
      activities.updateOne({ _id: doc._id }, { $set: { bannerUrl: url } });
      normalized += 1;
    }
  });

  printjson({ normalized });
})();
