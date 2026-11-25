// Shared by the content script and the popup.
// Every setting defaults to "on", and content.css applies the defaults before
// storage is read, so the page never flashes the Shorts shelf or the sidebar.
var YT_TIDY_DEFAULTS = {
  hideShorts: true, // Shorts shelves in the Home and Subscriptions feeds
  hideBreakingNews: true, // the "Breaking news" shelf on Home
  hideShortsLink: true, // the "Shorts" entry in the sidebar (if the sidebar is shown)
  hideSidebar: true, // the left sidebar, its mini version, and the menu button
  columns: 4, // videos per row on Home and Subscriptions
  squareCorners: true, // square thumbnails instead of rounded ones
};

var YT_TIDY_COLUMN_CHOICES = [3, 4, 5, 6];
