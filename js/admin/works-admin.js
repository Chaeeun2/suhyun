import { watchAuth, logout, ensureAdminSession } from "./auth.js";
import { listWorks, getWorksErrorMessage } from "./works-service.js";
import { addWork, editWork, removeWork, saveSortOrder } from "./works-actions.js";
import { getMediaErrorMessage, validateMediaFile } from "./media-api.js";
import {
  getPendingR2Deletes,
  retryPendingR2Deletes,
} from "./pending-r2-deletes.js";

const DESKTOP_MIN = 1025;

const logoutButton = document.getElementById("logoutButton");
const saveOrderButton = document.getElementById("saveOrderButton");
const addWorkButton = document.getElementById("addWorkButton");
const categoryTabs = document.getElementById("categoryTabs");
const projectList = document.getElementById("projectList");
const emptyMessage = document.getElementById("emptyMessage");
const listError = document.getElementById("listError");
const sectionTitle = document.getElementById("sectionTitle");
const pendingDeletes = document.getElementById("pendingDeletes");
const pendingDeleteKeys = document.getElementById("pendingDeleteKeys");
const retryDeleteButton = document.getElementById("retryDeleteButton");

const workModal = document.getElementById("workModal");
const modalTitle = document.getElementById("modalTitle");
const modalCancelButton = document.getElementById("modalCancelButton");
const modalSaveButton = document.getElementById("modalSaveButton");
const formError = document.getElementById("formError");
const workForm = document.getElementById("workForm");

const titleKo = document.getElementById("titleKo");
const titleEn = document.getElementById("titleEn");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const captionKo = document.getElementById("captionKo");
const captionEn = document.getElementById("captionEn");
const descriptionKo = document.getElementById("descriptionKo");
const descriptionEn = document.getElementById("descriptionEn");

const thumbnailUploadButton = document.getElementById("thumbnailUploadButton");
const thumbnailFile = document.getElementById("thumbnailFile");
const thumbnailPreview = document.getElementById("thumbnailPreview");
const thumbnailPreviewImg = document.getElementById("thumbnailPreviewImg");
const thumbnailDeleteButton = document.getElementById("thumbnailDeleteButton");

const detailUploadButton = document.getElementById("detailUploadButton");
const detailFiles = document.getElementById("detailFiles");
const detailPreview = document.getElementById("detailPreview");

let allWorks = [];
let displayWorks = [];
let currentCategory = "all";
let sortOrderDirty = false;
let isBusy = false;
let sortableInstance = null;

let modalMode = "create";
let editingWorkId = null;
let editingOriginal = null;

let mediaState = createEmptyMediaState();

function createEmptyMediaState() {
  return {
    thumbnail: { existing: null, pendingFile: null, previewUrl: null, removed: false },
    detailItems: [],
    video: { existing: null, pendingFile: null, previewUrl: null, removed: false },
  };
}

function isDesktop() {
  return window.innerWidth >= DESKTOP_MIN;
}

function setBusy(busy) {
  isBusy = busy;
  const disabled = busy;

  saveOrderButton.disabled = disabled;
  addWorkButton.disabled = disabled;
  logoutButton.disabled = disabled;
  modalSaveButton.disabled = disabled;
  modalCancelButton.disabled = disabled;
  thumbnailUploadButton.disabled = disabled;
  detailUploadButton.disabled = disabled;

  projectList.querySelectorAll(".btn-edit, .btn-delete").forEach(function (el) {
    el.disabled = disabled;
  });

  if (sortableInstance) {
    sortableInstance.option("disabled", disabled || currentCategory !== "all");
  }

  updateOrderControls();
}

function updateOrderControls() {
  const sortEnabled = currentCategory === "all" && !isBusy;
  projectList.classList.toggle("project-list--sort-disabled", !sortEnabled);
  saveOrderButton.disabled = isBusy || !sortOrderDirty || currentCategory !== "all";
  saveOrderButton.textContent = sortOrderDirty ? "저장*" : "저장";
}

function destroySortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

