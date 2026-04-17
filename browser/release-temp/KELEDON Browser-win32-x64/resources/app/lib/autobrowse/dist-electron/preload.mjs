// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("get-app-version"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getApiPort: () => ipcRenderer.invoke("get-api-port"),
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  onRuntimeLog: (callback) => {
    ipcRenderer.on("runtime-log", (_event, log) => callback(log));
  }
});
