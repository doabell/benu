import { readFile } from "node:fs/promises";
import { parse, type ParseError } from "jsonc-parser";
import { z } from "zod";

const schema = z.object({
    name: z.string().min(1),
    compatibility_date: z.string(),
    kv_namespaces: z.array(
        z.object({
            binding: z.string(),
            id: z.string().optional(),
            preview_id: z.string().optional(),
            remote: z.boolean().optional()
        })
    )
});

export async function readAppConfig() {
    const errors: ParseError[] = [];
    const value = parse(await readFile("wrangler.jsonc", "utf8"), errors);
    if (errors.length) throw new Error("Invalid wrangler.jsonc");
    return schema.parse(value);
}
