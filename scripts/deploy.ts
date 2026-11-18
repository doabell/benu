import { spawnSync } from "node:child_process";
import { readAppConfig } from "./config";

function run(args: string[]): void {
    const result = spawnSync(process.execPath, ["run", ...args], {
        stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

// Deploy the app first: Wrangler provisions KV and writes its ID back to the
// config. Regenerate the refresh config so both Workers share that namespace.
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--dry-run"))
    throw new Error("Only --dry-run is supported by this deploy script");
const dryRun = args.includes("--dry-run");
run(["wrangler", "deploy", "--env", "", ...args]);
const config = await readAppConfig();
if (
    !dryRun &&
    !config.kv_namespaces?.find(
        (binding: { binding: string; id?: string }) =>
            binding.binding === "MENU_SNAPSHOTS" && binding.id
    )
) {
    throw new Error(
        "Set the provisioned MENU_SNAPSHOTS namespace ID in wrangler.jsonc before deploying the refresh Worker."
    );
}
run(["deploy:refresh", ...args]);
