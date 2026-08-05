import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adminDir = join(root, "admin-v2");
const htmlPath = join(adminDir, "index.html");
const html = readFileSync(htmlPath, "utf8");
const membersHtml = readFileSync(join(root, "members.html"), "utf8");
const newsHtml = readFileSync(join(root, "news.html"), "utf8");
const siteContent = readFileSync(join(root, "site-content.js"), "utf8");
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "duplicate DOM ids found");

const requiredIds = [
    "setup-panel",
    "login-panel",
    "login-form",
    "login-email",
    "login-password",
    "login-error",
    "admin-panel",
    "admin-identity",
    "sign-out",
    "members-tab",
    "announcements-tab",
    "new-member",
    "new-announcement",
    "members-list",
    "announcements-list",
    "member-dialog",
    "member-form",
    "member-dialog-title",
    "member-id",
    "member-base-key",
    "member-old-image-url",
    "member-name",
    "member-position",
    "member-research",
    "member-bio",
    "member-image-url",
    "member-image-file",
    "member-category",
    "member-sort-order",
    "member-visible",
    "delete-member",
    "restore-member",
    "announcement-dialog",
    "announcement-form",
    "announcement-dialog-title",
    "announcement-id",
    "announcement-old-image-url",
    "announcement-title",
    "announcement-summary",
    "announcement-body",
    "announcement-published-at",
    "announcement-status",
    "announcement-image-url",
    "announcement-image-file",
    "delete-announcement",
    "toast"
];

for (const id of requiredIds) {
    assert(ids.includes(id), `missing DOM id: ${id}`);
}

const jsFiles = readdirSync(adminDir).filter((name) => name.endsWith(".js"));
for (const file of jsFiles) {
    const source = readFileSync(join(adminDir, file), "utf8");

    for (const match of source.matchAll(/from\s+["'](\.\/.*?)["']/g)) {
        assert(existsSync(join(adminDir, match[1])), `${file} imports missing ${match[1]}`);
    }

    for (const match of source.matchAll(/byId\(["']([^"']+)["']\)/g)) {
        assert(ids.includes(match[1]), `${file} references missing DOM id: ${match[1]}`);
    }
}

for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:|#)/.test(reference)) continue;
    const resolved = resolve(adminDir, reference.split(/[?#]/)[0]);
    assert(existsSync(resolved), `index.html references missing local file: ${reference}`);
}

assert(html.includes('type="module" src="./app.js"'), "app.js must load as an ES module");
assert(html.includes('name="robots" content="noindex, nofollow"'), "preview must remain noindex");
for (const [pageName, pageHtml] of [["members.html", membersHtml], ["news.html", newsHtml]]) {
    assert(pageHtml.includes('src="site-config.js"'), `${pageName} must load site-config.js`);
    assert(pageHtml.includes('src="site-content.js"'), `${pageName} must load site-content.js`);
}
assert(siteContent.includes('.from("member_overrides")'), "public members must read member_overrides");
assert(siteContent.includes('.from("announcements")'), "public news must read announcements");
assert(siteContent.includes('.eq("status", "published")'), "public news must filter published announcements");
assert(
    siteContent.includes('.lte("published_at", new Date().toISOString())'),
    "public news must exclude future announcements"
);
assert(
    /is_visible boolean default true/.test(schema) &&
    /alter column is_visible drop not null/.test(schema),
    "member visibility must allow NULL to inherit the static baseline"
);

const {
    hasMeaningfulMemberOverride,
    mergeMembers,
    memberPayload
} = await import(pathToFileURL(join(adminDir, "members.js")));
const baseline = [{
    base_member_key: "alice",
    name: "Alice",
    position: "Student",
    research: "RNA",
    bio: "Bio",
    image_url: "a.png",
    category: "Current Members",
    sort_order: 0,
    is_visible: true,
    is_baseline: true
}];
const merged = mergeMembers(baseline, [{ id: "1", base_member_key: "alice", position: "PhD" }]);
assert.equal(merged[0].name, "Alice");
assert.equal(merged[0].position, "PhD");
assert.equal(merged[0].baseline.position, "Student");

const payload = memberPayload({
    id: "1",
    base_member_key: "alice",
    name: "Alice",
    position: "PhD",
    research: "RNA",
    bio: "Bio",
    image_url: "a.png",
    category: "Current Members",
    sort_order: 0,
    is_visible: true
}, merged[0].baseline);
assert.deepEqual(payload, {
    id: "1",
    base_member_key: "alice",
    name: null,
    position: "PhD",
    research: null,
    bio: null,
    image_url: null,
    category: null,
    sort_order: null,
    is_visible: null
});
assert.equal(hasMeaningfulMemberOverride(payload), true);

const restoredPayload = memberPayload({
    id: "1",
    base_member_key: "alice",
    name: "Alice",
    position: "Student",
    research: "RNA",
    bio: "Bio",
    image_url: "a.png",
    category: "Current Members",
    sort_order: 0,
    is_visible: true
}, merged[0].baseline);
assert.deepEqual(restoredPayload, {
    id: "1",
    base_member_key: "alice",
    name: null,
    position: null,
    research: null,
    bio: null,
    image_url: null,
    category: null,
    sort_order: null,
    is_visible: null
});
assert.equal(
    hasMeaningfulMemberOverride(restoredPayload),
    false,
    "restoring every baseline field must remove the override row"
);

const hiddenPayload = memberPayload({
    id: null,
    base_member_key: "alice",
    name: "Alice",
    position: "Student",
    research: "RNA",
    bio: "Bio",
    image_url: "a.png",
    category: "Current Members",
    sort_order: 0,
    is_visible: false
}, merged[0].baseline);
assert.equal(hiddenPayload.is_visible, false);
assert.equal(hasMeaningfulMemberOverride(hiddenPayload), true);

const { removeManagedImage } = await import(pathToFileURL(join(adminDir, "upload.js")));
const removedPaths = [];
const storageClient = {
    storage: {
        from(bucket) {
            assert.equal(bucket, "chenj-lab-media");
            return {
                async remove(paths) {
                    removedPaths.push(...paths);
                    return { error: null };
                }
            };
        }
    }
};
const projectUrl = "https://example.supabase.co";
assert.equal(
    await removeManagedImage(storageClient, "chenj-lab-media", "member.jpg", projectUrl),
    false,
    "repository-relative images must never be deleted from Storage"
);
assert.equal(
    await removeManagedImage(
        storageClient,
        "chenj-lab-media",
        "https://images.example.org/member.jpg",
        projectUrl
    ),
    false,
    "external images must never be deleted from Storage"
);
assert.equal(
    await removeManagedImage(
        storageClient,
        "chenj-lab-media",
        `${projectUrl}/storage/v1/object/public/chenj-lab-media/admin/member%20photo.png`,
        projectUrl
    ),
    true
);
assert.deepEqual(removedPaths, ["admin/member photo.png"]);

console.log(
    `admin-v2 checks passed: ${jsFiles.length} modules, ${ids.length} DOM ids, public filters and managed-image boundaries`
);
