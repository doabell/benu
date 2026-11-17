/// <reference types="@cloudflare/workers-types" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
    namespace App {
        interface Platform {
            env: { MENU_SNAPSHOTS: KVNamespace };
            context: ExecutionContext;
        }
    }
}

export {};
