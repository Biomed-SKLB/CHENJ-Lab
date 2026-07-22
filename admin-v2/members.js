export function mergeMembers(baseMembers, overrides) {
    const map = new Map(overrides.map((item) => [item.base_member_key, item]));
    return baseMembers.map((member) => ({
        ...member,
        ...(map.get(member.base_member_key) || {})
    }));
}
