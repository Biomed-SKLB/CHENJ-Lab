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
    const [baseMembers, overrides, announcements] = await Promise.all([
        loadBaseMembers(),
        state.db.members.listOverrides(),
        state.db.announcements.list()
    ]);
    state.members = mergeMembers(baseMembers, overrides);
    state.announcements = announcements.map(normalizeAnnouncement);
    renderMembers();
    renderAnnouncements();
}

function renderMembers() {
    const box = byId("members-list");
    if (!state.members.length) return renderEmptyState(box, "暂无成员");
    box.replaceChildren(...state.members.map((item) => createContentRow({
        title: item.name || "未命名成员",
        meta: `${item.category || "未分组"} · ${item.position || "未填写职位"}`,
        status: {
            active: item.is_visible !== false,
            label: item.is_visible === false ? "已隐藏" : "公开"
        },
        onAction: () => state.memberEditor.open(item)
    })));
}

function renderAnnouncements() {
    const box = byId("announcements-list");
    if (!state.announcements.length) return renderEmptyState(box, "暂无公告");
    box.replaceChildren(...state.announcements.map((item) => createContentRow({
        title: item.title,
        meta: item.publishedLabel,
        status: {
            active: item.status === "published",
            label: item.status === "published" ? "已发布" : "草稿"
        },
        onAction: () => state.announcementEditor.open(item)
    })));
}

function bindLogin() {
    byId("login-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        setBusy(event.currentTarget, true);
        try {
            await signIn(state.client, byId("login-email").value.trim(), byId("login-password").value);
            location.reload();
        } catch (error) {
            byId("login-error").textContent = error.message || "登录失败。";
        } finally {
            setBusy(event.currentTarget, false);
        }
    });
}

function bindStaticUi() {
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", () => byId(button.dataset.closeDialog).close());
    });
    document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("is-active", item === button));
            byId("members-tab").hidden = button.dataset.tab !== "members";
            byId("announcements-tab").hidden = button.dataset.tab !== "announcements";
        });
    });
}

async function init() {
    bindStaticUi();
    bindLogin();
    if (!isConfigured(config)) {
        byId("setup-panel").hidden = false;
        return;
    }
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    const user = await getSession(state.client);
    if (!user) {
        byId("login-panel").hidden = false;
        return;
    }
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

init().catch((error) => showToast(error.message || "初始化失败。", true));
