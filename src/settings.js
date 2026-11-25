// Shared by the content script and the popup.
// content.css applies these defaults before storage is read, so the page
// never flashes a hidden shelf. Only the sidebar is opt-in.
var YT_TIDY_DEFAULTS = {
  hideShorts: true, // Shorts shelves in the Home and Subscriptions feeds
  hideBreakingNews: true, // the "Breaking news" shelf on Home
  hidePlayables: true, // the "YouTube Playables" games shelf on Home
  hideMostRelevant: true, // the "Most relevant" shelf on Subscriptions
  hideShortsLink: true, // the "Shorts" entry in the sidebar (if the sidebar is shown)
  hideSidebar: false, // the left sidebar, its mini version, and the menu button
  columns: 4, // videos per row on Home and Subscriptions
  squareCorners: true, // square thumbnails instead of rounded ones
};

var YT_TIDY_COLUMN_CHOICES = [3, 4, 5, 6];
