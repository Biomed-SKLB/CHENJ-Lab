export function normalizeAnnouncement(item) {
    return {
        ...item,
        publishedLabel: item.published_at
            ? new Date(item.published_at).toLocaleDateString("zh-CN")
            : "未发布"
    };
}

export function announcementPayload(values, userId) {
    const date = new Date(values.published_at);
    if (Number.isNaN(date.getTime())) throw new Error("请填写有效的发布时间。");

    return {
        ...(values.id ? { id: values.id } : {}),
        title: values.title.trim(),
        summary: values.summary.trim() || null,
        body: values.body.trim() || null,
        image_url: values.image_url.trim() || null,
        published_at: date.toISOString(),
        status: values.status,
        created_by: userId
    };
}
