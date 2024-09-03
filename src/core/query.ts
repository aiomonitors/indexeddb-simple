import {
	ExtractBooleanShape,
	KindaPartial,
	SelectFrom,
} from "../types/index.js";
import z from "zod";
import { DatabaseQuery } from "../types/object-store.js";

export class Query<
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
