/* global YT_TIDY_DEFAULTS, YT_TIDY_ROW_CHOICES, YT_TIDY_NORMAL_WIDTH, YT_TIDY_OLD_KEYS */
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

  // The count chosen in the popup, and whether to scale it with the window.
  let rowSetting = YT_TIDY_DEFAULTS.videosPerRow;
  let autoFit = YT_TIDY_DEFAULTS.autoFit;

  function apply(settings) {
    setShown("data-ytt-shorts", !settings.hideShorts);
    setShown("data-ytt-shelves", !settings.hideShelves);
    setShown("data-ytt-shorts-link", !settings.hideShortsLink);
    if (settings.hideSidebar) root.setAttribute("data-ytt-sidebar", "hide");
    else root.removeAttribute("data-ytt-sidebar");
    if (settings.squareCorners) root.removeAttribute("data-ytt-corners");
    else root.setAttribute("data-ytt-corners", "round");

    // 1.3.0 stored "auto" here; anything unknown falls back to the default.
    const count = Number(settings.videosPerRow);
    rowSetting = YT_TIDY_ROW_CHOICES.includes(count)
      ? count
      : YT_TIDY_DEFAULTS.videosPerRow;
    autoFit = Boolean(settings.autoFit);
    setColumns();

    scheduleReflow(); // a shelf may have been shown or hidden
  }

  // ---- Videos per row, scaled to the window when autoFit is on ----

  function columnsFor(width) {
    if (!autoFit) return rowSetting;
    const { min, max } = YT_TIDY_NORMAL_WIDTH;
    const scale = width > max ? width / max : width < min ? width / min : 1;
    return Math.min(Math.max(Math.round(rowSetting * scale), 2), 12);
  }

  function setColumns() {
    const columns = String(columnsFor(window.innerWidth));
    if (root.style.getPropertyValue("--ytt-columns") !== columns) {
      root.style.setProperty("--ytt-columns", columns);
      scheduleReflow();
    }
  }

  window.addEventListener("resize", setColumns);

  function loadSettings() {
    chrome.storage.sync.get(YT_TIDY_DEFAULTS).then(apply);
  }

  loadSettings();
  chrome.storage.sync.remove(YT_TIDY_OLD_KEYS);
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") loadSettings();
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
      document.querySelectorAll(FEED_CONTENTS).forEach(reflow);
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
