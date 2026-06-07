const sampleTranscript = `Sarah: Thanks everyone. The goal today is to lock the launch plan for the new analytics dashboard.

Marcus: Engineering is on track to finish the core dashboard by Thursday. The export feature needs two more days, so I suggest we move that into the first follow-up release.

Sarah: Agreed. Let's launch the core experience on June 18 and ship export in version 1.1. Does anyone object?

Priya: No objection. Marketing can support June 18. I need final screenshots by next Monday to prepare the launch email and help center article.

Marcus: I'll send Priya the final screenshots by Monday afternoon. I'll also create a ticket for the export follow-up and assign it to Elena.

Elena: That works. I can have export ready by June 25. We should tell beta customers that CSV export is coming one week after launch.

James: On customer readiness, I will draft the beta announcement by Friday and share it with Sarah for approval. We also need a short demo for the sales team.

Sarah: Good call. Priya, can you coordinate a 20-minute sales demo for June 17?

Priya: Yes, I'll schedule it and use the final build once Marcus sends the screenshots.

James: One concern: the mobile charts still feel cramped. It is not a blocker, but we should monitor feedback after launch.

Sarah: Let's add mobile chart usability to the post-launch review. Decision is confirmed: June 18 launch, export follows June 25. Marcus owns screenshots, Priya owns launch materials and the demo, James owns the beta announcement. We'll regroup on June 16 for a final go/no-go check.`;

const els = {
  transcript: document.querySelector("#transcript"),
  title: document.querySelector("#meetingTitle"),
  date: document.querySelector("#meetingDate"),
  wordCount: document.querySelector("#wordCount"),
  empty: document.querySelector("#emptyState"),
  results: document.querySelector("#results"),
  loading: document.querySelector("#loadingState"),
  output: document.querySelector("#outputPanel"),
  emailToggle: document.querySelector("#emailToggle")
};

let summaryStyle = "brief";
let currentBrief = null;
let savedMeetings = JSON.parse(localStorage.getItem("briefly-meetings") || "[]");
let profile = JSON.parse(localStorage.getItem("briefly-profile") || '{"name":"Anika Kapoor","email":"anika@example.com","role":"Product manager"}');
let preferences = JSON.parse(localStorage.getItem("briefly-preferences") || '{"theme":"system","style":"brief","email":true,"autosave":true}');

const today = new Date();
els.date.value = today.toISOString().slice(0, 10);

document.querySelector("#themeToggle").addEventListener("click", () => {
  preferences.theme = document.body.classList.contains("dark") ? "light" : "dark";
  savePreferences();
  applyPreferences();
});

initializeApp();

els.transcript.addEventListener("input", updateWordCount);

document.querySelector("#sampleButton").addEventListener("click", () => {
  els.transcript.value = sampleTranscript;
  els.title.value = "Analytics dashboard launch planning";
  els.date.value = "2026-06-08";
  updateWordCount();
  els.transcript.focus();
});

document.querySelector("#clearButton").addEventListener("click", () => {
  els.transcript.value = "";
  updateWordCount();
  els.transcript.focus();
});

document.querySelectorAll(".segment").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    summaryStyle = button.dataset.style;
  });
});

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.tab;
    document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
    document.querySelector(`#${target}Tab`).classList.add("active");
  });
});

