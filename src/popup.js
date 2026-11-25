/* global YT_TIDY_DEFAULTS, YT_TIDY_COLUMN_CHOICES */
const columnsGroup = document.getElementById("columns");
const toggles = [
  "hideShorts",
  "hideBreakingNews",
  "hidePlayables",
  "hideMostRelevant",
  "squareCorners",
  "hideSidebar",
  "hideShortsLink",
].map((id) => document.getElementById(id));
const hideSidebar = document.getElementById("hideSidebar");
const hideShortsLink = document.getElementById("hideShortsLink");

for (const count of YT_TIDY_COLUMN_CHOICES) {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "columns";
  input.value = String(count);
  const text = document.createElement("span");
  text.textContent = String(count);
  label.append(input, text);
  columnsGroup.append(label);
}

// The Shorts link lives in the sidebar, so it only matters while the sidebar shows.
function syncSidebarDependency() {
  hideShortsLink.disabled = hideSidebar.checked;
}

chrome.storage.sync.get(YT_TIDY_DEFAULTS).then((settings) => {
  for (const input of toggles) input.checked = Boolean(settings[input.id]);
  const chosen = columnsGroup.querySelector(
    `input[value="${Number(settings.columns)}"]`,
  );
  if (chosen) chosen.checked = true;
  syncSidebarDependency();
});

for (const input of toggles) {
  input.addEventListener("change", () => {
    chrome.storage.sync.set({ [input.id]: input.checked });
    syncSidebarDependency();
  });
}

columnsGroup.addEventListener("change", (event) => {
  chrome.storage.sync.set({ columns: Number(event.target.value) });
});
