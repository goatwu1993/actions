import { z } from "zod";

// xml2js emits a single object for one child and an array for multiple children.
function xmlArray<T extends z.ZodType>(schema: T) {
  return z.union([z.array(schema), schema]).optional().transform(
    (value): z.output<T>[] => value === undefined ? [] : Array.isArray(value) ? value : [value],
  );
}

// Empty XML containers are emitted as an empty string.
function xmlContainer<T extends z.ZodRawShape>(shape: T) {
  return z.preprocess((value) => typeof value === "string" && value.trim() === "" ? {} : value, z.object(shape));
}

const rateSchema = z.string().trim().min(1).pipe(z.coerce.number<string>().min(0).max(1));
const countSchema = z.string().regex(/^\d+$/).pipe(z.coerce.number<string>().int().nonnegative());
const xmlRatesSchema = z.object({
  "line-rate": rateSchema,
  "branch-rate": rateSchema,
});
const xmlLineSchema = z.object({
  number: countSchema.pipe(z.number().positive()),
  hits: countSchema,
});
const xmlClassSchema = xmlRatesSchema.extend({
  filename: z.string(),
  name: z.string(),
  lines: xmlContainer({ line: xmlArray(xmlLineSchema) }).optional(),
});
const xmlPackageShape = {
  name: z.string().optional(),
  "line-rate": rateSchema.optional(),
  "branch-rate": rateSchema.optional(),
  classes: xmlContainer({ class: xmlArray(xmlClassSchema) }).optional(),
  class: xmlArray(xmlClassSchema),
};
const xmlPackageSchema = xmlContainer(xmlPackageShape);

export const coberturaDocumentSchema = z.object({
  coverage: xmlRatesSchema.extend({
    packages: xmlContainer({
      ...xmlPackageShape,
      package: xmlArray(xmlPackageSchema),
    }),
  }),
});

// Other webhook fields are ignored; only fields consumed by this action are parsed.
export const actionPayloadSchema = z.object({
  pull_request: z.object({
    number: z.number().int().positive(),
    head: z.object({ sha: z.string().min(1) }),
  }).optional(),
  workflow_run: z.object({
    head_commit: z.object({ id: z.string().min(1) }).nullable(),
  }).optional(),
  after: z.string().min(1).optional(),
});

export type ActionPayload = z.infer<typeof actionPayloadSchema>;
export type XmlRates = z.infer<typeof xmlRatesSchema>;
export type XmlClass = z.infer<typeof xmlClassSchema>;
export type XmlPackage = z.infer<typeof xmlPackageSchema>;
export type XmlPackages = z.infer<typeof coberturaDocumentSchema>["coverage"]["packages"];

export const booleanInputSchema = z.enum(["true", "false"]).transform((value) => value === "true");
export const integerInputSchema = z.string().regex(/^-?\d+$/).pipe(z.coerce.number<string>().int());
export const minimumCoverageInputSchema = integerInputSchema.pipe(z.number().min(0).max(100));
export const pullRequestNumberInputSchema = integerInputSchema.pipe(z.number().positive());