function initSortable() {
  destroySortable();

  if (currentCategory !== "all" || typeof window.Sortable === "undefined") {
    updateOrderControls();
    return;
  }

  sortableInstance = window.Sortable.create(projectList, {
    handle: ".project-list-item__grab",
    draggable: ".project-list-item",
    animation: 150,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    disabled: isBusy,
    onEnd: function () {
      syncAllWorksOrderFromDom();
    },
  });

  updateOrderControls();
}

function syncAllWorksOrderFromDom() {
  if (currentCategory !== "all") return;

  const ids = Array.from(projectList.querySelectorAll(".project-list-item")).map(function (el) {
    return el.dataset.id;
  });

  const map = {};
  allWorks.forEach(function (work) {
    map[work.id] = work;
  });

  const reordered = ids
    .map(function (id) {
      return map[id];
    })
    .filter(Boolean);

  if (reordered.length !== allWorks.length) return;

  allWorks = reordered;
  sortOrderDirty = true;
  updateOrderControls();
}

function renderPendingDeletes() {
  const pending = getPendingR2Deletes();
  pendingDeletes.hidden = pending.length === 0;
  pendingDeleteKeys.textContent = pending.length ? pending.join(", ") : "";
}

async function handleRetryPendingDeletes() {
  if (isBusy) return;

  setBusy(true);
  retryDeleteButton.textContent = "재시도 중...";

  try {
    const report = await retryPendingR2Deletes();
    renderPendingDeletes();

    if (report.failed.length) {
      showListError(
        "일부 미디어 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } else {
      showListError("");
    }
  } catch {
    showListError("미디어 삭제 재시도에 실패했습니다.");
  } finally {
    setBusy(false);
    retryDeleteButton.textContent = "삭제 재시도";
  }
}

function showListError(message) {
  listError.textContent = message;
  listError.hidden = !message;
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function getFilteredWorks() {
  if (currentCategory === "all") return allWorks.slice();
  return allWorks.filter(function (work) {
    return work.category === currentCategory;
  });
}

function mediaPreviewUrl(media, pendingFile) {
  if (pendingFile) return URL.createObjectURL(pendingFile);
  if (media && media.url) return media.url;
  return "";
}

function renderList() {
  destroySortable();
  displayWorks = getFilteredWorks();
  projectList.innerHTML = "";

  emptyMessage.hidden = displayWorks.length > 0;
  sectionTitle.textContent = currentCategory + " 작품 관리";

  displayWorks.forEach(function (work) {
    const item = document.createElement("article");
    item.className = "project-list-item";
    item.dataset.id = work.id;

    const thumbSrc =
      work.thumbnail && work.thumbnail.url ? work.thumbnail.url : "";

    item.innerHTML =
      '<div class="project-list-item__row">' +
      '<button type="button" class="project-list-item__grab" aria-label="순서 변경">⠿</button>' +
      '<div class="project-list-item__content">' +
      '<div class="project-list-item__title-wrap">' +
      (thumbSrc
        ? '<img class="project-list-item__thumb" src="' + escapeAttr(thumbSrc) + '" alt="" />'
        : '<div class="project-list-item__thumb"></div>') +
      '<p class="project-list-item__title">' + escapeHtml(work.title.ko || work.title.en || work.id) + "</p>" +
      "</div>" +
      '<div class="project-list-item__meta">' +
      '<span class="project-list-item__cat">' + escapeHtml(work.category) + "</span>" +
      '<span class="project-list-item__date">' + escapeHtml(work.date) + "</span>" +
      '<div class="project-list-item__actions">' +
      '<button type="button" class="btn-edit">수정</button>' +
      '<button type="button" class="btn-delete">삭제</button>' +
      "</div></div></div></div>";

    item.querySelector(".btn-edit").addEventListener("click", function () {
      openEditModal(work.id);
    });

    item.querySelector(".btn-delete").addEventListener("click", function () {
      handleDelete(work.id);
    });

    projectList.appendChild(item);
  });

  initSortable();
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

async function loadWorksList() {
  showListError("");
  try {
    allWorks = await listWorks();
    sortOrderDirty = false;
    renderList();
    renderPendingDeletes();
  } catch (error) {
    showListError(getWorksErrorMessage(error));
  }
}

function readFormData() {
  return {
    title: { ko: titleKo.value.trim(), en: titleEn.value.trim() },
    category: categorySelect.value,
    date: dateInput.value.trim(),
    caption: { ko: captionKo.value, en: captionEn.value },
    description: { ko: descriptionKo.value, en: descriptionEn.value },
  };
}

function validateForm(formData) {
  if (!formData.title.ko && !formData.title.en) {
    return "프로젝트명(국문 또는 영문)을 입력해 주세요.";
  }
  if (!formData.category) return "분류를 선택해 주세요.";
  if (!formData.date) return "발표시기를 입력해 주세요.";
  if (!/^\d{4}\/\d{1,2}$/.test(formData.date)) {
    return "발표시기는 YYYY/MM 형식으로 입력해 주세요.";
  }

  const hasThumbnail =
    (mediaState.thumbnail.pendingFile || mediaState.thumbnail.existing) &&
    !mediaState.thumbnail.removed;

  if (!hasThumbnail) return "썸네일을 업로드해 주세요.";
  return "";
}

function renderThumbnailPreview() {
  const url =
    mediaState.thumbnail.previewUrl ||
    (mediaState.thumbnail.existing && !mediaState.thumbnail.removed
      ? mediaState.thumbnail.existing.url
      : "");

  if (!url || mediaState.thumbnail.removed) {
    thumbnailPreview.hidden = true;
    thumbnailPreviewImg.removeAttribute("src");
    return;
  }

  thumbnailPreview.hidden = false;
  thumbnailPreviewImg.src = url;
}

function renderDetailPreview() {
  detailPreview.innerHTML = "";

  mediaState.detailItems.forEach(function (item, index) {
    if (item.removed) return;

    const url =
      item.previewUrl || (item.existing ? item.existing.url : "");
    if (!url) return;

    const wrap = document.createElement("div");
    wrap.className = "media-thumbnail";

    if (item.pendingFile && item.pendingFile.type === "video/mp4") {
      const video = document.createElement("video");
      video.className = "media-thumbnail__video";
      video.src = url;
      video.controls = true;
      wrap.appendChild(video);
    } else if (item.existing && item.existing.type === "video/mp4") {
      const video = document.createElement("video");
      video.className = "media-thumbnail__video";
      video.src = url;
      video.controls = true;
      wrap.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.className = "media-thumbnail__img";
      img.src = url;
      img.alt = "";
      wrap.appendChild(img);
    }

    const del = document.createElement("button");
    del.type = "button";
    del.className = "media-delete";
    del.setAttribute("aria-label", "미디어 삭제");
    del.textContent = "×";
    del.addEventListener("click", function () {
      item.removed = true;
      renderDetailPreview();
    });
    wrap.appendChild(del);

    detailPreview.appendChild(wrap);
  });

  if (
    mediaState.video &&
    !mediaState.video.removed &&
    (mediaState.video.previewUrl ||
      (mediaState.video.existing && mediaState.video.existing.url))
  ) {
    const url =
      mediaState.video.previewUrl ||
      (mediaState.video.existing ? mediaState.video.existing.url : "");

    const wrap = document.createElement("div");
    wrap.className = "media-thumbnail";

    const video = document.createElement("video");
    video.className = "media-thumbnail__video";
    video.src = url;
    video.controls = true;
    wrap.appendChild(video);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "media-delete";
    del.setAttribute("aria-label", "동영상 삭제");
    del.textContent = "×";
    del.addEventListener("click", function () {
      mediaState.video.removed = true;
      renderDetailPreview();
    });
    wrap.appendChild(del);

    detailPreview.appendChild(wrap);
  }
}

function resetForm() {
  workForm.reset();
  mediaState = createEmptyMediaState();
  renderThumbnailPreview();
  renderDetailPreview();
  showFormError("");
}

function openCreateModal() {
  if (!isDesktop() || isBusy) return;
  modalMode = "create";
  editingWorkId = null;
  editingOriginal = null;
  resetForm();
  modalTitle.textContent = "프로젝트 관리: 새 작품";
  modalSaveButton.textContent = "저장";
  workModal.hidden = false;
}

async function openEditModal(workId) {
  if (!isDesktop() || isBusy) return;

  try {
    const work = allWorks.find(function (w) {
      return w.id === workId;
    });
    if (!work) return;

    modalMode = "edit";
    editingWorkId = workId;
    editingOriginal = work;
    resetForm();

    titleKo.value = work.title.ko || "";
    titleEn.value = work.title.en || "";
    categorySelect.value = work.category || "";
    dateInput.value = work.date || "";
    captionKo.value = work.caption.ko || "";
    captionEn.value = work.caption.en || "";
    descriptionKo.value = work.description.ko || "";
    descriptionEn.value = work.description.en || "";

    if (work.thumbnail) {
      mediaState.thumbnail.existing = work.thumbnail;
    }

    mediaState.detailItems = (work.detailImages || []).map(function (img) {
      return { existing: img, pendingFile: null, previewUrl: null, removed: false };
    });

    if (work.video) {
      mediaState.video.existing = work.video;
    }

    renderThumbnailPreview();
    renderDetailPreview();

    modalTitle.textContent =
      "프로젝트 관리: " + (work.title.ko || work.title.en || work.id);
    modalSaveButton.textContent = "저장";
    workModal.hidden = false;
  } catch (error) {
    showListError(getWorksErrorMessage(error));
  }
}

function closeModal() {
  if (isBusy) return;
  workModal.hidden = true;
  resetForm();
}

function handleThumbnailFile(file) {
  validateMediaFile(file);
  if (file.type === "video/mp4") {
    throw new Error("THUMBNAIL_VIDEO");
  }

  mediaState.thumbnail.pendingFile = file;
  mediaState.thumbnail.previewUrl = URL.createObjectURL(file);
  mediaState.thumbnail.removed = false;
  renderThumbnailPreview();
}

function handleDetailFiles(fileList) {
  Array.from(fileList).forEach(function (file) {
    validateMediaFile(file);

    if (file.type === "video/mp4") {
      mediaState.video.pendingFile = file;
      mediaState.video.previewUrl = URL.createObjectURL(file);
      mediaState.video.removed = false;
    } else {
      mediaState.detailItems.push({
        existing: null,
        pendingFile: file,
        previewUrl: URL.createObjectURL(file),
        removed: false,
      });
    }
  });

  renderDetailPreview();
}

async function handleModalSave() {
  if (isBusy) return;

  showFormError("");
  const formData = readFormData();
  const validationError = validateForm(formData);
  if (validationError) {
    showFormError(validationError);
    return;
  }

  setBusy(true);
  modalSaveButton.textContent = "저장 중...";

  try {
    let result;

    if (modalMode === "create") {
      result = await addWork(formData, mediaState, allWorks);
    } else {
      result = await editWork(editingWorkId, formData, mediaState, editingOriginal);
    }

    closeModal();
    await loadWorksList();

    if (result && result.failedDeleteKeys && result.failedDeleteKeys.length) {
      showListError(
        "저장은 완료되었지만 일부 기존 미디어 삭제에 실패했습니다. 상단에서 재시도할 수 있습니다.",
      );
    }
  } catch (error) {
    if (error && error.message === "THUMBNAIL_VIDEO") {
      showFormError("썸네일에는 이미지만 업로드할 수 있습니다.");
    } else if (error && error.message === "FILE_TOO_LARGE") {
      showFormError(getMediaErrorMessage(error));
    } else if (error && error.message === "FILE_TYPE_NOT_ALLOWED") {
      showFormError(getMediaErrorMessage(error));
    } else {
      showFormError(getWorksErrorMessage(error));
    }
  } finally {
    setBusy(false);
    modalSaveButton.textContent = "저장";
  }
}

async function handleDelete(workId) {
  if (isBusy) return;

  const work = allWorks.find(function (w) {
    return w.id === workId;
  });
  if (!work) return;

  const title = work.title.ko || work.title.en || work.id;
  if (!confirm('"' + title + '" 작품을 삭제하시겠습니까?')) return;

  setBusy(true);
  showListError("");

  const deleteBtn = projectList.querySelector(
    '.project-list-item[data-id="' + workId + '"] .btn-delete',
  );
  if (deleteBtn) deleteBtn.textContent = "삭제 중...";

  try {
    await removeWork(work);
    await loadWorksList();
  } catch (error) {
    showListError(getWorksErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

async function handleSaveOrder() {
  if (isBusy || !sortOrderDirty || currentCategory !== "all") return;

  setBusy(true);
  saveOrderButton.textContent = "저장 중...";

  try {
    const orderedIds = allWorks.map(function (w) {
      return w.id;
    });
    await saveSortOrder(orderedIds);
    sortOrderDirty = false;
    await loadWorksList();
  } catch (error) {
    showListError(getWorksErrorMessage(error));
  } finally {
    setBusy(false);
    saveOrderButton.textContent = "저장";
  }
}

categoryTabs.addEventListener("click", function (e) {
  const tab = e.target.closest(".tab");
  if (!tab) return;

  currentCategory = tab.dataset.cat;
  categoryTabs.querySelectorAll(".tab").forEach(function (btn) {
    btn.classList.toggle("is-active", btn === tab);
  });

  if (currentCategory !== "all" && sortOrderDirty) {
    showListError("순서 변경은 all 탭에서만 저장할 수 있습니다.");
  } else {
    showListError("");
  }

  renderList();
});

saveOrderButton.addEventListener("click", handleSaveOrder);
retryDeleteButton.addEventListener("click", handleRetryPendingDeletes);
addWorkButton.addEventListener("click", openCreateModal);
modalCancelButton.addEventListener("click", closeModal);
modalSaveButton.addEventListener("click", handleModalSave);

workModal.addEventListener("click", function (e) {
  if (e.target === workModal) closeModal();
});

thumbnailUploadButton.addEventListener("click", function () {
  if (!isBusy) thumbnailFile.click();
});

thumbnailFile.addEventListener("change", function () {
  const file = thumbnailFile.files && thumbnailFile.files[0];
  thumbnailFile.value = "";
  if (!file) return;

  try {
    handleThumbnailFile(file);
  } catch (error) {
    showFormError(
      error.message === "THUMBNAIL_VIDEO"
        ? "썸네일에는 이미지만 업로드할 수 있습니다."
        : getMediaErrorMessage(error),
    );
  }
});

thumbnailDeleteButton.addEventListener("click", function () {
  mediaState.thumbnail.removed = true;
  mediaState.thumbnail.pendingFile = null;
  mediaState.thumbnail.previewUrl = null;
  renderThumbnailPreview();
});

detailUploadButton.addEventListener("click", function () {
  if (!isBusy) detailFiles.click();
});

detailFiles.addEventListener("change", function () {
  if (!detailFiles.files || !detailFiles.files.length) return;

  try {
    handleDetailFiles(detailFiles.files);
  } catch (error) {
    showFormError(getMediaErrorMessage(error));
  }

  detailFiles.value = "";
});

logoutButton.addEventListener("click", async function () {
  if (isBusy) return;
  setBusy(true);
  try {
    await logout();
    window.location.replace("/admin/login");
  } catch {
    setBusy(false);
  }
});

watchAuth(function (user) {
  if (!user) {
    window.location.replace("/admin/login");
    return;
  }

  ensureAdminSession()
    .then(function () {
      if (isDesktop()) {
        loadWorksList();
      }
    })
    .catch(function () {
      window.location.replace("/admin/login");
    });
});

window.addEventListener("resize", function () {
  if (!isDesktop()) {
    closeModal();
  }
});