document.querySelector("#generateButton").addEventListener("click", generateBrief);
document.querySelector("#copyAllButton").addEventListener("click", () => copyText(buildMarkdown()));
document.querySelector("#copyEmailButton").addEventListener("click", () => copyText(`${document.querySelector("#emailSubject").innerText}\n\n${document.querySelector("#emailBody").innerText}`));
document.querySelector("#exportButton").addEventListener("click", exportMarkdown);
document.querySelector("#saveButton").addEventListener("click", () => saveCurrentMeeting(true));
document.querySelector("#libraryButton").addEventListener("click", openLibrary);
document.querySelector("#closeLibraryButton").addEventListener("click", closeLibrary);
document.querySelector("#drawerBackdrop").addEventListener("click", closeLibrary);
document.querySelector("#librarySearch").addEventListener("input", event => renderLibrary(event.target.value));
document.querySelector("#newBriefButton").addEventListener("click", newBrief);
document.querySelector("#profileButton").addEventListener("click", event => {
  event.stopPropagation();
  document.querySelector("#profileMenu").classList.toggle("hidden");
});
document.addEventListener("click", event => {
  if (!event.target.closest(".profile-wrap")) document.querySelector("#profileMenu").classList.add("hidden");
});
document.querySelector("#editProfileButton").addEventListener("click", openProfile);
document.querySelector("#settingsButton").addEventListener("click", openSettings);
document.querySelector("#menuSettingsButton").addEventListener("click", openSettings);
document.querySelector("#profileName").addEventListener("input", event => {
  document.querySelector("#profilePreview").textContent = initials(event.target.value || "User");
});
document.querySelector("#profileForm").addEventListener("submit", saveProfile);
document.querySelector("#settingsForm").addEventListener("submit", saveSettings);
document.querySelector("#libraryList").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "open") loadMeeting(button.dataset.id);
  if (button.dataset.action === "delete") deleteMeeting(button.dataset.id);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLibrary();
});

function initializeApp() {
  applyProfile();
  applyPreferences();
  renderLibrary();
  updateLibraryCount();
}

function applyProfile() {
  const avatar = initials(profile.name || "User");
  document.querySelector("#profileButton").textContent = avatar;
  document.querySelector("#menuAvatar").textContent = avatar;
  document.querySelector("#menuName").textContent = profile.name;
  document.querySelector("#menuEmail").textContent = profile.email;
}

function applyPreferences() {
  const useDark = preferences.theme === "dark" ||
    (preferences.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", useDark);
  summaryStyle = preferences.style || "brief";
  document.querySelectorAll(".segment").forEach(button => button.classList.toggle("active", button.dataset.style === summaryStyle));
  els.emailToggle.checked = preferences.email !== false;
}

function openProfile() {
  document.querySelector("#profileMenu").classList.add("hidden");
  document.querySelector("#profileName").value = profile.name || "";
  document.querySelector("#profileEmail").value = profile.email || "";
  document.querySelector("#profileRole").value = profile.role || "";
  document.querySelector("#profilePreview").textContent = initials(profile.name || "User");
  document.querySelector("#profileDialog").showModal();
}

function saveProfile(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.querySelector("#profileDialog").close();
    return;
  }
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  profile = {
    name: document.querySelector("#profileName").value.trim(),
    email: document.querySelector("#profileEmail").value.trim(),
    role: document.querySelector("#profileRole").value.trim()
  };
  localStorage.setItem("briefly-profile", JSON.stringify(profile));
  applyProfile();
  document.querySelector("#profileDialog").close();
  showToast("Profile updated");
}

function openSettings() {
  document.querySelector("#profileMenu").classList.add("hidden");
  document.querySelector("#themeSetting").value = preferences.theme || "system";
  document.querySelector("#styleSetting").value = preferences.style || "brief";
  document.querySelector("#emailSetting").checked = preferences.email !== false;
  document.querySelector("#autosaveSetting").checked = preferences.autosave !== false;
  document.querySelector("#settingsDialog").showModal();
}

function saveSettings(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.querySelector("#settingsDialog").close();
    return;
  }
  preferences = {
    theme: document.querySelector("#themeSetting").value,
    style: document.querySelector("#styleSetting").value,
    email: document.querySelector("#emailSetting").checked,
    autosave: document.querySelector("#autosaveSetting").checked
  };
  savePreferences();
  applyPreferences();
  document.querySelector("#settingsDialog").close();
  showToast("Preferences saved");
}

function savePreferences() {
  localStorage.setItem("briefly-preferences", JSON.stringify(preferences));
}

