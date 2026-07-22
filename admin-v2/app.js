import { byId, showToast, createContentRow, renderEmptyState } from "./utils.js";
import { verifyAdmin, getSession, signIn, signOut } from "./auth.js";
import { createDatabase } from "./database.js";
import { loadBaseMembers, mergeMembers } from "./members.js";
import { normalizeAnnouncement } from "./announcements.js";

const config = window.CHENJ_LAB_CONFIG || {};
let state = {};

async function init() {
    const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    state.client = client;
    const user = await getSession(client);
    if (!user) {
        byId("login-panel").hidden = false;
        byId("login-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await signIn(client, byId("login-email").value, byId("login-password").value);
                location.reload();
            } catch (error) { showToast(error.message, true); }
        });
        return;
    }

    await verifyAdmin(client, user);
    state.user = user;
    state.db = createDatabase(client);
    state.members = mergeMembers(await loadBaseMembers(), await state.db.members.listOverrides());
    state.announcements = (await state.db.announcements.list()).map(normalizeAnnouncement);

    byId("admin-panel").hidden = false;
    byId("admin-identity").hidden = false;
    byId("admin-identity").textContent = user.email;
    byId("sign-out").hidden = false;
    byId("sign-out").onclick = async () => { await signOut(client); location.reload(); };

    renderMembers(state.members);
    renderAnnouncements(state.announcements);
}

function renderMembers(items) {
    const box = byId("members-list");
    if (!items.length) return renderEmptyState(box, "暂无成员记录");
    box.replaceChildren(...items.map((item) => createContentRow({
        title: item.name || "未命名成员",
        meta: item.position || "",
        onAction: () => showToast("成员编辑器接口已准备")
    })));
}

function renderAnnouncements(items) {
    const box = byId("announcements-list");
    if (!items.length) return renderEmptyState(box, "暂无公告");
    box.replaceChildren(...items.map((item) => createContentRow({
        title: item.title,
        meta: item.publishedLabel || "",
        onAction: () => showToast("公告编辑器接口已准备")
    })));
}

init().catch((error) => showToast(error.message, true));
