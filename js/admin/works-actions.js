import {
  createWork,
  updateWork,
  deleteWork,
  updateWorksSortOrder,
  makeWorkId,
} from "./works-service.js";
import { collectMediaKeys } from "../firebase/work-map.js";
import { uploadMedia, deleteMediaManyWithReport } from "./media-api.js";
import { addPendingR2Deletes } from "./pending-r2-deletes.js";

async function uploadTracked(file, uploadedKeys) {
  const media = await uploadMedia(file);
  if (media && media.objectKey) uploadedKeys.push(media.objectKey);
  return media;
}

async function resolveThumbnail(thumbnailState, uploadedKeys) {
  if (!thumbnailState || thumbnailState.removed) return null;
  if (thumbnailState.pendingFile) {
    return uploadTracked(thumbnailState.pendingFile, uploadedKeys);
  }
  return thumbnailState.existing || null;
}

async function resolveDetailImages(detailItems, uploadedKeys) {
  const result = [];

  for (const item of detailItems || []) {
    if (item.removed) continue;
    if (item.pendingFile) {
      result.push(await uploadTracked(item.pendingFile, uploadedKeys));
    } else if (item.existing) {
      result.push(item.existing);
    }
  }

  return result;
}

async function resolveVideo(videoState, uploadedKeys) {
  if (!videoState || videoState.removed) return null;
  if (videoState.pendingFile) {
    return uploadTracked(videoState.pendingFile, uploadedKeys);
  }
  return videoState.existing || null;
}

function diffMediaKeys(originalWork, nextWork) {
  const newKeys = new Set(collectMediaKeys(nextWork));
  return collectMediaKeys(originalWork).filter(function (key) {
    return !newKeys.has(key);
  });
}

function collectNewUploadKeys(originalWork, nextWork) {
  const oldKeys = new Set(collectMediaKeys(originalWork));
  return collectMediaKeys(nextWork).filter(function (key) {
    return !oldKeys.has(key);
  });
}

function nextSortOrder(existingWorks) {
  if (!existingWorks.length) return 100;

  const maxOrder = existingWorks.reduce(function (max, work) {
    return Math.max(max, work.sortOrder || 0);
  }, 0);

  return maxOrder + 100;
}

/**
 * 작품 추가: R2 업로드 → Firestore 생성
 * Firestore 실패 시 업로드한 R2 미디어 즉시 삭제
 */
export async function addWork(formData, mediaState, existingWorks) {
  const uploadedKeys = [];

  try {
    const thumbnail = await resolveThumbnail(mediaState.thumbnail, uploadedKeys);
    const detailImages = await resolveDetailImages(mediaState.detailItems, uploadedKeys);
    const video = await resolveVideo(mediaState.video, uploadedKeys);

    const workId = makeWorkId(formData.title, existingWorks.length);
    await createWork(workId, {
      ...formData,
      sortOrder: nextSortOrder(existingWorks),
      thumbnail,
      detailImages,
      video,
    });

    return { workId, failedDeleteKeys: [] };
  } catch (error) {
    const rollback = await deleteMediaManyWithReport(uploadedKeys);
    if (rollback.failed.length) {
      addPendingR2Deletes(rollback.failed);
    }
    throw error;
  }
}

/**
 * 작품 수정: 새 미디어 R2 업로드 → Firestore 수정 → 기존 R2 삭제
 * Firestore 실패 시 새로 업로드한 미디어만 삭제하고 기존 데이터 유지
 */
export async function editWork(workId, formData, mediaState, originalWork) {
  const uploadedKeys = [];

  try {
    const thumbnail = await resolveThumbnail(mediaState.thumbnail, uploadedKeys);
    const detailImages = await resolveDetailImages(mediaState.detailItems, uploadedKeys);
    const video = await resolveVideo(mediaState.video, uploadedKeys);

    const nextWork = {
      ...formData,
      sortOrder: originalWork.sortOrder,
      thumbnail,
      detailImages,
      video,
    };

    await updateWork(workId, nextWork);

    const keysToRemove = diffMediaKeys(originalWork, nextWork);
    const deleteReport = await deleteMediaManyWithReport(keysToRemove);

    if (deleteReport.failed.length) {
      addPendingR2Deletes(deleteReport.failed);
    }

    return {
      workId,
      failedDeleteKeys: deleteReport.failed,
    };
  } catch (error) {
    if (uploadedKeys.length) {
      const rollback = await deleteMediaManyWithReport(uploadedKeys);
      if (rollback.failed.length) {
        addPendingR2Deletes(rollback.failed);
      }
    }
    throw error;
  }
}

/**
 * 작품 삭제: R2 삭제 → Firestore 삭제
 */
export async function removeWork(work) {
  const keys = collectMediaKeys(work);
  const deleteReport = await deleteMediaManyWithReport(keys);

  if (deleteReport.failed.length) {
    addPendingR2Deletes(deleteReport.failed);
    const err = new Error("Partial media delete failed");
    err.code = "PARTIAL_DELETE";
    err.failedKeys = deleteReport.failed;
    throw err;
  }

  await deleteWork(work.id);
}

/**
 * sortOrder 저장
 */
export async function saveSortOrder(orderedIds) {
  const count = orderedIds.length;
  const updates = orderedIds.map(function (id, index) {
    return {
      id: id,
      sortOrder: (count - index) * 100,
    };
  });

  await updateWorksSortOrder(updates);
}
