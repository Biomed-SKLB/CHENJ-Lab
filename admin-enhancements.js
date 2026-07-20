(function () {
    "use strict";

    const config = window.CHENJ_LAB_CONFIG || {};
    const bucket = config.mediaBucket || "chenj-lab-media";
    const maxUploadBytes = 5 * 1024 * 1024;
    const allowedImageTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ]);
    const pendingReplacements = {
        member: null,
        announcement: null
    };

    const byId = (id) => document.getElementById(id);

    if (!window.supabase || !config.supabaseUrl || !config.supabasePublishableKey) {
        return;
    }

    const client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey
    );

    function showToast(message, isError = false) {
        const toast = byId("toast");
        if (!toast) return;
        toast.textContent = message;
        toast.style.background = isError ? "#8f3333" : "";
        toast.hidden = false;
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
            toast.hidden = true;
        }, 4200);
    }

    function validateImage(file) {
        if (!file) return;
        if (!allowedImageTypes.has(file.type)) {
            throw new Error("仅支持 JPG、PNG、WebP 或 GIF 图片。");
        }
        if (file.size > maxUploadBytes) {
            throw new Error("图片不能超过 5 MB，请压缩后重新上传。");
        }
    }

    function managedStoragePath(url) {
        if (!url) return null;
        const prefix = `${String(config.supabaseUrl).replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;
        if (!String(url).startsWith(prefix)) return null;
        try {
            return decodeURIComponent(String(url).slice(prefix.length));
        } catch (_) {
            return String(url).slice(prefix.length);
        }
    }

    async function removeManagedImage(url) {
        const path = managedStoragePath(url);
        if (!path) return;
        const { error } = await client.storage.from(bucket).remove([path]);
        if (error) console.warn("Unable to remove unused CHENJ-Lab image.", error);
    }

    async function requireSession() {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session?.user) throw new Error("登录状态已失效，请重新登录。");
        return data.session.user;
    }

    function addUploadHint(input) {
        if (!input || input.nextElementSibling?.classList.contains("upload-hint")) return;
        const hint = document.createElement("small");
        hint.className = "upload-hint";
        hint.textContent = "支持 JPG、PNG、WebP、GIF，单张不超过 5 MB。";
        hint.style.color = "#68756f";
        hint.style.fontWeight = "400";
        input.insertAdjacentElement("afterend", hint);
    }

    function bindImageValidation(input) {
        if (!input) return;
        addUploadHint(input);
        input.addEventListener("change", () => {
            try {
                validateImage(input.files[0]);
            } catch (error) {
                input.value = "";
                showToast(error.message, true);
            }
        });
    }

    function validateFormUpload(event, inputId, pendingKey, urlInputId) {
        const input = byId(inputId);
        try {
            validateImage(input?.files[0]);
        } catch (error) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (input) input.value = "";
            showToast(error.message, true);
            return;
        }

        pendingReplacements[pendingKey] = input?.files[0]
            ? byId(urlInputId)?.value.trim() || null
            : null;
    }

    function ensureDeleteMemberButton() {
        const form = byId("member-form");
        if (!form) return null;

        let button = byId("delete-member");
        if (!button) {
            button = document.createElement("button");
            button.id = "delete-member";
            button.type = "button";
            button.className = "button button-danger";
            button.style.marginRight = "auto";
            form.querySelector(".dialog-actions")?.prepend(button);
            button.addEventListener("click", deleteMember);
        }
        return button;
    }

    function syncDeleteMemberButton() {
        const button = ensureDeleteMemberButton();
        if (!button) return;
        const id = byId("member-id")?.value;
        const isBaseline = Boolean(byId("member-base-key")?.value);
        button.hidden = !id;
        button.textContent = isBaseline ? "恢复原始资料" : "删除成员";
    }

    async function deleteMember() {
        const id = byId("member-id")?.value;
        if (!id) return;

        const isBaseline = Boolean(byId("member-base-key")?.value);
        const prompt = isBaseline
            ? "确定恢复为网站中的原始成员资料吗？后台修改和自定义图片将被移除。"
            : "确定删除这位新增成员吗？此操作无法撤销。";
        if (!window.confirm(prompt)) return;

        const button = byId("delete-member");
        button.disabled = true;
        try {
            await requireSession();
            const imageUrl = byId("member-image-url")?.value.trim() || "";
            const { error } = await client.from("member_overrides").delete().eq("id", id);
            if (error) throw error;
            await removeManagedImage(imageUrl);
            showToast(isBaseline ? "成员资料已恢复。" : "成员已删除。");
            window.setTimeout(() => window.location.reload(), 350);
        } catch (error) {
            showToast(error.message || "操作失败，请稍后重试。", true);
            button.disabled = false;
        }
    }

    async function deleteAnnouncement(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const id = byId("announcement-id")?.value;
        if (!id || !window.confirm("确定删除这条公告吗？此操作无法撤销。")) return;

        const button = byId("delete-announcement");
        button.disabled = true;
        try {
            await requireSession();
            const imageUrl = byId("announcement-image-url")?.value.trim() || "";
            const { error } = await client.from("announcements").delete().eq("id", id);
            if (error) throw error;
            await removeManagedImage(imageUrl);
            showToast("公告已删除。");
            window.setTimeout(() => window.location.reload(), 350);
        } catch (error) {
            showToast(error.message || "删除失败，请稍后重试。", true);
            button.disabled = false;
        }
    }

    function watchSuccessfulSaves() {
        const toast = byId("toast");
        if (!toast) return;

        const observer = new MutationObserver(() => {
            const message = toast.textContent.trim();
            if (message === "成员信息已保存。" && pendingReplacements.member) {
                removeManagedImage(pendingReplacements.member);
                pendingReplacements.member = null;
            }
            if ((message === "公告已发布。" || message === "草稿已保存。") && pendingReplacements.announcement) {
                removeManagedImage(pendingReplacements.announcement);
                pendingReplacements.announcement = null;
            }
            if (/失败|无权限|失效/.test(message)) {
                pendingReplacements.member = null;
                pendingReplacements.announcement = null;
            }
        });
        observer.observe(toast, { childList: true, characterData: true, subtree: true });
    }

    function init() {
        bindImageValidation(byId("member-image-file"));
        bindImageValidation(byId("announcement-image-file"));
        ensureDeleteMemberButton();
        watchSuccessfulSaves();

        byId("member-form")?.addEventListener(
            "submit",
            (event) => validateFormUpload(
                event,
                "member-image-file",
                "member",
                "member-image-url"
            ),
            true
        );
        byId("announcement-form")?.addEventListener(
            "submit",
            (event) => validateFormUpload(
                event,
                "announcement-image-file",
                "announcement",
                "announcement-image-url"
            ),
            true
        );
        byId("delete-announcement")?.addEventListener("click", deleteAnnouncement, true);

        const memberDialog = byId("member-dialog");
        if (memberDialog) {
            new MutationObserver(syncDeleteMemberButton).observe(memberDialog, {
                attributes: true,
                attributeFilter: ["open"]
            });
        }
        byId("new-member")?.addEventListener("click", () => {
            window.requestAnimationFrame(syncDeleteMemberButton);
        });
        byId("members-list")?.addEventListener("click", () => {
            window.requestAnimationFrame(syncDeleteMemberButton);
        });
    }

    init();
})();
