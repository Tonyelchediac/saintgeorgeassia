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
const DEFAULT_PAGE_GAP = 12;
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

// ============================================================
// 2. DATE FUNCTIONS
// ============================================================

// Returns the Monday of the displayed week.
//
// Rule:
//   - The displayed week advances by 7 days at TUESDAY 00:00 (local time).
//   - The displayed week is always the week AFTER the week containing
//     the most recent rollover Tuesday.
//
// Example (today = Fri 13 Nov 2026):
//   most recent Tuesday = Tue 10 Nov 2026
//   displayed Monday    = Tue 10 Nov + 6 days = Mon 16 Nov 2026
//   displayed Friday    = Fri 20 Nov 2026
function getWeekMonday() {
  const now = new Date();
  const currentDay = now.getDay();

  const daysSinceTuesday = (currentDay - 2 + 7) % 7;

  const mostRecentTuesday = new Date(now);
  mostRecentTuesday.setHours(0, 0, 0, 0);
  mostRecentTuesday.setDate(
    now.getDate() - daysSinceTuesday,
  );

  const monday = new Date(mostRecentTuesday);
  monday.setDate(mostRecentTuesday.getDate() + 6);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function initDates() {
  const monday = getWeekMonday();

  dayKeys.forEach((dayKey) => {
    const targetDate = new Date(monday);

    targetDate.setDate(
      monday.getDate() + dayOffsets[dayKey],
    );

    const dayNum = targetDate.getDate();
    const monthName = levantMonths[targetDate.getMonth()];
    const yearNum = targetDate.getFullYear();

    const formattedLabel =
      `${dayNames[dayKey]} ${dayNum} ${monthName} ${yearNum}`;

    const labelEl = document.getElementById(
      `label-${dayKey}`,
    );

    const nameEl = document.getElementById(
      `name-${dayKey}`,
    );

    if (labelEl) {
      labelEl.textContent = formattedLabel;
    }

    if (nameEl) {
      nameEl.textContent = `${formattedLabel}:`;
    }
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
  if (!dateStr) return "‎‏‏‎";

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

  localStorage.setItem(
    LS_KEYS.daySubtitles,
    JSON.stringify(subtitles),
  );

  const allEvents = {};

  dayKeys.forEach((k) => {
    const container = document.getElementById(`container-${k}`);

    if (!container) return;

    const rows = container.querySelectorAll(".event-row-input");
    const evs = [];

    rows.forEach((row) => {
      const time =
        row.querySelector(".day-time-input")?.value || "";

      const text =
        row.querySelector(".day-input")?.value || "";

      evs.push({ time, text });
    });

    allEvents[k] = evs;
  });

  localStorage.setItem(
    LS_KEYS.dayEvents,
    JSON.stringify(allEvents),
  );

  const newsContainer = document.getElementById("container-news");

  const newsRows = newsContainer
    ? newsContainer.querySelectorAll(".news-row-input")
    : [];

  const newsData = [];

  newsRows.forEach((row) => {
    const title =
      row.querySelector(".news-title-input")?.value || "";

    const imgInput = row.querySelector(".news-img-input");

    let imgData = "";

    if (
      imgInput &&
      imgInput.files &&
      imgInput.files.length > 0
    ) {
      imgData = "HAS_IMAGE";
    } else {
      const previewImg = row.querySelector(
        ".news-item-img-preview",
      );

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

    newsData.push({
      title,
      imgFlag: imgData,
    });
  });

  localStorage.setItem(
    LS_KEYS.newsItems,
    JSON.stringify(newsData),
  );

  // Save spacing values
  localStorage.setItem(
    LS_KEYS.gaps,
    JSON.stringify({
      bible: document.getElementById("input-gap-bible").value,
      days: document.getElementById("input-gap-days").value,
      news: document.getElementById("input-gap-news").value,
      recs: document.getElementById("input-gap-recs").value,
    }),
  );

  // Save line height
  localStorage.setItem(
    LS_KEYS.lineHeight,
    document.getElementById("input-line-height").value,
  );

  schedulePaginate();
}

function loadAllData() {
  const titleVal = localStorage.getItem(LS_KEYS.title);

  if (titleVal !== null) {
    document.getElementById("input-title").value = titleVal;
  }

  const aadadVal = localStorage.getItem(LS_KEYS.aadad);

  if (aadadVal !== null) {
    document.getElementById("input-3adad").value = aadadVal;
  }

  const dateVal = localStorage.getItem(LS_KEYS.date);

  if (dateVal !== null) {
    document.getElementById("input-date").value = dateVal;
  }

  const bibleVal = localStorage.getItem(LS_KEYS.bible);

  if (bibleVal !== null) {
    document.getElementById("input-bible").value = bibleVal;
  }

  const recVal = localStorage.getItem(LS_KEYS.recommendations);

  if (recVal !== null) {
    document.getElementById("input-recommendations").value = recVal;
  }

  const savedGaps = localStorage.getItem(LS_KEYS.gaps);

  if (savedGaps) {
    try {
      const g = JSON.parse(savedGaps);

      if (g.bible !== undefined) {
        document.getElementById("input-gap-bible").value = g.bible;
      }

      if (g.days !== undefined) {
        document.getElementById("input-gap-days").value = g.days;
      }

      if (g.news !== undefined) {
        document.getElementById("input-gap-news").value = g.news;
      }

      if (g.recs !== undefined) {
        document.getElementById("input-gap-recs").value = g.recs;
      }
    } catch (e) {}
  }

  const savedLH = localStorage.getItem(LS_KEYS.lineHeight);

  if (savedLH !== null) {
    document.getElementById("input-line-height").value = savedLH;
  }

  applyLineHeight();

  const savedSubtitles = localStorage.getItem(
    LS_KEYS.daySubtitles,
  );

  if (savedSubtitles) {
    try {
      const subs = JSON.parse(savedSubtitles);

      dayKeys.forEach((k) => {
        const el = document.getElementById(`subtitle-${k}`);

        if (el && subs[k] !== undefined) {
          el.value = subs[k];
        }
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

      if (container) {
        container.innerHTML = "";
      }

      news.forEach((item) => {
        addNewsRowWithData(item.title, item.imgFlag);
      });
    } catch (e) {}
  }

  refreshAllDisplays();
}

function resetAllData() {
  if (!confirm("هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع.")) {
    return;
  }

  Object.values(LS_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  document.getElementById("input-title").value = "";
  document.getElementById("input-3adad").value = "العدد ";
  document.getElementById("input-date").value = "";
  document.getElementById("input-bible").value = "";
  document.getElementById("input-recommendations").value = "";

  // Default formatting values
  document.getElementById("input-line-height").value = "1.4";
  document.getElementById("input-gap-bible").value = "4";
  document.getElementById("input-gap-days").value = "50";
  document.getElementById("input-gap-news").value = "4";
  document.getElementById("input-gap-recs").value = "50";

  applyLineHeight();

  dayKeys.forEach((k) => {
    const el = document.getElementById(`subtitle-${k}`);

    if (el) {
      el.value = "";
    }
  });

  dayKeys.forEach((k) => {
    const container = document.getElementById(`container-${k}`);

    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  });

  const newsContainer = document.getElementById("container-news");

  if (newsContainer) {
    newsContainer.innerHTML = "";
  }

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

  document.getElementById("display-title").textContent =
    titleInput.value;

  document.getElementById("display-3adad").textContent =
    aadadInput.value;

  document.getElementById("display-date").textContent =
    formatInputDate(dateInput.value);

  document.getElementById("display-bible").textContent =
    bibleInput.value;

  const recDisplay = document.getElementById(
    "display-recommendations",
  );

  recDisplay.textContent = recInput.value.trim();

  const wrapperRecs = document.getElementById(
    "wrapper-recommendations",
  );

  if (recInput.value.trim().length > 0) {
    wrapperRecs.classList.remove("is-hidden");
  } else {
    wrapperRecs.classList.add("is-hidden");
  }

  dayKeys.forEach((k) => {
    updateDayOutput(k);
  });

  updateNewsOutput();
  applyLineHeight();
  paginate();
}

// ============================================================
// 5. DAY EVENTS
// ============================================================

function addEventRow(dayKey) {
  const container = document.getElementById(`container-${dayKey}`);

  if (!container) return;

  const row = document.createElement("div");
  row.className = "event-row-input";

  row.innerHTML = `
    <input type="time" class="day-time-input">
    <input type="text" class="day-input" placeholder="تفاصيل النشاط">
    <button type="button" class="remove-event-btn">×</button>
  `;

  container.appendChild(row);
  container.style.display = "flex";

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      updateDayOutput(dayKey);
      saveAllData();
    });
  });

  row.querySelector(".remove-event-btn").addEventListener(
    "click",
    () => {
      row.remove();

      if (container.children.length === 0) {
        container.style.display = "none";
      }

      updateDayOutput(dayKey);
      saveAllData();
    },
  );

  updateDayOutput(dayKey);
  saveAllData();
}

function addEventRowWithData(dayKey, time, text) {
  const container = document.getElementById(`container-${dayKey}`);

  if (!container) return;

  const row = document.createElement("div");
  row.className = "event-row-input";

  row.innerHTML = `
    <input type="time" class="day-time-input">
    <input type="text" class="day-input" placeholder="تفاصيل النشاط">
    <button type="button" class="remove-event-btn">×</button>
  `;

  const timeInput = row.querySelector(".day-time-input");
  const textInput = row.querySelector(".day-input");

  timeInput.value = time || "";
  textInput.value = text || "";

  container.appendChild(row);
  container.style.display = "flex";

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      updateDayOutput(dayKey);
      saveAllData();
    });
  });

  row.querySelector(".remove-event-btn").addEventListener(
    "click",
    () => {
      row.remove();

      if (container.children.length === 0) {
        container.style.display = "none";
      }

      updateDayOutput(dayKey);
      saveAllData();
    },
  );
}

