/*
 * 콘텐츠는 content/*.json 에서 불러옵니다.
 * 관리자는 Pages CMS(https://app.pagescms.org)에서 GitHub 계정으로 로그인해 편집합니다.
 */
(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const demo = new URLSearchParams(location.search).has("demo");
  const load = (f) => fetch(`content/${f}.json`, { cache: "no-cache" }).then((r) => r.json());
  const [SITE, perfData, rolesData, awardsData, TRAINING, videoData, galleryData] = await Promise.all(
    ["site", demo ? "demo-performances" : "performances", "roles", "awards", "training", "videos", "gallery"].map(load)
  );
  const PERFORMANCES = perfData.performances || [];
  const ROLES = rolesData.roles || [];
  const AWARDS = awardsData.awards || [];
  // YouTube 주소(watch?v=, youtu.be/, shorts/, embed/) 어떤 형식이든 영상 ID 추출
  const ytId = (u) => { const m = String(u || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/); return m ? m[1] : String(u || "").trim(); };
  const VIDEOS = (videoData.videos || []).filter((v) => v.url).map((v) => ({ ...v, id: ytId(v.url), year: Number(v.year) }));
  const GALLERY = (galleryData.photos || []).filter((g) => g.image).map((g) => ({ src: String(g.image).replace(/^\/+/, ""), caption: g.caption }));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ── NAV ─────────────────────────── */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.6);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  $("#navToggle").addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    $("#navToggle").setAttribute("aria-expanded", open);
  });
  $("#navLinks").addEventListener("click", (e) => {
    if (e.target.tagName === "A") nav.classList.remove("open");
  });

  // Highlight current section in nav
  const links = [...document.querySelectorAll(".nav-links a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));

  /* ── ABOUT ───────────────────────── */
  const li = (x) => `<li><span class="yr">${esc(x.year)}</span>${esc(x.title)}${x.detail ? `<span class="sub">${esc(x.detail)}</span>` : ""}</li>`;
  $("#education").innerHTML = (TRAINING.education || []).map(li).join("");
  $("#programs").innerHTML = (TRAINING.programs || []).map(li).join("");
  $("#coaches").innerHTML = (TRAINING.coaches || []).map((c) => `<li>${esc(c.name)}</li>`).join("");

  /* ── SCHEDULE ────────────────────── */
  const perfs = PERFORMANCES.slice();
  const parse = (d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isPast = (p) => parse(p.endDate || p.date) < today;
  const upcoming = perfs.filter((p) => !isPast(p)).sort((a, b) => parse(a.date) - parse(b.date));
  const past = perfs.filter(isPast).sort((a, b) => parse(b.date) - parse(a.date));

  const pad = (n) => String(n).padStart(2, "0");
  const icsStamp = (p, end) => {
    const d = parse(end && p.endDate ? p.endDate : p.date);
    if (!p.time) { if (end) d.setDate(d.getDate() + 1); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; }
    const [h, m] = p.time.split(":").map(Number);
    d.setHours(h + (end ? 2 : 0), m);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };
  const eventText = (p) => {
    const title = `${SITE.name} — ${p.title}${p.role ? ` (${p.role})` : ""}`;
    const loc = [p.venue, p.city].filter(Boolean).join(", ");
    const details = [p.presenter, p.ticketUrl && p.ticketUrl !== "#" ? `Tickets: ${p.ticketUrl}` : ""].filter(Boolean).join("\n");
    return { title, loc, details };
  };
  const googleUrl = (p) => {
    const { title, loc, details } = eventText(p);
    const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${icsStamp(p)}/${icsStamp(p, true)}`, location: loc, details });
    return "https://calendar.google.com/calendar/render?" + q.toString();
  };
  const icsUrl = (p) => {
    const { title, loc, details } = eventText(p);
    const allDay = !p.time;
    const icsEsc = (s) => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const body = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//junseokhwang//site//EN", "BEGIN:VEVENT",
      `UID:${p.date}-${p.title.replace(/\W+/g, "")}@junseokhwang`,
      `DTSTART${allDay ? ";VALUE=DATE" : ""}:${icsStamp(p)}`,
      `DTEND${allDay ? ";VALUE=DATE" : ""}:${icsStamp(p, true)}`,
      `SUMMARY:${icsEsc(title)}`, `LOCATION:${icsEsc(loc)}`, `DESCRIPTION:${icsEsc(details)}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
  };

  const eventHtml = (p, withActions) => {
    const d = parse(p.date);
    const e = p.endDate ? parse(p.endDate) : null;
    const range = e ? `<span class="range">–${e.getMonth() === d.getMonth() ? e.getDate() : MONTHS[e.getMonth()] + " " + e.getDate()}</span>` : "";
    const meta = [p.presenter, [p.venue, p.city].filter(Boolean).join(", "), p.time].filter(Boolean).map(esc).join(" · ");
    const actions = withActions ? `
      <div class="event-actions">
        ${p.ticketUrl ? `<a class="btn" href="${esc(p.ticketUrl)}" target="_blank" rel="noopener">Tickets</a>` : ""}
        <details class="cal-menu">
          <summary class="link-sm">+ Add to Calendar</summary>
          <div class="cal-options">
            <a href="${esc(googleUrl(p))}" target="_blank" rel="noopener">Google Calendar</a>
            <a href="${icsUrl(p)}" download="junseok-hwang-${esc(p.date)}.ics">Apple / Outlook (.ics)</a>
          </div>
        </details>
      </div>` : "";
    return `
      <article class="event reveal">
        <div class="event-date"><span class="d">${d.getDate()}</span>${range}<span class="m">${MONTHS[d.getMonth()]} ${d.getFullYear()}</span></div>
        <div>
          <div class="event-title">${esc(p.title)}</div>
          ${p.role ? `<div class="event-role">${esc(p.role)}</div>` : ""}
          <div class="event-meta">${meta}</div>
          ${p.note ? `<div class="event-meta">${esc(p.note)}</div>` : ""}
        </div>
        ${actions}
      </article>`;
  };

  $("#upcoming").innerHTML = (demo ? `<span class="demo-badge">DEMO DATA — ?demo=1</span>` : "") + (upcoming.length
    ? upcoming.map((p) => eventHtml(p, true)).join("")
    : `<div class="events-empty"><p>New performances will be announced soon.</p>
       <p>Follow on <a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram</a> for the latest updates.</p></div>`);
  if (past.length) {
    $("#pastWrap").hidden = false;
    $("#past").innerHTML = past.map((p) => eventHtml(p, false)).join("");
  }

  /* ── ROLES ───────────────────────── */
  $("#rolesBody").innerHTML = ROLES.map((r) => `
    <tr>
      <td>${esc(r.role)}</td>
      <td><span class="opera">${esc(r.opera)}</span><span class="composer">${esc(r.composer)}${r.note ? " · " + esc(r.note) : ""}</span></td>
      <td>${esc(r.company)}</td>
      <td>${esc(r.year)}</td>
    </tr>`).join("");

  /* ── AWARDS ──────────────────────── */
  $("#awardsList").innerHTML = AWARDS.map((a) => `
    <li class="${a.highlight ? "hl" : ""} reveal">
      <span class="yr">${esc(a.year)}</span>
      <div><div class="result">${esc(a.result)}</div><div class="comp">${esc(a.competition)}</div></div>
    </li>`).join("");

  /* ── MEDIA ───────────────────────── */
  const thumb = (id, q = "hqdefault") => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
  const feat = VIDEOS.find((v) => v.featured) || VIDEOS[0];
  $("#featured").innerHTML = `
    <div class="ratio" data-id="${esc(feat.id)}" role="button" tabindex="0" aria-label="Play ${esc(feat.title)}">
      <img src="${thumb(feat.id, "maxresdefault")}" onerror="this.src='${thumb(feat.id)}'" alt="${esc(feat.title)}">
      <span class="play"></span>
    </div>
    <div class="featured-info">
      <span class="label">Featured</span>
      <h3>${esc(feat.title)}</h3>
      <p><em>${esc(feat.source || "")}</em></p>
      <p>${feat.piano ? "Piano · " + esc(feat.piano) + " · " : ""}${feat.year}</p>
    </div>`;

  const years = [...new Set(VIDEOS.map((v) => v.year))].sort((a, b) => b - a);
  const cats = ["All", ...new Set(VIDEOS.map((v) => v.category))];
  let curYear = "All", curCat = "All";

  const renderFilters = () => {
    $("#yearFilter").innerHTML = ["All", ...years].map((y) => `<button class="${y == curYear ? "on" : ""}" data-year="${y}">${y}</button>`).join("");
    $("#catFilter").innerHTML = cats.map((c) => `<button class="${c === curCat ? "on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  };
  const card = (v) => `
    <div class="video-card" data-id="${esc(v.id)}" role="button" tabindex="0" aria-label="Play ${esc(v.title)}">
      <div class="ratio"><img loading="lazy" src="${thumb(v.id)}" alt="${esc(v.title)}"><span class="play"></span></div>
      <h4>${esc(v.title)}</h4>
      ${v.source ? `<div class="src">${esc(v.source)}</div>` : ""}
      <div class="meta">${esc(v.category)}${v.piano ? " · Piano " + esc(v.piano) : ""}${v.note ? " · " + esc(v.note) : ""}</div>
      ${v.event ? `<span class="event-tag">${esc(v.event)}</span>` : ""}
    </div>`;
  const renderVideos = () => {
    const list = VIDEOS.filter((v) => (curYear === "All" || v.year == curYear) && (curCat === "All" || v.category === curCat));
    const ys = [...new Set(list.map((v) => v.year))].sort((a, b) => b - a);
    $("#videoGrid").innerHTML = list.length
      ? ys.map((y) => {
          const g = list.filter((v) => v.year === y);
          return `<div class="year-group-title">${y}<small>${g.length} video${g.length > 1 ? "s" : ""}</small></div>` + g.map(card).join("");
        }).join("")
      : `<p class="center" style="grid-column:1/-1;color:#8a8a8a">No videos in this selection.</p>`;
  };
  renderFilters();
  renderVideos();
  $("#yearFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; curYear = b.dataset.year; renderFilters(); renderVideos(); });
  $("#catFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; curCat = b.dataset.cat; renderFilters(); renderVideos(); });

  const vModal = $("#videoModal"), frame = $("#modalFrame");
  const openVideo = (id) => { frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`; vModal.hidden = false; document.body.style.overflow = "hidden"; };
  const closeModals = () => { vModal.hidden = true; frame.src = ""; pModal.hidden = true; document.body.style.overflow = ""; };
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-id]"); if (t) openVideo(t.dataset.id); });
  document.addEventListener("keydown", (e) => {
    const t = e.target.closest && e.target.closest("[data-id]");
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openVideo(t.dataset.id); }
  });

  /* ── GALLERY ─────────────────────── */
  $("#galleryGrid").innerHTML = GALLERY.map((g, i) => `<figure data-i="${i}"><img loading="lazy" src="${esc(g.src)}" alt="${esc(g.caption || "Photo")}"></figure>`).join("");
  const pModal = $("#photoModal");
  let cur = 0;
  const showPhoto = (i) => { cur = (i + GALLERY.length) % GALLERY.length; $("#lightboxImg").src = GALLERY[cur].src; $("#lightboxCap").textContent = GALLERY[cur].caption || ""; };
  $("#galleryGrid").addEventListener("click", (e) => { const f = e.target.closest("figure"); if (!f) return; showPhoto(+f.dataset.i); pModal.hidden = false; document.body.style.overflow = "hidden"; });
  $(".modal-nav.prev").addEventListener("click", () => showPhoto(cur - 1));
  $(".modal-nav.next").addEventListener("click", () => showPhoto(cur + 1));

  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => {
    if (e.target === m || e.target.classList.contains("modal-close")) closeModals();
  }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
    if (!pModal.hidden && e.key === "ArrowLeft") showPhoto(cur - 1);
    if (!pModal.hidden && e.key === "ArrowRight") showPhoto(cur + 1);
  });

  /* ── CONTACT / FOOTER ────────────── */
  const em = $("#contactEmail");
  em.href = "mailto:" + SITE.email;
  em.textContent = SITE.email;
  $("#year").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-link]").forEach((a) => { if (SITE[a.dataset.link]) a.href = SITE[a.dataset.link]; });

  /* ── REVEAL ON SCROLL ────────────── */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".section h2, .bio, .training, .reveal, .featured, .gallery, .table-wrap").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
})();
