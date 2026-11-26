/* global YT_TIDY_DEFAULTS, YT_TIDY_ROW_CHOICES, YT_TIDY_CARD_WIDTH, YT_TIDY_OLD_KEYS */
(() => {
  const root = document.documentElement;

  // The flat list of videos and shelves on Home and Subscriptions.
  const FEED_CONTENTS =
    'ytd-browse:is([page-subtype="home"], [page-subtype="subscriptions"]) ' +
    "ytd-rich-grid-renderer > #contents";

  // ---- Settings -> attributes on <html> that content.css reads ----

  function setShown(attribute, shown) {
    if (shown) root.setAttribute(attribute, "show");
    else root.removeAttribute(attribute);
  }

  // The count chosen in the popup, or "auto".
  let videosPerRowSetting = YT_TIDY_DEFAULTS.videosPerRow;

  function apply(settings) {
    setShown("data-ytt-shorts", !settings.hideShorts);
    setShown("data-ytt-shelves", !settings.hideShelves);
    setShown("data-ytt-shorts-link", !settings.hideShortsLink);
    if (settings.hideSidebar) root.setAttribute("data-ytt-sidebar", "hide");
    else root.removeAttribute("data-ytt-sidebar");
    if (settings.squareCorners) root.removeAttribute("data-ytt-corners");
    else root.setAttribute("data-ytt-corners", "round");

    const choice = YT_TIDY_ROW_CHOICES.find(
      (option) => String(option) === String(settings.videosPerRow),
    );
    videosPerRowSetting = choice ?? YT_TIDY_DEFAULTS.videosPerRow;
    if (videosPerRowSetting === "auto") {
      root.style.removeProperty("--ytt-columns");
    } else {
      root.style.setProperty("--ytt-columns", String(videosPerRowSetting));
    }

    scheduleReflow();
  }

  function loadSettings() {
    chrome.storage.sync.get(YT_TIDY_DEFAULTS).then(apply);
  }

  loadSettings();
  chrome.storage.sync.remove(YT_TIDY_OLD_KEYS);
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") loadSettings();
  });

  // ---- "auto": a count that keeps cards near YT_TIDY_CARD_WIDTH ----

  const CARD_GAP = 16; // YouTube's --ytd-rich-grid-item-margin

  function autoColumns(grid) {
    // The feed sits inside the grid with a gap on each side. Measure the grid,
    // not the feed: the feed's max-width depends on the count set here.
    const width = grid.clientWidth - 2 * CARD_GAP;
    const fits = Math.round(
      (width + CARD_GAP) / (YT_TIDY_CARD_WIDTH + CARD_GAP),
    );
    return Math.min(Math.max(fits, 2), 12);
  }

  // Sets --ytt-columns on the grid itself, so the Home and Subscriptions
  // grids each get their own count. A hidden grid (width 0) keeps its last one.
  function sizeGrid(grid) {
    if (videosPerRowSetting !== "auto") {
      grid.style.removeProperty("--ytt-columns");
      return;
    }
    if (!grid.clientWidth) return;
    const columns = String(autoColumns(grid));
    if (grid.style.getPropertyValue("--ytt-columns") !== columns) {
      grid.style.setProperty("--ytt-columns", columns);
    }
  }

  const gridSizes = new ResizeObserver((entries) => {
    for (const { target } of entries) sizeGrid(target);
    scheduleReflow();
  });

  // ---- Keep shelves from leaving a half-empty row ----
  //
  // YouTube drops a shelf (Breaking news, Shorts, Mixes, ...) into the
  // feed after every 2 or 3 rows of its own 3-wide grid. At 4 wide that lands
  // mid-row and leaves a gap. The feed is a flexbox, so instead of moving nodes
  // (which would upset YouTube's own bookkeeping) we set each child's CSS
  // `order` so a shelf waits until the row it interrupted is full.

  function videosPerRow(grid) {
    const value = getComputedStyle(grid).getPropertyValue(
      "--ytd-rich-grid-items-per-row",
    );
    return Number.parseInt(value, 10) || 0;
  }

  // A section heading such as "Latest" on Subscriptions. It names the videos
  // that follow it, so it must start a new row rather than wait for one.
  function isHeading(section) {
    const content = section.querySelector("#content");
    return content?.firstElementChild?.tagName === "YTD-SHELF-RENDERER";
  }

  function reflow(contents) {
    const perRow = videosPerRow(contents.parentElement);
    if (!perRow) return;

    const ordered = [];
    const atEnd = [];
    let waiting = [];
    let column = 0;

    const releaseWaiting = () => {
      ordered.push(...waiting);
      waiting = [];
    };

    for (const el of contents.children) {
      if (el.tagName === "YTD-CONTINUATION-ITEM-RENDERER") {
        atEnd.push(el); // the "load more" spinner stays last
      } else if (getComputedStyle(el).display === "none") {
        ordered.push(el); // takes no space, so it can stay where it is
      } else if (el.tagName === "YTD-RICH-ITEM-RENDERER") {
        ordered.push(el);
        column = (column + 1) % perRow;
        if (column === 0) releaseWaiting();
      } else if (column === 0) {
        ordered.push(el); // a full-width section that already starts a row
      } else if (isHeading(el)) {
        releaseWaiting();
        ordered.push(el);
        column = 0;
      } else {
        waiting.push(el);
      }
    }
    releaseWaiting();
    ordered.push(...atEnd);

    ordered.forEach((el, index) => {
      const order = String(index);
      if (el.style.order !== order) el.style.order = order;
    });
  }

  let reflowQueued = false;
  function scheduleReflow() {
    if (reflowQueued) return;
    reflowQueued = true;
    requestAnimationFrame(() => {
      reflowQueued = false;
      for (const contents of document.querySelectorAll(FEED_CONTENTS)) {
        const grid = contents.parentElement;
        gridSizes.observe(grid); // no-op once observed
        sizeGrid(grid); // YouTube may have rewritten the grid's inline style
        reflow(contents);
      }
    });
  }

  // Re-run when videos or shelves are added to a feed, and when a shelf
  // renders its contents (that is when it becomes hidden, or a heading
  // becomes recognisable).
  new MutationObserver((records) => {
    for (const { target } of records) {
      const parentTag = target.parentElement?.tagName;
      if (
        (target.id === "contents" && parentTag === "YTD-RICH-GRID-RENDERER") ||
        (target.id === "content" && parentTag === "YTD-RICH-SECTION-RENDERER")
      ) {
        scheduleReflow();
        return;
      }
    }
  }).observe(document, { childList: true, subtree: true });

  document.addEventListener("yt-navigate-finish", scheduleReflow);
})();
