import { DatabaseMigrationHandler } from "../types/object-store.js";

export class DBMigrationHandler implements DatabaseMigrationHandler {
	public version: number;
	private handler: (db: IDBDatabase) => Promise<void>;

	constructor(version: number, handler: (db: IDBDatabase) => Promise<void>) {
		this.version = version;
		this.handler = handler;
	}

	public handle(db: IDBDatabase): Promise<void> {
		return this.handler(db);
	}
}
