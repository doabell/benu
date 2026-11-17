import { mkdir, writeFile } from "node:fs/promises";
import { menuPolicy } from "../src/lib/menu/policy";
import { readAppConfig } from "./config";

const app = await readAppConfig();
await mkdir(".wrangler", { recursive: true });
await writeFile(
    ".wrangler/refresh.json",
    JSON.stringify(
        {
            $schema: "../node_modules/wrangler/config-schema.json",
            name: `${app.name}-refresh`,
            main: "../src/refresh-worker.ts",
            compatibility_date: app.compatibility_date,
            kv_namespaces: app.kv_namespaces,
            triggers: { crons: [menuPolicy.cron] },
            workers_dev: false,
            preview_urls: false
        },
        null,
        4
    ) + "\n"
);
