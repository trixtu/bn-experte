// Type for tracking upload progress
export type UploadProgress = {
  fileId: string;
  progress: number;
  completed: boolean;
};

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
  url: string;
  id: string;
};

export type FileWithPreview = {
  file: File | FileMetadata;
  id: string;
  preview?: string;
};

export type Item = {
  id: string;
  name: string;
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface AttachedFile {
  name: string;
  size: number;
  base64: string;
  mimeType: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}

export enum ModelType {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
  FLASH_2 = 'gemini-2.5-flash',
  PRO_2 = 'gemini-1.5-pro-latest',
  FLASH_3 = 'gemini-2.0-flash'
}