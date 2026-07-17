(function () {
    "use strict";

    const config = window.CHENJ_LAB_CONFIG || {};

    if (
        !window.supabase ||
        !config.supabaseUrl ||
        !config.supabasePublishableKey
    ) {
        return;
    }

    const client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );

    function memberKey(name) {
        const englishName = String(name || "").split("|").pop();
        return englishName
            .normalize("NFKD")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function setText(card, selector, value) {
        if (value === null || value === undefined) return;
        let element = card.querySelector(selector);
        if (!element) {
            element = document.createElement(selector === "h3" ? "h3" : "p");
            if (selector.startsWith(".")) element.className = selector.slice(1);
            card.querySelector(".member-text")?.appendChild(element);
        }
        element.textContent = value;
    }

    function replaceBio(card, value) {
        if (value === null || value === undefined) return;
        let bio = card.querySelector(".bio");
        if (!bio) {
            bio = document.createElement("div");
            bio.className = "bio";
            card.querySelector(".member-text")?.appendChild(bio);
        }
        bio.replaceChildren();
        const paragraph = document.createElement("p");
        paragraph.textContent = value;
        bio.appendChild(paragraph);
    }

    function findCategory(label) {
        return Array.from(document.querySelectorAll(".member-category")).find(
            (category) =>
                category.querySelector(".member-category-title")?.textContent.trim() === label
        );
    }

    function createMemberCard(row) {
        const card = document.createElement("div");
        card.className = "team-member managed-member";

        const memberInfo = document.createElement("div");
        memberInfo.className = "member-info";

        const image = document.createElement("img");
        image.src = row.image_url || "cjlogo_20260226201956_250_76.png";
        image.alt = row.name || "CHENJ-Lab member";

        const memberText = document.createElement("div");
        memberText.className = "member-text";
        memberText.appendChild(document.createElement("h3"));

        memberInfo.append(image, memberText);
        card.appendChild(memberInfo);
        return card;
    }

    function applyMemberRow(card, row) {
        card.dataset.managedMemberKey = row.base_member_key || row.id;
        if (row.sort_order !== null && row.sort_order !== undefined) {
            card.dataset.managedSort = String(row.sort_order);
        } else {
            delete card.dataset.managedSort;
        }
        card.hidden = row.is_visible === false;

        setText(card, "h3", row.name);
        setText(card, ".position", row.position);
        setText(card, ".research", row.research);
        replaceBio(card, row.bio);

        if (row.image_url) {
            const image = card.querySelector("img");
            if (image) {
                image.src = row.image_url;
                image.alt = row.name || image.alt;
            }
        }

        if (row.category) {
            findCategory(row.category)?.appendChild(card);
        }
    }

    function sortManagedMembers() {
        document.querySelectorAll(".member-category").forEach((category) => {
            const cards = Array.from(category.querySelectorAll(":scope > .team-member"));
            cards
                .sort((a, b) => {
                    const aSort = Number(a.dataset.managedSort ?? a.dataset.originalSort ?? 9999);
                    const bSort = Number(b.dataset.managedSort ?? b.dataset.originalSort ?? 9999);
                    return aSort - bSort;
                })
                .forEach((card) => category.appendChild(card));
        });
    }

    async function loadMembers() {
        if (!document.body.classList.contains("members-page")) return;

        const baselineCards = new Map();
        document.querySelectorAll(".member-category").forEach((category) => {
            Array.from(category.querySelectorAll(":scope > .team-member")).forEach((card, index) => {
                const key = memberKey(card.querySelector("h3")?.textContent);
                card.dataset.originalSort = String(index);
                card.dataset.managedMemberKey = key;
                baselineCards.set(key, card);
            });
        });

        const { data, error } = await client
            .from("member_overrides")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) throw error;

        (data || []).forEach((row) => {
            const card = row.base_member_key
                ? baselineCards.get(row.base_member_key)
                : createMemberCard(row);
            if (!card) return;
            applyMemberRow(card, row);
            if (!card.isConnected) {
                (findCategory(row.category) || findCategory("Current Members"))?.appendChild(card);
            }
        });

        sortManagedMembers();
    }

    function announcementCard(item) {
        const card = document.createElement("article");
        card.className = "news-card managed-news-card";

        if (item.image_url) {
            const wrapper = document.createElement("div");
            wrapper.className = "news-image-wrapper";
            const image = document.createElement("img");
            image.src = item.image_url;
            image.alt = item.title;
            wrapper.appendChild(image);
            card.appendChild(wrapper);
        }

        const date = document.createElement("p");
        date.className = "news-date";
        const publishedAt = new Date(item.published_at);
        date.textContent = `${publishedAt.getFullYear()}.${String(
            publishedAt.getMonth() + 1
        ).padStart(2, "0")}`;

        const title = document.createElement("h3");
        title.className = "news-title";
        title.textContent = item.title;

        const text = document.createElement("p");
        text.className = "news-text";
        text.textContent = item.summary || item.body || "";

        card.append(date, title, text);
        return card;
    }

    async function loadAnnouncements() {
        if (!document.body.classList.contains("news-page")) return;

        const { data, error } = await client
            .from("announcements")
            .select("id,title,summary,body,image_url,published_at")
            .eq("status", "published")
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false });

        if (error) throw error;
        const grid = document.querySelector(".news-grid");
        if (!grid) return;

        (data || []).reverse().forEach((item) => {
            grid.prepend(announcementCard(item));
        });
    }

    Promise.all([loadMembers(), loadAnnouncements()]).catch((error) => {
        // The original static content remains visible if the cloud service is
        // unavailable or has not been configured yet.
        console.warn("CHENJ-Lab managed content could not be loaded.", error);
    });
})();
