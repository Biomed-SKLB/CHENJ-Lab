import { byId, createContentRow, renderEmptyState, setBusy, showToast } from "./utils.js";
import { getSession, isConfigured, signIn, signOut, verifyAdmin } from "./auth.js";
import { createDatabase } from "./database.js";
import { loadBaseMembers, mergeMembers } from "./members.js";
import { normalizeAnnouncement } from "./announcements.js";
import { createMemberEditor } from "./member-editor.js";
import { createAnnouncementEditor } from "./announcement-editor.js";

const config = window.CHENJ_LAB_CONFIG || {};
const state = {};

async function refresh() {
    state.members = mergeMembers(await loadBaseMembers(), await state.db.members.listOverrides());
    state.announcements = (await state.db.announcements.list()).map(normalizeAnnouncement);
    renderMembers();
    renderAnnouncements();
}

function renderMembers() {
    const box = byId("members-list");
    if (!state.members.length) return renderEmptyState(box, "暂无成员");
    box.replaceChildren(...state.members.map((item) => createContentRow({
        title: item.name,
        meta: item.position || "",
        onAction: () => state.memberEditor.open(item)
    })));
}

function renderAnnouncements() {
    const box = byId("announcements-list");
    if (!state.announcements.length) return renderEmptyState(box, "暂无公告");
    box.replaceChildren(...state.announcements.map((item) => createContentRow({
        title: item.title,
        meta: item.publishedLabel,
        onAction: () => state.announcementEditor.open(item)
    })));
}

function bindLogin() {
    byId("login-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        setBusy(event.currentTarget, true);
        try {
            await signIn(state.client, byId("login-email").value, byId("login-password").value);
            location.reload();
        } catch (error) {
            byId("login-error").textContent = error.message;
        } finally {
            setBusy(event.currentTarget, false);
        }
    });
}

async function init() {
    bindLogin();
    if (!isConfigured(config)) return (byId("setup-panel").hidden = false);
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const user = await getSession(state.client);
    if (!user) return (byId("login-panel").hidden = false);
    await verifyAdmin(state.client, user);
    state.user = user;
    state.db = createDatabase(state.client);
    state.memberEditor = createMemberEditor({ client: state.client, db: state.db, config, user, onChanged: refresh });
    state.announcementEditor = createAnnouncementEditor({ client: state.client, db: state.db, config, user, onChanged: refresh });
    byId("admin-panel").hidden = false;
    byId("admin-identity").hidden = false;
    byId("admin-identity").textContent = user.email;
    byId("sign-out").hidden = false;
    byId("sign-out").onclick = async () => { await signOut(state.client); location.reload(); };
    byId("new-member").onclick = () => state.memberEditor.open();
    byId("new-announcement").onclick = () => state.announcementEditor.open();
    await refresh();
}

init().catch((error) => showToast(error.message, true));
