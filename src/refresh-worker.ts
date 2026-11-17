import { refreshMenus } from "./lib/server/refresh";

export default {
    async scheduled(
        controller: ScheduledController,
        env: { MENU_SNAPSHOTS: KVNamespace }
    ): Promise<void> {
        await refreshMenus(
            env.MENU_SNAPSHOTS,
            new Date(controller.scheduledTime)
        );
    }
};
