import { byId, localDateTimeValue, setBusy, showToast } from "./utils.js";
import { announcementPayload } from "./announcements.js";
import { uploadImage, removeManagedImage } from "./upload.js";

export function createAnnouncementEditor({ client, db, config, user, onChanged }) {
    const dialog = byId("announcement-dialog");
    const form = byId("announcement-form");
    const deleteButton = byId("delete-announcement");
    const bucket = config.mediaBucket || "chenj-lab-media";

    function open(item = null) {
        form.reset();
        byId("announcement-dialog-title").textContent = item ? "编辑公告" : "新建公告";
        byId("announcement-id").value = item?.id || "";
        byId("announcement-old-image-url").value = item?.image_url || "";
        byId("announcement-title").value = item?.title || "";
        byId("announcement-summary").value = item?.summary || "";
        byId("announcement-body").value = item?.body || "";
        byId("announcement-image-url").value = item?.image_url || "";
        byId("announcement-published-at").value = item?.published_at ? localDateTimeValue(new Date(item.published_at)) : localDateTimeValue();
        byId("announcement-status").value = item?.status || "draft";
        deleteButton.hidden = !item?.id;
        dialog.showModal();
    }

    async function submit(event) {
        event.preventDefault();
        setBusy(form, true);
        let uploadedUrl = null;
        let persisted = false;
        try {
            const oldImageUrl = byId("announcement-old-image-url").value;
            uploadedUrl = await uploadImage(client, user.id, bucket, byId("announcement-image-file").files[0], "announcement");
            const finalImageUrl = uploadedUrl || byId("announcement-image-url").value.trim();
            const payload = announcementPayload({
                id: byId("announcement-id").value || null,
                title: byId("announcement-title").value,
                summary: byId("announcement-summary").value,
                body: byId("announcement-body").value,
                image_url: finalImageUrl,
                published_at: byId("announcement-published-at").value,
                status: byId("announcement-status").value
            }, user.id);
            await db.announcements.save(payload);
            persisted = true;
            if (oldImageUrl && oldImageUrl !== finalImageUrl) {
                await removeManagedImage(client, bucket, oldImageUrl, config.supabaseUrl).catch(() => {});
            }
            dialog.close();
            await onChanged();
            showToast("公告已保存。");
        } catch (error) {
            if (uploadedUrl && !persisted) {
                await removeManagedImage(client, bucket, uploadedUrl, config.supabaseUrl).catch(() => {});
            }
            showToast(error.message || "保存公告失败。", true);
        } finally {
            setBusy(form, false);
        }
    }

    async function remove() {
        const id = byId("announcement-id").value;
        if (!id || !confirm("确定删除公告吗？")) return;
        setBusy(form, true);
        try {
            const imageUrl = byId("announcement-old-image-url").value;
            await db.announcements.remove(id);
            if (imageUrl) await removeManagedImage(client, bucket, imageUrl, config.supabaseUrl).catch(() => {});
            dialog.close();
            await onChanged();
            showToast("公告已删除。");
        } catch (error) {
            showToast(error.message || "删除失败。", true);
        } finally {
            setBusy(form, false);
        }
    }

    form.addEventListener("submit", submit);
    deleteButton.addEventListener("click", remove);
    return { open };
}
