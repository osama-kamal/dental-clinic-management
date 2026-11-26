// Browser stand-in for the parts of 'electron' the main-process code touches.
export const app = {
  getPath: (_name: string) => '/demo',
  on: () => {},
  quit: () => {},
  relaunch: () => {},
};
export const dialog = { showErrorBox: (title: string, msg: string) => console.error(title, msg) };
export const ipcMain = { handle: () => {}, on: () => {} };
export const BrowserWindow = function () {} as any;
