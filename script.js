// ============================================================
// 1. CONSTANTS & HELPERS
// ============================================================
const levantMonths = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

const dayNames = {
  mon: "✸ الإثنين",
  tue: "✸ الثلاثاء",
  wed: "✸ الأربعاء",
  thu: "✸ الخميس",
  fri: "✸ الجمعة",
  sat: "✸ السبت",
  sun: "✸ الأحد",
};

const dayOffsets = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};
const dayKeys = Object.keys(dayOffsets);

const LS_PREFIX = "nashra_";
const LS_KEYS = {
  icon: LS_PREFIX + "icon",
  title: LS_PREFIX + "title",
  aadad: LS_PREFIX + "aadad",
  date: LS_PREFIX + "date",
  bible: LS_PREFIX + "bible",
  recommendations: LS_PREFIX + "recommendations",
  daySubtitles: LS_PREFIX + "daySubtitles",
  dayEvents: LS_PREFIX + "dayEvents",
  newsItems: LS_PREFIX + "newsItems",
  gaps: LS_PREFIX + "gaps",
  lineHeight: LS_PREFIX + "lineHeight",
};

// Pagination settings
let PAGE_GAP = 12;
const FOOTER_RESERVE = 30;
let paginateTimer = null;

// ---- Spacing helpers ----
function parseGapValue(id) {
  const el = document.getElementById(id);
  if (!el) return PAGE_GAP;
  const v = parseFloat(el.value);
  return isNaN(v) || v < 0 ? PAGE_GAP : v;
}

function getSectionGaps() {
  return {
    bible: parseGapValue("input-gap-bible"),
    days: parseGapValue("input-gap-days"),
    news: parseGapValue("input-gap-news"),
    recs: parseGapValue("input-gap-recs"),
  };
}

function applyLineHeight() {
  const el = document.getElementById("input-line-height");
  if (!el) return;
  const v = parseFloat(el.value);
  if (!isNaN(v) && v > 0) {
    document.documentElement.style.setProperty(
      "--content-paper-line-height",
      v,
    );
  }
}

function applyIconDisplay(url) {
  const iconEls = document.querySelectorAll("#display-icon, .cont-sunday-icon");
  const trimmed = url ? url.trim() : "";
  iconEls.forEach((iconEl) => {
    if (trimmed) {
      iconEl.src = trimmed;
      iconEl.classList.remove("is-hidden");
    } else {
      iconEl.src = "";
      iconEl.classList.add("is-hidden");
    }
  });
}

// ============================================================
// 2. DATE FUNCTIONS
// ============================================================
function getWeekMonday() {
  const now = new Date();
  const currentDay = now.getDay();
  const daysSinceTuesday = (currentDay - 2 + 7) % 7;
  const mostRecentTuesday = new Date(now);
  mostRecentTuesday.setHours(0, 0, 0, 0);
  mostRecentTuesday.setDate(now.getDate() - daysSinceTuesday);
  const monday = new Date(mostRecentTuesday);
  monday.setDate(mostRecentTuesday.getDate() + 6);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function initDates() {
  const monday = getWeekMonday();
  dayKeys.forEach((dayKey) => {
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayOffsets[dayKey]);
    const dayNum = targetDate.getDate();
    const monthName = levantMonths[targetDate.getMonth()];
    const yearNum = targetDate.getFullYear();
    const formattedLabel = `${dayNames[dayKey]} ${dayNum} ${monthName} ${yearNum}`;
    const labelEl = document.getElementById(`label-${dayKey}`);
    const nameEl = document.getElementById(`name-${dayKey}`);
    if (labelEl) labelEl.textContent = formattedLabel;
    if (nameEl) nameEl.textContent = `${formattedLabel}:`;
  });
}

let lastWeekKey = null;

function checkWeekRollover() {
  const monday = getWeekMonday();
  const key = monday.toDateString();
  if (lastWeekKey !== null && key !== lastWeekKey) {
    initDates();
    schedulePaginate();
  }
  lastWeekKey = key;
}

function formatInputDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = levantMonths[monthIdx] || month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
}

