"use client";

import { useCallback, useEffect, useState } from "react";
import { offlineDb } from "@/lib/db";
import {
  ensureOfflineDataSeeded,
  processPendingSyncQueue,
} from "@/services/sync-service";
import type { LocalSyncQueueItem, SyncStatus } from "@/types";
import { useOnlineStatus } from "./useOnlineStatus";

export function useSyncManager() {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>(isOnline ? "ONLINE" : "OFFLINE");
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<LocalSyncQueueItem[]>([]);

  const refreshQueueState = useCallback(async () => {
    if (!offlineDb) return;
    await ensureOfflineDataSeeded();

    const allQueue = await offlineDb.syncQueue.orderBy("createdAt").reverse().toArray();
    const pending = allQueue.filter((q) => q.status === "PENDING" || q.status === "SYNCING").length;
    const failed = allQueue.filter((q) => q.status === "FAILED").length;
    const lastSynced = allQueue.find((q) => q.status === "SYNCED")?.updatedAt ?? null;

    setQueueItems(allQueue);
    setPendingCount(pending);
    setFailedCount(failed);
    if (lastSynced) setLastSyncedAt(lastSynced);

    if (!isOnline) {
      setStatus("OFFLINE");
    } else if (failed > 0) {
      setStatus("SYNC_FAILED");
    } else if (pending > 0) {
      setStatus("PENDING_SYNC");
    } else if (allQueue.some((q) => q.status === "SYNCED")) {
      setStatus("SYNCED");
    } else {
      setStatus("ONLINE");
    }
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      setStatus("OFFLINE");
      return { syncedBatches: 0, failedBatches: 0, pendingCount };
    }

    setStatus("SYNCING");
    const result = await processPendingSyncQueue();
    await refreshQueueState();
    return result;
  }, [isOnline, pendingCount, refreshQueueState]);

  useEffect(() => {
    refreshQueueState();
  }, [refreshQueueState]);

  // Automatically sync when connectivity returns
  useEffect(() => {
    if (isOnline && (pendingCount > 0 || failedCount > 0)) {
      syncNow();
    }
  }, [isOnline, pendingCount, failedCount, syncNow]);

  // Register Service Worker for offline shell caching
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore registration errors in unsupported environments
      });
    }
  }, []);

  return {
    isOnline,
    status,
    pendingCount,
    failedCount,
    lastSyncedAt,
    queueItems,
    syncNow,
    refreshQueueState,
  };
}
