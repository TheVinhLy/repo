// =============================================================================
// VAAPP Plugin: HQPorner  (viết theo HUONG_DAN.md + plugin_template.js)
// LƯU Ý: selector/regex dựa trên cấu trúc trang phổ biến, CHƯA kiểm chứng trực
// tiếp với HTML hiện tại. Dán HTML thật vào tester.html để chỉnh nếu cần.
// =============================================================================

var BASE = "https://hqporner.com";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function absUrl(u) {
    if (!u) return "";
    u = String(u).replace(/&amp;/g, "&").replace(/\\\//g, "/").trim();
    if (u.indexOf("//") === 0) return "https:" + u;
    if (u.indexOf("http") === 0) return u;
    if (u.charAt(0) === "/") return BASE + u;
    return BASE + "/" + u;
}

function decodeHtml(s) {
    return String(s || "")
        .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
        .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// "/hdporn/12345-ten-video.html" -> "12345-ten-video.html"
function pathToId(href) {
    var m = String(href).match(/\/hdporn\/([^"'?#|\s]+)/i);
    return m ? m[1] : "";
}

function pageFromUrl(url) {
    url = String(url || "").split("|")[0];
    var m = url.match(/[?&]p=(\d+)/) || url.match(/\/(\d+)\/?$/);
    return m ? parseInt(m[1], 10) : 1;
}

// =============================================================================
// NHÓM 1: CẤU HÌNH  (trong getManifest chỉ dùng string literal, không nối chuỗi)
// =============================================================================
function getManifest() {
    return JSON.stringify({
        "id": "hqporner",
        "name": "HQPorner",
        "version": "1.0.4",
        "description": "Video HD 18+ từ hqporner.com",
        "author": "TheVinhLy",
        "baseUrl": "https://hqporner.com",
        "iconUrl": "https://hqporner.com/favicon.ico",
        "referrer": "https://hqporner.com/",
        "isEnabled": true,
        "isAdult": true,
        "type": "MOVIE",
        "layoutType": "HORIZONTAL",
        "playerType": "exoplayer",
        "adblock": true,
        "debug": true
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'hdporn', title: 'Mới Nhất', type: 'Horizontal', path: '' },
        { slug: 'top/week', title: 'Top Tuần', type: 'Horizontal', path: '' },
        { slug: 'top/month', title: 'Top Tháng', type: 'Horizontal', path: '' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Mới Nhất', slug: 'hdporn' },
        { name: 'Top Tuần', slug: 'top/week' },
        { name: 'Top Tháng', slug: 'top/month' },
        { name: 'Top Mọi Thời Đại', slug: 'top' },
        { name: 'Thể Loại', slug: 'categories' },
        { name: 'Diễn Viên', slug: 'actresses' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({ sort: [], category: [] });
}

// =============================================================================
// NHÓM 2: SINH URL
// =============================================================================
function getUrlList(slug, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    slug = String(slug || "hdporn").split("|")[0].replace(/^\/+|\/+$/g, "");

    if (slug === "categories" || slug === "actresses") {
        return BASE + "/" + slug + (page > 1 ? "/" + page : "");
    }
    if (slug === "hdporn" || slug === "") {
        return page > 1 ? BASE + "/hdporn/" + page : BASE + "/";
    }
    // top/..., category/..., actress/... : giữ nguyên path
    if (slug.indexOf("top") !== 0 && slug.indexOf("category/") !== 0 && slug.indexOf("actress/") !== 0) {
        slug = "category/" + slug;
    }
    return BASE + "/" + slug + (page > 1 ? "/" + page : "");
}

function getUrlSearch(keyword, filtersJson) {
    var page = JSON.parse(filtersJson || "{}").page || 1;
    var url = BASE + "/?q=" + encodeURIComponent(keyword);
    if (page > 1) url += "&p=" + page;
    return url;
}

// slug = "12345-ten-video.html" (id từ parseListResponse)
function getUrlDetail(slug, datasend) {
    if (!slug) return "";
    slug = String(slug).split("|")[0];
    if (slug.indexOf("http") === 0) return slug;
    slug = slug.replace(/^\/+/, "").replace(/^hdporn\//, "");
    return BASE + "/hdporn/" + slug;
}

function getUrlCategories() { return BASE + "/categories"; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// NHÓM 3: PARSER
// =============================================================================
function parseListResponse(html, apiUrl) {
    var empty = JSON.stringify({ items: [], pagination: { currentPage: 1, totalPages: 1 } });
    try {
        html = String(html || "");
        var url = String(apiUrl || "");
        var items = [];
        var seen = {};
        var i, m;

        // --- Trang Thể loại: quality "CAT" -> App mở tiếp danh sách phim ---
        if (/\/categories/i.test(url)) {
            var cr = /<a[^>]+href="\/category\/([^"\/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
            while ((m = cr.exec(html)) !== null) {
                var cname = decodeHtml(m[2]);
                if (!cname || seen[m[1]]) continue;
                seen[m[1]] = true;
                var cimg = m[2].match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
                items.push({ id: "category/" + m[1], title: cname, posterUrl: cimg ? absUrl(cimg[1]) : "", quality: "CAT" });
            }
            return JSON.stringify({ items: items, pagination: { currentPage: 1, totalPages: 1 } });
        }

        // --- Trang Diễn viên: quality "ACTRESS" ---
        if (/\/actresses/i.test(url)) {
            var ar = /<a[^>]+href="\/actress\/([^"\/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
            while ((m = ar.exec(html)) !== null) {
                var aname = decodeHtml(m[2]);
                if (!aname || seen[m[1]]) continue;
                seen[m[1]] = true;
                var aimg = m[2].match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
                items.push({ id: "actress/" + m[1], title: aname, posterUrl: aimg ? absUrl(aimg[1]) : "", quality: "ACTRESS" });
            }
            return JSON.stringify({ items: items, pagination: { currentPage: pageFromUrl(url), totalPages: 50 } });
        }

        // --- Danh sách video ---
        // Cách 1: tách theo từng khối video
        var blocks = html.split(/<section[^>]*class="[^"]*box feature[^"]*"[^>]*>/i);
        blocks.shift();
        // Cách 2 (dự phòng): tách theo từng link video
        if (blocks.length === 0) {
            blocks = html.split(/(?=<a[^>]+href="\/hdporn\/[^"]+\.html")/i);
            blocks.shift();
        }

        for (i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            var hm = b.match(/href="(\/hdporn\/[^"]+\.html)"/i);
            if (!hm) continue;
            var id = pathToId(hm[1]);
            if (!id || seen[id]) continue;

            var im = b.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
            var tm = b.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)
                || b.match(/<img[^>]+alt="([^"]+)"/i);
            var dm = b.match(/(\d{1,2}:\d{2}(?::\d{2})?)|(\d+\s*(?:min|mins|minutes))/i);

            var title = tm ? decodeHtml(tm[1]) : id.replace(/^\d+-/, "").replace(/\.html$/, "").replace(/-/g, " ");
            seen[id] = true;
            items.push({
                id: id,
                title: title,
                posterUrl: im ? absUrl(im[1]) : "",
                description: dm ? dm[0] : "",
                quality: "HD"
            });
        }

        // Phân trang
        var current = pageFromUrl(url);
        var total = current;
        var re = /href="[^"]*(?:\/hdporn\/|\/top\/[a-z]+\/|\/category\/[^"\/]+\/|[?&]p=)(\d+)\/?"/gi;
        var pm;
        while ((pm = re.exec(html)) !== null) {
            var n = parseInt(pm[1], 10);
            if (n < 5000 && n > total) total = n; // bỏ qua id video (số lớn)
        }

        return JSON.stringify({
            items: items,
            pagination: { currentPage: current, totalPages: total }
        });
    } catch (e) {
        console.log("parseListResponse lỗi: " + e);
        return empty;
    }
}

function parseSearchResponse(html, apiUrl) {
    return parseListResponse(html, apiUrl);
}

/**
 * Mỗi video = 1 server, 1 tập. slug tập là duy nhất theo id video.
 * casts/category dùng Markdown link để App mở trang diễn viên/thể loại.
 */
function parseMovieDetail(html, apiUrl, datasend) {
    html = String(html || "");
    var id = pathToId(apiUrl || "");
    if (!id) {
        var c = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
        if (c) id = pathToId(c[1]);
    }

    var t = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        || html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    var title = t ? decodeHtml(t[1]) : "Video";

    var p = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
        || html.match(/<video[^>]+poster="([^"]+)"/i);
    var poster = p ? absUrl(p[1]) : "";

    var d = html.match(/<meta[^>]+(?:name="description"|property="og:description")[^>]+content="([^"]*)"/i);

    var casts = [];
    var seenA = {};
    var cr = /<a[^>]+href="\/actress\/([^"\/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
    var cm;
    while ((cm = cr.exec(html)) !== null) {
        var name = decodeHtml(cm[2]);
        if (name && !seenA[cm[1]]) {
            seenA[cm[1]] = true;
            casts.push("[" + name + "](actress/" + cm[1] + ")");
        }
    }

    var cats = [];
    var seenC = {};
    var gr = /<a[^>]+href="\/category\/([^"\/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
    var gm;
    while ((gm = gr.exec(html)) !== null) {
        var cn = decodeHtml(gm[2]);
        if (cn && !seenC[gm[1]]) {
            seenC[gm[1]] = true;
            cats.push("[" + cn + "](category/" + gm[1] + ")");
        }
    }

    var dur = html.match(/(\d{1,3})\s*(?:min|mins|minutes)/i);

    return JSON.stringify({
        id: id,
        title: title,
        posterUrl: poster,
        backdropUrl: poster,
        description: d ? decodeHtml(d[1]) : "",
        servers: [
            {
                name: "HQPorner",
                episodes: [
                    { id: id, name: "Full", slug: id || "full" }
                ]
            }
        ],
        quality: "HD",
        status: "Full",
        duration: dur ? dur[1] + " Phút" : "",
        casts: casts.join(", "),
        category: cats.join(", ")
    });
}

/**
 * Trang xem: nếu có sẵn mp4/m3u8 → phát luôn; nếu có iframe → isEmbed:true
 * để App fetch tiếp và gọi parseEmbedResponse().
 */
function parseDetailResponse(html, apiUrl, datasend) {
    html = String(html || "");
    var referer = BASE + "/";

    var direct = extractStreams(html);
    if (direct.length > 0) {
        return JSON.stringify({
            url: direct[0].url,
            isEmbed: false,
            headers: { "Referer": referer },
            subtitles: [],
            mimeType: direct[0].url.indexOf(".m3u8") !== -1 ? "application/x-mpegURL" : "video/mp4"
        });
    }

    var m = html.match(/<iframe[^>]+src=["']([^"']+)["']/i)
        || html.match(/["'](\/blocks\/altplayer\.php\?[^"']+)["']/i)
        || html.match(/["']((?:https?:)?\/\/[^"']*\/(?:video|embed)\/[^"']+)["']/i);

    if (!m) {
        console.log("parseDetailResponse: không thấy iframe/nguồn video");
        return JSON.stringify({ url: "", isEmbed: false, headers: { "Referer": referer }, subtitles: [] });
    }

    return JSON.stringify({
        url: absUrl(m[1]),
        // App fetch trang player kèm Referer hqporner (mydaddy.cc chặn khi thiếu Referer),
        // rồi gọi parseEmbedResponse() để lấy link mp4 thật (giống cách MissAV lấy m3u8).
        isEmbed: true,
        headers: {
            "Referer": referer,
            "Origin": BASE,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        subtitles: []
    });
}

/**
 * Bước embed (tối đa 3 lần): có thể là trang trung gian (chứa iframe tiếp)
 * hoặc trang player (chứa mp4).
 */
function parseEmbedResponse(html, sourceUrl) {
    html = String(html || "").replace(/\\u002F/gi, "/").replace(/\\x2F/gi, "/");
    // Log để xem HTML player thật trong Console Toast (bật debug trong manifest)
    console.log("EMBED url=" + sourceUrl + " len=" + html.length);
    console.log("EMBED head=" + html.substring(0, 1500));
    var kpos = html.search(/mp4|m3u8|eval\(|atob\(|bigcdn/i);
    if (kpos !== -1) console.log("EMBED ctx=" + html.substring(Math.max(0, kpos - 300), kpos + 500));
    var src = String(sourceUrl || "").split("|")[0];
    var om = src.match(/^(https?:\/\/[^\/]+)/i);
    var origin = om ? om[1] : BASE;

    var streams = extractStreams(html);
    if (streams.length > 0) {
        var best = streams[0];
        return JSON.stringify({
            url: best.url,
            isEmbed: false,
            mimeType: best.url.indexOf(".m3u8") !== -1 ? "application/x-mpegURL" : "video/mp4",
            headers: { "Referer": origin + "/" }
        });
    }

    var f = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (f) {
        return JSON.stringify({
            url: absUrl(f[1]),
            isEmbed: true,
            headers: { "Referer": src || BASE + "/" }
        });
    }

    console.log("parseEmbedResponse: không tìm thấy stream");
    return JSON.stringify({ url: "", isEmbed: false });
}

// Lấy các nguồn mp4/m3u8, sắp xếp chất lượng cao → thấp
function extractStreams(html) {
    var out = [];
    var seen = {};

    function push(u, label) {
        u = absUrl(u);
        if (!u || seen[u]) return;
        seen[u] = true;
        // Chất lượng lấy từ tên file (vd .../1080.mp4), không lấy số trong token
        var qm = u.match(/\/(\d{3,4})p?\.(?:mp4|m3u8)/i) || String(label || "").match(/^(\d{3,4})p?$/);
        out.push({ url: u, q: qm ? parseInt(qm[1], 10) : 0 });
    }

    var r1 = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
    var m;
    while ((m = r1.exec(html)) !== null) {
        var title = m[0].match(/(?:title|label|res|size)=["']([^"']+)["']/i);
        push(m[1], title ? title[1] : m[1]);
    }

    // Bắt mọi URL .mp4/.m3u8 trong trang (kể cả dạng \/ hoặc // không có https:)
    var plain = html.replace(/\\\//g, "/");
    var r2 = /(?:https?:)?\/\/[^"'\s<>\\]+?\.(?:mp4|m3u8)(?:\?[^"'\s<>\\]*)?/gi;
    while ((m = r2.exec(plain)) !== null) push(m[0], m[0]);

    out.sort(function (a, b) { return b.q - a.q; });
    return out;
}

function parseCategoriesResponse(html, apiUrl) {
    try {
        var res = [];
        var seen = {};
        var re = /<a[^>]+href="\/category\/([^"\/]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            var name = decodeHtml(m[2]);
            if (!name || seen[m[1]]) continue;
            seen[m[1]] = true;
            res.push({ name: name, slug: "category/" + m[1] });
        }
        return JSON.stringify(res);
    } catch (e) { return "[]"; }
}
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