// ============================================================
// 3. SAVE / LOAD / RESET STATE
// ============================================================
function saveAllData() {
  localStorage.setItem(
    LS_KEYS.icon,
    document.getElementById("input-icon").value,
  );
  localStorage.setItem(
    LS_KEYS.title,
    document.getElementById("input-title").value,
  );
  localStorage.setItem(
    LS_KEYS.aadad,
    document.getElementById("input-3adad").value,
  );
  localStorage.setItem(
    LS_KEYS.date,
    document.getElementById("input-date").value,
  );
  localStorage.setItem(
    LS_KEYS.bible,
    document.getElementById("input-bible").value,
  );
  localStorage.setItem(
    LS_KEYS.recommendations,
    document.getElementById("input-recommendations").value,
  );

  const subtitles = {};
  dayKeys.forEach((k) => {
    const el = document.getElementById(`subtitle-${k}`);
    subtitles[k] = el ? el.value : "";
  });
  localStorage.setItem(LS_KEYS.daySubtitles, JSON.stringify(subtitles));

  const allEvents = {};
  dayKeys.forEach((k) => {
    const container = document.getElementById(`container-${k}`);
    if (!container) return;
    const rows = container.querySelectorAll(".event-row-input");
    const evs = [];
    rows.forEach((row) => {
      const time = row.querySelector(".day-time-input")?.value || "";
      const text = row.querySelector(".day-input")?.value || "";
      evs.push({ time, text });
    });
    allEvents[k] = evs;
  });
  localStorage.setItem(LS_KEYS.dayEvents, JSON.stringify(allEvents));

  const newsContainer = document.getElementById("container-news");
  const newsRows = newsContainer
    ? newsContainer.querySelectorAll(".news-row-input")
    : [];
  const newsData = [];
  newsRows.forEach((row) => {
    const title = row.querySelector(".news-title-input")?.value || "";
    const imgInput = row.querySelector(".news-img-input");
    let imgData = "";
    if (imgInput && imgInput.files && imgInput.files.length > 0) {
      imgData = "HAS_IMAGE";
    } else {
      const previewImg = row.querySelector(".news-item-img-preview");
      if (
        previewImg &&
        previewImg.src &&
        previewImg.src.startsWith("data:image")
      ) {
        imgData = "HAS_IMAGE";
      } else if (
        previewImg &&
        previewImg.src &&
        !previewImg.src.includes("saint_george_assia.png")
      ) {
        imgData = "HAS_IMAGE";
      }
    }
    newsData.push({ title, imgFlag: imgData });
  });
  localStorage.setItem(LS_KEYS.newsItems, JSON.stringify(newsData));

  localStorage.setItem(
    LS_KEYS.gaps,
    JSON.stringify({
      bible: document.getElementById("input-gap-bible").value,
      days: document.getElementById("input-gap-days").value,
      news: document.getElementById("input-gap-news").value,
      recs: document.getElementById("input-gap-recs").value,
    }),
  );

  localStorage.setItem(
    LS_KEYS.lineHeight,
    document.getElementById("input-line-height").value,
  );

  schedulePaginate();
}

function loadAllData() {
  const iconVal = localStorage.getItem(LS_KEYS.icon);
  if (iconVal !== null) {
    document.getElementById("input-icon").value = iconVal;
    applyIconDisplay(iconVal);
  }

  const titleVal = localStorage.getItem(LS_KEYS.title);
  if (titleVal !== null)
    document.getElementById("input-title").value = titleVal;

  const aadadVal = localStorage.getItem(LS_KEYS.aadad);
  if (aadadVal !== null)
    document.getElementById("input-3adad").value = aadadVal;

  const dateVal = localStorage.getItem(LS_KEYS.date);
  if (dateVal !== null) document.getElementById("input-date").value = dateVal;

  const bibleVal = localStorage.getItem(LS_KEYS.bible);
  if (bibleVal !== null)
    document.getElementById("input-bible").value = bibleVal;

  const recVal = localStorage.getItem(LS_KEYS.recommendations);
  if (recVal !== null)
    document.getElementById("input-recommendations").value = recVal;

  const savedGaps = localStorage.getItem(LS_KEYS.gaps);
  if (savedGaps) {
    try {
      const g = JSON.parse(savedGaps);
      if (g.bible !== undefined)
        document.getElementById("input-gap-bible").value = g.bible;
      if (g.days !== undefined)
        document.getElementById("input-gap-days").value = g.days;
      if (g.news !== undefined)
        document.getElementById("input-gap-news").value = g.news;
      if (g.recs !== undefined)
        document.getElementById("input-gap-recs").value = g.recs;
    } catch (e) {}
  }

  const savedLH = localStorage.getItem(LS_KEYS.lineHeight);
  if (savedLH !== null) {
    document.getElementById("input-line-height").value = savedLH;
  }
  applyLineHeight();

  const savedSubtitles = localStorage.getItem(LS_KEYS.daySubtitles);
  if (savedSubtitles) {
    try {
      const subs = JSON.parse(savedSubtitles);
      dayKeys.forEach((k) => {
        const el = document.getElementById(`subtitle-${k}`);
        if (el && subs[k] !== undefined) el.value = subs[k];
      });
    } catch (e) {}
  }

  const savedEvents = localStorage.getItem(LS_KEYS.dayEvents);
  if (savedEvents) {
    try {
      const evs = JSON.parse(savedEvents);
      dayKeys.forEach((k) => {
        const container = document.getElementById(`container-${k}`);
        if (!container) return;
        container.innerHTML = "";
        const dayEvents = evs[k] || [];
        dayEvents.forEach((ev) => {
          addEventRowWithData(k, ev.time, ev.text);
        });
        if (dayEvents.length > 0) {
          container.style.display = "flex";
        }
      });
    } catch (e) {}
  }

  const savedNews = localStorage.getItem(LS_KEYS.newsItems);
  if (savedNews) {
    try {
      const news = JSON.parse(savedNews);
      const container = document.getElementById("container-news");
      if (container) container.innerHTML = "";
      news.forEach((item) => {
        addNewsRowWithData(item.title, item.imgFlag);
      });
    } catch (e) {}
  }

  refreshAllDisplays();
}

