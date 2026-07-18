import process from "node:process";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const { MongoClient } = mongoose.mongo;
const PORTAL_COLLECTIONS = [
  "portalclients",
  "portalusers",
  "portalsettings",
  "portalbookkeepingtransactions",
  "portalbookkeepingrules"
];

const CONFIRMATION_FLAG = "--confirm-copy-client-portal";
const BATCH_SIZE = 250;

function printHelp() {
  console.log(`
Clone the Client Portal collections from the uniforms MongoDB database into the
clients MongoDB database.

Environment:
  MONGO_URI_UNIFORMS  Source database (the uniforms database)
  MONGO_URI_CLIENT    Destination database (the clients database)
  CLIENT_PORTAL_CLONE_SOURCE_DB
                      Optional source database override (for example: test)
  CLIENT_PORTAL_CLONE_TARGET_DB
                      Optional destination database override (for example: test)

Usage:
  node scripts/clone-client-portal-db.js --source-db=test --target-db=test
      Read-only dry run. Shows the collections and document counts.

  node scripts/clone-client-portal-db.js --source-db=test --target-db=test --apply ${CONFIRMATION_FLAG}
      Copy into an empty destination. Existing source data is never deleted.

  node scripts/clone-client-portal-db.js --source-db=test --target-db=test --apply --merge ${CONFIRMATION_FLAG}
      Upsert by _id into a non-empty destination. Extra destination documents
      are retained. Unique-key conflicts are checked before copying.
`);
}

