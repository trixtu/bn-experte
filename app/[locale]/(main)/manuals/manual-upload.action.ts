export const uploadFileWithProgress = (
  file: File,
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    // Progres simulare până la 95%
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        let progress = Math.round((event.loaded / event.total) * 100);
        if (progress > 95) progress = 95; // nu depășește 95%
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const { url } = JSON.parse(xhr.responseText);

        // la finalizare, progres 100%
        onProgress(100);

        resolve(url);
      } else {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("POST", "/api/manuals", true);
    xhr.send(formData);
  });
};
