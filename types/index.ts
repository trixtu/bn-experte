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
