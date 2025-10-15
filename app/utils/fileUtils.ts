/**
 * Triggers a browser download for the given content.
 * @param content The string content to be saved in the file.
 * @param filename The name of the file to be downloaded.
 * @param mimeType The MIME type of the file.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.download = filename;
  link.href = url;
  
  // Append link to the body, click it, and then remove it
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
