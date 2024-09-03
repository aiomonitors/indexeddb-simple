import z from "zod";
import { ExtractBooleanShape, SelectFrom } from "../types/index.js";
import { DatabaseObjectStore } from "../types/object-store.js";
import { Query } from "./query.js";

const isIndex = (obj: unknown): obj is { path: string } =>
	obj !== undefined &&
	obj !== null &&
	typeof obj === "object" &&
	"path" in obj &&
	typeof obj.path === "string";

export class ObjectStore<
	T extends Record<string, unknown>,
	Key extends Readonly<string>,
	Indexes = object,
> implements DatabaseObjectStore<T, Key, Indexes>
{
	schema: z.Schema<T>;
	name: string;
	readonly keyPath: Key;
	private indexes: Indexes;

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

	create(db: IDBDatabase): Promise<void> {
		const objStore = db.createObjectStore(this.name, { keyPath: this.keyPath });
		for (const key in this.indexes) {
			if (isIndex(this.indexes[key])) {
				objStore.createIndex(key, this.indexes[key].path);
			}
		}
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