// ============================================================
// 6. DAY OUTPUT
// ============================================================

function updateDayOutput(dayKey) {
  const container = document.getElementById(`container-${dayKey}`);
  const output = document.getElementById(`output-${dayKey}`);

  if (!container || !output) return;

  output.innerHTML = "";

  const rows = container.querySelectorAll(".event-row-input");

  rows.forEach((row) => {
    const time =
      row.querySelector(".day-time-input")?.value || "";

    const text =
      row.querySelector(".day-input")?.value || "";

    if (!time && !text) return;

    const item = document.createElement("div");
    item.className = "day-event";

    const timeSpan = document.createElement("span");
    timeSpan.className = "day-event-time";
    timeSpan.textContent = time;

    const textSpan = document.createElement("span");
    textSpan.className = "day-event-text";
    textSpan.textContent = text;

    if (time) {
      item.appendChild(timeSpan);
    }

    if (text) {
      item.appendChild(textSpan);
    }

    output.appendChild(item);
  });

  const row = document.getElementById(`row-${dayKey}`);

  if (row) {
    if (rows.length > 0) {
      row.classList.remove("is-hidden");
    } else {
      row.classList.add("is-hidden");
    }
  }
}

// ============================================================
// 7. NEWS
// ============================================================

function addNewsRow() {
  const container = document.getElementById("container-news");

  if (!container) return;

  const row = document.createElement("div");
  row.className = "news-row-input";

  row.innerHTML = `
    <input type="text" class="news-title-input" placeholder="عنوان الخبر">
    <input type="file" class="news-img-input" accept="image/*">
    <button type="button" class="remove-news-btn">×</button>
  `;

  container.appendChild(row);

  row.querySelector(".news-title-input").addEventListener(
    "input",
    () => {
      updateNewsOutput();
      saveAllData();
    },
  );

  row.querySelector(".news-img-input").addEventListener(
    "change",
    () => {
      updateNewsOutput();
      saveAllData();
    },
  );

  row.querySelector(".remove-news-btn").addEventListener(
    "click",
    () => {
      row.remove();
      updateNewsOutput();
      saveAllData();
    },
  );
}