function openLibrary() {
  renderLibrary(document.querySelector("#librarySearch").value);
  document.querySelector("#libraryDrawer").classList.add("open");
  document.querySelector("#drawerBackdrop").classList.add("open");
  document.querySelector("#libraryDrawer").setAttribute("aria-hidden", "false");
  document.querySelector("#libraryButton").classList.add("active");
}

function closeLibrary() {
  document.querySelector("#libraryDrawer").classList.remove("open");
  document.querySelector("#drawerBackdrop").classList.remove("open");
  document.querySelector("#libraryDrawer").setAttribute("aria-hidden", "true");
  document.querySelector("#libraryButton").classList.remove("active");
}

function renderLibrary(query = "") {
  const list = document.querySelector("#libraryList");
  const normalized = query.trim().toLowerCase();
  const matches = savedMeetings.filter(meeting =>
    !normalized || `${meeting.title} ${(meeting.topics || []).join(" ")} ${meeting.date}`.toLowerCase().includes(normalized)
  );
  if (!matches.length) {
    list.innerHTML = `<div class="library-empty">
      <svg viewBox="0 0 24 24"><path d="M5 3h14v18H5zM9 8h6M9 12h6"/></svg>
      <strong>${normalized ? "No matching meetings" : "Your library is empty"}</strong>
      <p>${normalized ? "Try a different title or topic." : "Generate a brief and it will appear here."}</p>
    </div>`;
    return;
  }
  list.innerHTML = matches.map(meeting => `
    <article class="library-card">
      <div class="library-card-head">
        <div><h3>${escapeHtml(meeting.title)}</h3><p>${escapeHtml(meeting.date)}</p></div>
        <div class="library-card-actions">
          <button data-action="open" data-id="${meeting.id}">Open</button>
          <button data-action="delete" data-id="${meeting.id}">Delete</button>
        </div>
      </div>
      <div class="library-card-tags">
        <span>${meeting.actions.length} actions</span>
        <span>${meeting.decisions.length} decisions</span>
        <span>${escapeHtml(meeting.style || "brief")}</span>
      </div>
    </article>`).join("");
}

function saveCurrentMeeting(notify) {
  if (!currentBrief) return;
  syncBriefFromEditor();
  const existingIndex = savedMeetings.findIndex(meeting => meeting.id === currentBrief.id);
  if (existingIndex >= 0) savedMeetings[existingIndex] = structuredClone(currentBrief);
  else savedMeetings.unshift(structuredClone(currentBrief));
  savedMeetings = savedMeetings.slice(0, 50);
  localStorage.setItem("briefly-meetings", JSON.stringify(savedMeetings));
  updateLibraryCount();
  renderLibrary(document.querySelector("#librarySearch").value);
  if (notify) showToast(existingIndex >= 0 ? "Meeting updated" : "Meeting saved");
}

function syncBriefFromEditor() {
  if (!currentBrief) return;
  currentBrief.summary = [...document.querySelectorAll("#summaryContent p")].map(item => item.innerText.trim()).filter(Boolean);
  currentBrief.decisions = [...document.querySelectorAll("#decisionsList li")].map(item => item.innerText.trim()).filter(Boolean);
  currentBrief.actions = [...document.querySelectorAll(".action-card")].map((card, index) => ({
    ...currentBrief.actions[index],
    task: card.querySelector(".action-text").innerText.trim(),
    completed: card.querySelector("input").checked
  }));
  currentBrief.emailSubject = document.querySelector("#emailSubject").innerText.trim();
  currentBrief.emailBody = document.querySelector("#emailBody").innerText.trim();
}

function loadMeeting(id) {
  const meeting = savedMeetings.find(item => item.id === id);
  if (!meeting) return;
  currentBrief = structuredClone(meeting);
  els.title.value = meeting.title;
  els.date.value = meeting.sourceDate || today.toISOString().slice(0, 10);
  els.transcript.value = meeting.transcript || "";
  summaryStyle = meeting.style || preferences.style;
  document.querySelectorAll(".segment").forEach(button => button.classList.toggle("active", button.dataset.style === summaryStyle));
  updateWordCount();
  renderBrief(currentBrief);
  els.empty.classList.add("hidden");
  els.loading.classList.add("hidden");
  els.results.classList.remove("hidden");
  document.body.classList.add("compact");
  closeLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("Meeting opened");
}

