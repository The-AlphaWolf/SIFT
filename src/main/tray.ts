import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow): Tray {
  // Create a minimal 16x16 icon in memory if file is not found
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('SIFT — Local-First Intelligent File Librarian');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SIFT',
      click: (): void => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit SIFT',
      click: (): void => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