function resetAllData() {
  if (!confirm("هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع.")) return;

  Object.values(LS_KEYS).forEach((key) => localStorage.removeItem(key));

  document.getElementById("input-icon").value = "";
  applyIconDisplay("");
  document.getElementById("input-title").value = "";
  document.getElementById("input-3adad").value = "العدد ";
  document.getElementById("input-date").value = "";
  document.getElementById("input-bible").value = "";
  document.getElementById("input-recommendations").value = "";

  document.getElementById("input-line-height").value = "1.4";
  document.getElementById("input-gap-bible").value = "12";
  document.getElementById("input-gap-days").value = "12";
  document.getElementById("input-gap-news").value = "12";
  document.getElementById("input-gap-recs").value = "12";
  applyLineHeight();

  dayKeys.forEach((k) => {
    const el = document.getElementById(`subtitle-${k}`);
    if (el) el.value = "";
  });

  dayKeys.forEach((k) => {
    const container = document.getElementById(`container-${k}`);
    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  });

  const newsContainer = document.getElementById("container-news");
  if (newsContainer) newsContainer.innerHTML = "";
  addNewsRow();

  refreshAllDisplays();
}

// ============================================================
// 4. REFRESH ALL DISPLAYS
// ============================================================
function refreshAllDisplays() {
  const titleInput = document.getElementById("input-title");
  const aadadInput = document.getElementById("input-3adad");
  const dateInput = document.getElementById("input-date");
  const bibleInput = document.getElementById("input-bible");
  const recInput = document.getElementById("input-recommendations");

  document.getElementById("display-title").textContent = titleInput.value || "";
  document.getElementById("display-3adad").textContent = aadadInput.value || "";
  document.getElementById("display-date").textContent = formatInputDate(
    dateInput.value,
  );
  document.getElementById("display-bible").textContent = bibleInput.value;
  document.getElementById("display-recommendations").textContent =
    recInput.value;

  const recVal = recInput.value.trim();
  const wrapperRecs = document.getElementById("wrapper-recommendations");
  if (recVal.length > 0) {
    wrapperRecs.classList.remove("is-hidden");
  } else {
    wrapperRecs.classList.add("is-hidden");
  }

  dayKeys.forEach((k) => {
    updateDayOutput(k);
  });

  updateNewsOutput();
  schedulePaginate();
}

// ============================================================
// 5. EVENT ROW FUNCTIONS
// ============================================================
function toggleDayEvents(dayKey) {
  const container = document.getElementById(`container-${dayKey}`);
  if (!container) return;
  container.style.display = "flex";
  addEventRow(dayKey);
}

function addEventRow(dayKey) {
  const container = document.getElementById(`container-${dayKey}`);
  const eventDiv = document.createElement("div");
  eventDiv.className = "event-row-input";

  eventDiv.innerHTML = `
                <input type="time" class="day-time-input">
                <textarea class="day-input" placeholder="أدخل النشاط..."></textarea>
                <button type="button" class="btn-remove-event" onclick="removeEventRow(this, '${dayKey}')">✕</button>
            `;

  container.appendChild(eventDiv);

  const inputs = eventDiv.querySelectorAll("input, textarea");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      updateDayOutput(dayKey);
      saveAllData();
    });
  });

  updateDayOutput(dayKey);
}

function addEventRowWithData(dayKey, timeVal, textVal) {
  const container = document.getElementById(`container-${dayKey}`);
  const eventDiv = document.createElement("div");
  eventDiv.className = "event-row-input";

  eventDiv.innerHTML = `
                <input type="time" class="day-time-input" value="${timeVal || ""}">
                <textarea class="day-input" placeholder="أدخل النشاط...">${textVal || ""}</textarea>
                <button type="button" class="btn-remove-event" onclick="removeEventRow(this, '${dayKey}')">✕</button>
            `;

  container.appendChild(eventDiv);

  const inputs = eventDiv.querySelectorAll("input, textarea");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      updateDayOutput(dayKey);
      saveAllData();
    });
  });

  updateDayOutput(dayKey);
}

function removeEventRow(btn, dayKey) {
  btn.parentElement.remove();
  updateDayOutput(dayKey);
  saveAllData();
}

// ============================================================
// 6. NEWS ROW FUNCTIONS
// ============================================================
function addNewsRow() {
  const container = document.getElementById("container-news");
  const newsDiv = document.createElement("div");
  newsDiv.className = "news-row-input";

  newsDiv.innerHTML = `
                <div class="news-input-fields">
                    <input type="file" accept="image/*" class="news-img-input">
                    <textarea class="news-title-input" placeholder="عنوان الخبر / المحتوى..."></textarea>
                </div>
                <button type="button" class="btn-remove-event" onclick="removeNewsRow(this)">✕</button>
            `;

  container.appendChild(newsDiv);

  const fileInput = newsDiv.querySelector(".news-img-input");
  const titleInput = newsDiv.querySelector(".news-title-input");

  fileInput.addEventListener("change", () => {
    updateNewsOutput();
    saveAllData();
  });
  titleInput.addEventListener("input", () => {
    updateNewsOutput();
    saveAllData();
  });

  updateNewsOutput();
}

