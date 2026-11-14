import * as watcher from '@parcel/watcher';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase } from '../db/connection';
import { markFileDeleted } from '../db/queries/file-queries';
import { IndexerService } from '../indexer/indexer-service';
import { isSupportedExtension } from '../../../shared/constants/supported-extensions';

export interface WatcherSubscription {
  folderId: string;
  folderPath: string;
  subscription: watcher.AsyncSubscription;
}

export class WatcherManager {
  private static instance: WatcherManager;
  private subscriptions: Map<string, WatcherSubscription> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): WatcherManager {
    if (!WatcherManager.instance) {
      WatcherManager.instance = new WatcherManager();
    }
    return WatcherManager.instance;
  }

  public async watchFolder(folderId: string, folderPath: string): Promise<void> {
    if (this.subscriptions.has(folderId)) {
      console.log(`[WatcherManager] Already watching folder: ${folderPath}`);
      return;
    }

    try {
      const sub = await watcher.subscribe(
        folderPath,
        (err, events) => {
          if (err) {
            console.error(`[WatcherManager] Error in watcher for ${folderPath}:`, err);
            return;
          }
          this.handleEvents(folderId, folderPath, events);
        },
        {
          backend: process.platform === 'win32' ? 'windows' : undefined,
          ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'],
        }
      );

      this.subscriptions.set(folderId, {
        folderId,
        folderPath,
        subscription: sub,
      });

      console.log(`[WatcherManager] Subscribed native watcher to: ${folderPath}`);
    } catch (err) {
      console.error(`[WatcherManager] Failed to subscribe to ${folderPath}:`, err);
    }
  }

  public async unwatchFolder(folderId: string): Promise<void> {
    const sub = this.subscriptions.get(folderId);
    if (sub) {
      await sub.subscription.unsubscribe();
      this.subscriptions.delete(folderId);
      console.log(`[WatcherManager] Unsubscribed from: ${sub.folderPath}`);
    }
  }

  public async unwatchAll(): Promise<void> {
    for (const [id, sub] of this.subscriptions) {
      try {
        await sub.subscription.unsubscribe();
      } catch (e) {
        console.error(`[WatcherManager] Error unsubscribing ${id}:`, e);
      }
    }
    this.subscriptions.clear();
  }

  private handleEvents(
    folderId: string,
    folderPath: string,
    events: watcher.Event[]
  ): void {
    const db = getDatabase();
    let hasAddOrUpdate = false;

    for (const event of events) {
      const ext = path.extname(event.path).toLowerCase().replace(/^\./, '');
      if (!isSupportedExtension(ext)) {
        continue;
      }

      console.log(`[WatcherManager] Event: ${event.type} -> ${event.path}`);

      if (event.type === 'delete') {
        markFileDeleted(db, event.path);
      } else if (event.type === 'create' || event.type === 'update') {
        hasAddOrUpdate = true;
      }
    }

    // Debounce re-index trigger on create/update events
    if (hasAddOrUpdate) {
      const existingTimer = this.debounceTimers.get(folderId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(folderId);
        IndexerService.getInstance().indexFolder(folderId, folderPath);
      }, 500);

      this.debounceTimers.set(folderId, timer);
    }
  }
}
