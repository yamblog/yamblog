/**
 * Converts the zod 3 schemas yamblog uses into what Astro 6+ expects from a
 * loader's `createSchema()`: a schema built with Astro's own zod (v4, from
 * `astro/zod`) and a TypeScript source for the entry type.
 *
 * Only the zod 3 types that make sense for frontmatter are mapped. Anything
 * else becomes `unknown` / `z.any()`, which keeps the collection loading and
 * only loosens the type of that one field.
 */

type AnyDef = { typeName?: string; [key: string]: unknown };
type AnySchema = { _def?: AnyDef; shape?: unknown };

// The subset of the zod v4 API used here. Typed loosely on purpose: it is
// whatever `astro/zod` exports at runtime.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type LoaderZod = {
  string(): any;
  number(): any;
  boolean(): any;
  bigint(): any;
  date(): any;
  null(): any;
  any(): any;
  unknown(): any;
  coerce: { date(): any; number(): any; string(): any; boolean(): any };
  array(item: any): any;
  object(shape: Record<string, any>): any;
  enum(values: readonly string[]): any;
  literal(value: unknown): any;
  union(options: any[]): any;
  record(key: any, value: any): any;
  tuple(items: any[]): any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function defOf(schema: unknown): AnyDef {
  return ((schema as AnySchema | null)?._def ?? {}) as AnyDef;
}

function shapeOf(schema: unknown): Record<string, unknown> {
  const def = defOf(schema);
  const shape = typeof def.shape === 'function' ? (def.shape as () => unknown)() : (schema as AnySchema).shape;
  return (shape && typeof shape === 'object' ? shape : {}) as Record<string, unknown>;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function propKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

/** True when the field may be absent from the parsed output. */
function isOptional(schema: unknown): boolean {
  const def = defOf(schema);
  if (def.typeName === 'ZodOptional') return true;
  if (def.typeName === 'ZodNullable' || def.typeName === 'ZodReadonly' || def.typeName === 'ZodBranded') {
    return isOptional(def.innerType ?? def.type);
  }
  return false;
}

/** TypeScript source for the *output* type of a zod 3 schema. */
export function toTypeScript(schema: unknown): string {
  const def = defOf(schema);
  switch (def.typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodBigInt':
      return 'bigint';
    case 'ZodDate':
      return 'Date';
    case 'ZodNull':
      return 'null';
    case 'ZodUndefined':
      return 'undefined';
    case 'ZodLiteral':
      return def.value === undefined ? 'undefined' : JSON.stringify(def.value);
    case 'ZodEnum':
      return (def.values as string[]).map((v) => JSON.stringify(v)).join(' | ') || 'never';
    case 'ZodArray':
      return `Array<${toTypeScript(def.type)}>`;
    case 'ZodTuple':
      return `[${(def.items as unknown[]).map(toTypeScript).join(', ')}]`;
    case 'ZodOptional':
      return `${toTypeScript(def.innerType)} | undefined`;
    case 'ZodNullable':
      return `${toTypeScript(def.innerType)} | null`;
    case 'ZodDefault':
    case 'ZodCatch':
    case 'ZodReadonly':
      return toTypeScript(def.innerType);
    case 'ZodBranded':
      return toTypeScript(def.type);
    case 'ZodPipeline':
      return toTypeScript(def.out);
    case 'ZodEffects': {
      const effect = def.effect as { type?: string } | undefined;
      return effect?.type === 'transform' ? 'unknown' : toTypeScript(def.schema);
    }
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      const options = Array.isArray(def.options) ? def.options : Array.from((def.options as Map<unknown, unknown>).values());
      return options.map((o) => `(${toTypeScript(o)})`).join(' | ') || 'never';
    }
    case 'ZodRecord':
      return `Record<string, ${toTypeScript(def.valueType)}>`;
    case 'ZodObject': {
      const fields = Object.entries(shapeOf(schema)).map(
        ([key, value]) => `${propKey(key)}${isOptional(value) ? '?' : ''}: ${toTypeScript(value)}`,
      );
      return fields.length ? `{ ${fields.join('; ')} }` : 'Record<string, never>';
    }
    default:
      return 'unknown';
  }
}

/**
 * Rebuilds a zod 3 schema with another zod instance (Astro's zod v4).
 * Defaults, optionality and nullability are kept; refinements and
 * transforms are dropped (the loader stores already-parsed data).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function toLoaderSchema(schema: unknown, z: LoaderZod): any {
  const def = defOf(schema);
  switch (def.typeName) {
    case 'ZodString':
      return def.coerce ? z.coerce.string() : z.string();
    case 'ZodNumber':
      return def.coerce ? z.coerce.number() : z.number();
    case 'ZodBoolean':
      return def.coerce ? z.coerce.boolean() : z.boolean();
    case 'ZodBigInt':
      return z.bigint();
    case 'ZodDate':
      return def.coerce ? z.coerce.date() : z.date();
    case 'ZodNull':
      return z.null();
    case 'ZodLiteral':
      return z.literal(def.value);
    case 'ZodEnum':
      return z.enum(def.values as string[]);
    case 'ZodArray':
      return z.array(toLoaderSchema(def.type, z));
    case 'ZodTuple':
      return z.tuple((def.items as unknown[]).map((item) => toLoaderSchema(item, z)));
    case 'ZodOptional':
      return toLoaderSchema(def.innerType, z).optional();
    case 'ZodNullable':
      return toLoaderSchema(def.innerType, z).nullable();
    case 'ZodDefault':
      return toLoaderSchema(def.innerType, z).default(def.defaultValue as () => unknown);
    case 'ZodCatch':
    case 'ZodReadonly':
      return toLoaderSchema(def.innerType, z);
    case 'ZodBranded':
      return toLoaderSchema(def.type, z);
    case 'ZodPipeline':
      return toLoaderSchema(def.out, z);
    case 'ZodEffects': {
      const effect = def.effect as { type?: string } | undefined;
      return effect?.type === 'transform' ? z.any() : toLoaderSchema(def.schema, z);
    }
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      const options = Array.isArray(def.options) ? def.options : Array.from((def.options as Map<unknown, unknown>).values());
      const mapped = options.map((o) => toLoaderSchema(o, z));
      return mapped.length >= 2 ? z.union(mapped) : (mapped[0] ?? z.any());
    }
    case 'ZodRecord':
      return z.record(z.string(), toLoaderSchema(def.valueType, z));
    case 'ZodObject': {
      const shape: Record<string, any> = {};
      for (const [key, value] of Object.entries(shapeOf(schema))) shape[key] = toLoaderSchema(value, z);
      return z.object(shape);
    }
    default:
      return z.any();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
