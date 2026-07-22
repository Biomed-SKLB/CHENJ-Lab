export function normalizeAnnouncement(item) {
    return {
        ...item,
        publishedLabel: new Date(item.published_at).toLocaleDateString("zh-CN")
    };
}

export function announcementPayload(form, userId) {
    return {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        body: form.body.trim() || null,
        image_url: form.image_url.trim() || null,
        published_at: form.published_at,
        status: form.status,
        created_by: userId
    };
}
