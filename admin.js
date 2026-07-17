(function () {
    "use strict";

    const config = window.CHENJ_LAB_CONFIG || {};
    const state = {
        client: null,
        user: null,
        baseMembers: [],
        overrides: [],
        announcements: []
    };

    const byId = (id) => document.getElementById(id);

    function configured() {
        return Boolean(
            window.supabase &&
            config.supabaseUrl &&
            config.supabasePublishableKey
        );
    }

    function memberKey(name) {
        const englishName = String(name || "").split("|").pop();
        return englishName
            .normalize("NFKD")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function showToast(message, isError = false) {
        const toast = byId("toast");
        toast.textContent = message;
        toast.style.background = isError ? "#8f3333" : "";
        toast.hidden = false;
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3600);
    }

    function setBusy(form, busy) {
        form.querySelectorAll("button, input, select, textarea").forEach((control) => {
            control.disabled = busy;
        });
    }

    function localDateTimeValue(date = new Date()) {
        const offset = date.getTimezoneOffset() * 60_000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }

    async function loadBaseMembers() {
        const response = await fetch("members.html", { cache: "no-store" });
        if (!response.ok) throw new Error("无法读取现有成员页面。");
        const html = await response.text();
        const page = new DOMParser().parseFromString(html, "text/html");
        const members = [];

        page.querySelectorAll(".member-category").forEach((category) => {
            const categoryName = category
                .querySelector(".member-category-title")
                ?.textContent.trim();

            Array.from(category.querySelectorAll(":scope > .team-member")).forEach(
                (card, index) => {
                    const name = card.querySelector("h3")?.textContent.trim() || "";
                    members.push({
                        id: null,
                        base_member_key: memberKey(name),
                        name,
                        position: card.querySelector(".position")?.textContent.trim() || "",
                        research: card.querySelector(".research")?.textContent.trim() || "",
                        bio: card.querySelector(".bio")?.textContent.trim() || "",
                        image_url: card.querySelector("img")?.getAttribute("src") || "",
                        category: categoryName || "Current Members",
                        sort_order: index,
                        is_visible: true,
                        is_baseline: true
                    });
                }
            );
        });

        state.baseMembers = members;
    }

    async function verifyAdmin(user) {
        const { data, error } = await state.client
            .from("site_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error || !data) {
            await state.client.auth.signOut();
            throw new Error("这个账号尚未被授权为网站管理员。");
        }
    }

    async function loadManagedData() {
        const [memberResult, announcementResult] = await Promise.all([
            state.client
                .from("member_overrides")
                .select("*")
                .order("sort_order", { ascending: true }),
            state.client
                .from("announcements")
                .select("*")
                .order("published_at", { ascending: false })
        ]);

        if (memberResult.error) throw memberResult.error;
        if (announcementResult.error) throw announcementResult.error;
        state.overrides = memberResult.data || [];
        state.announcements = announcementResult.data || [];
    }

    function effectiveMembers() {
        const overridesByKey = new Map(
            state.overrides
                .filter((item) => item.base_member_key)
                .map((item) => [item.base_member_key, item])
        );

        const baseline = state.baseMembers.map((member) => {
            const override = overridesByKey.get(member.base_member_key);
            if (!override) return member;
            return {
                ...member,
                ...Object.fromEntries(
                    Object.entries(override).filter(([, value]) => value !== null)
                ),
                id: override.id,
                is_baseline: true
            };
        });

        const added = state.overrides
            .filter((item) => !item.base_member_key)
            .map((item) => ({ ...item, is_baseline: false }));

        return [...baseline, ...added].sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return Number(a.sort_order) - Number(b.sort_order);
        });
    }

    function contentRow(title, meta, status, actionLabel, onAction) {
        const row = document.createElement("div");
        row.className = "content-row";

        const titleNode = document.createElement("div");
        titleNode.className = "content-row-title";
        titleNode.textContent = title;

        const metaNode = document.createElement("div");
        metaNode.className = "content-row-meta";
        metaNode.textContent = meta;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-secondary";
        button.textContent = actionLabel;
        button.addEventListener("click", onAction);

        const statusNode = document.createElement("span");
        statusNode.className = `status-pill${status.active ? "" : " is-muted"}`;
        statusNode.textContent = status.label;
        metaNode.append(" · ", statusNode);

        row.append(titleNode, metaNode, button);
        return row;
    }

    function renderMembers() {
        const list = byId("members-list");
        list.replaceChildren();
        const members = effectiveMembers();

        members.forEach((member) => {
            list.appendChild(
                contentRow(
                    member.name,
                    `${member.category} · ${member.position || "未填写职位"}`,
                    {
                        active: member.is_visible !== false,
                        label: member.is_visible === false ? "已隐藏" : "公开"
                    },
                    "编辑",
                    () => openMember(member)
                )
            );
        });
    }

    function renderAnnouncements() {
        const list = byId("announcements-list");
        list.replaceChildren();

        if (!state.announcements.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "还没有通过管理后台创建的公告。";
            list.appendChild(empty);
            return;
        }

        state.announcements.forEach((announcement) => {
            const date = new Date(announcement.published_at).toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
            list.appendChild(
                contentRow(
                    announcement.title,
                    date,
                    {
                        active: announcement.status === "published",
                        label: announcement.status === "published" ? "已发布" : "草稿"
                    },
                    "编辑",
                    () => openAnnouncement(announcement)
                )
            );
        });
    }

    function baselineFor(key) {
        return state.baseMembers.find((member) => member.base_member_key === key);
    }

    function openMember(member = null) {
        byId("member-form").reset();
        byId("member-form-title").textContent = member ? "编辑成员" : "新增成员";
        byId("member-id").value = member?.id || "";
        byId("member-base-key").value = member?.base_member_key || "";
        byId("member-name").value = member?.name || "";
        byId("member-position").value = member?.position || "";
        byId("member-category").value = member?.category || "Current Members";
        byId("member-research").value = member?.research || "";
        byId("member-bio").value = member?.bio || "";
        byId("member-image-url").value = member?.image_url || "";
        byId("member-sort-order").value = member?.sort_order ?? 100;
        byId("member-visible").checked = member?.is_visible !== false;
        byId("member-dialog").showModal();
    }

    function openAnnouncement(announcement = null) {
        byId("announcement-form").reset();
        byId("announcement-form-title").textContent = announcement ? "编辑公告" : "发布公告";
        byId("announcement-id").value = announcement?.id || "";
        byId("announcement-title").value = announcement?.title || "";
        byId("announcement-summary").value = announcement?.summary || "";
        byId("announcement-body").value = announcement?.body || "";
        byId("announcement-image-url").value = announcement?.image_url || "";
        byId("announcement-published-at").value = announcement
            ? localDateTimeValue(new Date(announcement.published_at))
            : localDateTimeValue();
        byId("announcement-status").value = announcement?.status || "draft";
        byId("delete-announcement").hidden = !announcement;
        byId("announcement-dialog").showModal();
    }

    async function uploadImage(file, area) {
        if (!file) return null;
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeArea = String(area).replace(/[^a-z0-9-]/gi, "-");
        const path = `${state.user.id}/${safeArea}-${Date.now()}.${extension}`;
        const { error } = await state.client.storage
            .from(config.mediaBucket || "chenj-lab-media")
            .upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        return state.client.storage
            .from(config.mediaBucket || "chenj-lab-media")
            .getPublicUrl(path).data.publicUrl;
    }

    function nullableOverride(value, baselineValue) {
        const normalizedValue = value === "" ? "" : value;
        return normalizedValue === (baselineValue ?? "") ? null : normalizedValue;
    }

    async function saveMember(event) {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(form, true);
        try {
            const id = byId("member-id").value || null;
            const baseKey = byId("member-base-key").value || null;
            const baseline = baseKey ? baselineFor(baseKey) : null;
            const uploadedUrl = await uploadImage(
                byId("member-image-file").files[0],
                baseKey || memberKey(byId("member-name").value)
            );
            const imageUrl = uploadedUrl || byId("member-image-url").value.trim();

            const current = {
                name: byId("member-name").value.trim(),
                position: byId("member-position").value.trim(),
                research: byId("member-research").value.trim(),
                bio: byId("member-bio").value.trim(),
                image_url: imageUrl,
                category: byId("member-category").value,
                sort_order: Number(byId("member-sort-order").value || 0),
                is_visible: byId("member-visible").checked
            };

            let payload;
            if (baseline) {
                payload = {
                    ...(id ? { id } : {}),
                    base_member_key: baseKey,
                    name: nullableOverride(current.name, baseline.name),
                    position: nullableOverride(current.position, baseline.position),
                    research: nullableOverride(current.research, baseline.research),
                    bio: nullableOverride(current.bio, baseline.bio),
                    image_url: nullableOverride(current.image_url, baseline.image_url),
                    category: current.category === baseline.category ? null : current.category,
                    sort_order:
                        current.sort_order === Number(baseline.sort_order)
                            ? null
                            : current.sort_order,
                    is_visible: current.is_visible
                };
            } else {
                payload = {
                    ...(id ? { id } : {}),
                    base_member_key: null,
                    ...current
                };
            }

            const query = id
                ? state.client.from("member_overrides").update(payload).eq("id", id)
                : state.client.from("member_overrides").insert(payload);
            const { error } = await query;
            if (error) throw error;

            byId("member-dialog").close();
            await loadManagedData();
            renderMembers();
            renderAnnouncements();
            showToast("成员信息已保存。");
        } catch (error) {
            showToast(error.message || "保存失败，请稍后重试。", true);
        } finally {
            setBusy(form, false);
        }
    }

    async function saveAnnouncement(event) {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(form, true);
        try {
            const id = byId("announcement-id").value || null;
            const uploadedUrl = await uploadImage(
                byId("announcement-image-file").files[0],
                "announcement"
            );
            const payload = {
                ...(id ? { id } : {}),
                title: byId("announcement-title").value.trim(),
                summary: byId("announcement-summary").value.trim() || null,
                body: byId("announcement-body").value.trim() || null,
                image_url:
                    uploadedUrl || byId("announcement-image-url").value.trim() || null,
                published_at: new Date(byId("announcement-published-at").value).toISOString(),
                status: byId("announcement-status").value,
                created_by: state.user.id
            };
            const { error } = await state.client.from("announcements").upsert(payload);
            if (error) throw error;

            byId("announcement-dialog").close();
            await loadManagedData();
            renderAnnouncements();
            showToast(payload.status === "published" ? "公告已发布。" : "草稿已保存。");
        } catch (error) {
            showToast(error.message || "保存失败，请稍后重试。", true);
        } finally {
            setBusy(form, false);
        }
    }

    async function deleteAnnouncement() {
        const id = byId("announcement-id").value;
        if (!id || !window.confirm("确定删除这条公告吗？此操作无法撤销。")) return;
        const { error } = await state.client.from("announcements").delete().eq("id", id);
        if (error) {
            showToast(error.message || "删除失败。", true);
            return;
        }
        byId("announcement-dialog").close();
        await loadManagedData();
        renderAnnouncements();
        showToast("公告已删除。");
    }

    function showAuthenticated(user) {
        state.user = user;
        byId("login-panel").hidden = true;
        byId("admin-panel").hidden = false;
        byId("sign-out").hidden = false;
        byId("admin-identity").hidden = false;
        byId("admin-identity").textContent = user.email || "管理员";
        renderMembers();
        renderAnnouncements();
    }

    async function authenticate(user) {
        await verifyAdmin(user);
        await Promise.all([loadBaseMembers(), loadManagedData()]);
        showAuthenticated(user);
    }

    async function handleLogin(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const errorNode = byId("login-error");
        errorNode.textContent = "";
        setBusy(form, true);
        try {
            const { data, error } = await state.client.auth.signInWithPassword({
                email: byId("login-email").value.trim(),
                password: byId("login-password").value
            });
            if (error) throw error;
            await authenticate(data.user);
        } catch (error) {
            errorNode.textContent = error.message || "登录失败，请检查邮箱和密码。";
        } finally {
            setBusy(form, false);
        }
    }

    function bindEvents() {
        byId("login-form").addEventListener("submit", handleLogin);
        byId("member-form").addEventListener("submit", saveMember);
        byId("announcement-form").addEventListener("submit", saveAnnouncement);
        byId("delete-announcement").addEventListener("click", deleteAnnouncement);
        byId("new-member").addEventListener("click", () => openMember());
        byId("new-announcement").addEventListener("click", () => openAnnouncement());
        byId("sign-out").addEventListener("click", async () => {
            await state.client.auth.signOut();
            window.location.reload();
        });

        document.querySelectorAll("[data-close-dialog]").forEach((button) => {
            button.addEventListener("click", () => {
                byId(button.dataset.closeDialog).close();
            });
        });

        document.querySelectorAll(".tab-button").forEach((button) => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".tab-button").forEach((item) => {
                    item.classList.toggle("is-active", item === button);
                });
                byId("members-tab").hidden = button.dataset.tab !== "members";
                byId("announcements-tab").hidden = button.dataset.tab !== "announcements";
            });
        });
    }

    async function init() {
        bindEvents();
        if (!configured()) {
            byId("setup-panel").hidden = false;
            return;
        }

        state.client = window.supabase.createClient(
            config.supabaseUrl,
            config.supabasePublishableKey
        );
        const { data } = await state.client.auth.getSession();
        if (!data.session?.user) {
            byId("login-panel").hidden = false;
            return;
        }

        try {
            await authenticate(data.session.user);
        } catch (error) {
            byId("login-panel").hidden = false;
            byId("login-error").textContent = error.message;
        }
    }

    init().catch((error) => {
        byId("login-panel").hidden = false;
        byId("login-error").textContent = error.message || "管理后台初始化失败。";
    });
})();
