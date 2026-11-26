// content.css applies these defaults before storage is read, so the page
// never flashes a hidden shelf. Only the sidebar is opt-in.
var YT_TIDY_DEFAULTS = {
  hideShorts: true,
  hideShelves: true,
  hideShortsLink: true,
  hideSidebar: false,
  videosPerRow: 5,
  autoFit: true,
  squareCorners: true,
};

var YT_TIDY_ROW_CHOICES = [3, 4, 5, 6, 7, 8];

// With autoFit on, the chosen count is what a window between these widths
// gets. Wider windows get proportionally more (6 at 1920px is 8 at 2560px),
// narrower ones fewer.
var YT_TIDY_NORMAL_WIDTH = { min: 1440, max: 1920 };

// Settings from earlier versions, removed from storage on load.
var YT_TIDY_OLD_KEYS = [
  "columns",
  "hideBreakingNews",
  "hidePlayables",
  "hideMostRelevant",
];