function parseArguments(argv) {
  const supported = new Set(["--help", "-h", "--apply", "--merge", CONFIRMATION_FLAG]);
  const sourceDatabaseArguments = argv.filter((argument) => argument.startsWith("--source-db="));
  const targetDatabaseArguments = argv.filter((argument) => argument.startsWith("--target-db="));
  const unknown = argv.filter(
    (argument) =>
      !supported.has(argument) &&
      !argument.startsWith("--source-db=") &&
      !argument.startsWith("--target-db=")
  );

  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  }

  if (sourceDatabaseArguments.length > 1) {
    throw new Error("--source-db may only be supplied once.");
  }

  if (targetDatabaseArguments.length > 1) {
    throw new Error("--target-db may only be supplied once.");
  }

  const help = argv.includes("--help") || argv.includes("-h");
  const apply = argv.includes("--apply");
  const merge = argv.includes("--merge");
  const confirmed = argv.includes(CONFIRMATION_FLAG);
  const sourceDatabase = sourceDatabaseArguments[0]?.slice("--source-db=".length)
    || process.env.CLIENT_PORTAL_CLONE_SOURCE_DB
    || null;
  const targetDatabase = targetDatabaseArguments[0]?.slice("--target-db=".length)
    || process.env.CLIENT_PORTAL_CLONE_TARGET_DB
    || null;

  if (merge && !apply) {
    throw new Error("--merge can only be used together with --apply.");
  }

  if (apply && !confirmed) {
    throw new Error(`Refusing to write without ${CONFIRMATION_FLAG}.`);
  }

  if (sourceDatabase !== null) {
    if (!sourceDatabase || /[\/\\."$*<>:|?]/.test(sourceDatabase)) {
      throw new Error("--source-db contains an invalid MongoDB database name.");
    }
  }

  if (targetDatabase !== null) {
    if (!targetDatabase || /[\/\\."$*<>:|?]/.test(targetDatabase)) {
      throw new Error("--target-db contains an invalid MongoDB database name.");
    }
  }

  return { help, apply, merge, sourceDatabase, targetDatabase };
}

function connectionIdentity(uri, environmentName, databaseOverride = null) {
  if (!uri) {
    throw new Error(`${environmentName} is not configured.`);
  }

  const schemeEnd = uri.indexOf("://");
  if (schemeEnd === -1) {
    throw new Error(`${environmentName} is not a valid MongoDB connection string.`);
  }

  const authorityStart = schemeEnd + 3;
  const pathStart = uri.indexOf("/", authorityStart);
  const queryStart = uri.indexOf("?", authorityStart);
  const authorityEndCandidates = [pathStart, queryStart].filter((position) => position !== -1);
  const authorityEnd = authorityEndCandidates.length > 0
    ? Math.min(...authorityEndCandidates)
    : uri.length;
  const authority = uri.slice(authorityStart, authorityEnd);
  const hosts = authority.slice(authority.lastIndexOf("@") + 1).toLowerCase();
  const rawDatabaseName = pathStart === -1
    ? ""
    : uri.slice(pathStart + 1).split("?")[0];

  if (!databaseOverride && !rawDatabaseName) {
    throw new Error(`${environmentName} must include an explicit database name.`);
  }

  let databaseName;
  try {
    databaseName = databaseOverride || decodeURIComponent(rawDatabaseName);
  } catch {
    throw new Error(`${environmentName} contains an invalid database name.`);
  }

  return { hosts, databaseName };
}

function getPath(document, dottedPath) {
  return dottedPath.split(".").reduce(
    (current, part) => (current === null || current === undefined ? undefined : current[part]),
    document
  );
}

function buildIndexOptions(index) {
  const supportedOptions = [
    "name",
    "unique",
    "sparse",
    "expireAfterSeconds",
    "partialFilterExpression",
    "collation",
    "hidden",
    "wildcardProjection"
  ];
  const options = {};

  for (const option of supportedOptions) {
    if (index[option] !== undefined) {
      options[option] = index[option];
    }
  }

  return options;
}

async function inspectDatabase(sourceDb, targetDb) {
  const sourceCollectionInfo = await sourceDb
    .listCollections({}, { nameOnly: true })
    .toArray();
  const targetCollectionInfo = await targetDb
    .listCollections({}, { nameOnly: true })
    .toArray();

  const sourceExisting = new Set(
    sourceCollectionInfo
      .map(({ name }) => name)
      .filter((name) => PORTAL_COLLECTIONS.includes(name))
  );
  const targetExisting = new Set(
    targetCollectionInfo
      .map(({ name }) => name)
      .filter((name) => PORTAL_COLLECTIONS.includes(name))
  );
  const plan = [];

  for (const name of PORTAL_COLLECTIONS) {
    const sourceCount = sourceExisting.has(name)
      ? await sourceDb.collection(name).countDocuments({})
      : 0;
    const targetCount = targetExisting.has(name)
      ? await targetDb.collection(name).countDocuments({})
      : 0;

    plan.push({
      name,
      sourceExists: sourceExisting.has(name),
      targetExists: targetExisting.has(name),
      sourceCount,
      targetCount
    });
  }

  return plan;
}

function printPlan(plan, sourceName, targetName) {
  console.log(`Source database:      ${sourceName}`);
  console.log(`Destination database: ${targetName}`);
  console.log("");
  console.log("Collection                         Source  Destination");
  console.log("---------------------------------  ------  -----------");

  for (const item of plan) {
    console.log(
      `${item.name.padEnd(33)}  ${String(item.sourceCount).padStart(6)}  ${String(item.targetCount).padStart(11)}`
    );
  }
}

async function findUniqueConflicts(sourceDb, targetDb, plan) {
  const conflicts = [];

  for (const item of plan) {
    if (!item.sourceExists || !item.targetExists || item.sourceCount === 0 || item.targetCount === 0) {
      continue;
    }

    const sourceCollection = sourceDb.collection(item.name);
    const targetCollection = targetDb.collection(item.name);
    const uniqueIndexes = (await sourceCollection.listIndexes().toArray())
      .filter((index) => index.unique && index.name !== "_id_");

    for (const index of uniqueIndexes) {
      const fields = Object.keys(index.key);
      const sourceFilter = index.partialFilterExpression || {};
      const projection = Object.fromEntries([["_id", 1], ...fields.map((field) => [field, 1])]);
      const cursor = sourceCollection.find(sourceFilter, { projection });

      for await (const sourceDocument of cursor) {
        const values = fields.map((field) => getPath(sourceDocument, field));
        if (index.sparse && values.some((value) => value === undefined)) {
          continue;
        }

        const valueFilter = Object.fromEntries(
          fields.map((field, position) => [field, values[position] ?? null])
        );
        const filters = [
          valueFilter,
          { _id: { $ne: sourceDocument._id } }
        ];

        if (index.partialFilterExpression) {
          filters.push(index.partialFilterExpression);
        }

        const options = { projection: { _id: 1 } };
        if (index.collation) {
          options.collation = index.collation;
        }

        const targetDocument = await targetCollection.findOne({ $and: filters }, options);
        if (targetDocument) {
          conflicts.push({
            collection: item.name,
            index: index.name,
            sourceId: String(sourceDocument._id),
            targetId: String(targetDocument._id)
          });
        }
      }
    }
  }

  return conflicts;
}

async function ensureCollectionAndIndexes(sourceDb, targetDb, item) {
  if (!item.targetExists) {
    await targetDb.createCollection(item.name);
  }

  if (!item.sourceExists) {
    return;
  }

  const indexes = await sourceDb.collection(item.name).listIndexes().toArray();
  for (const index of indexes) {
    if (index.name === "_id_") {
      continue;
    }

    await targetDb.collection(item.name).createIndex(index.key, buildIndexOptions(index));
  }
}

async function copyCollection(sourceDb, targetDb, item) {
  if (!item.sourceExists || item.sourceCount === 0) {
    return { copied: 0, matched: 0 };
  }

  const sourceCollection = sourceDb.collection(item.name);
  const targetCollection = targetDb.collection(item.name);
  const cursor = sourceCollection.find({}).batchSize(BATCH_SIZE);
  let operations = [];
  let copied = 0;
  let matched = 0;

  async function writeBatch() {
    if (operations.length === 0) {
      return;
    }

    const ids = operations.map((operation) => operation.replaceOne.filter._id);
    const result = await targetCollection.bulkWrite(operations, { ordered: true });
    const verifiedCount = await targetCollection.countDocuments({ _id: { $in: ids } });

    if (verifiedCount !== ids.length) {
      throw new Error(
        `${item.name}: verification failed for a batch of ${ids.length} documents.`
      );
    }

    copied += result.upsertedCount + result.modifiedCount;
    matched += result.matchedCount;
    operations = [];
  }

  for await (const document of cursor) {
    operations.push({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true
      }
    });

    if (operations.length >= BATCH_SIZE) {
      await writeBatch();
    }
  }

  await writeBatch();
  return { copied, matched };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const sourceUri = process.env.MONGO_URI_UNIFORMS || process.env.MONGO_URI;
  const targetUri = process.env.MONGO_URI_CLIENT;
  const sourceIdentity = connectionIdentity(
    sourceUri,
    "MONGO_URI_UNIFORMS",
    options.sourceDatabase
  );
  const targetIdentity = connectionIdentity(
    targetUri,
    "MONGO_URI_CLIENT",
    options.targetDatabase
  );

  if (
    sourceIdentity.hosts === targetIdentity.hosts &&
    sourceIdentity.databaseName === targetIdentity.databaseName
  ) {
    throw new Error("Source and destination resolve to the same MongoDB database.");
  }

  const clientOptions = { serverSelectionTimeoutMS: 15_000 };
  const sourceClient = new MongoClient(sourceUri, clientOptions);
  const targetClient = new MongoClient(targetUri, clientOptions);

  try {
    await Promise.all([sourceClient.connect(), targetClient.connect()]);
    const sourceDb = sourceClient.db(sourceIdentity.databaseName);
    const targetDb = targetClient.db(targetIdentity.databaseName);
    const plan = await inspectDatabase(sourceDb, targetDb);

    printPlan(plan, sourceDb.databaseName, targetDb.databaseName);

    const sourceTotal = plan.reduce((total, item) => total + item.sourceCount, 0);
    const targetTotal = plan.reduce((total, item) => total + item.targetCount, 0);

    if (!options.apply) {
      console.log("");
      console.log("Dry run only: no data was changed.");
      if (sourceTotal === 0) {
        console.log("No Client Portal documents were found in the source database.");
      } else {
        console.log(
          `Ready to clone ${sourceTotal} document(s). Re-run with --apply ${CONFIRMATION_FLAG}.`
        );
      }
      return;
    }

    if (sourceTotal === 0) {
      throw new Error("No Client Portal documents were found in the source database.");
    }

    if (targetTotal > 0 && !options.merge) {
      throw new Error(
        `The destination already has ${targetTotal} portal document(s). ` +
        "Inspect them first, then re-run with --merge if they should be retained/upserted."
      );
    }

    if (targetTotal > 0) {
      const conflicts = await findUniqueConflicts(sourceDb, targetDb, plan);
      if (conflicts.length > 0) {
        const details = conflicts
          .slice(0, 10)
          .map(
            (conflict) =>
              `${conflict.collection}.${conflict.index}: source _id ${conflict.sourceId}, ` +
              `destination _id ${conflict.targetId}`
          )
          .join("\n");
        throw new Error(
          `Unique-key conflicts must be resolved before merging:\n${details}` +
          (conflicts.length > 10 ? `\n...and ${conflicts.length - 10} more.` : "")
        );
      }
    }

    console.log("");
    console.log("Copying Client Portal collections...");
    for (const item of plan) {
      await ensureCollectionAndIndexes(sourceDb, targetDb, item);
      const result = await copyCollection(sourceDb, targetDb, item);
      console.log(
        `${item.name}: ${item.sourceCount} verified (${result.copied} written, ${result.matched} matched)`
      );
    }

    console.log("");
    console.log(
      `Clone complete. The ${sourceDb.databaseName} source database was not modified or deleted.`
    );
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

main().catch((error) => {
  console.error(`Client Portal database clone failed: ${error.message}`);
  process.exitCode = 1;
});
