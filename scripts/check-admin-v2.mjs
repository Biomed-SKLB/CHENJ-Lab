import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adminDir = join(root, "admin-v2");
const html = readFileSync(join(adminDir, "index.html"), "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, "duplicate DOM ids found");

for (const id of ["login-form", "admin-panel", "members-list", "announcements-list", "member-dialog", "announcement-dialog"]) {
    assert(ids.includes(id), `missing ${id}`);
}

for (const file of readdirSync(adminDir).filter((name) => name.endsWith(".js"))) {
    const source = readFileSync(join(adminDir, file), "utf8");
    for (const match of source.matchAll(/from\s+["'](\.\/.*?)["']/g)) {
        assert(existsSync(join(adminDir, match[1])), `${file} imports missing ${match[1]}`);
    }
}

const { mergeMembers, memberPayload } = await import(pathToFileURL(join(adminDir, "members.js")));
const baseline = [{ base_member_key: "alice", name: "Alice", position: "Student", research: "RNA", bio: "Bio", image_url: "a.png", category: "Current Members", sort_order: 0, is_visible: true }];
const merged = mergeMembers(baseline, [{ id: "1", base_member_key: "alice", position: "PhD" }]);
assert.equal(merged[0].name, "Alice");
assert.equal(merged[0].position, "PhD");
const payload = memberPayload({ id: "1", base_member_key: "alice", name: "Alice", position: "PhD", research: "RNA", bio: "Bio", image_url: "a.png", category: "Current Members", sort_order: 0, is_visible: true }, merged[0].baseline);
assert.equal(payload.name, null);
assert.equal(payload.position, "PhD");
console.log("admin-v2 static checks passed");