function addNewsRowWithData(title, imgFlag) {
  const container = document.getElementById("container-news");
  const newsDiv = document.createElement("div");
  newsDiv.className = "news-row-input";

  let previewHtml = "";
  if (imgFlag === "HAS_IMAGE") {
    previewHtml = `<div class="news-item-img-preview" style="display:none;"></div>`;
  }

  newsDiv.innerHTML = `
                <div class="news-input-fields">
                    <input type="file" accept="image/*" class="news-img-input">
                    <textarea class="news-title-input" placeholder="عنوان الخبر / المحتوى...">${title || ""}</textarea>
                </div>
                <button type="button" class="btn-remove-event" onclick="removeNewsRow(this)">✕</button>
                ${previewHtml}
            `;

  container.appendChild(newsDiv);

  const fileInput = newsDiv.querySelector(".news-img-input");
  const titleInput = newsDiv.querySelector(".news-title-input");
  const previewDiv = newsDiv.querySelector(".news-item-img-preview");
  if (previewDiv) {
    const img = document.createElement("img");
    img.src = "saint_george_assia.png";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "fill";
    previewDiv.appendChild(img);
  }

  fileInput.addEventListener("change", () => {
    updateNewsOutput();
    saveAllData();
  });
  titleInput.addEventListener("input", () => {
    updateNewsOutput();
    saveAllData();
  });

  updateNewsOutput();
}

function removeNewsRow(btn) {
  btn.closest(".news-row-input").remove();
  updateNewsOutput();
  saveAllData();
}

// ============================================================
// 7. UPDATE OUTPUT FUNCTIONS
// ============================================================
function updateNewsOutput() {
  const container = document.getElementById("container-news");
  const rows = container.querySelectorAll(".news-row-input");
  const gridDisplay = document.getElementById("display-news-grid");
  const wrapperNews = document.getElementById("wrapper-news");

  gridDisplay.innerHTML = "";
  let validCount = 0;

  rows.forEach((row) => {
    const imgInput = row.querySelector(".news-img-input");
    const titleInput = row.querySelector(".news-title-input");
    const previewDiv = row.querySelector(".news-item-img-preview");

    const titleVal = titleInput ? titleInput.value.trim() : "";
    const file = imgInput && imgInput.files ? imgInput.files[0] : null;

    let hasPreviewImage = false;
    if (previewDiv && previewDiv.querySelector("img")) {
      hasPreviewImage = true;
    }

    if (titleVal || file || hasPreviewImage) {
      validCount++;
      const itemDiv = document.createElement("div");
      itemDiv.className = "news-item";

      const textDiv = document.createElement("div");
      textDiv.className = "news-item-text";
      textDiv.textContent = titleVal;

      const imgContainer = document.createElement("div");
      imgContainer.className = "news-item-img";

      const img = document.createElement("img");
      img.addEventListener("load", () => schedulePaginate());

      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } else if (hasPreviewImage && previewDiv) {
        const previewImg = previewDiv.querySelector("img");
        if (previewImg && previewImg.src) {
          img.src = previewImg.src;
        } else {
          img.src = "saint_george_assia.png";
        }
      } else {
        img.src = "saint_george_assia.png";
      }

      imgContainer.appendChild(img);
      itemDiv.appendChild(imgContainer);
      itemDiv.appendChild(textDiv);

      gridDisplay.appendChild(itemDiv);
    }
  });

  if (validCount > 0) {
    wrapperNews.classList.remove("is-hidden");
  } else {
    wrapperNews.classList.add("is-hidden");
  }
}

function checkDaysHeaderVisibility() {
  const wrapperDays = document.getElementById("wrapper-days");
  const visibleRows = document.querySelectorAll(".day-row:not(.is-hidden)");
  if (visibleRows.length > 0) {
    wrapperDays.classList.remove("is-hidden");
  } else {
    wrapperDays.classList.add("is-hidden");
  }
}

function updateDayOutput(dayKey) {
  const container = document.getElementById(`container-${dayKey}`);
  const eventRows = container.querySelectorAll(".event-row-input");
  const targetRow = document.getElementById(`row-${dayKey}`);
  const targetDisplay = document.getElementById(`display-${dayKey}`);

  const subtitleInput = document.getElementById(`subtitle-${dayKey}`);
  const subtitleDisplay = document.getElementById(`display-subtitle-${dayKey}`);
  const subtitleVal = subtitleInput ? subtitleInput.value.trim() : "";

  if (subtitleDisplay) {
    subtitleDisplay.textContent = subtitleVal;
  }

  let combinedHtml = "";
  let hasValidEvents = false;

  eventRows.forEach((row) => {
    const timeInput = row.querySelector(".day-time-input");
    const textInput = row.querySelector(".day-input");

    const timeValue = timeInput ? timeInput.value : "";
    const textValue = textInput ? textInput.value.trim() : "";

    if (timeValue || textValue) {
      hasValidEvents = true;
      let formattedTime = "";
      if (timeValue) {
        const [hours, minutes] = timeValue.split(":");
        const hourNum = parseInt(hours, 10);
        const period = hourNum >= 12 ? "م" : "ص";
        const displayHour = hourNum % 12 || 12;
        formattedTime = `${displayHour}:${minutes} ${period} `;
      }
      combinedHtml += `<div class="event-item-display"><span class="day-time-tag">${formattedTime}</span>${textValue}</div>`;
    }
  });

  if (hasValidEvents || subtitleVal.length > 0) {
    targetDisplay.innerHTML = combinedHtml;
    targetRow.classList.remove("is-hidden");
  } else {
    targetDisplay.innerHTML = "";
    targetRow.classList.add("is-hidden");
  }

  checkDaysHeaderVisibility();
}

