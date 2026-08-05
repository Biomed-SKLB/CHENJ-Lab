export function memberKey(name) {
    const englishName = String(name || "").split("|").pop();
    return englishName
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function loadBaseMembers() {
    const response = await fetch("../members.html", { cache: "no-store" });
    if (!response.ok) throw new Error("无法读取现有成员页面。");

    const html = await response.text();
    const page = new DOMParser().parseFromString(html, "text/html");
    const members = [];

    page.querySelectorAll(".member-category").forEach((category) => {
        const categoryName = category.querySelector(".member-category-title")?.textContent.trim();
        Array.from(category.querySelectorAll(":scope > .team-member")).forEach((card, index) => {
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
        });
    });

    return members;
}

export function mergeMembers(baseMembers, overrides) {
    const overridesByKey = new Map(
        overrides
            .filter((item) => item.base_member_key)
            .map((item) => [item.base_member_key, item])
    );

    const baseline = baseMembers.map((member) => {
        const baselineSnapshot = { ...member };
        const override = overridesByKey.get(member.base_member_key);
        if (!override) return { ...member, baseline: baselineSnapshot };
        const nonNullValues = Object.fromEntries(
            Object.entries(override).filter(([, value]) => value !== null)
        );
        return {
            ...member,
            ...nonNullValues,
            id: override.id,
            is_baseline: true,
            baseline: baselineSnapshot
        };
    });

    const added = overrides
        .filter((item) => !item.base_member_key)
        .map((item) => ({ ...item, is_baseline: false, baseline: null }));

    return [...baseline, ...added].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
}

function nullableOverride(value, baselineValue) {
    return value === (baselineValue ?? "") ? null : value;
}

export function memberPayload(values, baseline = null) {
    const current = {
        name: values.name.trim(),
        position: values.position.trim(),
        research: values.research.trim(),
        bio: values.bio.trim(),
        image_url: values.image_url.trim(),
        category: values.category,
        sort_order: Number(values.sort_order || 0),
        is_visible: Boolean(values.is_visible)
    };

    if (!baseline) {
        return {
            ...(values.id ? { id: values.id } : {}),
            base_member_key: null,
            ...current
        };
    }

    return {
        ...(values.id ? { id: values.id } : {}),
        base_member_key: values.base_member_key,
        name: nullableOverride(current.name, baseline.name),
        position: nullableOverride(current.position, baseline.position),
        research: nullableOverride(current.research, baseline.research),
        bio: nullableOverride(current.bio, baseline.bio),
        image_url: nullableOverride(current.image_url, baseline.image_url),
        category: current.category === baseline.category ? null : current.category,
        sort_order: current.sort_order === Number(baseline.sort_order || 0) ? null : current.sort_order,
        is_visible: current.is_visible === Boolean(baseline.is_visible) ? null : current.is_visible
    };
}

export function hasMeaningfulMemberOverride(payload) {
    if (!payload.base_member_key) return true;
    return [
        payload.name,
        payload.position,
        payload.research,
        payload.bio,
        payload.image_url,
        payload.category,
        payload.sort_order,
        payload.is_visible
    ].some((value) => value !== null);
}
