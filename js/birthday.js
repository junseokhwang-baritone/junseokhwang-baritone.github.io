/*
 * 9월 29일(준석이 생일)로 끝나는 일주일(9월 23일~29일) 동안 접속하면 풍선 + 폭죽 + "Happy Birthday!"
 * 미리보기: 주소 뒤에 ?birthday=1
 */
(function () {
  const now = new Date();
  const force = new URLSearchParams(location.search).has("birthday");
  // 생일 주간: 생일(9/29)을 마지막 날로 하는 7일 = 9월 23일 ~ 9월 29일
  const y = now.getFullYear(), today = new Date(y, now.getMonth(), now.getDate());
  const inWeek = today >= new Date(y, 8, 23) && today <= new Date(y, 8, 29);
  if (!force && !inWeek) return;
  (window.siteEntered || Promise.resolve()).then(run);
  function run() {

  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const style = document.createElement("style");
  style.textContent = `
    .bday-layer { position: fixed; inset: 0; pointer-events: none; z-index: 200; overflow: hidden; }
    .bday-balloon { position: absolute; bottom: -160px; width: 56px; height: 70px; border-radius: 50% 50% 48% 48% / 55% 55% 45% 45%;
      animation: bdayRise var(--dur) cubic-bezier(.3,.1,.4,1) var(--delay) forwards; opacity: .95; }
    .bday-balloon::before { content: ""; position: absolute; left: 50%; bottom: -6px; margin-left: -5px; border: 5px solid transparent; border-bottom-color: inherit; border-top: 0;
      border-bottom-color: var(--c); transform: rotate(180deg); }
    .bday-balloon::after { content: ""; position: absolute; left: 50%; top: 100%; width: 1px; height: 90px; background: rgba(0,0,0,.35); }
    .bday-balloon i { position: absolute; left: 22%; top: 16%; width: 20%; height: 26%; border-radius: 50%; background: rgba(255,255,255,.45); }
    @keyframes bdayRise {
      0% { transform: translate(0, 0) rotate(-4deg); }
      25% { transform: translate(var(--sway), -30vh) rotate(4deg); }
      50% { transform: translate(0, -60vh) rotate(-3deg); }
      75% { transform: translate(var(--sway), -90vh) rotate(3deg); }
      100% { transform: translate(0, calc(-100vh - 260px)) rotate(0deg); }
    }
    .bday-msg { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(.9); z-index: 201; text-align: center;
      background: rgba(255,255,255,.96); color: #0b0b0b; padding: 36px 48px 30px; box-shadow: 0 10px 40px rgba(0,0,0,.25);
      opacity: 0; transition: opacity .6s ease, transform .6s ease; max-width: calc(100vw - 32px); }
    .bday-msg.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    .bday-msg h2 { font-family: "Cormorant Garamond", serif; font-weight: 400; font-size: clamp(2.4rem, 8vw, 4.2rem); line-height: 1; margin: 0; }
    .bday-msg h2::after { display: none; }
    .bday-msg p { font-size: .72rem; letter-spacing: .35em; text-transform: uppercase; color: #8a8a8a; margin-top: 14px; }
    .bday-msg .bday-from { font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 1.35rem; letter-spacing: .02em; text-transform: none; color: #4a4a4a; margin-top: 18px; }
    .bday-msg .bday-from span { color: #c0392b; font-style: normal; font-size: 1rem; }
    .bday-msg button { position: absolute; top: 6px; right: 12px; font-size: 1.6rem; font-weight: 200; color: #4a4a4a; background: none; border: 0; cursor: pointer; }
  `;
  document.head.appendChild(style);

  const layer = document.createElement("div");
  layer.className = "bday-layer";
  document.body.appendChild(layer);

  const colors = ["#d4af37", "#0b0b0b", "#e9e4d8", "#c0392b", "#8fa9c7", "#c9a0a0", "#b8b8b8"];
  const balloon = (side, i) => {
    const b = document.createElement("div");
    const c = colors[(i + (side === "left" ? 0 : 3)) % colors.length];
    b.className = "bday-balloon";
    b.innerHTML = "<i></i>";
    b.style.background = c;
    b.style.setProperty("--c", c);
    const edge = 2 + Math.random() * 16; // 화면 양쪽 가장자리
    b.style[side] = edge + "vw";
    b.style.setProperty("--dur", 7 + Math.random() * 4 + "s");
    b.style.setProperty("--delay", i * 0.5 + Math.random() * 0.4 + "s");
    b.style.setProperty("--sway", (side === "left" ? 1 : -1) * (10 + Math.random() * 30) + "px");
    const s = 0.75 + Math.random() * 0.5;
    b.style.width = 56 * s + "px"; b.style.height = 70 * s + "px";
    layer.appendChild(b);
  };
  if (!reduced) for (let i = 0; i < 7; i++) { balloon("left", i); balloon("right", i); }

  // 폭죽 — 화면 양쪽에서 쏘아 올려 터지는 불꽃 + 종이 꽃가루 (외부 라이브러리 없음)
  if (!reduced) {
    const cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:202";
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    const P = [];
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = () => colors[(Math.random() * colors.length) | 0];
    // 양쪽 아래에서 비스듬히 쏘는 꽃가루
    const cannon = (fromLeft) => {
      for (let i = 0; i < 60; i++) {
        const ang = (fromLeft ? rand(-75, -45) : rand(-135, -105)) * Math.PI / 180, sp = rand(9, 17);
        P.push({ x: fromLeft ? 0 : innerWidth, y: innerHeight * 0.85, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.28, drag: 0.985,
          life: rand(110, 170), c: pick(), w: rand(5, 9), h: rand(8, 14), rot: rand(0, 6), vr: rand(-0.3, 0.3), kind: "paper" });
      }
    };
    // 로켓이 올라가 터지는 불꽃
    const rocket = (fromLeft) => {
      const x = fromLeft ? rand(0.06, 0.22) * innerWidth : rand(0.78, 0.94) * innerWidth;
      P.push({ x, y: innerHeight, vx: rand(-0.6, 0.6), vy: -rand(11, 14), g: 0.18, drag: 1, life: 999, c: "#d4af37", kind: "rocket",
        top: rand(0.18, 0.4) * innerHeight });
    };
    const explode = (x, y) => {
      const c1 = pick(), c2 = pick();
      for (let i = 0; i < 80; i++) {
        const ang = rand(0, Math.PI * 2), sp = rand(1.5, 6.5);
        P.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.06, drag: 0.975, life: rand(60, 95), max: 95, c: i % 2 ? c1 : c2, kind: "spark" });
      }
    };
    let shots = 0;
    const timer = setInterval(() => {
      cannon(true); cannon(false); rocket(true); rocket(false);
      if (++shots >= 5) clearInterval(timer);
    }, 900);
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.life--;
        if (p.kind === "rocket") {
          ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
          if (p.y <= p.top || p.vy >= 0) { explode(p.x, p.y); P.splice(i, 1); }
          continue;
        }
        if (p.life <= 0 || p.y > innerHeight + 40) { P.splice(i, 1); continue; }
        if (p.kind === "spark") {
          ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        } else {
          p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.rot * 2)), p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1); ctx.restore();
        }
      }
      if (shots < 5 || P.length) requestAnimationFrame(tick); else cv.remove();
    };
    requestAnimationFrame(tick);
  }

  // 메시지
  const msg = document.createElement("div");
  msg.className = "bday-msg";
  msg.setAttribute("role", "status");
  msg.innerHTML = `<button aria-label="Close">&times;</button><h2>Happy Birthday,<br>Junseok</h2><p class="bday-from">love you — from SH <span>&hearts;</span></p>`;
  document.body.appendChild(msg);
  const close = () => { msg.classList.remove("show"); setTimeout(() => msg.remove(), 700); };
  msg.querySelector("button").addEventListener("click", close);
  requestAnimationFrame(() => setTimeout(() => msg.classList.add("show"), 400));
  setTimeout(close, 8000);
  setTimeout(() => layer.remove(), 16000);
  }
})();
