/* global YT_TIDY_DEFAULTS, YT_TIDY_COLUMN_CHOICES */
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

  function apply(settings) {
    setShown("data-ytt-shorts", !settings.hideShorts);
    setShown("data-ytt-shorts-link", !settings.hideShortsLink);
    if (settings.hideSidebar) root.setAttribute("data-ytt-sidebar", "hide");
    else root.removeAttribute("data-ytt-sidebar");
    setShown("data-ytt-breaking-news", !settings.hideBreakingNews);
    setShown("data-ytt-playables", !settings.hidePlayables);
    setShown("data-ytt-most-relevant", !settings.hideMostRelevant);
    if (settings.squareCorners) root.removeAttribute("data-ytt-corners");
    else root.setAttribute("data-ytt-corners", "round");

    const columns = YT_TIDY_COLUMN_CHOICES.includes(Number(settings.columns))
      ? Number(settings.columns)
      : YT_TIDY_DEFAULTS.columns;
    root.style.setProperty("--ytt-columns", String(columns));

    scheduleReflow();
  }

  function loadSettings() {
    chrome.storage.sync.get(YT_TIDY_DEFAULTS).then(apply);
  }

  loadSettings();
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") loadSettings();
  });

  // ---- Keep shelves from leaving a half-empty row ----
  //
  // YouTube drops a shelf (Breaking news, Shorts, "Most relevant", ...) into the
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

  // The "Breaking news" shelf has no marker of its own, only its title, so
  // tag it for content.css. Re-checked on every pass because YouTube reuses
  // section elements when the feed changes (e.g. picking a topic chip).
  const BREAKING_NEWS_TITLE = /^breaking news$/i;

  function tagShelves(contents) {
    for (const section of contents.querySelectorAll(
      ":scope > ytd-rich-section-renderer",
    )) {
      const title = section
        .querySelector("ytd-rich-shelf-renderer #title")
        ?.textContent.trim();
      const kind = title && BREAKING_NEWS_TITLE.test(title) ? "breaking-news" : "";
      if ((section.dataset.yttShelf ?? "") !== kind) {
        if (kind) section.dataset.yttShelf = kind;
        else delete section.dataset.yttShelf;
      }
    }
  }

  function reflow(contents) {
    tagShelves(contents);

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

  // Re-run when videos or shelves are added to a feed, when a shelf renders
  // its contents (that is when a Shorts shelf becomes hidden, or a heading
  // becomes recognisable), and when a shelf's title text arrives.
  new MutationObserver((records) => {
    for (const { target } of records) {
      const parentTag = target.parentElement?.tagName;
      if (
        (target.id === "contents" && parentTag === "YTD-RICH-GRID-RENDERER") ||
        (target.id === "content" && parentTag === "YTD-RICH-SECTION-RENDERER") ||
        (target.closest?.("ytd-rich-shelf-renderer #title") &&
          target.closest("ytd-rich-section-renderer"))
      ) {
        scheduleReflow();
        return;
      }
    }
  }).observe(document, { childList: true, subtree: true });

  document.addEventListener("yt-navigate-finish", scheduleReflow);
})();
