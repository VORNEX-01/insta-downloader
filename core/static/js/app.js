document.addEventListener("DOMContentLoaded", () => {

    const mainBtn = document.getElementById("downloadBtn");
    const input   = document.getElementById("url");
    const result  = document.getElementById("result");

    if (!mainBtn || !input || !result) return;

    /* ── Mode (video / audio) ───────────────── */
    let selectedMode = "video";

    document.querySelectorAll(".mode-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".mode-tab")
                    .forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            selectedMode = tab.dataset.mode;

            // ✅ فیکس ۱ — کیفیت رو توی حالت audio مخفی کن
            const qBox = document.getElementById("qualityBox");
            if (qBox) {
                if (selectedMode === "audio") {
                    qBox.style.display = "none";
                } else {
                    qBox.style.display = "inline-flex";
                }
            }

            result.innerHTML = "";
        });
    });

    /* ── Quality ────────────────────────────── */
    let selectedQuality = "best";

    document.querySelectorAll(".quality-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".quality-btn")
                    .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedQuality = btn.dataset.quality;
        });
    });

    /* ── Toast ──────────────────────────────── */
    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast       = document.createElement("div");
        toast.className   = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity   = "0";
            toast.style.transform = "translateY(10px) scale(0.9)";
            setTimeout(() => toast.remove(), 320);
        }, 3000);
    }

    /* ── Proxy Download ─────────────────────── */
    function triggerDownload(fileUrl, title, ext) {
        const safeTitle = (title || "instagram")
            .replace(/[^\w\u0600-\u06FF\s\-]/g, "")
            .trim()
            .substring(0, 60);

        const filename = safeTitle + "." + (ext || "mp4");
        const proxyUrl = `/api/proxy/?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}`;

        const a         = document.createElement("a");
        a.href          = proxyUrl;
        a.download      = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /* ── Render Video Card ──────────────────── */
    function renderVideoCard(data) {
        result.innerHTML = `
            <div class="card">
                <div class="card-thumb">
                    <img
                        src="${escapeHtml(data.thumbnail)}"
                        alt="پیش‌نمایش"
                        loading="lazy"
                        onerror="this.parentElement.style.display='none'">
                    <div class="card-thumb-overlay"></div>
                    <div class="card-quality-badge">${escapeHtml(data.quality_note || "auto")}</div>
                </div>
                <div class="card-body">
                    <h3>${escapeHtml(data.title || "ویدیوی اینستاگرام")}</h3>
                    <div class="actions">
                        <a href="${escapeHtml(data.url)}"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="btn-watch">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <polygon points="5,3 19,12 5,21" fill="currentColor"/>
                            </svg>
                            پخش
                        </a>
                        <button type="button" class="btn-dl"
                                data-url="${escapeHtml(data.url)}"
                                data-title="${escapeHtml(data.title || "instagram-video")}"
                                data-ext="${escapeHtml(data.ext || "mp4")}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                                      stroke="currentColor" stroke-width="2.5"
                                      stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            دانلود ویدیو
                        </button>
                    </div>
                </div>
            </div>
        `;

        const dlBtn = result.querySelector(".btn-dl");
        if (dlBtn) {
            dlBtn.addEventListener("click", () => {
                showToast("دانلود شروع شد… ⬇️", "success");
                dlBtn.disabled = true;
                triggerDownload(dlBtn.dataset.url, dlBtn.dataset.title, dlBtn.dataset.ext);
                setTimeout(() => { dlBtn.disabled = false; }, 4000);
            });
        }
    }

    /* ── Render Audio Card ──────────────────── */
    function renderAudioCard(data) {
        // ✅ فیکس ۲ — دکمه پخش کنار دکمه دانلود MP3
        result.innerHTML = `
            <div class="audio-card">
                <div class="audio-card-header">
                    ${data.thumbnail
                        ? `<img class="audio-thumb"
                                src="${escapeHtml(data.thumbnail)}"
                                alt="cover"
                                onerror="this.style.display='none'">`
                        : `<div class="audio-thumb-placeholder">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 18V5l12-2v13" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                    <circle cx="6" cy="18" r="3" stroke="white" stroke-width="2"/>
                                    <circle cx="18" cy="16" r="3" stroke="white" stroke-width="2"/>
                                </svg>
                            </div>`
                    }
                    <div class="audio-info">
                        <h3>${escapeHtml(data.title || "آهنگ اینستاگرام")}</h3>
                        <span class="audio-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                                <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2"/>
                                <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            MP3 Audio
                        </span>
                    </div>
                </div>
                <div class="actions">

                    <!-- ✅ دکمه پخش آنلاین -->
                    <a href="${escapeHtml(data.url)}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="btn-watch">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <polygon points="5,3 19,12 5,21" fill="currentColor"/>
                        </svg>
                        پخش
                    </a>

                    <!-- دکمه دانلود MP3 -->
                    <button type="button" class="btn-dl-audio"
                            data-url="${escapeHtml(data.url)}"
                            data-title="${escapeHtml(data.title || "instagram-audio")}"
                            data-ext="mp3">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                                  stroke="currentColor" stroke-width="2.5"
                                  stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        دانلود MP3
                    </button>

                </div>
            </div>
        `;

        const dlAudio = result.querySelector(".btn-dl-audio");
        if (dlAudio) {
            dlAudio.addEventListener("click", () => {
                showToast("دانلود MP3 شروع شد… 🎵", "success");
                dlAudio.disabled = true;
                triggerDownload(dlAudio.dataset.url, dlAudio.dataset.title, "mp3");
                setTimeout(() => { dlAudio.disabled = false; }, 4000);
            });
        }
    }

    /* ── Main Handler ───────────────────────── */
    async function handleDownload() {

        const url = input.value.trim();

        if (!url) {
            showToast("لطفاً لینک را وارد کن", "error");
            input.focus();
            return;
        }

        if (!url.includes("instagram.com")) {
            showToast("لطفاً یک لینک اینستاگرام معتبر وارد کن", "error");
            input.focus();
            return;
        }

        result.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <div class="loading-text">
                    ${selectedMode === "audio"
                        ? "در حال استخراج آهنگ…"
                        : "در حال استخراج ویدیو…"}
                </div>
            </div>
        `;

        mainBtn.disabled = true;
        const btnText  = mainBtn.querySelector(".btn-text");
        const origText = btnText ? btnText.textContent : "پیداش کن";
        if (btnText) btnText.textContent = "در حال پردازش…";

        try {
            const response = await fetch("/api/download/", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    url,
                    quality: selectedQuality,
                    mode:    selectedMode,
                }),
            });

            let data;
            try { data = await response.json(); }
            catch { throw new Error("invalid_json"); }

            if (!response.ok || !data.ok) {
                result.innerHTML = `
                    <div class="error-box">
                        <span>❌</span>
                        <span>${escapeHtml(data?.error || "خطا در پردازش لینک.")}</span>
                    </div>
                `;
                return;
            }

            if (selectedMode === "audio") {
                renderAudioCard(data);
            } else {
                renderVideoCard(data);
            }

            showToast(
                selectedMode === "audio"
                    ? "آهنگ آماده دانلود است 🎵"
                    : "ویدیو آماده دانلود است ✅",
                "success"
            );

        } catch (err) {
            console.error("[InstaGet]", err);
            result.innerHTML = `
                <div class="error-box">
                    <span>🚫</span>
                    <span>${err.message === "invalid_json"
                        ? "پاسخ سرور نامعتبر بود."
                        : "خطا در اتصال به سرور."
                    }</span>
                </div>
            `;
        } finally {
            mainBtn.disabled = false;
            if (btnText) btnText.textContent = origText;
        }
    }

    mainBtn.addEventListener("click", handleDownload);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") handleDownload();
    });

});

/* ── XSS Guard ──────────────────────────── */
function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;")
        .replace(/'/g,  "&#039;");
}