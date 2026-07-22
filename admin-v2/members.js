export function mergeMembers(baseMembers, overrides) {
    const map = new Map(overrides.map((item) => [item.base_member_key, item]));
    return baseMembers.map((member) => ({
        ...member,
        ...(map.get(member.base_member_key) || {})
    }));
}

export function memberPayload(form) {
    return {
        name: form.name.trim(),
        position: form.position.trim(),
        research: form.research.trim(),
        bio: form.bio.trim(),
        category: form.category,
        image_url: form.image_url.trim(),
        is_visible: form.is_visible
    };
}