// ============================================================
// 8. LISTENERS FOR SIMPLE FIELDS + AUTO-SAVE
// ============================================================
function attachSimpleListeners() {
  const iconInput = document.getElementById("input-icon");
  const titleInput = document.getElementById("input-title");
  const aadadInput = document.getElementById("input-3adad");
  const dateInput = document.getElementById("input-date");
  const bibleInput = document.getElementById("input-bible");
  const recInput = document.getElementById("input-recommendations");

  const titleDisplay = document.getElementById("display-title");
  const aadadDisplay = document.getElementById("display-3adad");
  const titleDate = document.getElementById("display-date");
  const bibleDisplay = document.getElementById("display-bible");
  const recDisplay = document.getElementById("display-recommendations");
  const wrapperRecs = document.getElementById("wrapper-recommendations");

  if (iconInput) {
    iconInput.addEventListener("input", (e) => {
      applyIconDisplay(e.target.value);
      saveAllData();
    });
  }

  titleInput.addEventListener("input", (e) => {
    titleDisplay.textContent = e.target.value || "";
    saveAllData();
  });

  aadadInput.addEventListener("input", (e) => {
    aadadDisplay.textContent = e.target.value || "";
    saveAllData();
  });

  dateInput.addEventListener("input", (e) => {
    titleDate.textContent = formatInputDate(e.target.value);
    saveAllData();
  });

  bibleInput.addEventListener("input", (e) => {
    bibleDisplay.textContent = e.target.value;
    saveAllData();
  });

  recInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    recDisplay.textContent = val;
    if (val.length > 0) {
      wrapperRecs.classList.remove("is-hidden");
    } else {
      wrapperRecs.classList.add("is-hidden");
    }
    saveAllData();
  });

  dayKeys.forEach((k) => {
    const el = document.getElementById(`subtitle-${k}`);
    if (el) {
      el.addEventListener("input", () => {
        updateDayOutput(k);
        saveAllData();
      });
    }
  });

  [
    "input-gap-bible",
    "input-gap-days",
    "input-gap-news",
    "input-gap-recs",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => saveAllData());
  });

  const lhInput = document.getElementById("input-line-height");
  if (lhInput) {
    lhInput.addEventListener("input", () => {
      applyLineHeight();
      saveAllData();
    });
  }
}

// ============================================================
// 9. PAGINATION ENGINE (DYNAMIC CONTINUOUS FLOW)
// ============================================================
let measureBox = null;

function getMeasureBox(width) {
  if (!measureBox) {
    measureBox = document.createElement("div");
    measureBox.id = "measure-box";
    measureBox.style.cssText =
      "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;";
    document.body.appendChild(measureBox);
  }
  measureBox.style.width = Math.floor(width) + "px";
  return measureBox;
}

function measureElementHeight(el, contentWidth) {
  const box = getMeasureBox(contentWidth);
  box.appendChild(el);
  const cs = getComputedStyle(el);
  const h =
    el.getBoundingClientRect().height +
    (parseFloat(cs.marginTop) || 0) +
    (parseFloat(cs.marginBottom) || 0);
  box.removeChild(el);
  return h;
}

function createTextMeasurer(className, contentWidth) {
  const box = getMeasureBox(contentWidth);
  const probe = document.createElement("div");
  probe.className = className;
  box.appendChild(probe);
  return {
    measure(text) {
      probe.textContent = text;
      const cs = getComputedStyle(probe);
      return (
        probe.getBoundingClientRect().height +
        (parseFloat(cs.marginTop) || 0) +
        (parseFloat(cs.marginBottom) || 0)
      );
    },
    dispose() {
      if (probe.parentNode) probe.parentNode.removeChild(probe);
    },
  };
}

function stripIds(node) {
  if (!node || node.nodeType !== 1) return node;
  if (node.id) node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  return node;
}

function schedulePaginate() {
  if (paginateTimer) clearTimeout(paginateTimer);
  paginateTimer = setTimeout(() => {
    paginateTimer = null;
    paginate();
  }, 250);
}

function computePageMetrics() {
  const src = document.getElementById("paper-source");
  const cs = getComputedStyle(src);
  const rect = src.getBoundingClientRect();
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const padLeft = parseFloat(cs.paddingLeft) || 0;
  const padRight = parseFloat(cs.paddingRight) || 0;
  const contentWidth = rect.width - padLeft - padRight;
  const usableHeight = rect.height - padTop - padBottom - FOOTER_RESERVE;
  return { contentWidth, usableHeight };
}