function deleteMeeting(id) {
  savedMeetings = savedMeetings.filter(item => item.id !== id);
  localStorage.setItem("briefly-meetings", JSON.stringify(savedMeetings));
  updateLibraryCount();
  renderLibrary(document.querySelector("#librarySearch").value);
  showToast("Meeting deleted");
}

function updateLibraryCount() {
  document.querySelector("#libraryCount").textContent = savedMeetings.length;
}

function newBrief() {
  currentBrief = null;
  els.title.value = "";
  els.date.value = today.toISOString().slice(0, 10);
  els.transcript.value = "";
  updateWordCount();
  els.results.classList.add("hidden");
  els.loading.classList.add("hidden");
  els.empty.classList.remove("hidden");
  document.body.classList.remove("compact");
  closeLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => els.title.focus(), 250);
}

function updateWordCount() {
  const count = els.transcript.value.trim() ? els.transcript.value.trim().split(/\s+/).length : 0;
  els.wordCount.textContent = `${count.toLocaleString()} word${count === 1 ? "" : "s"}`;
}

async function generateBrief() {
  const transcript = els.transcript.value.trim();
  if (transcript.split(/\s+/).length < 12) {
    els.transcript.focus();
    els.transcript.closest(".transcript-wrap").classList.add("shake");
    showToast("Add a little more transcript first");
    setTimeout(() => els.transcript.closest(".transcript-wrap").classList.remove("shake"), 500);
    return;
  }

  els.empty.classList.add("hidden");
  els.results.classList.add("hidden");
  els.loading.classList.remove("hidden");

  const messages = ["Reading through the conversation", "Spotting decisions and owners", "Tidying up the takeaways"];
  const messageEl = document.querySelector("#loadingMessage");
  let index = 0;
  const timer = setInterval(() => {
    index = (index + 1) % messages.length;
    messageEl.textContent = messages[index];
  }, 550);

  await new Promise(resolve => setTimeout(resolve, 1350));
  currentBrief = analyzeTranscript(transcript, summaryStyle);
  currentBrief.id = `meeting-${Date.now()}`;
  currentBrief.createdAt = new Date().toISOString();
  currentBrief.sourceDate = els.date.value;
  currentBrief.transcript = transcript;
  currentBrief.style = summaryStyle;
  clearInterval(timer);
  renderBrief(currentBrief);
  els.loading.classList.add("hidden");
  els.results.classList.remove("hidden");
  document.body.classList.add("compact");
  if (preferences.autosave) saveCurrentMeeting(false);
}