function addNewsRowWithData(title, imgFlag) {
  const container = document.getElementById("container-news");

  if (!container) return;

  const row = document.createElement("div");
  row.className = "news-row-input";

  row.innerHTML = `
    <input type="text" class="news-title-input" placeholder="عنوان الخبر">
    <input type="file" class="news-img-input" accept="image/*">
    <button type="button" class="remove-news-btn">×</button>
  `;

  row.querySelector(".news-title-input").value = title || "";

  container.appendChild(row);

  row.querySelector(".news-title-input").addEventListener(
    "input",
    () => {
      updateNewsOutput();
      saveAllData();
    },
  );

  row.querySelector(".news-img-input").addEventListener(
    "change",
    () => {
      updateNewsOutput();
      saveAllData();
    },
  );

  row.querySelector(".remove-news-btn").addEventListener(
    "click",
    () => {
      row.remove();
      updateNewsOutput();
      saveAllData();
    },
  );
}

// ============================================================
// 8. NEWS OUTPUT & LISTENERS
// ============================================================

function updateNewsOutput() {
  const container = document.getElementById("container-news");
  const output = document.getElementById("news-output");

  if (!container || !output) return;

  output.innerHTML = "";

  const rows = container.querySelectorAll(".news-row-input");

  rows.forEach((row) => {
    const title =
      row.querySelector(".news-title-input")?.value || "";

    const fileInput = row.querySelector(".news-img-input");

    if (!title.trim() && !fileInput?.files?.length) return;

    const item = document.createElement("div");
    item.className = "news-item";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const img = document.createElement("img");
      img.className = "news-item-img-preview";

      img.src = URL.createObjectURL(fileInput.files[0]);
      img.alt = title || "صورة الخبر";

      item.appendChild(img);
    }

    const text = document.createElement("div");
    text.className = "news-item-title";
    text.textContent = title;

    item.appendChild(text);
    output.appendChild(item);
  });

  const wrapper = document.getElementById("wrapper-news");

  if (wrapper) {
    if (output.children.length > 0) {
      wrapper.classList.remove("is-hidden");
    } else {
      wrapper.classList.add("is-hidden");
    }
  }
}

