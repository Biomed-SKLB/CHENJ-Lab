import { byId, showToast, createContentRow, renderEmptyState } from "./utils.js";
import { verifyAdmin, getSession } from "./auth.js";
import { createDatabase } from "./database.js";

const config = window.CHENJ_LAB_CONFIG || {};

async function init() {
    const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const user = await getSession(client);
    if (!user) {
        byId("login-panel").hidden = false;
        return;
    }

    await verifyAdmin(client, user);
    const db = createDatabase(client);
    const members = await db.members.listOverrides();
    const announcements = await db.announcements.list();

    byId("admin-panel").hidden = false;
    byId("admin-identity").hidden = false;
    byId("admin-identity").textContent = user.email;

    renderMembers(members.data || []);
    renderAnnouncements(announcements.data || []);
}

function renderMembers(items) {
    const box = byId("members-list");
    if (!items.length) return renderEmptyState(box, "暂无成员记录");
    box.replaceChildren(...items.map((item) => createContentRow({
        title: item.name || "未命名成员",
        meta: item.position || "",
        status: { active: item.is_visible !== false, label: item.is_visible === false ? "隐藏" : "公开" },
        onAction: () => showToast("编辑功能将在下一阶段接入")
    })));
}

function renderAnnouncements(items) {
    const box = byId("announcements-list");
    if (!items.length) return renderEmptyState(box, "暂无公告");
    box.replaceChildren(...items.map((item) => createContentRow({
        title: item.title,
        meta: item.published_at,
        status: { active: item.status === "published", label: item.status },
        onAction: () => showToast("编辑功能将在下一阶段接入")
    })));
}

init().catch((error) => showToast(error.message, true));
