(() => {
  "use strict";

  const CLASS_META = {
    warrior: { label: "Warrior", color: "#ff7d87", restrict: "Warrior" },
    mage: { label: "Mage Priest", color: "#a78bfa", restrict: "Mage" },
    ranger: { label: "Ranger", color: "#6ee7b7", restrict: "Ranger" },
    worge: { label: "Worge", color: "#f6ad55", restrict: "Worge" },
  };

  const SLOT_COLORS = {
    primary: { bg: "rgba(255,125,135,0.18)", fg: "#ff7d87" },
    secondary: { bg: "rgba(96,165,250,0.18)", fg: "#60a5fa" },
    ability: { bg: "rgba(167,139,250,0.18)", fg: "#a78bfa" },
    ultimate: { bg: "rgba(212,175,55,0.20)", fg: "#d4af37" },
  };

  const DATA_PATHS = {
    skillTrees: "data/master-skillTrees.json",
    weaponSkills: "data/master-weaponSkills.json",
  };

  const escHTML = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const fmtNum = (n) => (Number.isFinite(n) ? n.toLocaleString() : "—");

  async function loadJSON(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  }

  function renderCounts(trees, arsenal) {
    document.getElementById("cClasses").textContent = fmtNum(
      trees.totalClasses,
    );
    document.getElementById("cClassSkills").textContent = fmtNum(
      trees.totalSkills,
    );
    document.getElementById("cWeapons").textContent = fmtNum(
      arsenal.totalWeaponTypes,
    );
    document.getElementById("cWeaponSkills").textContent = fmtNum(
      arsenal.totalSkills,
    );
  }

  /* ============================ CLASS SKILL TREES ============================ */
  function renderClassTabs(trees) {
    const tabs = document.getElementById("classTabs");
    tabs.innerHTML = "";
    const order = ["warrior", "mage", "ranger", "worge"];
    order.forEach((key, idx) => {
      const meta = CLASS_META[key];
      if (!trees.skillTrees[key]) return;
      const el = document.createElement("div");
      el.className = "class-tab" + (idx === 0 ? " active" : "");
      el.dataset.class = key;
      el.style.borderColor = meta.color;
      el.style.color = meta.color;
      el.textContent = meta.label;
      el.addEventListener("click", () => {
        document
          .querySelectorAll("#classTabs .class-tab")
          .forEach((t) => t.classList.remove("active"));
        el.classList.add("active");
        renderClassContent(trees, key);
      });
      tabs.appendChild(el);
    });
    renderClassContent(
      trees,
      order.find((k) => trees.skillTrees[k]) || "warrior",
    );
  }

  function renderClassContent(trees, classKey) {
    const tree = trees.skillTrees[classKey];
    const meta = CLASS_META[classKey];
    const host = document.getElementById("classContent");
    if (!tree) {
      host.innerHTML = '<p class="err">Class data missing.</p>';
      return;
    }

    const tiers = (tree.tiers || [])
      .map((tier) => {
        const cards = (tier.skills || [])
          .map((s) => skillCardHTML(s, meta.color))
          .join("");
        return `
        <div class="tier-block">
          <div class="tier-head">
            <h3>${escHTML(tier.name)}</h3>
            <span class="lvl">REQ LEVEL ${escHTML(tier.requiredLevel)}</span>
            <span class="lvl" style="margin-left:auto">${(tier.skills || []).length} skills</span>
          </div>
          <div class="skill-grid">${cards}</div>
        </div>`;
      })
      .join("");

    host.innerHTML = `
      <div style="margin-bottom:18px;color:var(--muted);font-size:0.85em">
        <span style="color:${meta.color};font-family:var(--font-heading);font-size:1.1em">${escHTML(tree.className || meta.label)}</span>
        — ${(tree.tiers || []).reduce((a, t) => a + (t.skills || []).length, 0)} skills across ${(tree.tiers || []).length} tiers
      </div>
      ${tiers}`;
  }

  function skillCardHTML(s, color) {
    const isPassive = !!s.passive;
    const badge = isPassive
      ? `<span class="badge" style="background:rgba(110,231,183,0.15);color:#6ee7b7">PASSIVE</span>`
      : `<span class="badge" style="background:${color}33;color:${color}">ACTIVE</span>`;
    const bonuses = s.bonuses
      ? Object.entries(s.bonuses)
          .map(([k, v]) => `${k}: <b>+${v}</b>`)
          .join(" · ")
      : "";
    const proc = s.procEffect
      ? ` · proc: <b>${escHTML(s.procEffect.type)}</b>${s.procEffect.duration ? ` ${s.procEffect.duration}s` : ""}`
      : "";
    return `
      <div class="skill-card" style="border-left-color:${color}">
        <div class="sc-row">
          ${s.icon ? `<img class="sc-icon" src="${escHTML(s.icon)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
          <div style="flex:1;min-width:0">
            <h4>${escHTML(s.name)} ${badge}</h4>
            <div class="desc">${escHTML(s.description || "")}</div>
            ${s.effect ? `<div class="effect">${escHTML(s.effect)}</div>` : ""}
            <div class="meta">
              ${s.maxPoints ? `Max: <b>${s.maxPoints} pts</b>` : ""}
              ${bonuses ? ` · ${bonuses}` : ""}
              ${proc}
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ============================== WEAPON ARSENAL ============================== */
  let _arsenal = null;
  let _classFilter = "all";

  function renderArsenal(arsenal) {
    _arsenal = arsenal;
    document.querySelectorAll(".arsenal-filters .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document
          .querySelectorAll(".arsenal-filters .chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        _classFilter = chip.dataset.class;
        renderArsenalGrid();
      });
    });
    renderArsenalGrid();
  }

  function renderArsenalGrid() {
    const host = document.getElementById("arsenalContent");
    if (!_arsenal) {
      host.innerHTML = '<p class="err">No arsenal data.</p>';
      return;
    }

    const restrict = _arsenal.classRestrictions || {};
    const allowed = (weaponId) => {
      if (_classFilter === "all") return true;
      const list = restrict[_classFilter] || [];
      return list.includes(weaponId);
    };

    const cards = (_arsenal.weaponTypes || [])
      .filter((w) => allowed(w.id))
      .map(weaponCardHTML)
      .join("");

    host.innerHTML = `<div class="weapon-grid">${cards || '<p class="loading">No weapons match this filter.</p>'}</div>`;

    host.querySelectorAll(".weapon-card .wc-head").forEach((head) => {
      head.addEventListener("click", () =>
        head.parentElement.classList.toggle("open"),
      );
    });
  }

  function weaponCardHTML(w) {
    const classList =
      Object.entries(_arsenal.classRestrictions || {})
        .filter(([, ids]) => ids.includes(w.id))
        .map(([cls]) => (cls === "Mage" ? "Mage Priest" : cls))
        .join(" · ") || "All Classes";

    const slotsHtml = (w.slots || [])
      .map((slot) => {
        const c = SLOT_COLORS[slot.type] || SLOT_COLORS.primary;
        const skills = (slot.skills || [])
          .sort((a, b) => (a.tier || 0) - (b.tier || 0))
          .map((sk) => weaponSkillHTML(sk, c.fg))
          .join("");
        return `
          <div class="slot-block">
            <div class="slot-label">
              <span class="pill" style="background:${c.bg};color:${c.fg}">${escHTML(slot.label)}</span>
              <span class="unlock">unlocks @ tier ${escHTML(slot.unlockTier)} · ${(slot.skills || []).length} skills</span>
            </div>
            <div class="slot-skills">${skills}</div>
          </div>`;
      })
      .join("");

    return `
      <article class="weapon-card">
        <header class="wc-head">
          ${w.icon ? `<img src="https://molochdagod.github.io/ObjectStore${escHTML(w.icon)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ""}
          <div class="wc-name">
            <h3>${escHTML(w.name)}</h3>
            <div class="wc-classes">${escHTML(classList)}</div>
          </div>
          <div class="wc-count">${escHTML(w.totalSkills || 0)} skills ▾</div>
        </header>
        <div class="wc-body">${slotsHtml}</div>
      </article>`;
  }

  function weaponSkillHTML(s, color) {
    const meta = [];
    if (s.damage) meta.push(`dmg <b>${s.damage}</b>`);
    if (s.cooldown) meta.push(`cd <b>${s.cooldown}s</b>`);
    if (s.range) meta.push(`rng <b>${s.range}m</b>`);
    if (s.castTime) meta.push(`cast <b>${s.castTime}s</b>`);
    if (s.damageType) meta.push(`type <b>${escHTML(s.damageType)}</b>`);
    const effects = (s.effects || []).map((e) => escHTML(e)).join(" · ");

    return `
      <div class="ws-card" style="border-left-color:${color}">
        ${s.icon ? `<img src="${escHTML(s.icon)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ""}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
            <span class="ws-name">${escHTML(s.name)}</span>
            <span class="ws-tier">T${escHTML(s.tier || 1)}</span>
          </div>
          ${s.description ? `<div class="ws-desc">${escHTML(s.description)}</div>` : ""}
          ${effects ? `<div class="ws-desc" style="color:var(--gold-light)">${effects}</div>` : ""}
          ${meta.length ? `<div class="ws-meta">${meta.join(" · ")}</div>` : ""}
        </div>
      </div>`;
  }

  /* =================================== BOOT =================================== */
  function setupModeTabs() {
    document.querySelectorAll(".mode-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".mode-tabs button")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const mode = btn.dataset.mode;
        document
          .querySelectorAll(".mode-section")
          .forEach((s) => s.classList.remove("active"));
        document.getElementById("mode-" + mode).classList.add("active");
      });
    });
  }

  async function init() {
    setupModeTabs();
    try {
      const [trees, arsenal] = await Promise.all([
        loadJSON(DATA_PATHS.skillTrees),
        loadJSON(DATA_PATHS.weaponSkills),
      ]);
      renderCounts(trees, arsenal);
      renderClassTabs(trees);
      renderArsenal(arsenal);
    } catch (err) {
      console.error("[spells-skills] load failure", err);
      document.getElementById("classContent").innerHTML =
        `<p class="err">Failed to load skill data: ${escHTML(err.message)}</p>`;
      document.getElementById("arsenalContent").innerHTML =
        `<p class="err">Failed to load arsenal: ${escHTML(err.message)}</p>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