function attachSimpleListeners() {
  const titleInput = document.getElementById("input-title");
  const aadadInput = document.getElementById("input-3adad");
  const dateInput = document.getElementById("input-date");
  const bibleInput = document.getElementById("input-bible");
  const recInput = document.getElementById("input-recommendations");

  const titleDate = document.getElementById("display-date");
  const recDisplay = document.getElementById(
    "display-recommendations",
  );

  const wrapperRecs = document.getElementById(
    "wrapper-recommendations",
  );

  titleInput.addEventListener("input", (e) => {
    document.getElementById("display-title").textContent =
      e.target.value;

    saveAllData();
  });

  aadadInput.addEventListener("input", (e) => {
    document.getElementById("display-3adad").textContent =
      e.target.value;

    saveAllData();
  });

  dateInput.addEventListener("input", (e) => {
    titleDate.textContent = formatInputDate(e.target.value);
    saveAllData();
  });

  bibleInput.addEventListener("input", (e) => {
    document.getElementById("display-bible").textContent =
      e.target.value;

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

  // Spacing inputs
  [
    "input-gap-bible",
    "input-gap-days",
    "input-gap-news",
    "input-gap-recs",
  ].forEach((id) => {
    const el = document.getElementById(id);

    if (el) {
      el.addEventListener("input", () => {
        saveAllData();
      });
    }
  });

  // Line-height input
  const lhInput = document.getElementById("input-line-height");

  if (lhInput) {
    lhInput.addEventListener("input", () => {
      applyLineHeight();
      saveAllData();
    });
  }
}

// ============================================================
// 9. PAGINATION ENGINE
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
      return probe.getBoundingClientRect().height;
    },

    dispose() {
      if (probe.parentNode) {
        probe.parentNode.removeChild(probe);
      }
    },
  };
}

