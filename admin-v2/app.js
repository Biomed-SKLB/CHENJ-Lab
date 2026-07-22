import { byId, showToast } from "./utils.js";
import { verifyAdmin, getSession } from "./auth.js";
import { createDatabase } from "./database.js";

const config = window.CHENJ_LAB_CONFIG || {};

async function init() {
    const client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey
    );

    const user = await getSession(client);
    if (!user) {
        byId("login-panel").hidden = false;
        return;
    }

    await verifyAdmin(client, user);
    const db = createDatabase(client);

    const [members, announcements] = await Promise.all([
        db.members.listOverrides(),
        db.announcements.list()
    ]);

    byId("admin-panel").hidden = false;
    byId("admin-identity").hidden = false;
    byId("admin-identity").textContent = user.email;

    byId("members-list").textContent = `${members.data?.length || 0} 条成员覆盖记录`;
    byId("announcements-list").textContent = `${announcements.data?.length || 0} 条公告记录`;
}

init().catch((error) => showToast(error.message, true));
