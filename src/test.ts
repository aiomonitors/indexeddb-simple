import "fake-indexeddb/auto";
import { z } from "zod";
import { Query } from "./core/query.js";
import { Database } from "./core/database.js";
import { DBMigrationHandler } from "./core/migration-handler.js";
import { createObjectStore } from "./index.js";
import { ExtractBooleanShape } from "./types/index.js";

const schema = z.object({
	name: z.string().optional(),
	id: z.string(),
	email: z.string(),
	meta: z
		.object({
			createdAt: z.string(),
			updatedAt: z.string(),
		})
		.optional(),
});

const query = new Query(schema, {
	email: true,
	name: true,
	meta: {
		createdAt: true,
	},
});

const value = query.extractShape({
	email: "blah@gmail.com",
	name: "blah",
	id: "1-1-1-1",
	meta: {
		createdAt: "1",
		updatedAt: "2",
	},
});

const objectStore = createObjectStore("userData", schema, "id");

const database = new Database(
	"my_db",
	1,
	{
		users: objectStore,
	} as const,
	[
		// eslint-disable-next-line @typescript-eslint/require-await
		new DBMigrationHandler(1, async (db) => {
			if (db.objectStoreNames.contains(objectStore.name)) {
				objectStore.delete();
			}

			objectStore.create();
		}),
	],
);

const db = await database.connect();
await objectStore.insert({
	id: "12345",
	name: "Shihab",
	email: "hi@shihab.dev",
});

const count = await objectStore.count();
const exists = await objectStore.exists("g");
console.log("Count", count, exists);