function takeFittingText(remainingText, maxHeight, measureFn) {
  if (!remainingText) return { fitted: "", rest: "" };
  if (measureFn(remainingText) <= maxHeight) {
    return { fitted: remainingText, rest: "" };
  }

  const lines = remainingText.split("\n");
  let fittedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const testWithLine = [...fittedLines, lines[i]].join("\n");
    if (measureFn(testWithLine) <= maxHeight) {
      fittedLines.push(lines[i]);
    } else {
      const words = lines[i].split(" ");
      let fittedWords = [];
      for (let j = 0; j < words.length; j++) {
        const partialLine = [...fittedWords, words[j]].join(" ");
        const testWithPartial = [...fittedLines, partialLine].join("\n");
        if (measureFn(testWithPartial) <= maxHeight) {
          fittedWords.push(words[j]);
        } else {
          const restWords = words.slice(j).join(" ");
          const restLines = [restWords, ...lines.slice(i + 1)].join("\n");
          const fitted =
            fittedWords.length > 0
              ? [...fittedLines, fittedWords.join(" ")].join("\n")
              : fittedLines.join("\n");
          return { fitted, rest: restLines };
        }
      }
      break;
    }
  }

  const fitted = fittedLines.join("\n");
  const rest = lines.slice(fittedLines.length).join("\n");
  return { fitted, rest };
}

function buildFirstHeaderTemplate(source) {
  const template = document.createElement("div");
  template.className = "paper-header-group";
  source
    .querySelectorAll(":scope > .paper-header, :scope > hr, :scope > .ra3awe")
    .forEach((part) => {
      template.appendChild(stripIds(part.cloneNode(true)));
    });
  return template;
}

function buildContinuationHeaderTemplate() {
  const template = document.createElement("div");
  template.className = "paper-header-group";

  const header = document.createElement("div");
  header.className = "paper-header-cont";

  const risele = document.createElement("div");
  risele.className = "cont-risele";
  const riseleImg = document.createElement("img");
  riseleImg.src = "title.png";
  riseleImg.alt = "title";
  risele.appendChild(riseleImg);

  const center = document.createElement("div");
  center.className = "cont-center";

  const aadadEl = document.createElement("div");
  aadadEl.className = "date";
  aadadEl.textContent = document.getElementById("input-3adad").value || "";

  const separatorEl = document.createElement("div");
  separatorEl.className = "date";
  separatorEl.textContent = "-";

  const dateEl = document.createElement("div");
  dateEl.className = "date";
  dateEl.textContent = formatInputDate(
    document.getElementById("input-date").value,
  );

  center.appendChild(aadadEl);
  center.appendChild(separatorEl);
  center.appendChild(dateEl);

  const logo = document.createElement("div");
  logo.className = "cont-logo";

  const iconVal = document.getElementById("input-icon").value.trim();
  if (iconVal) {
    const contIconImg = document.createElement("img");
    contIconImg.src = iconVal;
    contIconImg.alt = "icon";
    contIconImg.className = "cont-sunday-icon";
    logo.appendChild(contIconImg);
  }

  const logoImg = document.createElement("img");
  logoImg.src = "saint_george_assia.png";
  logoImg.alt = "saint george";
  logo.appendChild(logoImg);

  header.appendChild(risele);
  header.appendChild(center);
  header.appendChild(logo);
  template.appendChild(header);

  const hr = document.createElement("hr");
  template.appendChild(hr);

  return template;
}

function buildItems(metrics) {
  const source = document.getElementById("paper-source");
  const items = [];

  const addFixedEl = (el, type, section, isSectionStart) => {
    const clone = stripIds(el.cloneNode(true));
    const h = measureElementHeight(clone, metrics.contentWidth);
    items.push({ kind: "fixed", el: clone, h, type, section, isSectionStart });
  };

  const bibleWrapper = source.querySelector("#wrapper-bible");
  if (bibleWrapper && !bibleWrapper.classList.contains("is-hidden")) {
    const bibleEl = bibleWrapper.querySelector("#display-bible");
    const text = bibleEl ? bibleEl.textContent || "" : "";
    if (text.trim()) {
      items.push({
        kind: "text",
        text,
        className: "content-box",
        section: "bible",
        isSectionStart: true,
      });
    }
  }

  const daysWrapper = source.querySelector("#wrapper-days");
  if (daysWrapper && !daysWrapper.classList.contains("is-hidden")) {
    let firstInDays = true;
    const titleEl = daysWrapper.querySelector(".section-title");
    if (titleEl) {
      addFixedEl(titleEl, "title", "days", firstInDays);
      firstInDays = false;
    }
    daysWrapper.querySelectorAll(".day-row").forEach((row) => {
      if (!row.classList.contains("is-hidden")) {
        addFixedEl(row, "day", "days", firstInDays);
        firstInDays = false;
      }
    });
  }

  const newsWrapper = source.querySelector("#wrapper-news");
  if (newsWrapper && !newsWrapper.classList.contains("is-hidden")) {
    let firstInNews = true;
    const titleEl = newsWrapper.querySelector(".section-title");
    if (titleEl) {
      addFixedEl(titleEl, "title", "news", firstInNews);
      firstInNews = false;
    }
    newsWrapper.querySelectorAll(".news-item").forEach((item) => {
      addFixedEl(item, "news", "news", firstInNews);
      firstInNews = false;
    });
  }

  const recWrapper = source.querySelector("#wrapper-recommendations");
  if (recWrapper && !recWrapper.classList.contains("is-hidden")) {
    let firstInRecs = true;
    const titleEl = recWrapper.querySelector(".section-title");
    if (titleEl) {
      addFixedEl(titleEl, "title", "recs", firstInRecs);
      firstInRecs = false;
    }
    const recEl = recWrapper.querySelector("#display-recommendations");
    const text = recEl ? recEl.textContent || "" : "";
    if (text.trim()) {
      items.push({
        kind: "text",
        text,
        className: "content-box",
        section: "recs",
        isSectionStart: firstInRecs,
      });
    }
  }

  return items;
}

