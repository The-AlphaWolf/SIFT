import { app, shell, BrowserWindow, session } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { registerAllIpcHandlers } from './ipc';
import { setupTray, destroyTray } from './tray';
import { initializeDatabase, closeDatabase } from './services/db/connection';
import { runMigrations } from './services/db/migrator';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#09090b',
      title: 'SIFT — Intelligent File Librarian',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show();
    });

    // Pipe renderer console logs directly to terminal for instant debugging
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[Renderer Console] [Level ${level}] ${message} (${sourceId}:${line})`);
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Renderer Load Failed] Code: ${errorCode}, Description: ${errorDescription}, URL: ${validatedURL}`);
    });

    // Intercept window close to minimize to tray if configured
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // Setup Tray
    setupTray(mainWindow);

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.sift.app');

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // Security: Restrict network requests outside localhost
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const csp = is.dev
        ? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:*; img-src 'self' data: http://localhost:*; connect-src 'self' http://127.0.0.1:* http://localhost:* ws://localhost:* ws://127.0.0.1:*"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:* http://localhost:*";

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp],
        },
      });
    });

    // Initialize Database & apply migrations
    try {
      const db = initializeDatabase();
      runMigrations(db);
      console.log('[Main] SQLite database initialized and migrations applied.');
    } catch (err) {
      console.error('[Main] Failed to initialize database:', err);
    }

    // Register all type-safe IPC handlers
    registerAllIpcHandlers();

    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      destroyTray();
      closeDatabase();
      app.quit();
    }
  });
}
