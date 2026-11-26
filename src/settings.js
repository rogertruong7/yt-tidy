// content.css applies these defaults before storage is read, so the page
// never flashes a hidden shelf. Only the sidebar is opt-in.
var YT_TIDY_DEFAULTS = {
  hideShorts: true,
  hideShelves: true,
  hideShortsLink: true,
  hideSidebar: false,
  videosPerRow: "auto",
  squareCorners: true,
};

// "auto" aims for cards about YT_TIDY_CARD_WIDTH px wide: 5 per row on a
// laptop or 1920px screen, 7 at 2560px, 10 on a 3440px ultrawide.
var YT_TIDY_ROW_CHOICES = ["auto", 3, 4, 5, 6, 7, 8];
var YT_TIDY_CARD_WIDTH = 300;

// Settings from earlier versions, removed from storage on load.
var YT_TIDY_OLD_KEYS = [
  "columns",
  "hideBreakingNews",
  "hidePlayables",
  "hideMostRelevant",
];
