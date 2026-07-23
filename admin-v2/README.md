# CHENJ-Lab Admin v2

This directory contains a modular, non-production foundation for the CHENJ-Lab content manager.

## Current scope

- standalone preview at `admin-v2/index.html`
- Supabase session restoration and password login
- administrator verification through `site_admins`
- baseline member parsing from `members.html`
- merge of baseline members with `member_overrides`
- member create, edit, visibility, ordering, restore, and delete workflows
- announcement draft, publish, edit, and delete workflows
- managed image upload, replacement, rollback, and deletion cleanup
- differential baseline overrides, including nullable inherited visibility

## Safety boundaries

- `admin.html` and `admin.js` are unchanged
- no real Supabase data is required for the local mock acceptance suite
- `supabase/schema.sql` allows `member_overrides.is_visible` to be `NULL`
  so unchanged static-member visibility remains inherited
- no production route points to this directory
- the preview remains `noindex, nofollow`
- live Supabase administrator CRUD still requires separate manual acceptance

## Module responsibilities

- `app.js`: application orchestration and rendering
- `auth.js`: Supabase authentication and administrator authorization
- `database.js`: content CRUD access
- `upload.js`: image validation, upload, and managed-file cleanup
- `members.js`: baseline parsing and override merge logic
- `announcements.js`: announcement transformations
- `utils.js`: DOM and feedback helpers

## RC validation boundary

Local syntax, contract, HTTP smoke, and browser tests use a Supabase stub and
must not be reported as live database validation. Do not replace the current
administrator page, mark the PR ready, or merge until an authorized
administrator completes the live Supabase checklist.
