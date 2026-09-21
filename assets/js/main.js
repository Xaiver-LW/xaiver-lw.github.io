/* =========================================================================
   LINEWELL · 交互脚本
   - 滚动进度 / 导航吸顶与高亮
   - 元素进场动画（IntersectionObserver）
   - 数字滚动 / 对比条动画
   - 首屏视差 / 移动端菜单 / 回到顶部
   ========================================================================= */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 告诉 <head> 中的兜底脚本：动画体系已就绪 */
  window.__linewellReady = true;

  /* ---------------------------------------------------- 滚动进度 & 吸顶 */
  var progress = doc.getElementById("scrollProgress");
  var nav = doc.getElementById("nav");
  var toTop = doc.getElementById("toTop");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || root.scrollTop;
    var max = doc.body.scrollHeight - window.innerHeight;

    if (progress) {
      progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
    }
    if (nav) nav.classList.toggle("is-stuck", y > 40);
    if (toTop) toTop.classList.toggle("is-visible", y > window.innerHeight * 1.2);

    ticking = false;
  }

  function requestScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  /* -------------------------------------------------- 进场动画 & 观察器 */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll(".reveal"));

  if (!("IntersectionObserver" in window) || prefersReduced) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
    var cmp0 = doc.querySelector(".eq-compare");
    if (cmp0) cmp0.classList.add("is-in");
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute("data-delay") || "0", 10);
        el.style.transitionDelay = Math.min(delay, 8) * 85 + "ms";
        el.classList.add("is-in");
        revealObserver.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    revealEls.forEach(function (el) { revealObserver.observe(el); });

    /* 对比条：整块进入视口后再播放 */
    var cmp = doc.querySelector(".eq-compare");
    if (cmp) {
      var cmpObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            cmpObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      cmpObserver.observe(cmp);
    }
  }

  /* ------------------------------------------------------------ 数字滚动 */
  var counters = Array.prototype.slice.call(doc.querySelectorAll(".count"));

  function runCount(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var decimals = (el.getAttribute("data-count") || "").indexOf(".") > -1 ? 1 : 0;
    if (prefersReduced) { el.textContent = target.toFixed(decimals); return; }
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) window.requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    }
    window.requestAnimationFrame(step);
  }

  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(runCount);
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* -------------------------------------------------------- 区块高亮 */
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll("[data-nav]"));
  var railLinks = Array.prototype.slice.call(doc.querySelectorAll("[data-rail]"));
  var rail = doc.getElementById("rail");

  var navIds = {};
  navLinks.forEach(function (a) { navIds[a.getAttribute("data-nav")] = true; });
  var sections = Array.prototype.slice.call(doc.querySelectorAll("section[id]"))
    .filter(function (s) { return navIds[s.id]; });

  function setActive(id) {
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === id);
    });
    railLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-rail") === id);
    });
  }

  if (sections.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
          best = entry;
        }
      });
      if (best) setActive(best.target.id);
    }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.05, 0.25, 0.5] });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  if (rail) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY || root.scrollTop;
      rail.classList.toggle("is-visible", y > window.innerHeight * 0.75);
    }, { passive: true });
  }

  /* ------------------------------------------------------ 首屏视差效果 */
  var parallaxEls = Array.prototype.slice.call(doc.querySelectorAll("[data-parallax]"));
  if (parallaxEls.length && !prefersReduced && window.matchMedia("(min-width: 1025px)").matches) {
    var pointerX = 0, pointerY = 0, scrollY = 0, rafId = null;

    function applyParallax() {
      parallaxEls.forEach(function (el) {
        var k = parseFloat(el.getAttribute("data-parallax")) || 0.08;
        var tx = pointerX * 26 * k;
        var ty = pointerY * 20 * k - scrollY * 0.05 * k * 10;
        el.style.transform = "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0)";
      });
      rafId = null;
    }

    function schedule() {
      if (!rafId) rafId = window.requestAnimationFrame(applyParallax);
    }

    window.addEventListener("mousemove", function (e) {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      schedule();
    }, { passive: true });

    window.addEventListener("scroll", function () {
      scrollY = window.scrollY || root.scrollTop;
      if (scrollY < window.innerHeight * 1.3) schedule();
    }, { passive: true });
  }

  /* --------------------------------------------------------- 移动端菜单 */
  var burger = doc.getElementById("navBurger");
  var menu = doc.getElementById("mobileMenu");

  function closeMenu() {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
  }

  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", open ? "false" : "true");
      menu.classList.toggle("is-open", !open);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
  }

  /* ------------------------------------------------------------ 其它杂项 */
  var yearEl = doc.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* 图片懒加载兜底：为所有非首屏图片补充 decoding 提示 */
  Array.prototype.forEach.call(doc.images, function (img, i) {
    if (i > 1) img.setAttribute("decoding", "async");
  });
})();