function distributeItems(
  items,
  metrics,
  firstHeaderHeight,
  contHeaderHeight,
  sectionGaps,
) {
  const pages = [];
  const usable = metrics.usableHeight;

  let current = { blocks: [], height: firstHeaderHeight };

  const startNewPage = () => {
    pages.push(current);
    current = { blocks: [], height: contHeaderHeight };
  };

  const getGap = (section, isSectionStart) => {
    if (isSectionStart) {
      const v = sectionGaps[section];
      return typeof v === "number" && !isNaN(v) ? v : PAGE_GAP;
    }
    return PAGE_GAP;
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.kind === "fixed") {
      let gap = getGap(item.section, item.isSectionStart);

      if (item.type === "title" && i + 1 < items.length) {
        const next = items[i + 1];
        let minNextHeight = 0;
        if (next.kind === "fixed") {
          minNextHeight = next.h;
        } else if (next.kind === "text") {
          const m = createTextMeasurer(next.className, metrics.contentWidth);
          minNextHeight = m.measure("أبجد");
          m.dispose();
        }

        if (
          current.height + gap + item.h + PAGE_GAP + minNextHeight > usable &&
          current.blocks.length > 0
        ) {
          startNewPage();
          gap = getGap(item.section, item.isSectionStart);
        }
      } else if (
        current.height + gap + item.h > usable &&
        current.blocks.length > 0
      ) {
        startNewPage();
        gap = getGap(item.section, item.isSectionStart);
      }

      if (current.blocks.length === 0) {
        gap = Math.min(gap, Math.max(0, usable - current.height - item.h));
      }

      current.blocks.push({ el: item.el, gapBefore: gap });
      current.height += gap + item.h;
    } else if (item.kind === "text") {
      let remaining = item.text;
      let isFirstChunk = true;
      const measurer = createTextMeasurer(item.className, metrics.contentWidth);
      const singleLineHeight = measurer.measure("أبجد");

      while (remaining && remaining.trim().length > 0) {
        let gap = isFirstChunk
          ? getGap(item.section, item.isSectionStart)
          : PAGE_GAP;
        let available = usable - current.height - gap;

        if (available < singleLineHeight && current.blocks.length > 0) {
          startNewPage();
          gap = isFirstChunk
            ? getGap(item.section, item.isSectionStart)
            : PAGE_GAP;
          available = usable - current.height - gap;
        }

        const { fitted, rest } = takeFittingText(
          remaining,
          Math.max(singleLineHeight, available),
          measurer.measure,
        );

        if (!fitted && current.blocks.length > 0) {
          startNewPage();
          continue;
        }

        const chunkText = fitted || remaining;
        const div = document.createElement("div");
        div.className = item.className;
        div.textContent = chunkText;
        const h = measureElementHeight(div, metrics.contentWidth);

        if (current.blocks.length === 0) {
          gap = Math.min(gap, Math.max(0, usable - current.height - h));
        }

        current.blocks.push({ el: div, gapBefore: gap });
        current.height += gap + h;

        remaining = fitted ? rest : "";
        isFirstChunk = false;

        if (remaining && remaining.trim().length > 0) {
          startNewPage();
        }
      }

      measurer.dispose();
    }
  }

  if (current.blocks.length > 0 || pages.length === 0) {
    pages.push(current);
  }
  return pages;
}

function renderPages(pages, firstHeaderTemplate, contHeaderTemplate) {
  const container = document.getElementById("paper-to-print");
  if (!container) return;
  container.innerHTML = "";

  const total = pages.length;

  pages.forEach((page, index) => {
    const pageEl = document.createElement("div");
    pageEl.className = "paper";
    pageEl.setAttribute("data-page", String(index + 1));

    const contentEl = document.createElement("div");
    contentEl.className = "paper-content";

    const headerTpl = index === 0 ? firstHeaderTemplate : contHeaderTemplate;
    if (headerTpl) {
      contentEl.appendChild(headerTpl.cloneNode(true));
    }

    page.blocks.forEach((b) => {
      const gap = b.gapBefore != null ? b.gapBefore : PAGE_GAP;
      b.el.style.marginTop = gap + "px";
      contentEl.appendChild(b.el);
    });

    const footer = document.createElement("div");
    footer.className = "paperfooter";
    footer.textContent = `${index + 1}/${total}`;

    pageEl.appendChild(contentEl);
    pageEl.appendChild(footer);
    container.appendChild(pageEl);
  });
}

