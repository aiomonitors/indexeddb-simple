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

class Query<
	T extends Record<string, unknown>,
	K extends ExtractBooleanShape<T>,
	R = unknown,
> implements DatabaseQuery<T, K, R>
{
	schema: z.Schema<T>;
	queryShape: K;

	constructor(schema: z.Schema<T>, queryShape: K) {
		this.schema = schema;
		this.queryShape = queryShape;
	}

	private extractShapeSafe<
		Raw extends T,
		Target extends ExtractBooleanShape<T>,
	>(obj: Raw, shape: Target) {
		return Object.keys(obj).reduce(
			(raw, key) => {
				const val = obj[key];
				const shapeVal = shape[key];

				const valType = ["string", "boolean", "number"];

				if (shapeVal && valType.includes(typeof val)) {
					// @ts-expect-error Test
					raw[key] = val;
				}

				if (shapeVal && typeof val === "object") {
					// @ts-expect-error Test
					raw[key] = this.extractShapeSafe(val, shapeVal);
				}
				return raw;
			},
			{} as SelectFrom<T, Target>,
		);
	}

	public extractShape<Raw extends Record<string, unknown>>(obj: Raw) {
		const parsed = this.schema.safeParse(obj);
		if (parsed.success) {
			console.log(parsed.data);
			return this.extractShapeSafe(parsed.data, this.queryShape);
		}

		throw new Error("Could not parse");
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

const schema = z.object({
	name: z.string().optional(),
	id: z.string(),
	email: z.string(),
	meta: z.object({
		createdAt: z.string(),
		updatedAt: z.string(),
	}),
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
console.log(value);
