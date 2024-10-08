export type KeyPathHelper<T extends Record<string, unknown>> = {
	[Key in keyof T]: T[Key] extends IDBValidKey
		? Key extends string
			? Key
			: never
		: never;
}[keyof T];

export type KeyPathIsPrimitive<T extends Record<string, unknown>> = {
	[Key in keyof T]: T[Key] extends string | number
		? Key extends string
			? Key
			: never
		: never;
}[keyof T];

export type KindaPartial<
	T extends Record<string, unknown>,
	TNew extends Record<string, unknown>,
> = {
	[Key in keyof TNew]: Key extends keyof T ? NonNullable<T[Key]> : never;
};

export type ExtractBooleanShape<T extends Record<string, unknown>> = {
	[Key in keyof T]?: NonNullable<T[Key]> extends Record<string, unknown>
		? ExtractBooleanShape<NonNullable<T[Key]>>
		: boolean;
};

export type SelectFrom<
	T extends Record<string, unknown>,
	SelectedShape extends ExtractBooleanShape<T>,
> = {
	[Key in keyof SelectedShape]: Key extends keyof T
		? T[Key] extends Record<string, unknown>
			? SelectedShape[Key] extends ExtractBooleanShape<T[Key]>
				? SelectFrom<T[Key], SelectedShape[Key]>
				: never
			: T[Key]
		: never;
};

export type Equals<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;

type Expect<T extends true> = T;

/* Tests */
type KindaPartialBlah = Expect<
	Equals<
		KindaPartial<{ name: string; email: string }, { name: string }>,
		{ name: string }
	>
>;
type KindaPartialTest2 = Expect<
	Equals<
		KindaPartial<{ name?: string; email: string }, { name: string }>,
		{ name: string }
	>
>;
type KindaPartialTest3 = Expect<
	// @ts-expect-error Failed test
	Equals<
		KindaPartial<{ name?: number; email: string }, { name: string }>,
		{ name: string }
	>
>;

type ExtractBooleanShapeTest = Expect<
	Equals<
		ExtractBooleanShape<{ name: string; email: string }>,
		{ name?: boolean; email?: boolean }
	>
>;

type ExtractBooleanShapeTest2 = Expect<
	Equals<
		ExtractBooleanShape<{
			name: string;
			email: string;
			details: { createdAt: string };
		}>,
		{ name?: boolean; email?: boolean; details?: { createdAt?: boolean } }
	>
>;

type SelectFromTest = Expect<
	Equals<
		SelectFrom<
			{
				name: string;
				email: string;
				details: { createdAt: string };
			},
			{ name: true }
		>,
		{ name: string }
	>
>;