function analyzeTranscript(text, style) {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const utterances = lines.map(line => {
    const match = line.match(/^([A-Za-z][A-Za-z .'-]{0,30}):\s*(.+)$/);
    return match ? { speaker: match[1].trim(), text: match[2].trim() } : { speaker: "", text: line };
  });
  const speakers = [...new Set(utterances.map(item => item.speaker).filter(Boolean))];
  const sentences = utterances.flatMap(item =>
    splitSentences(item.text)
      .map(sentence => ({ speaker: item.speaker, text: sentence.trim() }))
      .filter(item => item.text.length > 15)
  );

  const decisionPatterns = /\b(agreed|decision|decided|confirmed|we(?:'ll| will) (?:launch|move|ship|use|proceed)|let's (?:launch|move|use|add)|no objection|approved)\b/i;
  const actionPatterns = /\b(i(?:'ll| will| can)|can you|will (?:send|draft|create|schedule|prepare|coordinate|share|deliver|finish|review)|need(?:s)? to|action item|owns?)\b/i;
  const concernPatterns = /\b(concern|risk|blocker|issue|monitor|follow[- ]?up|cramped|problem)\b/i;

  let decisions = sentences.filter(item => decisionPatterns.test(item.text)).map(item => cleanSentence(item.text));
  decisions = dedupe(decisions).slice(0, style === "detailed" ? 6 : 4);
  if (!decisions.length) decisions = ["The team aligned on the direction discussed in the meeting."];

  let actions = sentences.filter(item => actionPatterns.test(item.text)).map(item => parseAction(item));
  actions = dedupeObjects(actions, "task").slice(0, style === "brief" ? 5 : 8);

  const important = scoreSentences(sentences);
  const summaryLimit = style === "brief" ? 2 : style === "executive" ? 3 : 4;
  const summarySentences = important.slice(0, summaryLimit).map(item => cleanSentence(item.text));
  const concern = sentences.find(item => concernPatterns.test(item.text));

  const topics = extractTopics(text, els.title.value, speakers);
  const dateText = formatDate(els.date.value);
  const meetingTitle = els.title.value.trim() || inferTitle(topics);
  const summary = buildSummary(summarySentences, concern, style, speakers.length);
  const email = buildEmail(meetingTitle, decisions, actions, summarySentences);

  return {
    title: meetingTitle,
    date: dateText,
    speakers,
    summary,
    decisions,
    actions,
    topics,
    emailSubject: email.subject,
    emailBody: email.body
  };
}

function scoreSentences(sentences) {
  const keywords = /\b(launch|decision|agreed|goal|deadline|customer|risk|plan|priority|ship|complete|important|concern|next|final|review|approve)\b/gi;
  return sentences.map((item, index) => {
    const hits = (item.text.match(keywords) || []).length;
    const lengthScore = item.text.length > 45 && item.text.length < 220 ? 2 : 0;
    const positionScore = index < sentences.length * .2 ? 1 : 0;
    return { ...item, score: hits * 2 + lengthScore + positionScore };
  }).sort((a, b) => b.score - a.score);
}

function parseAction(item) {
  const explicitOwner = item.text.match(/^([A-Z][a-z]+),\s+can you/i);
  const owner = explicitOwner ? explicitOwner[1] : item.speaker || "Team";
  const dueMatch = item.text.match(/\b(by|on|before|for)\s+((?:next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+(?:morning|afternoon|evening))?|(?:June|July|August|September|October|November|December|January|February|March|April|May)\s+\d{1,2}|tomorrow|end of (?:the )?week)\b/i);
  let task = cleanSentence(item.text).replace(/^(yes,\s*)/i, "");
  if (explicitOwner) task = task.replace(new RegExp(`^${explicitOwner[1]},\\s+can you\\s+`, "i"), "");
  else task = task.replace(/^i(?:'ll| will| can)\s+/i, "");
  return { task, owner, due: dueMatch ? `${capitalize(dueMatch[1])} ${dueMatch[2]}` : "No date set" };
}

function extractTopics(text, title, speakers) {
  const stopWords = new Set(["that","this","with","have","from","will","would","there","their","about","should","could","into","your","what","when","where","which","today","thanks","everyone","also","need","good","work","once","after","before","meeting","team"]);
  speakers.forEach(name => stopWords.add(name.toLowerCase()));
  const words = `${title} ${text}`.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  const counts = {};
  words.forEach(word => {
    if (!stopWords.has(word)) counts[word] = (counts[word] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => capitalize(word.replace("-", " ")));
}

function buildSummary(sentences, concern, style, speakerCount) {
  const intro = style === "executive"
    ? `The meeting aligned ${speakerCount || "the"} participants around the highest-priority outcomes and delivery plan.`
    : sentences[0] || "The team reviewed current progress and aligned on next steps.";
  const rest = sentences.slice(1);
  const paragraphs = [intro];
  if (rest.length) paragraphs.push(rest.join(" "));
  if (concern && style !== "brief") paragraphs.push(`Watch item: ${cleanSentence(concern.text)}`);
  return paragraphs;
}

function buildEmail(title, decisions, actions, summarySentences) {
  const actionLines = actions.length
    ? actions.map(item => `- ${item.owner}: ${item.task}${item.due !== "No date set" ? ` (${item.due})` : ""}`).join("\n")
    : "- No explicit action items were captured.";
  return {
    subject: `Recap & next steps: ${title}`,
    body: `Hi everyone,

Thanks for the productive conversation. Here's a quick recap of what we aligned on:

${summarySentences.slice(0, 2).map(sentence => `- ${sentence}`).join("\n")}

Key decisions
${decisions.map(item => `- ${item}`).join("\n")}

Next steps
${actionLines}

Please reply if I missed anything or if an owner or date needs to change.

Best,`
  };
}

function renderBrief(brief) {
  document.querySelector("#resultTitle").textContent = brief.title;
  document.querySelector("#resultMeta").textContent = `${brief.date} / ${brief.speakers.length || "Unknown"} participants`;
  document.querySelector("#summaryContent").innerHTML = brief.summary.map(item => `<p>${escapeHtml(item)}</p>`).join("");
  document.querySelector("#decisionsList").innerHTML = brief.decisions.map(item => `<li contenteditable="true">${escapeHtml(item)}</li>`).join("");
  document.querySelector("#decisionCount").textContent = brief.decisions.length;
  document.querySelector("#actionsList").innerHTML = brief.actions.length
    ? brief.actions.map((item, index) => `
      <div class="action-card">
        <label>
          <input type="checkbox" aria-label="Mark action complete" ${item.completed ? "checked" : ""}>
          <span class="action-text" contenteditable="true">${escapeHtml(item.task)}</span>
        </label>
        <span class="assignee">${escapeHtml(initials(item.owner))} - ${escapeHtml(item.owner)}</span>
        <span class="due-date">${escapeHtml(item.due)}</span>
      </div>`).join("")
    : `<p class="muted-empty">No explicit action items found.</p>`;
  document.querySelector("#actionCount").textContent = brief.actions.length;
  document.querySelector("#topicsList").innerHTML = brief.topics.map(topic => `<span>${escapeHtml(topic)}</span>`).join("");
  document.querySelector("#emailSubject").textContent = brief.emailSubject;
  document.querySelector("#emailBody").textContent = brief.emailBody;

  const emailTabButton = document.querySelector('[data-tab="email"]');
  emailTabButton.style.display = els.emailToggle.checked ? "" : "none";
  if (!els.emailToggle.checked && emailTabButton.classList.contains("active")) document.querySelector('[data-tab="notes"]').click();
}

function buildMarkdown() {
  if (!currentBrief) return "";
  syncBriefFromEditor();
  return `# ${currentBrief.title}
${currentBrief.date}

## Summary
${document.querySelector("#summaryContent").innerText}

## Key decisions
${currentBrief.decisions.map(item => `- ${item}`).join("\n")}

## Action items
${currentBrief.actions.map(item => `- [ ] **${item.owner}:** ${item.task} _${item.due}_`).join("\n")}

## Topics
${currentBrief.topics.map(item => `\`${item}\``).join(" ")}

## Follow-up email
**${currentBrief.emailSubject}**

${document.querySelector("#emailBody").innerText}`;
}

function exportMarkdown() {
  const blob = new Blob([buildMarkdown()], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(currentBrief.title)}-brief.md`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Markdown brief exported");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast("Copied to clipboard");
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function cleanSentence(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return capitalize(/[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`);
}

function splitSentences(text) {
  const protectedText = text.replace(/(\d)\.(\d)/g, "$1__DECIMAL__$2");
  return (protectedText.match(/[^.!?]+[.!?]?/g) || [protectedText]).map(sentence => sentence.replace(/__DECIMAL__/g, "."));
}

function dedupe(items) {
  return [...new Map(items.map(item => [item.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 70), item])).values()];
}

function dedupeObjects(items, key) {
  return [...new Map(items.map(item => [item[key].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60), item])).values()];
}

function inferTitle(topics) {
  return topics.length ? `${topics.slice(0, 2).join(" & ")} meeting` : "Untitled meeting";
}

function formatDate(value) {
  if (!value) return "Date not set";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function initials(name) {
  return name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
