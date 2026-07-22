import { byId, setBusy, showToast } from "./utils.js";
import { memberKey, memberPayload } from "./members.js";
import { uploadImage, removeManagedImage } from "./upload.js";

function hasMeaningfulOverride(payload) {
    if (!payload.base_member_key) return true;
    if (payload.is_visible === false) return true;
    return [
        payload.name,
        payload.position,
        payload.research,
        payload.bio,
        payload.image_url,
        payload.category,
        payload.sort_order
    ].some((value) => value !== null);
}

export function createMemberEditor({ client, db, config, user, onChanged }) {
    const dialog = byId("member-dialog");
    const form = byId("member-form");
    const deleteButton = byId("delete-member");
    const restoreButton = byId("restore-member");
    const bucket = config.mediaBucket || "chenj-lab-media";
    let currentMember = null;

    function open(member = null) {
        currentMember = member;
        form.reset();
        byId("member-dialog-title").textContent = member ? "编辑成员" : "新增成员";
        byId("member-id").value = member?.id || "";
        byId("member-base-key").value = member?.base_member_key || "";
        byId("member-old-image-url").value = member?.image_url || "";
        byId("member-name").value = member?.name || "";
        byId("member-position").value = member?.position || "";
        byId("member-research").value = member?.research || "";
        byId("member-bio").value = member?.bio || "";
        byId("member-image-url").value = member?.image_url || "";
        byId("member-category").value = member?.category || "Current Members";
        byId("member-sort-order").value = member?.sort_order ?? 100;
        byId("member-visible").checked = member?.is_visible !== false;
        deleteButton.hidden = !(member?.id && !member?.is_baseline);
        restoreButton.hidden = !(member?.id && member?.is_baseline);
        dialog.showModal();
    }

    async function submit(event) {
        event.preventDefault();
        setBusy(form, true);
        let uploadedUrl = null;
        try {
            const oldImageUrl = byId("member-old-image-url").value;
            const file = byId("member-image-file").files[0];
            const name = byId("member-name").value;
            uploadedUrl = await uploadImage(
                client,
                user.id,
                bucket,
                file,
                byId("member-base-key").value || memberKey(name) || "member"
            );
            const finalImageUrl = uploadedUrl || byId("member-image-url").value.trim();
            const payload = memberPayload({
                id: byId("member-id").value || null,
                base_member_key: byId("member-base-key").value || null,
                name,
                position: byId("member-position").value,
                research: byId("member-research").value,
                bio: byId("member-bio").value,
                image_url: finalImageUrl,
                category: byId("member-category").value,
                sort_order: byId("member-sort-order").value,
                is_visible: byId("member-visible").checked
            }, currentMember?.baseline || null);

            if (payload.base_member_key && !hasMeaningfulOverride(payload)) {
                if (payload.id) await db.members.remove(payload.id);
            } else {
                await db.members.save(payload);
            }

            if (oldImageUrl && oldImageUrl !== finalImageUrl) {
                await removeManagedImage(client, bucket, oldImageUrl, config.supabaseUrl).catch(() => {});
            }

            dialog.close();
            await onChanged();
            showToast("成员信息已保存。");
        } catch (error) {
            if (uploadedUrl) {
                await removeManagedImage(client, bucket, uploadedUrl, config.supabaseUrl).catch(() => {});
            }
            showToast(error.message || "保存成员失败。", true);
        } finally {
            setBusy(form, false);
        }
    }

    async function remove() {
        const id = byId("member-id").value;
        if (!id || !window.confirm("确定删除这个新增成员吗？此操作无法撤销。")) return;
        setBusy(form, true);
        try {
            const imageUrl = byId("member-old-image-url").value;
            await db.members.remove(id);
            if (imageUrl) {
                await removeManagedImage(client, bucket, imageUrl, config.supabaseUrl).catch(() => {});
            }
            dialog.close();
            await onChanged();
            showToast("成员已删除。");
        } catch (error) {
            showToast(error.message || "删除成员失败。", true);
        } finally {
            setBusy(form, false);
        }
    }

    async function restore() {
        const id = byId("member-id").value;
        if (!id || !window.confirm("恢复为 members.html 中的原始成员资料吗？")) return;
        setBusy(form, true);
        try {
            const currentImageUrl = byId("member-old-image-url").value;
            const baselineImageUrl = currentMember?.baseline?.image_url || "";
            await db.members.remove(id);
            if (currentImageUrl && currentImageUrl !== baselineImageUrl) {
                await removeManagedImage(client, bucket, currentImageUrl, config.supabaseUrl).catch(() => {});
            }
            dialog.close();
            await onChanged();
            showToast("成员资料已恢复为原始版本。");
        } catch (error) {
            showToast(error.message || "恢复成员失败。", true);
        } finally {
            setBusy(form, false);
        }
    }

    form.addEventListener("submit", submit);
    deleteButton.addEventListener("click", remove);
    restoreButton.addEventListener("click", restore);

    return { open };
}
