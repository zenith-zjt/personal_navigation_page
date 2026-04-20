const fields = {
  navUrl: document.getElementById("navUrl"),
  group: document.getElementById("group"),
  tags: document.getElementById("tags"),
  bucket: document.getElementById("bucket"),
  save: document.getElementById("save"),
  status: document.getElementById("status"),
};

const defaults = {
  navUrl: "",
  group: "导入",
  tags: "导入",
  bucket: "watching",
};

function setStatus(message, isError = false) {
  fields.status.textContent = message;
  fields.status.style.color = isError ? "#be123c" : "#57534e";
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadOptions() {
  const saved = await chrome.storage.sync.get(defaults);
  fields.navUrl.value = saved.navUrl;
  fields.group.value = saved.group || defaults.group;
  fields.tags.value = saved.tags || defaults.tags;
  fields.bucket.value = saved.bucket || defaults.bucket;
}

async function saveOptions() {
  await chrome.storage.sync.set({
    navUrl: fields.navUrl.value.trim(),
    group: fields.group.value.trim() || defaults.group,
    tags: fields.tags.value.trim() || defaults.tags,
    bucket: fields.bucket.value,
  });
}

async function collectCurrentPage() {
  const navUrl = normalizeBaseUrl(fields.navUrl.value);
  if (!navUrl) {
    setStatus("请先填写导航页地址。", true);
    return;
  }

  let endpoint;
  try {
    endpoint = new URL("/api/navigation/bookmarklet", navUrl).toString();
  } catch {
    setStatus("导航页地址不正确。", true);
    return;
  }

  await saveOptions();
  const tab = await getCurrentTab();
  if (!tab?.url || !/^https?:\/\//.test(tab.url)) {
    setStatus("当前页面不是可收藏的 http/https 链接。", true);
    return;
  }

  fields.save.disabled = true;
  setStatus("正在收藏...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: tab.title || tab.url,
        url: tab.url,
        group: fields.group.value.trim() || defaults.group,
        tags: fields.tags.value.trim() || defaults.tags,
        bucket: fields.bucket.value,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || "收藏失败");
    }

    setStatus(payload.exists ? "这个链接已经在导航页中。" : "已收藏到导航页。");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "收藏失败。", true);
  } finally {
    fields.save.disabled = false;
  }
}

fields.save.addEventListener("click", collectCurrentPage);
loadOptions().catch(() => setStatus("读取插件配置失败。", true));
