import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kaghazbaadInstaller', {
  selectSource: () => ipcRenderer.invoke('select-source') as Promise<string | null>,
  selectWorkspace: () => ipcRenderer.invoke('select-workspace') as Promise<string | null>,
  prepareDeployment: (input: unknown) => ipcRenderer.invoke('prepare-deployment', input) as Promise<unknown>,
});
