const supabaseUrl = "https://krkiorqyqordwtbcolop.supabase.co";
const supabaseKey = "sb_publishable_MetnC11vPQT3eKxjrmNOUQ_53QWymrI";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const ratingCategories = [
    { key: "qc", label: "QC" },
    { key: "building_difficulty", label: "Building difficulty" },
    { key: "parts_availability", label: "Parts availability" },
    { key: "upgrade_ecosystem", label: "Upgrade ecosystem" },
    { key: "value_for_money", label: "Value for money" }
];

document.addEventListener("DOMContentLoaded", () => {
    const ratingBlocks = document.querySelectorAll(".chassis-rating");

    ratingBlocks.forEach(block => {
        const slug = block.dataset.slug;
        renderRatings(block, slug);
    });
});

async function renderRatings(block, slug) {
    block.innerHTML = `<p>Loading ratings...</p>`

    let html = "";

    for (const category of ratingCategories) {
        const { data, error } = await supabaseClient
            .from("ratings")
            .select("score")
            .eq("page_slug", slug)
            .eq("category", category.key);

        if (error) {
            html += `<p>${category.label}: error loading</p>`;
            console.error(error);
            continue;
        }

        const votes = data.length;
        const average = votes
            ? data.reduce((sum, row) => sum + row.score, 0) / votes
            : 0;

        html += `
        <div class="rating-row">
            <span class="rating-label">${category.label}</span>
            <span class="rating-stars vote-stars" data-category="${category.key}">
                ${renderStars(average)}</span>
            <span class="rating-score">${average.toFixed(1)} / 5</span>
            <span class="rating-votes">(${votes} votes)</span>
        </div>
        <div class="rating-status" data-category="${category.key}"></div>`;
    }

    block.innerHTML = html;

    block.querySelectorAll(".vote-stars").forEach(stars => {
    const starItems = stars.querySelectorAll(".star-item");

    starItems.forEach(item => {
        item.addEventListener("mousemove", () => {
            const score = Number(item.dataset.score);

            starItems.forEach(star => {
                const fill = star.querySelector(".star-fill");
                const starScore = Number(star.dataset.score);

                fill.style.width = starScore <= score ? "100%" : "0%";
            });
        });

        item.addEventListener("click", () => {
            const score = Number(item.dataset.score);
            const category = stars.dataset.category;

            submitVote(slug, category, score, block);
        });
    });

    stars.addEventListener("mouseleave", () => {
        starItems.forEach(star => {
            const fill = star.querySelector(".star-fill");
            fill.style.width = fill.dataset.originalWidth + "%";
        });
    });
});

}

function renderStars(rating) {
    let stars = "";

    for (let i = 1; i <= 5; i++) {
        const fill = Math.max(0, Math.min(100, (rating - (i - 1)) * 100));

        stars += `
            <span class="star-item" data-score="${i}">
                <span class="star-bg">★</span>
                <span class="star-fill" data-original-width="${fill}" style="width:${fill}%">★</span>
            </span>
        `;
    }

    return `<span class="stars-container">${stars}</span>`;
}

async function submitVote(slug, category, score, block) {
    const voterId = getVoterId();

    const { error } = await supabaseClient
        .from("ratings")
        .upsert({
            page_slug: slug,
            category: category,
            score: score,
            voter_id: voterId
        }, {
            onConflict: "page_slug,category,voter_id"
        });

    if (error) {
        console.error(error);
        showRatingStatus(block, category, "Vote failed.");
        return;
    }

    showRatingStatus(block, category, "Your rating was saved.");
    renderRatings(block, slug);
}

function showRatingStatus(block, category, message) {
    const status = block.querySelector(`.rating-status[data-category="${category}"]`);
    if (status) {
        status.textContent = message;
    }
}

function getVoterId() {
    let voterId = localStorage.getItem("ssd_voter_id");

    if (!voterId) {
        voterId = crypto.randomUUID();
        localStorage.setItem("ssd_voter_id", voterId);
    }

    return voterId;
}