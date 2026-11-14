import type { SiftIpcBridge } from '../shared/contracts/ipc-api';

declare global {
  interface Window {
    api: SiftIpcBridge;
  }
}
