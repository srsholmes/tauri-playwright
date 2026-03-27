import { invoke } from '@tauri-apps/api/core';

export interface GreetResponse {
  message: string;
}

export const api = {
  greet: (name: string) => invoke<string>('greet', { name }),
};