function paginate(overrideGap) {
  const source = document.getElementById("paper-source");
  if (!source) return;

  const prevGap = PAGE_GAP;
  if (typeof overrideGap === "number" && !isNaN(overrideGap)) {
    PAGE_GAP = overrideGap;
  }

  try {
    const metrics = computePageMetrics();
    if (metrics.contentWidth <= 0 || metrics.usableHeight <= 0) return;

    const firstHeaderTemplate = buildFirstHeaderTemplate(source);
    const contHeaderTemplate = buildContinuationHeaderTemplate();

    const firstHeaderHeight = measureElementHeight(
      firstHeaderTemplate.cloneNode(true),
      metrics.contentWidth,
    );
    const contHeaderHeight = measureElementHeight(
      contHeaderTemplate.cloneNode(true),
      metrics.contentWidth,
    );

    const sectionGaps = getSectionGaps();
    const items = buildItems(metrics);

    const pages = distributeItems(
      items,
      metrics,
      firstHeaderHeight,
      contHeaderHeight,
      sectionGaps,
    );

    renderPages(pages, firstHeaderTemplate, contHeaderTemplate);
  } catch (err) {
    console.error("Pagination error:", err);
  } finally {
    PAGE_GAP = prevGap;
  }
}

// ============================================================
// 10. DOWNLOAD AS IMAGE
// ============================================================
// ============================================================
// 10. DOWNLOAD AS IMAGE (Fixed CORS & Missing Icons)
// ============================================================

// Helper: Convert external image URL to Base64 to bypass browser security
async function convertImageToBase64(url) {
  if (!url || url.startsWith("data:")) return url; // Already local/base64

  // 1. Try fetching directly (works if the server allows it)
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    // 2. If blocked, use a public CORS proxy (images.weserv.nl)
    try {
      const cleanUrl = url.replace(/^https?:\/\//i, "");
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&we`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (proxyError) {
      console.warn("Could not convert image, using original URL:", url);
      return url; // Fallback to original URL
    }
  }
}

async function downloadAsImage() {
  const pagesWrap = document.getElementById("paper-to-print");
  if (!pagesWrap) return;
  const btn = document.querySelector(".print-btn");
  if (btn) btn.disabled = true;

  const prevZoom = pagesWrap.style.zoom;
  paginate();
  pagesWrap.style.zoom = "1";

  // Fix date margins for capture
  const dateEls = pagesWrap.querySelectorAll(
    ".sundaydetails .date, .cont-center .date",
  );
  const savedDateMargins = [];
  dateEls.forEach((el) => {
    savedDateMargins.push([el, el.style.marginTop]);
    el.style.marginTop = "-8px";
  });
  paginate();

  const pages = Array.from(pagesWrap.querySelectorAll(".paper"));
  if (pages.length === 0) {
    pagesWrap.style.zoom = prevZoom;
    savedDateMargins.forEach(([el, v]) => (el.style.marginTop = v));
    paginate();
    if (btn) btn.disabled = false;
    return;
  }

  try {
    // STEP 1: Find all images and convert them to Base64 BEFORE capturing
    const allImages = pagesWrap.querySelectorAll("img");
    const conversionPromises = Array.from(allImages).map(async (img) => {
      const originalSrc = img.getAttribute("src") || img.src;
      const base64Src = await convertImageToBase64(originalSrc);
      img.src = base64Src; // Replace link with Base64 code
    });

    // Wait for all images to be converted
    await Promise.all(conversionPromises);

    // STEP 2: Wait for the new Base64 images to fully load in the DOM
    const loadPromises = Array.from(allImages).map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 3000); // Hard timeout fallback
      });
    });
    await Promise.all(loadPromises);

    // STEP 3: Capture each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Scroll into view to ensure browser renders it
      page.scrollIntoView({ behavior: "instant", block: "start" });
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(page, {
        scale: 3, // High resolution
        useCORS: true,
        allowTaint: false, // MUST be false to allow downloading
        logging: false,
        backgroundColor: "#ffffff",
        // Use the ACTUAL dimensions of the paper, not hardcoded numbers
        width: page.offsetWidth,
        height: page.offsetHeight,
        windowWidth: page.offsetWidth,
        windowHeight: page.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });

      const link = document.createElement("a");
      link.download =
        pages.length === 1
          ? "saint_george_assia_highres.png"
          : `saint_george_assia_page_${i + 1}_of_${pages.length}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (i < pages.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } catch (err) {
    console.error("Export Error:", err);
    alert("حدث خطأ أثناء تحميل الصور: " + err.message);
  } finally {
    // Restore original state
    savedDateMargins.forEach(([el, v]) => (el.style.marginTop = v));
    pagesWrap.style.zoom = prevZoom;
    paginate();
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// 11. INIT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  checkWeekRollover();
  initDates();
  attachSimpleListeners();
  loadAllData();

  dayKeys.forEach((k) => {
    const container = document.getElementById(`container-${k}`);
    if (container) {
      if (container.children.length > 0) {
        container.style.display = "flex";
      } else {
        container.style.display = "none";
      }
    }
  });

  const newsContainer = document.getElementById("container-news");
  if (newsContainer && newsContainer.children.length === 0) {
    addNewsRow();
  }

  refreshAllDisplays();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => paginate());
  }

  window.addEventListener("beforeunload", () => {
    saveAllData();
  });

  document.addEventListener("input", (e) => {
    if (e.target.closest(".form-container")) {
      saveAllData();
    }
  });

  setInterval(checkWeekRollover, 60 * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkWeekRollover();
  });
});
