/*
 * 콘텐츠는 content/*.json 에서 불러옵니다.
 * 관리자는 Pages CMS(https://app.pagescms.org)에서 GitHub 계정으로 로그인해 편집합니다.
 */
(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const demo = new URLSearchParams(location.search).has("demo");
  const load = (f) => fetch(`content/${f}.json`, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const [SITE, perfData, rolesData, awardsData, TRAINING, videoData, galleryData, stageData] = await Promise.all(
    ["site", demo ? "demo-performances" : "performances", "roles", "awards", "training", "videos", "gallery", "stage"].map(load)
  );
  const path = (p) => String(p || "").replace(/^\/+/, "");
  const ytId = (u) => { const m = String(u || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/); return m ? m[1] : ""; };
  const parse = (d) => { const [y, m, dd] = String(d).split("-").map(Number); return new Date(y, (m || 1) - 1, dd || 1); };
  const fmtDate = (d) => { if (!d) return ""; const x = parse(d); return `${MONTHS_FULL[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
  const pad = (n) => String(n).padStart(2, "0");
  const dotDate = (d) => String(d || "").trim().split("-").filter(Boolean).map((x, i) => (i ? pad(+x) : x)).join(". ");

  const PERFORMANCES = perfData.performances || [];
  const ROLES = rolesData.roles || [];
  const AWARDS = awardsData.awards || [];
  const VIDEOS = (videoData.videos || []).filter((v) => ytId(v.url)).map((v) => ({ ...v, id: ytId(v.url), year: Number(v.year) }));
  const GALLERY = (galleryData.photos || []).filter((g) => g.image).map((g) => ({ src: path(g.image), caption: g.caption }));
  const STAGE = (stageData.performances || []).filter((p) => p.title || p.video || p.youtube);

  /* ── BACKGROUND MUSIC ────────────── */
  // site.json 의 bgm 에 음원 경로를 넣으면 켜집니다. 영상 재생 시 자동으로 멈춥니다.
  const bgm = { el: null, wanted: false };
  const bgmBtn = $("#bgmToggle");
  if (SITE.bgm) {
    bgm.el = new Audio(path(SITE.bgm));
    bgm.el.loop = true;
    bgm.el.volume = 0.35;
    bgmBtn.hidden = false;
    let pref = null;
    try { pref = localStorage.getItem("bgm"); } catch (e) {}
    bgm.wanted = pref !== "off";
    const sync = () => bgmBtn.classList.toggle("on", !bgm.el.paused);
    bgm.el.addEventListener("play", sync);
    bgm.el.addEventListener("pause", sync);
    bgm.play = () => bgm.el.play().catch(() => {});
    bgmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      bgm.wanted = bgm.el.paused;
      try { localStorage.setItem("bgm", bgm.wanted ? "on" : "off"); } catch (err) {}
      bgm.wanted ? bgm.play() : bgm.el.pause();
    });
    // 브라우저는 사용자 동작 전 자동재생을 막으므로, 첫 클릭/터치/키 입력 때 시작
    const kick = (e) => {
      if (e.target.closest && e.target.closest("#bgmToggle, [data-id], video")) return;
      if (bgm.wanted && !anyVideoPlaying()) bgm.play();
      ["pointerdown", "keydown"].forEach((t) => document.removeEventListener(t, kick, true));
    };
    ["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, kick, true));
    bgm.play && bgm.wanted && bgm.el.play().catch(() => {});
  }
  const anyVideoPlaying = () => [...document.querySelectorAll("video")].some((v) => !v.paused) || !$("#videoModal").hidden;
  const pauseBgm = () => { if (bgm.el) bgm.el.pause(); };
  const resumeBgm = () => { if (bgm.el && bgm.wanted && !anyVideoPlaying()) bgm.play(); };
  // 페이지 안의 모든 <video> 재생 시 BGM 정지, 다른 영상도 정지
  document.addEventListener("play", (e) => {
    if (e.target.tagName !== "VIDEO") return;
    pauseBgm();
    document.querySelectorAll("video").forEach((v) => { if (v !== e.target) v.pause(); });
  }, true);
  document.addEventListener("pause", (e) => { if (e.target.tagName === "VIDEO") setTimeout(resumeBgm, 300); }, true);
  document.addEventListener("ended", (e) => { if (e.target.tagName === "VIDEO") setTimeout(resumeBgm, 300); }, true);

  /* ── NAV ─────────────────────────── */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.6);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $("#navToggle").addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    $("#navToggle").setAttribute("aria-expanded", open);
  });
  $("#navLinks").addEventListener("click", (e) => { if (e.target.tagName === "A") nav.classList.remove("open"); });
  const links = [...document.querySelectorAll(".nav-links a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id)); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));

  /* ── ABOUT ───────────────────────── */
  const li = (x) => `<li><span class="yr">${esc(x.year)}</span>${esc(x.title)}${x.detail ? `<span class="sub">${esc(x.detail)}</span>` : ""}</li>`;
  $("#education").innerHTML = (TRAINING.education || []).map(li).join("");
  $("#programs").innerHTML = (TRAINING.programs || []).map(li).join("");
  $("#coaches").innerHTML = (TRAINING.coaches || []).map((c) => `<li>${esc(c.name)}</li>`).join("");

  /* ── SCHEDULE ────────────────────── */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const perfs = PERFORMANCES.filter((p) => p.date).map((p, i) => ({ ...p, _i: i }));
  const isPast = (p) => parse(p.endDate || p.date) < today;
  const upcoming = perfs.filter((p) => !isPast(p)).sort((a, b) => parse(a.date) - parse(b.date));
  const past = perfs.filter(isPast).sort((a, b) => parse(b.date) - parse(a.date));

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
      `UID:${p.date}-${String(p.title).replace(/\W+/g, "")}@junseokhwang`,
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
      <article class="event reveal" id="ev-${p._i}">
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

  /* ── MEDIA: 공연 단위 카드 (영상 1 + 사진 1 + 정보) ── */
  const thumb = (id, q = "hqdefault") => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
  const stageCard = (p) => {
    const yt = ytId(p.youtube);
    const vertical = p.orientation === "vertical";
    const media = p.video
      ? `<div class="stage-video ${vertical ? "vertical" : ""}"><video controls preload="none" playsinline ${p.poster ? `poster="${esc(path(p.poster))}"` : ""} src="${esc(path(p.video))}"></video></div>`
      : yt ? `<div class="stage-video"><div class="ratio" data-id="${yt}" role="button" tabindex="0" aria-label="Play ${esc(p.title)}"><img loading="lazy" src="${thumb(yt, "maxresdefault")}" onerror="this.src='${thumb(yt)}'" alt=""><span class="play"></span></div></div>` : "";
    const program = (p.program || []).filter((x) => x.title);
    const performers = (p.performers || []).filter((x) => x.name);
    const place = [p.venue, p.city].filter(Boolean).join(", ");
    return `
      <article class="stage-card reveal ${vertical ? "is-vertical" : ""}">
        ${media}
        <div class="stage-info">
          <h3 class="stage-title">${esc(p.title)}</h3>
          ${p.date || place ? `<p class="stage-meta">${esc([dotDate(p.date), place].filter(Boolean).join("  ·  "))}</p>` : ""}
          ${p.description ? `<p class="stage-desc">${esc(p.description)}</p>` : ""}
          ${program.length ? `<div class="stage-block"><h4>Program</h4><ul>${program.map((x) => `<li><em>${esc(x.title)}</em>${x.composer ? ` <span>— ${esc(x.composer)}</span>` : ""}</li>`).join("")}</ul></div>` : ""}
          ${performers.length ? `<div class="stage-block"><h4>With</h4><ul>${performers.map((x) => `<li>${esc(x.name)}${x.role ? ` <span>· ${esc(x.role)}</span>` : ""}</li>`).join("")}</ul></div>` : ""}
        </div>
      </article>`;
  };
  const perfCards = STAGE.filter((p) => p.section !== "Studio");
  const studioCards = STAGE.filter((p) => p.section === "Studio");
  $("#stagePerf").innerHTML = perfCards.map(stageCard).join("");
  $("#stageStudio").innerHTML = studioCards.map(stageCard).join("");
  $("#studioHead").hidden = !studioCards.length;

  // YouTube recordings — 간결한 리스트
  $("#recList").innerHTML = VIDEOS.map((v) => `
    <div class="rec" data-id="${esc(v.id)}" role="button" tabindex="0" aria-label="Play ${esc(v.title)}">
      <div class="rec-thumb"><img loading="lazy" src="${thumb(v.id, "mqdefault")}" alt=""><span class="play sm"></span></div>
      <div class="rec-text">
        <div class="rec-title">${esc(v.title)}</div>
        <div class="rec-src">${esc(v.source || "")}</div>
      </div>
      <div class="rec-year">${esc(v.year || "")}</div>
    </div>`).join("");

  const vModal = $("#videoModal"), frame = $("#modalFrame");
  const openVideo = (id) => {
    pauseBgm();
    document.querySelectorAll("video").forEach((v) => v.pause());
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    vModal.hidden = false; document.body.style.overflow = "hidden";
  };
  const closeModals = () => {
    const wasVideo = !vModal.hidden;
    vModal.hidden = true; frame.src = ""; pModal.hidden = true; document.body.style.overflow = "";
    if (wasVideo) setTimeout(resumeBgm, 300);
  };
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-id]"); if (t) openVideo(t.dataset.id); });
  document.addEventListener("keydown", (e) => {
    const t = e.target.closest && e.target.closest("[data-id]");
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openVideo(t.dataset.id); }
  });

  /* ── GALLERY (Stage) ─────────────── */
  $("#galleryGrid").innerHTML = GALLERY.map((g, i) => `<figure data-i="${i}"><img loading="lazy" src="${esc(g.src)}" alt="${esc(g.caption || "Photo")}">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`).join("");
  const pModal = $("#photoModal");
  let lbList = GALLERY, cur = 0;
  const showPhoto = (i) => { cur = (i + lbList.length) % lbList.length; $("#lightboxImg").src = lbList[cur].src; $("#lightboxCap").textContent = lbList[cur].caption || ""; };
  const openLightbox = (list, i) => { lbList = list; showPhoto(i); pModal.hidden = false; document.body.style.overflow = "hidden"; $(".modal-nav.prev").hidden = $(".modal-nav.next").hidden = list.length < 2; };
  $("#galleryGrid").addEventListener("click", (e) => { const f = e.target.closest("figure"); if (f) openLightbox(GALLERY, +f.dataset.i); });
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
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.08 });
  document.querySelectorAll(".section h2, .bio, .training, .reveal, .gallery, .table-wrap").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
})();
