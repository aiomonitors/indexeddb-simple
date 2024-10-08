import z from "zod";
import { ExtractBooleanShape, SelectFrom } from "../types/index.js";
import {
	DatabaseObjectStore,
	DatabaseObjectStoreRaw,
} from "../types/object-store.js";
import { Query } from "./query.js";

const isIndex = (obj: unknown): obj is { path: string } =>
	obj !== undefined &&
	obj !== null &&
	typeof obj === "object" &&
	"path" in obj &&
	typeof obj.path === "string";

export class ObjectStoreInsertError extends Error {
	error: DOMException | null;

	constructor(
		message: string,
		error: DOMException | null,
		errorOpts?: ErrorOptions,
	) {
		super(message, errorOpts);
		this.error = error;
	}
}

export class ObjectStore<
		T extends Record<string, unknown>,
		Key extends Readonly<string>,
		Indexes = object,
	>
	implements DatabaseObjectStore<T, Key, Indexes>, DatabaseObjectStoreRaw
{
	schema: z.Schema<T>;
	name: string;
	readonly keyPath: Key;
	private indexes: Indexes;
	db?: IDBDatabase;

	constructor(
		name: string,
		schema: z.Schema<T>,
		keyPath: Key,
		indexes?: Indexes,
	) {
		this.name = name;
		this.schema = schema;
		this.keyPath = keyPath;
		// @ts-expect-error Should be an empty object, typescript won't allow indexing if none are added
		this.indexes = indexes ?? {};
	}

	public select<K extends ExtractBooleanShape<T>>(shape: K) {
		return new Query<T, K, SelectFrom<T, K>>(this.schema, shape);
	}

	create(): void {
		if (!this.db) {
			throw new Error("Database not connected");
		}

		const objStore = this.db.createObjectStore(this.name, {
			keyPath: this.keyPath,
		});
		for (const key in this.indexes) {
			if (isIndex(this.indexes[key])) {
				objStore.createIndex(key, this.indexes[key].path);
			}
		}
	}

	delete(): void {
		if (!this.db) {
			throw new Error("Database not connected");
		}

		this.db.deleteObjectStore(this.name);
	}

	insert(item: unknown): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				throw new Error("Database not connected");
			}

			const parsedItem = this.schema.safeParse(item);
			if (!parsedItem.success) {
				reject(new Error("Item does not fit schema"));
			}

			const transaction = this.db
				.transaction(this.name, "readwrite")
				.objectStore(this.name)
				.add(parsedItem.data);

			transaction.onsuccess = () => {
				resolve();
			};

			transaction.onerror = () => {
				reject(
					new ObjectStoreInsertError(
						"Could not insert item into store",
						transaction.error,
					),
				);
			};
		});
	}

	count(): Promise<number> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				throw new Error("Database not connected");
			}

			const transaction = this.db
				.transaction(this.name, "readonly")
				.objectStore(this.name)
				.count();

			transaction.onsuccess = () => {
				resolve(transaction.result);
			};

			transaction.onerror = () => {
				reject(
					new ObjectStoreInsertError(
						"Could not fetch count from database",
						transaction.error,
					),
				);
			};
		});
	}

	exists(key: IDBValidKey): Promise<boolean> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				throw new Error("Database not connected");
			}

			const transaction = this.db
				.transaction(this.name, "readonly")
				.objectStore(this.name)
				.getKey(key);

			transaction.onsuccess = () => {
				if (transaction.result != null) {
					return resolve(true);
				} else {
					return resolve(false);
				}
			};

			transaction.onerror = () => {
				reject(
					new ObjectStoreInsertError(
						"Could not fetch count from database",
						transaction.error,
					),
				);
			};
		});
	}

	public updateDbConnection(db: IDBDatabase): void {
		this.db = db;
	}

	public addIndex<
		N extends string,
		K extends keyof T,
		I = { path: K; opts: { unique: false } },
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