function stripIds(node) {
  if (!node || node.nodeType !== 1) return node;

  if (node.id) {
    node.removeAttribute("id");
  }

  node.querySelectorAll("[id]").forEach((el) => {
    el.removeAttribute("id");
  });

  return node;
}

function schedulePaginate() {
  if (paginateTimer) {
    clearTimeout(paginateTimer);
  }

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

  const usableHeight =
    rect.height - padTop - padBottom - FOOTER_RESERVE;

  return {
    contentWidth,
    usableHeight,
  };
}

function splitTextIntoChunks(text, maxHeight, measureFn) {
  const chunks = [];

  if (!text) return chunks;

  const lines = text.split("\n");
  let current = "";

  for (const line of lines) {
    const candidate = current
      ? current + "\n" + line
      : line;

    if (measureFn(candidate) <= maxHeight) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
      }

      current = line;

      if (measureFn(current) > maxHeight) {
        const words = current.split(/\s+/);
        let wordChunk = "";

        for (const word of words) {
          const test = wordChunk
            ? wordChunk + " " + word
            : word;

          if (measureFn(test) <= maxHeight) {
            wordChunk = test;
          } else {
            if (wordChunk) {
              chunks.push(wordChunk);
            }

            wordChunk = word;
          }
        }

        current = wordChunk;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function pushTextBlocks(
  blocks,
  text,
  className,
  metrics,
  maxHeight,
  section,
) {
  if (!text || !text.trim()) return;

  const measurer = createTextMeasurer(
    className,
    metrics.contentWidth,
  );

  const chunks = splitTextIntoChunks(
    text,
    maxHeight,
    measurer.measure,
  );

  measurer.dispose();

  chunks.forEach((chunk) => {
    const div = document.createElement("div");

    div.className = className;
    div.textContent = chunk;

    const h = measureElementHeight(
      div,
      metrics.contentWidth,
    );

    blocks.push({
      el: div,
      h,
      type: "text",
      section,
    });
  });
}

function pushBlock(blocks, el, type, metrics, section) {
  const div = stripIds(el.cloneNode(true));

  const h = measureElementHeight(
    div,
    metrics.contentWidth,
  );

  blocks.push({
    el: div,
    h,
    type,
    section,
  });
}

function buildFirstHeaderTemplate(source) {
  const template = document.createElement("div");

  template.className = "paper-header-group";

  source
    .querySelectorAll(
      ":scope > .paper-header, :scope > hr, :scope > .ra3awe",
    )
    .forEach((part) => {
      template.appendChild(
        stripIds(part.cloneNode(true)),
      );
    });

  return template;
}

function buildContinuationHeaderTemplate() {
  const template = document.createElement("div");

  template.className = "paper-header-group";

  const header = document.createElement("div");
  header.className = "cont-center";

  const logo = document.createElement("img");
  logo.src = "saint_george_assia.png";
  logo.alt = "رعية مار جرجس أسيا";

  header.appendChild(logo);
  template.appendChild(header);

  const hr = document.createElement("hr");
  template.appendChild(hr);

  return template;
}

function buildBlocks(metrics, sectionGaps) {
  const source = document.getElementById("paper-source");

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

  const maxHeaderHeight = Math.max(
    firstHeaderHeight,
    contHeaderHeight,
  );

  const textMaxForSection = (gap) =>
    metrics.usableHeight -
    maxHeaderHeight -
    Math.max(PAGE_GAP, gap);

  const blocks = [];

  // Sunday reading
  const bibleWrapper = source.querySelector("#wrapper-bible");

  if (
    bibleWrapper &&
    !bibleWrapper.classList.contains("is-hidden")
  ) {
    const bibleEl = bibleWrapper.querySelector("#display-bible");

    if (bibleEl) {
      pushTextBlocks(
        blocks,
        bibleEl.textContent || "",
        "content-box",
        metrics,
        textMaxForSection(sectionGaps.bible),
        "bible",
      );
    }
  }

  // Weekly program
  const daysWrapper = source.querySelector("#wrapper-days");

  if (
    daysWrapper &&
    !daysWrapper.classList.contains("is-hidden")
  ) {
    const titleEl = daysWrapper.querySelector(".section-title");

    if (titleEl) {
      pushBlock(blocks, titleEl, "title", metrics, "days");
    }

    daysWrapper.querySelectorAll(".day-row").forEach((row) => {
      if (!row.classList.contains("is-hidden")) {
        pushBlock(blocks, row, "day", metrics, "days");
      }
    });
  }

  // Parish news
  const newsWrapper = source.querySelector("#wrapper-news");

  if (
    newsWrapper &&
    !newsWrapper.classList.contains("is-hidden")
  ) {
    const titleEl = newsWrapper.querySelector(".section-title");

    if (titleEl) {
      pushBlock(blocks, titleEl, "title", metrics, "news");
    }

    newsWrapper.querySelectorAll(".news-item").forEach((item) => {
      pushBlock(blocks, item, "news", metrics, "news");
    });
  }

  // General recommendations
  const recWrapper = source.querySelector(
    "#wrapper-recommendations",
  );

  if (
    recWrapper &&
    !recWrapper.classList.contains("is-hidden")
  ) {
    const titleEl = recWrapper.querySelector(".section-title");

    if (titleEl) {
      pushBlock(blocks, titleEl, "title", metrics, "recs");
    }

    const recEl = recWrapper.querySelector(
      "#display-recommendations",
    );

    if (recEl) {
      pushTextBlocks(
        blocks,
        recEl.textContent || "",
        "content-box",
        metrics,
        textMaxForSection(sectionGaps.recs),
        "recs",
      );
    }
  }

  let prevSection = null;

  blocks.forEach((b) => {
    b.isSectionStart = b.section !== prevSection;
    prevSection = b.section;
  });

  return {
    blocks,
    firstHeaderTemplate,
    contHeaderTemplate,
    firstHeaderHeight,
    contHeaderHeight,
  };
}

function distributeBlocks(
  blocks,
  metrics,
  firstHeaderHeight,
  contHeaderHeight,
  sectionGaps,
) {
  const pages = [];
  const usable = metrics.usableHeight;

  let current = {
    blocks: [],
    height: firstHeaderHeight,
  };

  const startNewPage = () => {
    pages.push(current);

    current = {
      blocks: [],
      height: contHeaderHeight,
    };
  };

  const computeGap = (block) => {
    if (block.isSectionStart) {
      const v = sectionGaps[block.section];

      return typeof v === "number" && !isNaN(v)
        ? v
        : PAGE_GAP;
    }

    return PAGE_GAP;
  };

  const capGapForPage = (gap, block) => {
    if (current.blocks.length !== 0) {
      return gap;
    }

    const maxGap = Math.max(
      0,
      usable - current.height - block.h,
    );

    return Math.min(gap, maxGap);
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    let gap = capGapForPage(
      computeGap(block),
      block,
    );

    if (block.type === "title" && i + 1 < blocks.length) {
      const next = blocks[i + 1];

      const togetherHeight =
        gap + block.h + PAGE_GAP + next.h;

      if (
        current.height + togetherHeight > usable &&
        current.blocks.length > 0
      ) {
        startNewPage();

        gap = capGapForPage(
          computeGap(block),
          block,
        );
      }
    }

    if (
      current.height + gap + block.h > usable &&
      current.blocks.length > 0
    ) {
      startNewPage();

      gap = capGapForPage(
        computeGap(block),
        block,
      );
    }

    block.gapBefore = gap;

    current.blocks.push(block);
    current.height += gap + block.h;
  }

  if (current.blocks.length > 0 || pages.length === 0) {
    pages.push(current);
  }

  return pages;
}

function renderPages(
  pages,
  firstHeaderTemplate,
  contHeaderTemplate,
) {
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

    const headerTpl =
      index === 0
        ? firstHeaderTemplate
        : contHeaderTemplate;

    if (headerTpl) {
      contentEl.appendChild(
        headerTpl.cloneNode(true),
      );
    }

    page.blocks.forEach((b) => {
      const gap =
        b.gapBefore != null
          ? b.gapBefore
          : PAGE_GAP;

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

  if (
    typeof overrideGap === "number" &&
    !isNaN(overrideGap)
  ) {
    PAGE_GAP = overrideGap;
  }

  try {
    const metrics = computePageMetrics();

    if (
      metrics.contentWidth <= 0 ||
      metrics.usableHeight <= 0
    ) {
      return;
    }

    // Always read the current values from the inputs.
    const sectionGaps = getSectionGaps();

    const {
      blocks,
      firstHeaderTemplate,
      contHeaderTemplate,
      firstHeaderHeight,
      contHeaderHeight,
    } = buildBlocks(metrics, sectionGaps);

    const pages = distributeBlocks(
      blocks,
      metrics,
      firstHeaderHeight,
      contHeaderHeight,
      sectionGaps,
    );

    renderPages(
      pages,
      firstHeaderTemplate,
      contHeaderTemplate,
    );
  } catch (err) {
    console.error("Pagination error:", err);
  } finally {
    PAGE_GAP = prevGap;
  }
}

// ============================================================
// 10. DOWNLOAD AS IMAGE
// ============================================================

async function downloadAsImage() {
  const pagesWrap = document.getElementById("paper-to-print");

  if (!pagesWrap) return;

  const btn = document.querySelector(".print-btn");

  if (btn) {
    btn.disabled = true;
  }

  const prevZoom = pagesWrap.style.zoom;
  const savedDateMargins = [];

  try {
    // Use the exact values currently entered in the form.
    // Never replace the user's spacing values with fixed numbers.

    applyLineHeight();

    // Rebuild pagination using the current spacing inputs.
    paginate();

    pagesWrap.style.zoom = "1";

    // Preserve the original date margins after export.
    const dateEls = pagesWrap.querySelectorAll(
      ".sundaydetails .date, .cont-center .date",
    );

    dateEls.forEach((el) => {
      savedDateMargins.push([
        el,
        el.style.marginTop,
      ]);

      el.style.marginTop = "-8px";
    });

    const pages = Array.from(
      pagesWrap.querySelectorAll(".paper"),
    );

    if (pages.length === 0) return;

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
        windowHeight: 1600,
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
        await new Promise((resolve) =>
          setTimeout(resolve, 400),
        );
      }
    }
  } catch (err) {
    console.error("Export Error:", err);
  } finally {
    // Restore original date margins.
    savedDateMargins.forEach(([el, value]) => {
      el.style.marginTop = value;
    });

    pagesWrap.style.zoom = prevZoom;

    // Restore preview using the same input values.
    paginate();

    if (btn) {
      btn.disabled = false;
    }
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

  if (
    newsContainer &&
    newsContainer.children.length === 0
  ) {
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
    if (!document.hidden) {
      checkWeekRollover();
    }
  });
});