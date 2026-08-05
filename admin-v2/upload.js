const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"]
]);

export function validateImage(file) {
    if (!file) return;
    if (!IMAGE_EXTENSIONS.has(file.type)) {
        throw new Error("仅支持 JPG、PNG、WebP 或 GIF 图片。");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("图片大小不能超过 5 MB。");
    }
}

export async function uploadImage(client, userId, bucket, file, folder) {
    validateImage(file);
    if (!file) return null;
    const safeFolder = String(folder || "image")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "image";
    const extension = IMAGE_EXTENSIONS.get(file.type);
    const path = `${userId}/${safeFolder}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false
    });
    if (error) throw error;
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function removeManagedImage(client, bucket, urlValue, supabaseUrl) {
    if (!urlValue || !supabaseUrl) return false;
    let imageUrl;
    let projectUrl;
    try {
        imageUrl = new URL(urlValue);
        projectUrl = new URL(supabaseUrl);
    } catch {
        return false;
    }
    const marker = `/storage/v1/object/public/${bucket}/`;
    if (imageUrl.origin !== projectUrl.origin || !imageUrl.pathname.startsWith(marker)) return false;
    const path = decodeURIComponent(imageUrl.pathname.slice(marker.length));
    if (!path) return false;
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
}
