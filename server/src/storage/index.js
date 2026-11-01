import { config } from '../config.js';
import { cloudinaryStorage } from './cloudinaryStorage.js';
import { localStorageAdapter } from './localStorage.js';

export const storage = config.useCloudinary ? cloudinaryStorage : localStorageAdapter;
console.log(`[storage] using ${storage.name}`);
