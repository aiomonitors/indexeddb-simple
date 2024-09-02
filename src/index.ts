import z from "zod";
import {
	ExtractBooleanShape,
	KeyPathHelper,
	KindaPartial,
	SelectFrom,
} from "./types/index.js";
import { DatabaseObjectStore, DatabaseQuery } from "./types/object-store.js";

export class DatabaseConnectionError extends Error {
	error: DOMException | null;
	constructor(
		message: string,
		error: DOMException | null,
		errorOptions?: ErrorOptions,
	) {
		super(message, errorOptions);
		this.error = error;
	}
}

export class Database {
	name: string;
	version: number;

	constructor(name: string, version: number) {
		this.name = name;
		this.version = version;
	}

	public connect() {
		return new Promise<IDBDatabase>((resolve, reject) => {
			if (!window.indexedDB) {
				throw new Error("Indexed DB does not exist on the window");
			}

			const request = window.indexedDB.open(this.name, this.version);

			request.onerror = function () {
				reject(
					new DatabaseConnectionError(
						"Error encountered connecting to the database",
						request.error,
					),
				);
			};

			request.onsuccess = () => {
				resolve(request.result);
			};
		});
	}
}

class Query<T extends Record<string, unknown>, R = unknown>
	implements DatabaseQuery<T, R>
{
	schema: z.Schema<T>;

	constructor(schema: z.Schema<T>) {
		this.schema = schema;
	}

	public where<K extends Record<string, unknown>>(
		shape: KindaPartial<T, K>,
	): R {
		return {} as R;
	}
}

type Index = Readonly<{
	path: string;
	opts: { unique: boolean };
}>;

class ObjectStore<
	T extends Record<string, unknown>,
	Key extends Readonly<string>,
	Indexes = object,
> implements DatabaseObjectStore<T, Key, Indexes>
{
	schema: z.Schema<T>;
	name: string;
	readonly keyPath: Key;
	indexes: Indexes;

	constructor(
		name: string,
		schema: z.Schema<T>,
		keyPath: Key,
		indexes?: Indexes,
	) {
		this.name = name;
		this.schema = schema;
		this.keyPath = keyPath;
		// @ts-expect-error Blah
		this.indexes = indexes ?? {};
	}

	public select<K extends ExtractBooleanShape<T>>(shape: K) {
		return new Query<T, SelectFrom<T, K>>(this.schema);
	}

	public addIndex<
		N extends string,
		K extends keyof T,
		I = { path: K; pts: { unique: false } },
	>(
		indexName: N extends keyof Indexes ? never : N,
		indexPath: K extends Key ? never : K,
	) {
		return new ObjectStore<T, Key, Indexes & Record<N, I>>(
			this.name,
			this.schema,
			this.keyPath,
			this.indexes
				? ({
						...this.indexes,
						[indexName]: {
							path: indexPath,
							opts: {
								unique: false,
							},
						},
					} as Indexes & Record<N, I>)
				: ({
						[indexName]: {
							path: indexPath,
							opts: {
								unique: false,
							},
						},
					} as Indexes & Record<N, I>),
		);
	}
}

export const createObjectStore = <
	T extends Record<string, unknown>,
	K extends KeyPathHelper<T>,
>(
	name: string,
	schema: z.Schema<T>,
	keyPath: K,
) => {
	return new ObjectStore(name, schema, keyPath);
};

const userStore = createObjectStore(
	"blah",
	z.object({
		name: z.string().optional(),
		id: z.string().uuid(),
		email: z.string(),
	}),
	"id",
)
	.addIndex("name", "email")
	.addIndex("emailDate", "email");

const { name: nameIndex, emailDate } = userStore.indexes;
//        ^?

const value = userStore
	.select({
		email: true,
	})
	.where({
		name: "shihab",
	});
