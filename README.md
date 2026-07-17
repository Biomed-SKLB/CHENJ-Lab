# CHENJ-Lab Website

This website was built as a small graduation gift for CHENJ-Lab.

During my time in the lab, I learned much more than scientific knowledge. I experienced curiosity, patience, collaboration, and the quiet strength that comes from working with wonderful people. The days in the lab, the conversations, the laughter, and even the busy and challenging moments have all become an important part of my memory.

This website is my way of saying thank you.

Thank you to the lab for the support, encouragement, and companionship. Thank you for giving me a place to learn, to grow, and to become a better version of myself.

I hope this website can serve as a small record of the lab’s people, work, and stories, and that it will continue to grow along with CHENJ-Lab in the years to come.

I have always thought of this place as my home. To whoever joins CHENJ-Lab in the future, I hope that what once warmed me here will also warm you.

With gratitude and best wishes,  
**Mingpeng Li**

## Website administration

The existing HTML remains the public, search-indexable baseline. Administrator
changes are stored as Supabase overrides, so the original member profiles and
news entries stay intact in Git history.

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Create the administrator in Authentication > Users.
3. Run the final commented `insert into public.site_admins ...` statement in
   `supabase/schema.sql` with the administrator's email.
4. Add the Project URL and Publishable key to `site-config.js`.
5. Open `admin.html` and sign in to manage members and announcements.

The GitHub Pages workflow publishes the static site after changes reach `main`.
The administrator page is excluded from search indexing, and Supabase Row Level
Security limits all content writes to users listed in `site_admins`.
