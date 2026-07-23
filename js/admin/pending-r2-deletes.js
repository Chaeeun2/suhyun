import { deleteMediaManyWithReport } from "./media-api.js";

const STORAGE_KEY = "admin_pending_r2_deletes";

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStore(keys) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function getPendingR2Deletes() {
  return readStore();
}

export function addPendingR2Deletes(objectKeys) {
  const next = [...readStore(), ...(objectKeys || []).filter(Boolean)];
  writeStore(next);
  return readStore();
}

export function removePendingR2Deletes(objectKeys) {
  const removeSet = new Set((objectKeys || []).filter(Boolean));
  const next = readStore().filter(function (key) {
    return !removeSet.has(key);
  });
  writeStore(next);
  return readStore();
}

export async function retryPendingR2Deletes() {
  const pending = readStore();
  if (!pending.length) return { deleted: [], failed: [] };

  const report = await deleteMediaManyWithReport(pending);
  removePendingR2Deletes(report.deleted);
  addPendingR2Deletes(report.failed);
  return report;
}
