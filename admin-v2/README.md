# CHENJ-Lab Admin v2

This directory contains a modular, non-production foundation for the CHENJ-Lab content manager.

## Current scope

- standalone preview at `admin-v2/index.html`
- Supabase session restoration and password login
- administrator verification through `site_admins`
- baseline member parsing from `members.html`
- merge of baseline members with `member_overrides`
- administrator view of announcements, including drafts
- isolated database and upload service modules for later write workflows

## Safety boundaries

- `admin.html` and `admin.js` are unchanged
- the public website is unchanged
- no database migration is included
- no production route points to this directory
- write methods exist at the service layer but are not connected to UI controls yet

## Module responsibilities

- `app.js`: application orchestration and rendering
- `auth.js`: Supabase authentication and administrator authorization
- `database.js`: content CRUD access
- `upload.js`: image validation, upload, and managed-file cleanup
- `members.js`: baseline parsing and override merge logic
- `announcements.js`: announcement transformations
- `utils.js`: DOM and feedback helpers

## Next migration slice

Add member and announcement editor dialogs to the v2 page, connect one write workflow at a time, and test against the existing Supabase project before considering replacement of the current administrator page.
