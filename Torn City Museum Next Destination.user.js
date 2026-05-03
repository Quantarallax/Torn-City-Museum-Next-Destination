// ==UserScript==
// @name         TORN CITY Museum Next Destination
// @namespace    sanxion.tc.museumnextdestination
// @version      1.0.15
// @description  Highlights the plushies and flowers of which you have least stock. Shows which countries to visit next.
// @author       Sanxion [2987640]
// @match        https://www.torn.com/museum.php*
// @updateURL    https://github.com/Quantarallax/Torn-City-Museum-Next-Destination/raw/refs/heads/main/Torn%20City%20Museum%20Next%20Destination.user.js
// @downloadURL  https://github.com/Quantarallax/Torn-City-Museum-Next-Destination/raw/refs/heads/main/Torn%20City%20Museum%20Next%20Destination.user.js
// @license      MIT
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  /* =========================================================
   * CONSTANTS
   * ========================================================= */

  const SCRIPT_NAME = 'TORN CITY Museum Next Destination';
  const VERSION = '1.0.15';
  const AUTHOR_NAME = 'Sanxion';
  const AUTHOR_ID = '2987640';
  const STORAGE_KEY_API = 'tcmnd_apiKey';
  const STORAGE_KEY_PANEL_LEFT = 'tcmnd_panelLeft';
  const STORAGE_KEY_PANEL_TOP = 'tcmnd_panelTop';
  const API_BASE = 'https://api.torn.com/user/';
  const LOG_TAG = '[TCMND]';

  /**
   * Selector for Torn City museum item images.
   * The src HTML attribute is a relative path (/images/items/186/large.png),
   * so matching by CSS class is the only reliable approach.
   */
  const ITEM_IMG_SELECTOR = 'img.torn-item.large';

  /**
   * Torn has deprecated the `inventory` API selection (returns the string
   * "The inventory selection is no longer available").
   *
   * Item counts are now read directly from the museum page DOM, which
   * already shows Torn's own computed totals (inventory + display cabinet).
   * The `display` API selection is retained as a fallback only.
   */
  const PLUSHIE_SECTION_TEXT = 'To exchange a Plushie set for 10 points';
  const FLOWER_SECTION_TEXT = 'To exchange an Exotic flower set for 10 points';

  /** Plushie collection — 13 items. "Torn City" = obtained in-city. */
  const PLUSHIE_ITEMS = {
    'Sheep Plushie': 'Torn City',
    'Teddy Bear Plushie': 'Torn City',
    'Kitten Plushie': 'Torn City',
    'Jaguar Plushie': 'Mexico',
    'Wolverine Plushie': 'Canada',
    'Nessie Plushie': 'United Kingdom',
    'Red Fox Plushie': 'United Kingdom',
    'Monkey Plushie': 'Argentina',
    'Chamois Plushie': 'Switzerland',
    'Panda Plushie': 'China',
    'Lion Plushie': 'South Africa',
    'Camel Plushie': 'United Arab Emirates',
    'Stingray Plushie': 'Cayman Islands'
  };

  /** Flower collection — 11 items. Tribulus Omanense is native to the UAE. */
  const FLOWER_ITEMS = {
    'Dahlia': 'Mexico',
    'Orchid': 'Hawaii',
    'African Violet': 'South Africa',
    'Cherry Blossom': 'Japan',
    'Peony': 'China',
    'Ceibo Flower': 'Argentina',
    'Edelweiss': 'Switzerland',
    'Crocus': 'Canada',
    'Heather': 'United Kingdom',
    'Tribulus Omanense': 'United Arab Emirates',
    'Banana Orchid': 'Cayman Islands'
  };

  const ITEM_COUNTRIES = Object.assign({}, PLUSHIE_ITEMS, FLOWER_ITEMS);
  const PLUSHIE_NAMES = Object.keys(PLUSHIE_ITEMS);
  const FLOWER_NAMES = Object.keys(FLOWER_ITEMS);
  const ALL_ITEM_NAMES = PLUSHIE_NAMES.concat(FLOWER_NAMES);

  const COL_RED = '#e84545';
  const COL_YELLOW = '#f5c518';
  const COL_GREEN = '#3cb371';
  const COL_RED_BG = 'rgba(232, 69, 69, 0.15)';
  const COL_YELLOW_BG = 'rgba(245, 197, 24, 0.15)';
  const COL_GREEN_BG = 'rgba(60, 179, 113, 0.15)';

  const TIER_CSS = ['red', 'yellow', 'green'];
  const HL_CLASSES = ['tcmnd-hl-red', 'tcmnd-hl-yellow', 'tcmnd-hl-green'];

  /* =========================================================
   * STYLES
   * ========================================================= */

  GM_addStyle(`
    .tcmnd-hl-red {
      outline: 3px solid ${COL_RED} !important;
      box-shadow: 0 0 10px rgba(232, 69, 69, 0.55) !important;
      background: ${COL_RED_BG} !important;
      border-radius: 6px;
      position: relative !important;
      overflow: visible !important;
      z-index: 1;
    }
    .tcmnd-hl-yellow {
      outline: 3px solid ${COL_YELLOW} !important;
      box-shadow: 0 0 10px rgba(245, 197, 24, 0.55) !important;
      background: ${COL_YELLOW_BG} !important;
      border-radius: 6px;
      position: relative !important;
      overflow: visible !important;
      z-index: 1;
    }
    .tcmnd-hl-green {
      outline: 3px solid ${COL_GREEN} !important;
      box-shadow: 0 0 10px rgba(60, 179, 113, 0.55) !important;
      background: ${COL_GREEN_BG} !important;
      border-radius: 6px;
      position: relative !important;
      overflow: visible !important;
      z-index: 1;
    }
    .tcmnd-country {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 4px 3px;
      border-radius: 0 0 5px 5px;
      white-space: nowrap;
      line-height: 1.2;
      pointer-events: none;
      background: rgba(13, 13, 22, 0.88);
    }
    .tcmnd-country-red { color: ${COL_RED}; border-top: 1px solid ${COL_RED}; }
    .tcmnd-country-yellow { color: #c9a300; border-top: 1px solid #c9a300; }
    .tcmnd-country-green { color: #2a9058; border-top: 1px solid #2a9058; }
    .tcmnd-badge {
      position: absolute;
      top: 4px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      pointer-events: none;
      line-height: 1;
    }
    .tcmnd-badge-red { background: ${COL_RED}; }
    .tcmnd-badge-yellow { background: #c9a300; }
    .tcmnd-badge-green { background: #2a9058; }
    #tcmnd-toolbar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
      margin-top: 2em;
      vertical-align: middle;
    }
    #tcmnd-countdown {
      display: block;
      font-size: 11px;
      font-family: 'Lucida Console', 'Courier New', monospace;
      color: #8888cc;
      margin-top: 4px;
      min-height: 1em;
      padding-left: 4px;
    }
    #tcmnd-cog {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      width: 22px;
      height: 22px;
      font-size: 15px;
      cursor: pointer;
      color: #999;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      transition: color 0.15s, border-color 0.15s;
      line-height: 1;
      flex-shrink: 0;
    }
    #tcmnd-cog:hover { color: #fff; border-color: #555; }
    #tcmnd-api-status {
      font-size: 11px;
      font-family: 'Lucida Console', 'Courier New', monospace;
      white-space: nowrap;
    }
    .tcmnd-api-warn { color: ${COL_RED}; }
    .tcmnd-api-ok { color: ${COL_GREEN}; }
    #tcmnd-panel {
      position: fixed;
      z-index: 999999;
      width: 340px;
      background: #13131f;
      border: 1px solid #3a3a55;
      border-radius: 10px;
      box-shadow: 0 6px 32px rgba(0, 0, 0, 0.85);
      font-family: 'Lucida Console', 'Courier New', monospace;
      font-size: 12px;
      color: #ccc;
      box-sizing: border-box;
      user-select: none;
    }
    #tcmnd-panel * { box-sizing: border-box; }
    .tcmnd-drag-handle {
      padding: 14px 18px 10px;
      cursor: move;
      border-bottom: 1px solid #2a2a40;
      border-radius: 10px 10px 0 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .tcmnd-drag-handle:active { cursor: grabbing; }
    .tcmnd-panel-title { flex: 1; }
    #tcmnd-panel h2 {
      margin: 0 0 2px;
      font-size: 13px;
      color: #e8e8ff;
      font-weight: 700;
      line-height: 1.3;
    }
    .tcmnd-ver { font-size: 10px; color: #555; }
    .tcmnd-panel-body { padding: 14px 18px 16px; }
    .tcmnd-sep {
      border: none;
      border-top: 1px solid #2a2a40;
      margin: 12px 0;
    }
    .tcmnd-section-title {
      font-size: 11px;
      color: #7878aa;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 8px;
    }
    #tcmnd-panel label {
      display: block;
      margin-bottom: 4px;
      color: #aaa;
      font-size: 11px;
    }
    #tcmnd-panel input[type="text"],
    #tcmnd-panel input[type="password"] {
      width: 100%;
      padding: 6px 8px;
      background: #0c0c1a;
      border: 1px solid #3a3a55;
      border-radius: 5px;
      color: #e0e0ff;
      font-size: 11px;
      font-family: 'Lucida Console', 'Courier New', monospace;
      margin-bottom: 5px;
      transition: border-color 0.15s;
    }
    #tcmnd-panel input[type="text"]:focus,
    #tcmnd-panel input[type="password"]:focus {
      border-color: #5a5a88;
      outline: none;
    }
    .tcmnd-key-type-note {
      font-size: 10px;
      color: #7878aa;
      margin-bottom: 5px;
      line-height: 1.5;
    }
    .tcmnd-key-type-note strong { color: #9898cc; }
    .tcmnd-api-note {
      font-size: 10px;
      color: #555;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .tcmnd-api-note strong { color: #888; }
    .tcmnd-row {
      display: flex;
      gap: 6px;
      margin-bottom: 5px;
    }
    .tcmnd-btn {
      flex: 1;
      padding: 6px 8px;
      font-size: 11px;
      font-family: 'Lucida Console', 'Courier New', monospace;
      cursor: pointer;
      border-radius: 5px;
      border: 1px solid #3a3a55;
      background: #1e1e35;
      color: #ccc;
      transition: background 0.15s, color 0.15s;
    }
    .tcmnd-btn:hover { background: #2a2a50; color: #fff; }
    .tcmnd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .tcmnd-btn-test {
      background: #0e2a1a;
      border-color: #2a5a3a;
      color: #5a9;
    }
    .tcmnd-btn-test:hover { background: #1a3a28; color: #7bc; }
    .tcmnd-btn-refresh {
      background: #1a1a35;
      border-color: #3a3a66;
      color: #8888cc;
    }
    .tcmnd-btn-refresh:hover { background: #22224a; color: #aaaaee; }
    #tcmnd-close-btn {
      width: 22px;
      min-width: 22px;
      height: 22px;
      padding: 0;
      font-size: 14px;
      line-height: 1;
      background: #1e1e35;
      border: 1px solid #3a3a55;
      border-radius: 4px;
      color: #777;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background 0.15s;
      flex-shrink: 0;
      align-self: flex-start;
    }
    #tcmnd-close-btn:hover { background: #2a2a50; color: #fff; }
    .tcmnd-status {
      font-size: 10px;
      margin-top: 4px;
      min-height: 14px;
      line-height: 1.5;
      color: #5a9;
    }
    .tcmnd-status-err { color: ${COL_RED}; }
    .tcmnd-status-ok { color: ${COL_GREEN}; }
    .tcmnd-credits {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #1e1e30;
      font-size: 10px;
      color: #444;
      line-height: 1.6;
    }
    .tcmnd-credits a { color: #6868aa; text-decoration: none; }
    .tcmnd-credits a:hover { color: #9898cc; }
  `);

  /* =========================================================
   * STORAGE
   * ========================================================= */

  function saveApiKey(key) {
    GM_setValue(STORAGE_KEY_API, key);
  }

  function loadApiKey() {
    return GM_getValue(STORAGE_KEY_API, '');
  }

  function savePanelPosition(leftPx, topPx) {
    GM_setValue(STORAGE_KEY_PANEL_LEFT, String(Math.round(leftPx)));
    GM_setValue(STORAGE_KEY_PANEL_TOP, String(Math.round(topPx)));
  }

  function loadPanelPosition() {
    return {
      left: GM_getValue(STORAGE_KEY_PANEL_LEFT, ''),
      top: GM_getValue(STORAGE_KEY_PANEL_TOP, '')
    };
  }

  /* =========================================================
   * API CALLS
   *
   * NOTE: The Torn `inventory` selection is deprecated and now returns
   * the string "The inventory selection is no longer available".
   * Item counts are read directly from the page DOM instead.
   * The `display` selection is retained as a fallback count source only.
   * ========================================================= */

  async function fetchDisplayData(apiKey) {
    try {
      const apiUrl = API_BASE + '?selections=display&key=' + apiKey;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    } catch (err) {
      console.error(LOG_TAG, 'fetchDisplayData failed:', err);
      throw err;
    }
  }

  async function fetchBasicProfile(apiKey) {
    try {
      const profileUrl = API_BASE + '?selections=basic&key=' + apiKey;
      const response = await fetch(profileUrl);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    } catch (err) {
      console.error(LOG_TAG, 'fetchBasicProfile failed:', err);
      throw err;
    }
  }

  async function fetchCalendarData(apiKey) {
    try {
      const calUrl = API_BASE + '?selections=calendar&key=' + apiKey;
      const response = await fetch(calUrl);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    } catch (err) {
      console.error(LOG_TAG, 'fetchCalendarData failed:', err);
      return null;
    }
  }

  /* =========================================================
   * DOM HELPERS
   * ========================================================= */

  function findElementByText(searchText) {
    const lc = searchText.toLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent.toLowerCase().includes(lc)) {
        return node.parentElement;
      }
      node = walker.nextNode();
    }
    return null;
  }

  function extractItemId(img) {
    const match = img.src.match(/\/items\/(\d+)\//);
    return match ? parseInt(match[1], 10) : null;
  }

  function buildIdToNameMapFromDOM() {
    const map = {};
    const imgs = document.querySelectorAll(ITEM_IMG_SELECTOR);

    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const itemId = extractItemId(img);
      if (!itemId) continue;

      let el = img.parentElement;
      for (let up = 0; up < 10; up++) {
        if (!el || el === document.body) break;
        const elText = el.textContent;
        for (let n = 0; n < ALL_ITEM_NAMES.length; n++) {
          const name = ALL_ITEM_NAMES[n];
          if (elText.includes(name) && !map[itemId]) {
            map[itemId] = name;
            break;
          }
        }
        if (map[itemId]) break;
        el = el.parentElement;
      }
    }

    if (Object.keys(map).length > 0) {
      console.log(LOG_TAG, 'DOM item ID map:', JSON.stringify(map));
    } else {
      console.warn(LOG_TAG, 'DOM item ID map empty — no ' + ITEM_IMG_SELECTOR + ' on page.');
      logDomStructure();
    }
    return map;
  }

  /**
   * Read the item stock count directly from the container element.
   *
   * Torn's museum page already shows each player's total stock (inventory
   * + display cabinet combined) next to each item image. This function
   * finds that number by scanning text nodes in the container.
   *
   * We look for text nodes that contain ONLY digits (and optional comma
   * separators for thousands), ignoring the item name text itself and
   * any script-generated elements (badges / country labels are cleared
   * before this function is called).
   *
   * Returns the count as an integer, or null if no count was found.
   */
  function extractDomCount(containerEl, itemName) {
    if (!containerEl) return null;

    const lcName = itemName.toLowerCase();
    const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null, false);
    let node = walker.nextNode();

    while (node) {
      const raw = node.textContent.trim();

      // Skip empty nodes and nodes that include the item name (those are label/name elements)
      if (!raw || raw.toLowerCase().includes(lcName)) {
        node = walker.nextNode();
        continue;
      }

      // Accept purely numeric text (with optional comma thousands separators)
      const cleaned = raw.replace(/,/g, '');
      if (/^\d+$/.test(cleaned) && cleaned.length >= 1 && cleaned.length <= 8) {
        const num = parseInt(cleaned, 10);
        if (num >= 0) {
          return num;
        }
      }

      node = walker.nextNode();
    }

    return null;
  }

  function logDomStructure() {
    const firstImg = document.querySelector(ITEM_IMG_SELECTOR);
    if (!firstImg) {
      const allImgs = document.querySelectorAll('img');
      console.log(LOG_TAG, 'No ' + ITEM_IMG_SELECTOR + ' found. Total imgs:', allImgs.length);
      const srcs = [];
      for (let i = 0; i < Math.min(6, allImgs.length); i++) {
        srcs.push(allImgs[i].src);
      }
      console.log(LOG_TAG, 'Sample img srcs:', srcs.join(' | '));
      return;
    }
    console.log(LOG_TAG, 'First torn-item src attr:', firstImg.getAttribute('src'));
    let el = firstImg.parentElement;
    for (let up = 0; up < 8; up++) {
      if (!el || el === document.body) break;
      const imgCount = el.querySelectorAll(ITEM_IMG_SELECTOR).length;
      const preview = el.textContent.trim().replace(/\s+/g, ' ').substring(0, 80);
      console.log(LOG_TAG, 'Ancestor[' + up + ']: <' + el.tagName.toLowerCase() + ' class="' + (el.className || '') + '"> imgs=' + imgCount + ' text="' + preview + '"');
      el = el.parentElement;
    }
  }

  /* =========================================================
   * ITEM COUNT LOGIC
   * =========================================================
   *
   * Count sources (in priority order):
   *
   *  1. DOM  — Torn's own displayed count for each item on the museum page.
   *            This already combines inventory + display cabinet + any other
   *            source Torn uses. This is the most accurate and complete source.
   *
   *  2. Display API — items found in the display cabinet via API.
   *            Used only as fallback when a DOM count could not be extracted
   *            (avoids double-counting since DOM already includes display data).
   */

  function toArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'object') {
      console.warn(LOG_TAG, 'toArray: unexpected type "' + (typeof raw) + '", skipping.');
      return [];
    }
    return Object.values(raw);
  }

  /**
   * Build the final item counts map.
   *
   * IMPORTANT: The Torn museum page shows INVENTORY counts ONLY.
   * Display cabinet totals are NOT included in the page figures.
   * The correct total is therefore:  inventory (DOM) + display cabinet (API).
   *
   * @param {Object} displayData - API response from fetchDisplayData
   * @param {Object} domCounts   - { itemName → number|null } from extractDomCount calls
   */
  function buildAllCounts(displayData, domCounts) {
    const counts = {};
    ALL_ITEM_NAMES.forEach(function (name) {
      counts[name] = 0;
    });

    const lcLookup = {};
    ALL_ITEM_NAMES.forEach(function (name) {
      lcLookup[name.toLowerCase()] = name;
    });

    // Step 1: Add inventory counts from DOM (museum page = inventory only)
    if (domCounts) {
      ALL_ITEM_NAMES.forEach(function (name) {
        const domVal = domCounts[name];
        if (domVal !== null && domVal !== undefined) {
          counts[name] += domVal;
        }
      });

      const domFound = ALL_ITEM_NAMES.filter(function (n) {
        return domCounts[n] !== null && domCounts[n] !== undefined;
      });
      console.log(LOG_TAG, 'DOM inventory counts (' + String(domFound.length) + ' items):', domFound.map(function (n) {
        return n + '=' + String(domCounts[n]);
      }).join(', ') || 'none');
    }

    // Step 2: Add display cabinet counts on top (total = inventory + display cabinet)
    const displayArr = toArray(displayData ? displayData.display : null);
    const displayMatched = [];

    displayArr.forEach(function (item) {
      if (!item || !item.name) return;
      const qty = item.quantity || 0;
      const canonical = lcLookup[item.name.toLowerCase()];
      if (canonical) {
        counts[canonical] += qty;
        displayMatched.push(canonical + '=' + String(qty));
      }
    });

    if (displayMatched.length > 0) {
      console.log(LOG_TAG, 'Display cabinet added to totals:', displayMatched.join(', '));
    }

    // Log combined totals for all items with non-zero count
    const nonZeroTotals = ALL_ITEM_NAMES.filter(function (n) { return counts[n] > 0; });
    if (nonZeroTotals.length > 0) {
      console.log(LOG_TAG, 'Final totals (inventory + display):', nonZeroTotals.map(function (n) {
        return n + '=' + String(counts[n]);
      }).join(', '));
    }

    return counts;
  }

  /* =========================================================
   * HIGHLIGHT ASSIGNMENT LOGIC
   * =========================================================
   *
   * Zero-quantity rules:
   *
   *  0 zeros  → red / yellow / green for the 3 lowest non-zero items
   *  1 zero   → red(zero), yellow(1st non-zero), green(2nd non-zero)
   *  2 zeros  → red(zero), red(zero), yellow(1st non-zero)
   *  ≥ 3 zeros → ALL zeros get red; no yellow or green
   */

  function getHighlightAssignments(counts, sectionNames) {
    const zeros = [];
    const nonZeros = [];

    sectionNames.forEach(function (name) {
      const count = counts[name] || 0;
      if (count === 0) {
        zeros.push({ name: name, count: 0 });
      } else {
        nonZeros.push({ name: name, count: count });
      }
    });

    nonZeros.sort(function (a, b) { return a.count - b.count; });

    const assignments = [];

    if (zeros.length === 0) {
      if (nonZeros.length >= 1) assignments.push({ name: nonZeros[0].name, count: nonZeros[0].count, colorIndex: 0 });
      if (nonZeros.length >= 2) assignments.push({ name: nonZeros[1].name, count: nonZeros[1].count, colorIndex: 1 });
      if (nonZeros.length >= 3) assignments.push({ name: nonZeros[2].name, count: nonZeros[2].count, colorIndex: 2 });
    } else if (zeros.length === 1) {
      assignments.push({ name: zeros[0].name, count: 0, colorIndex: 0 });
      if (nonZeros.length >= 1) assignments.push({ name: nonZeros[0].name, count: nonZeros[0].count, colorIndex: 1 });
      if (nonZeros.length >= 2) assignments.push({ name: nonZeros[1].name, count: nonZeros[1].count, colorIndex: 2 });
    } else if (zeros.length === 2) {
      assignments.push({ name: zeros[0].name, count: 0, colorIndex: 0 });
      assignments.push({ name: zeros[1].name, count: 0, colorIndex: 0 });
      if (nonZeros.length >= 1) assignments.push({ name: nonZeros[0].name, count: nonZeros[0].count, colorIndex: 1 });
    } else {
      // 3 or more zeros — all zeros get red only
      zeros.forEach(function (item) {
        assignments.push({ name: item.name, count: 0, colorIndex: 0 });
      });
    }

    return assignments;
  }

  /* =========================================================
   * CONTAINER MAP BUILDING
   * =========================================================
   *
   * Three strategies applied in order:
   *
   *  A — text-first : find item name text node, walk UP to the
   *      NEAREST ancestor that contains exactly ONE torn-item image.
   *      The imgCount === 1 guard prevents overly-broad containers.
   *
   *  B — image-first fallback: walk outward from each image,
   *      stopping at the first single-image ancestor whose text
   *      contains the item name.
   *
   *  C — text-only fallback: for zero-stock items that Torn may
   *      render without a standard torn-item image (greyed-out,
   *      placeholder, or different class). Uses the smallest
   *      block-level ancestor containing the item name.
   */

  function buildContainerMapFromPage(itemNames) {
    const map = {};

    // Strategy A — text-first
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node = walker.nextNode();

    while (node) {
      const nodeText = node.textContent.trim();

      for (let n = 0; n < itemNames.length; n++) {
        const name = itemNames[n];
        if (map[name]) continue;

        if (nodeText === name || nodeText.startsWith(name)) {
          let ancestor = node.parentElement;
          for (let up = 0; up < 12; up++) {
            if (!ancestor || ancestor === document.body) break;
            const imgCount = ancestor.querySelectorAll(ITEM_IMG_SELECTOR).length;
            if (imgCount === 1) {
              map[name] = ancestor;
              break;
            }
            if (imgCount > 1) break; // Too broad — stop ascending
            ancestor = ancestor.parentElement;
          }
        }
      }

      node = walker.nextNode();
    }

    // Strategy B — image-first fallback
    const stillMissingB = itemNames.filter(function (name) { return !map[name]; });
    if (stillMissingB.length > 0) {
      const imgs = document.querySelectorAll(ITEM_IMG_SELECTOR);

      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        let el = img.parentElement;
        let done = false;

        for (let up = 0; up < 12 && !done; up++) {
          if (!el || el === document.body) break;

          const imgCount = el.querySelectorAll(ITEM_IMG_SELECTOR).length;
          if (imgCount > 1) break;

          const elText = el.textContent;
          for (let m = 0; m < stillMissingB.length; m++) {
            const name = stillMissingB[m];
            if (elText.includes(name) && !map[name]) {
              map[name] = el;
              done = true;
              break;
            }
          }

          if (!done) el = el.parentElement;
        }
      }
    }

    // Strategy C — text-only fallback (zero-stock items may have no torn-item image)
    const stillMissingC = itemNames.filter(function (name) { return !map[name]; });
    if (stillMissingC.length > 0) {
      const BLOCK_TAGS = { li: 1, td: 1, tr: 1, div: 1, article: 1, section: 1 };
      const walker2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node2 = walker2.nextNode();

      while (node2) {
        const text2 = node2.textContent.trim();

        for (let n = 0; n < stillMissingC.length; n++) {
          const name = stillMissingC[n];
          if (map[name]) continue;

          if (text2 === name || text2.startsWith(name)) {
            let anc = node2.parentElement;
            for (let up = 0; up < 8; up++) {
              if (!anc || anc === document.body) break;
              if (BLOCK_TAGS[anc.tagName.toLowerCase()]) {
                map[name] = anc;
                break;
              }
              anc = anc.parentElement;
            }
          }
        }

        node2 = walker2.nextNode();
      }

      const foundC = stillMissingC.filter(function (name) { return map[name]; });
      if (foundC.length > 0) {
        console.log(LOG_TAG, 'Strategy C (text-only) found containers for:', foundC.join(', '));
      }
    }

    return map;
  }

  /* =========================================================
   * HIGHLIGHT APPLICATION
   * ========================================================= */

  function clearHighlights() {
    HL_CLASSES.forEach(function (cls) {
      document.querySelectorAll('.' + cls).forEach(function (el) {
        el.classList.remove(cls);
        el.style.removeProperty('padding-bottom');
      });
    });
    document.querySelectorAll('.tcmnd-country, .tcmnd-badge').forEach(function (el) {
      el.remove();
    });
    // Restore ancestor overflow values that were changed for clipping prevention
    document.querySelectorAll('.tcmnd-ovfix').forEach(function (el) {
      el.style.removeProperty('overflow');
      el.classList.remove('tcmnd-ovfix');
    });
  }

  /**
   * Walk up to 4 parent levels and change overflow: hidden → visible so that
   * the highlight outline and country label are never clipped. Marks changed
   * elements with .tcmnd-ovfix so clearHighlights() can restore them.
   */
  function makeAncestorsOverflowVisible(el) {
    let parent = el.parentElement;
    for (let d = 0; d < 4 && parent && parent !== document.body; d++) {
      const ov = window.getComputedStyle(parent).overflow;
      const ofy = window.getComputedStyle(parent).overflowY;
      if (ov === 'hidden' || ofy === 'hidden') {
        parent.style.setProperty('overflow', 'visible', 'important');
        parent.classList.add('tcmnd-ovfix');
      }
      parent = parent.parentElement;
    }
  }

  function applyHighlightsForSection(counts, containerMap, sectionNames) {
    const assignments = getHighlightAssignments(counts, sectionNames);

    console.log(LOG_TAG, 'Highlight assignments:', assignments.map(function (a) {
      return a.name + '(x' + String(a.count) + ')=' + TIER_CSS[a.colorIndex];
    }).join(', '));

    // Log any items that should be highlighted but have no container
    const missing = assignments.filter(function (a) { return !containerMap[a.name]; });
    if (missing.length > 0) {
      console.warn(LOG_TAG, 'No container found for:', missing.map(function (a) {
        return '"' + a.name + '"';
      }).join(', '));
    }

    let applied = 0;

    assignments.forEach(function (assignment) {
      let container = containerMap[assignment.name];
      if (!container) return;

      if (container.tagName === 'IMG' || container.tagName === 'INPUT') {
        container = container.parentElement || container;
      }

      container.classList.add(HL_CLASSES[assignment.colorIndex]);
      container.style.setProperty('position', 'relative', 'important');
      container.style.setProperty('overflow', 'visible', 'important');
      // Extra bottom space so the country label strip sits inside the box
      container.style.setProperty('padding-bottom', '18px', 'important');
      // Fix parent overflow so the outline and country label aren't clipped
      makeAncestorsOverflowVisible(container);

      const badge = document.createElement('span');
      badge.className = 'tcmnd-badge tcmnd-badge-' + TIER_CSS[assignment.colorIndex];
      badge.textContent = String(assignment.count);
      container.appendChild(badge);

      const country = ITEM_COUNTRIES[assignment.name] || 'Unknown';
      const label = document.createElement('span');
      label.className = 'tcmnd-country tcmnd-country-' + TIER_CSS[assignment.colorIndex];
      label.textContent = '\u2708 ' + country;
      container.appendChild(label);

      applied++;
    });

    return applied;
  }

  /* =========================================================
   * COG STATUS LABEL
   * ========================================================= */

  function updateCogStatus() {
    const statusEl = document.getElementById('tcmnd-api-status');
    if (!statusEl) return;
    if (loadApiKey()) {
      statusEl.textContent = 'API key entered.';
      statusEl.className = 'tcmnd-api-status tcmnd-api-ok';
    } else {
      statusEl.textContent = 'API key required.';
      statusEl.className = 'tcmnd-api-status tcmnd-api-warn';
    }
  }

  /* =========================================================
   * SETTINGS PANEL — HTML
   * ========================================================= */

  function buildPanelHTML(savedKey) {
    const inputType = savedKey ? 'password' : 'text';
    return (
      '<div class="tcmnd-drag-handle">' +
      '<div class="tcmnd-panel-title">' +
      '<h2>' + SCRIPT_NAME + '</h2>' +
      '<div class="tcmnd-ver">Version ' + VERSION + '</div>' +
      '</div>' +
      '<button id="tcmnd-close-btn" title="Close">&times;</button>' +
      '</div>' +

      '<div class="tcmnd-panel-body">' +
      '<p class="tcmnd-section-title">Settings</p>' +

      '<label for="tcmnd-api-input">Torn API Key</label>' +
      '<input' +
      ' type="' + inputType + '"' +
      ' id="tcmnd-api-input"' +
      ' placeholder="Paste your API key here"' +
      ' value="' + savedKey + '"' +
      ' autocomplete="off"' +
      ' spellcheck="false"' +
      '>' +
      '<p class="tcmnd-key-type-note">' +
      'Requires a <strong>Limited Access</strong> API key or higher. ' +
      'Generate one via Torn \u2192 Settings \u2192 API Keys. ' +
      'Entering a new key replaces any previously saved key.' +
      '</p>' +
      '<p class="tcmnd-api-note">' +
      'Your key is used to read your <strong>display cabinet</strong> totals ' +
      'from the Torn API. Inventory counts are read directly from the museum page. ' +
      'Both are combined for the full total. ' +
      'The key is stored locally and is ' +
      '<strong>never shared with any third party</strong>.' +
      '</p>' +

      '<div class="tcmnd-row">' +
      '<button class="tcmnd-btn" id="tcmnd-save-btn">&#128190; Save Key</button>' +
      '</div>' +
      '<div class="tcmnd-row">' +
      '<button class="tcmnd-btn tcmnd-btn-test" id="tcmnd-test-btn">&#128268; Test API Connection</button>' +
      '</div>' +
      '<div class="tcmnd-row">' +
      '<button class="tcmnd-btn tcmnd-btn-refresh" id="tcmnd-refresh-btn">&#8635; Refresh Highlights</button>' +
      '</div>' +
      '<div class="tcmnd-status" id="tcmnd-status"></div>' +

      '<hr class="tcmnd-sep">' +
      '<p class="tcmnd-section-title">Credits</p>' +
      '<div class="tcmnd-credits">' +
      'Written by ' +
      '<a href="https://www.torn.com/profiles.php?XID=' + AUTHOR_ID + '"' +
      ' target="_blank" rel="noopener noreferrer">' +
      AUTHOR_NAME + ' [' + AUTHOR_ID + ']' +
      '</a>' +
      '</div>' +
      '</div>'
    );
  }

  /* =========================================================
   * SETTINGS PANEL — STATUS HELPER
   * ========================================================= */

  function setStatus(message, cssClass) {
    const statusEl = document.getElementById('tcmnd-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'tcmnd-status' + (cssClass ? ' ' + cssClass : '');
  }

  /* =========================================================
   * SETTINGS PANEL — EVENT WIRING
   * ========================================================= */

  function wireSettingsPanelEvents() {
    document.getElementById('tcmnd-close-btn').addEventListener('click', function () {
      closeSettingsPanel();
    });

    document.getElementById('tcmnd-save-btn').addEventListener('click', function () {
      const apiInput = document.getElementById('tcmnd-api-input');
      const enteredKey = (apiInput.value || '').trim();
      if (!enteredKey) {
        setStatus('Please enter a key first.', 'tcmnd-status-err');
        return;
      }
      saveApiKey(enteredKey);
      apiInput.type = 'password';
      updateCogStatus();
      setStatus('Key saved. Refreshing highlights\u2026', '');
      runMuseumHighlights();
    });

    document.getElementById('tcmnd-test-btn').addEventListener('click', async function () {
      const testInput = document.getElementById('tcmnd-api-input');
      const testKey = (testInput.value || '').trim();
      const testBtn = document.getElementById('tcmnd-test-btn');

      if (!testKey) {
        setStatus('Enter a key above before testing.', 'tcmnd-status-err');
        return;
      }

      testBtn.disabled = true;
      setStatus('Testing connection\u2026', '');

      let profileData;
      try {
        profileData = await fetchBasicProfile(testKey);
      } catch (fetchErr) {
        setStatus('Connection failed: ' + fetchErr.message, 'tcmnd-status-err');
        testBtn.disabled = false;
        return;
      }

      if (profileData.error) {
        const errMsg = profileData.error.error || ('Code ' + String(profileData.error.code));
        setStatus('API error: ' + errMsg, 'tcmnd-status-err');
        testBtn.disabled = false;
        return;
      }

      const playerName = profileData.name || 'Unknown';
      const playerId = String(profileData.player_id || '?');
      setStatus('\u2714 Connected \u2013 ' + playerName + ' [' + playerId + ']', 'tcmnd-status-ok');
      testBtn.disabled = false;
    });

    document.getElementById('tcmnd-refresh-btn').addEventListener('click', function () {
      setStatus('Refreshing\u2026', '');
      runMuseumHighlights().then(function () {
        setStatus('Done.', '');
      });
    });
  }

  /* =========================================================
   * SETTINGS PANEL — DRAG SUPPORT
   * ========================================================= */

  function makeDraggable(panelEl) {
    const handle = panelEl.querySelector('.tcmnd-drag-handle');
    if (!handle) return;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartLeft = 0;
    let panelStartTop = 0;

    function onDragMove(evt) {
      if (!isDragging) return;
      panelEl.style.left = (panelStartLeft + evt.clientX - dragStartX) + 'px';
      panelEl.style.top = (panelStartTop + evt.clientY - dragStartY) + 'px';
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      const endRect = panelEl.getBoundingClientRect();
      savePanelPosition(endRect.left, endRect.top);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
    }

    handle.addEventListener('mousedown', function (evt) {
      if (evt.target.id === 'tcmnd-close-btn') return;
      isDragging = true;
      dragStartX = evt.clientX;
      dragStartY = evt.clientY;
      const startRect = panelEl.getBoundingClientRect();
      panelStartLeft = startRect.left;
      panelStartTop = startRect.top;
      panelEl.style.right = 'auto';
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      evt.preventDefault();
    });
  }

  /* =========================================================
   * SETTINGS PANEL — LIFECYCLE
   * ========================================================= */

  let settingsPanel = null;
  let cogAnchorTop = 80;

  function buildSettingsPanel() {
    if (document.getElementById('tcmnd-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'tcmnd-panel';

    const savedPos = loadPanelPosition();
    if (savedPos.left && savedPos.top) {
      panel.style.left = savedPos.left + 'px';
      panel.style.top = savedPos.top + 'px';
      panel.style.right = 'auto';
    } else {
      panel.style.right = '18px';
      panel.style.top = (cogAnchorTop + 28) + 'px';
    }

    panel.innerHTML = buildPanelHTML(loadApiKey());
    document.body.appendChild(panel);
    settingsPanel = panel;

    wireSettingsPanelEvents();
    makeDraggable(panel);
  }

  function closeSettingsPanel() {
    if (settingsPanel) {
      settingsPanel.remove();
      settingsPanel = null;
    }
  }

  function toggleSettingsPanel() {
    if (settingsPanel) {
      closeSettingsPanel();
    } else {
      buildSettingsPanel();
    }
  }

  /* =========================================================
   * COG + TOOLBAR INJECTION
   * ========================================================= */

  function injectCog() {
    if (document.getElementById('tcmnd-toolbar')) return;

    const targetEl = findElementByText('Exchange rare items for points');
    if (!targetEl) return;

    const toolbar = document.createElement('span');
    toolbar.id = 'tcmnd-toolbar';

    const cog = document.createElement('button');
    cog.id = 'tcmnd-cog';
    cog.title = SCRIPT_NAME + ' Settings';
    cog.textContent = '\u2699';
    cog.addEventListener('click', function (evt) {
      evt.stopPropagation();
      toggleSettingsPanel();
    });

    const statusSpan = document.createElement('span');
    statusSpan.id = 'tcmnd-api-status';

    toolbar.appendChild(cog);
    toolbar.appendChild(statusSpan);

    const parentEl = targetEl.parentElement || targetEl;
    parentEl.appendChild(toolbar);

    // Countdown sits on its own line directly below the toolbar
    const countdown = document.createElement('span');
    countdown.id = 'tcmnd-countdown';
    parentEl.appendChild(countdown);

    const rect = parentEl.getBoundingClientRect();
    cogAnchorTop = rect.top + window.scrollY;

    updateCogStatus();
  }

  /* =========================================================
   * MUSEUM DAY COUNTDOWN
   * =========================================================
   *
   * Fetches the Torn calendar via API and finds the next event
   * whose title contains "museum" (case-insensitive). Displays
   * the result in the format:
   *   "[X] days until museum day on [Day D Month YYYY]"
   *
   * The countdown element is left blank if no API key is set
   * or if no museum event is found in the calendar data.
   *
   * Torn's calendar API returns an object keyed by event ID:
   *   { "calendar": { "123": { "title": "Museum Day",
   *                             "start": 1234567890 } } }
   */

  async function updateMuseumDayCountdown(apiKey) {
    const countdownEl = document.getElementById('tcmnd-countdown');
    if (!countdownEl) return;

    if (!apiKey) {
      countdownEl.textContent = '';
      return;
    }

    const calData = await fetchCalendarData(apiKey);
    if (!calData || calData.error) {
      console.log(LOG_TAG, 'Calendar API error or no data:', calData ? calData.error : 'null');
      countdownEl.textContent = '';
      return;
    }

    console.log(LOG_TAG, 'Calendar API keys:', Object.keys(calData).join(', '));

    // Support both array and object formats for calendar entries
    const calRaw = calData.calendar;
    if (!calRaw) {
      console.log(LOG_TAG, 'No calendar key in API response.');
      countdownEl.textContent = '';
      return;
    }

    console.log(LOG_TAG, 'Calendar raw (first 400 chars):', JSON.stringify(calRaw).substring(0, 400));

    const events = Array.isArray(calRaw) ? calRaw : Object.values(calRaw);
    const nowSec = Math.floor(Date.now() / 1000);
    let nearestTimestamp = null;

    events.forEach(function (ev) {
      if (!ev) return;
      const title = String(ev.title || ev.name || ev.event || '').toLowerCase();
      if (!title.includes('museum')) return;

      // Prefer the start/begin time; fall back to the event timestamp itself
      const evTime = ev.start || ev.begin || ev.time || ev.timestamp;
      if (!evTime) return;

      const evSec = Number(evTime);
      if (evSec < nowSec) return; // Already passed

      if (nearestTimestamp === null || evSec < nearestTimestamp) {
        nearestTimestamp = evSec;
      }
    });

    if (nearestTimestamp === null) {
      console.log(LOG_TAG, 'No upcoming museum event found in calendar.');
      countdownEl.textContent = '';
      return;
    }

    const msUntil = (nearestTimestamp * 1000) - Date.now();
    const daysUntil = Math.ceil(msUntil / 86400000);
    const eventDate = new Date(nearestTimestamp * 1000);

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = DAY_NAMES[eventDate.getUTCDay()];
    const dayNum = eventDate.getUTCDate();
    const monthName = MONTH_NAMES[eventDate.getUTCMonth()];
    const year = eventDate.getUTCFullYear();

    const dateStr = dayName + ' ' + String(dayNum) + ' ' + monthName + ' ' + String(year);
    const dayWord = daysUntil === 1 ? 'day' : 'days';
    countdownEl.textContent = String(daysUntil) + ' ' + dayWord + ' until museum day on ' + dateStr;
    console.log(LOG_TAG, 'Museum day countdown:', countdownEl.textContent);
  }

  /* =========================================================
   * MUSEUM RUNNER
   * =========================================================
   *
   * Run order:
   *  1. Fetch display cabinet API (fallback count source)
   *  2. Clear previous highlights so script-generated numbers
   *     don't interfere with DOM count reading
   *  3. Build container maps for plushies and flowers
   *  4. Extract item counts from page DOM (primary count source)
   *  5. Merge DOM + display API counts
   *  6. Apply highlights using zero-quantity logic
   */

  let tcmndRunning = false;

  async function runMuseumHighlights() {
    if (tcmndRunning) return;
    tcmndRunning = true;

    try {
      const apiKey = loadApiKey();
      if (!apiKey) {
        console.log(LOG_TAG, 'No API key set \u2013 open the settings cog (\u2699) to add one.');
        return;
      }

      let displayData = null;
      try {
        displayData = await fetchDisplayData(apiKey);
        if (displayData && displayData.error) {
          console.error(LOG_TAG, 'Display API error:', displayData.error);
          displayData = null;
        }
      } catch (fetchErr) {
        console.error(LOG_TAG, 'fetchDisplayData failed:', fetchErr);
        // Non-fatal — DOM counts can still work without API
      }

      // Update museum day countdown (non-blocking — errors are swallowed internally)
      updateMuseumDayCountdown(apiKey);

      // Build ID→name map (diagnostic)
      buildIdToNameMapFromDOM();

      // Clear BEFORE reading DOM counts so old badge numbers don't pollute the read
      clearHighlights();

      // Build container maps (A + B + C strategies)
      const plushieMap = buildContainerMapFromPage(PLUSHIE_NAMES);
      const flowerMap = buildContainerMapFromPage(FLOWER_NAMES);

      console.log(LOG_TAG, 'Plushie containers: ' + String(Object.keys(plushieMap).length) + '/' + String(PLUSHIE_NAMES.length));
      console.log(LOG_TAG, 'Flower containers: ' + String(Object.keys(flowerMap).length) + '/' + String(FLOWER_NAMES.length));

      // Extract counts from DOM (primary count source — inventory only)
      const domCounts = {};
      ALL_ITEM_NAMES.forEach(function (name) { domCounts[name] = null; });

      Object.keys(plushieMap).forEach(function (name) {
        const cnt = extractDomCount(plushieMap[name], name);
        if (cnt !== null) domCounts[name] = cnt;
      });
      Object.keys(flowerMap).forEach(function (name) {
        const cnt = extractDomCount(flowerMap[name], name);
        if (cnt !== null) domCounts[name] = cnt;
      });

      // Diagnostic: flag items with no container or no DOM count (useful for zero-stock debugging)
      const noContainer = ALL_ITEM_NAMES.filter(function (name) {
        return !plushieMap[name] && !flowerMap[name];
      });
      if (noContainer.length > 0) {
        console.log(LOG_TAG, 'Items with no container (not on current tab or zero-stock structure):', noContainer.join(', '));
      }
      const nullDomCount = ALL_ITEM_NAMES.filter(function (name) {
        return (plushieMap[name] || flowerMap[name]) && domCounts[name] === null;
      });
      if (nullDomCount.length > 0) {
        console.log(LOG_TAG, 'Containers found but no DOM count extracted (will default to 0):', nullDomCount.join(', '));
      }

      // Build final counts (inventory DOM + display cabinet API)
      const counts = buildAllCounts(displayData, domCounts);

      let totalApplied = 0;

      // Always call applyHighlightsForSection — even with 0 containers — so that
      // zero-stock items get their assignment logged even if containers are missing.
      totalApplied += applyHighlightsForSection(counts, plushieMap, PLUSHIE_NAMES);
      totalApplied += applyHighlightsForSection(counts, flowerMap, FLOWER_NAMES);

      if (totalApplied === 0) {
        console.warn(LOG_TAG, 'No highlights applied. DOM structure:');
        logDomStructure();
      } else {
        console.log(LOG_TAG, 'Total highlights: ' + String(totalApplied));
      }
    } finally {
      tcmndRunning = false;
    }
  }

  /* =========================================================
   * SECTION/ITEM CHANGE OBSERVER
   * =========================================================
   *
   * Two triggers for re-applying highlights:
   *
   *  1. The count of img.torn-item.large elements changes — covers
   *     cases where Torn loads new DOM content for the switched tab.
   *
   *  2. Whether the plushie or flower section header text is present
   *     changes — covers cases where Torn hides/shows pre-rendered
   *     sections via CSS without adding or removing img elements.
   */

  function startItemObserver() {
    function readPageState() {
      const imgCount = document.querySelectorAll(ITEM_IMG_SELECTOR).length;
      const hasPlushie = !!findElementByText(PLUSHIE_SECTION_TEXT);
      const hasFlower = !!findElementByText(FLOWER_SECTION_TEXT);
      return String(imgCount) + '|' + String(hasPlushie) + '|' + String(hasFlower);
    }

    let lastState = readPageState();
    let debounceTimer = null;

    const observer = new MutationObserver(function () {
      const newState = readPageState();
      if (newState !== lastState) {
        lastState = newState;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          console.log(LOG_TAG, 'Page state changed \u2014 re-applying highlights.');
          runMuseumHighlights();
        }, 600);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* =========================================================
   * PAGE INIT
   * ========================================================= */

  function waitForContent(testFn, callback, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 15000);
    const observer = new MutationObserver(function (mutations, obs) {
      if (testFn()) {
        obs.disconnect();
        callback();
      } else if (Date.now() > deadline) {
        obs.disconnect();
        console.warn(LOG_TAG, 'Timed out waiting for museum content.');
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (testFn()) {
      observer.disconnect();
      callback();
    }
  }

  function hasMuseumContent() {
    return !!(
      document.querySelector(ITEM_IMG_SELECTOR) ||
      findElementByText('Exchange rare items for points') ||
      findElementByText(PLUSHIE_SECTION_TEXT) ||
      findElementByText(FLOWER_SECTION_TEXT)
    );
  }

  function init() {
    waitForContent(hasMuseumContent, function () {
      injectCog();
      runMuseumHighlights();
      startItemObserver();
      setTimeout(runMuseumHighlights, 3000);
    }, 15000);
  }

  /* =========================================================
   * SPA NAVIGATION DETECTION
   * ========================================================= */

  setTimeout(init, 1200);

  window.addEventListener('hashchange', function () {
    setTimeout(init, 1200);
  });

  let lastHref = window.location.href;
  setInterval(function () {
    const nowHref = window.location.href;
    if (nowHref !== lastHref) {
      lastHref = nowHref;
      setTimeout(init, 1200);
    }
  }, 800);

  /* =========================================================
   * STATCOUNTER ANALYTICS
   * =========================================================
   *
   * Fires a 1×1 invisible tracking pixel to c.statcounter.com
   * by appending a hidden <img> element to the page body.
   * Waits for window.load (or fires immediately if already loaded)
   * so it behaves like a standard bottom-of-page analytics snippet.
   * The { once: true } option removes the listener automatically.
   */

  function fireStatCounter() {
    const img = document.createElement('img');
    img.src = 'https://c.statcounter.com/13224046/0/dba7d310/1/';
    img.alt = '';
    img.referrerPolicy = 'no-referrer-when-downgrade';
    img.style.cssText = 'display:none!important;width:1px;height:1px;position:absolute;';
    document.body.appendChild(img);
  }

  if (document.readyState === 'complete') {
    fireStatCounter();
  } else {
    window.addEventListener('load', fireStatCounter, { once: true });
  }

})();
