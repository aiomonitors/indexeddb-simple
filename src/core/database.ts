import {
	DatabaseMigrationHandler,
	DatabaseObjectStore,
	DatabaseObjectStoreRaw,
} from "../types/object-store.js";

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

export class DatabaseUpgradeError extends Error {
	constructor(message: string) {
		super(message, {});
	}
}

export class Database<T extends Record<string, DatabaseObjectStoreRaw>> {
	name: string;
	version: number;
	readonly objectStores: T;
	private handlers: DatabaseMigrationHandler[];

	constructor(
		name: string,
		version: number,
		objectStores: T,
		handlers: DatabaseMigrationHandler[],
	) {
		this.name = name;
		this.objectStores = objectStores;
		this.version = version;
		this.handlers = handlers;
	}

	public connect() {
		return new Promise<IDBDatabase>((resolve, reject) => {
			if (!indexedDB) {
				throw new Error("Indexed DB does not exist on the window");
			}

			const request = indexedDB.open(this.name, this.version);

			request.onerror = function () {
				reject(
					new DatabaseConnectionError(
						"Error encountered connecting to the database",
						request.error,
					),
				);
			};

			request.onsuccess = () => {
				const db = request.result;

				db.onversionchange = () => {
					db.close();
				};

				resolve(db);
			};

			request.onupgradeneeded = (event) => {
				if (
					this.handlers.filter((handler) => handler.version === this.version)
						.length === 0
				) {
					throw new DatabaseUpgradeError("DB Needs upgrade");
				}

				this.handlers.forEach((handler) => {
					if (handler.version === this.version) {
						handler.handle(request.result);
					}
				});
			};
		});
	}

	public exec<
		T extends Record<string, unknown>,
		Key extends Readonly<string>,
		Indexes extends object,
	>(store: DatabaseObjectStore<T, Key, Indexes>) {}
}
