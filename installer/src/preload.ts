import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kaghazbaadInstaller', {
  repositoryRoot: () => ipcRenderer.invoke('repository-root') as Promise<string>,
  selectWorkspace: () => ipcRenderer.invoke('select-workspace') as Promise<string | null>,
  previewDeployment: (input: unknown) => ipcRenderer.invoke('preview-deployment', input) as Promise<unknown>,
  prepareDeployment: (input: unknown) => ipcRenderer.invoke('prepare-deployment', input) as Promise<unknown>,
});
