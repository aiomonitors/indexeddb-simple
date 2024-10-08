import { z } from "zod";
import { ExtractBooleanShape, KindaPartial, SelectFrom } from "./index.js";

export interface DatabaseQuery<
	T extends Record<string, unknown>,
	K extends ExtractBooleanShape<T>,
	R = unknown,
> {
	schema: z.Schema<T>;
	queryShape: K;

	where<K extends Record<string, unknown>>(shape: KindaPartial<T, K>): R;
}

export interface DatabaseObjectStoreRaw {
	name: string;
	schema: z.Schema;
	keyPath: Readonly<string>;

	updateDbConnection(db: IDBDatabase): void;
}

export interface DatabaseObjectStore<
	T extends Record<string, unknown>,
	Key extends Readonly<string>,
	Indexes = object,
> {
	schema: z.Schema<T>;
	name: string;
	readonly keyPath: Key;

	addIndex<
		N extends string,
		K extends keyof T,
		I = { path: K; opts: { unique: false } },
	>(
		name: N extends keyof Indexes ? never : N,
		path: K extends Key ? never : K,
	): DatabaseObjectStore<T, Key, Indexes & Record<N, I>>;

	create(db: IDBDatabase): void;

	select<K extends ExtractBooleanShape<T>>(
		shape: K,
	): DatabaseQuery<T, K, SelectFrom<T, K>>;
}

export interface DatabaseMigrationHandler {
	version: number;

	handle(db: IDBDatabase): Promise<void>;
}
