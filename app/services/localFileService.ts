import { LANGUAGES, FILE_SIZE_LIMITS } from '@/app/data/constants';
import { CodeFile, Language } from '@/app/types';
import { logger } from '@/app/utils/logger';
import { filterSensitiveFiles } from '@/app/utils/security';
import { getLanguageForFile as getLanguageFromExtension } from '@/app/utils/languageDetection';

// Allowed file extensions (security measure)
const ALLOWED_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.dart', '.scala',
    '.r', '.sql', '.html', '.css', '.json', '.yaml', '.yml', '.xml',
    '.sh', '.bash', '.ps1', '.md', '.txt'
];

/**
 * Get language for file with security check for allowed extensions
 * @param filePath - Path to the file
 * @returns Language object if detected and allowed, undefined otherwise
 */
function getLanguageForFile(filePath: string): Language | undefined {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();

    // Security check: only allow known safe file types
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return undefined;
    }

    return getLanguageFromExtension(filePath);
}

async function scanFiles(directoryHandle: FileSystemDirectoryHandle, pathPrefix = ''): Promise<CodeFile[]> {
    let files: CodeFile[] = [];
    const ignoreDirs = new Set(['node_modules', 'dist', '.git', 'build', 'vendor', 'target']);
    for await (const entry of (directoryHandle as any).values()) {
        const nestedPath = `${pathPrefix}${entry.name}`;
        if (entry.kind === 'file') {
            const language = getLanguageForFile(entry.name);
            if (language) {
                files.push({
                    path: nestedPath,
                    language,
                    handle: entry as FileSystemFileHandle,
                });
            }
        } else if (entry.kind === 'directory') {
            if (!ignoreDirs.has(entry.name)) {
                const nestedFiles = await scanFiles(entry as FileSystemDirectoryHandle, `${nestedPath}/`);
                files = files.concat(nestedFiles);
            }
        }
    }
    return files;
}

export async function openDirectoryAndGetFiles(): Promise<{ directoryHandle: FileSystemDirectoryHandle, files: CodeFile[] }> {
    if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.');
    }

    try {
        const directoryHandle = await window.showDirectoryPicker();
        const files = await scanFiles(directoryHandle);

        // Filter out sensitive files (.env, API keys, etc.)
        const filesWithPaths = files.map(f => ({ path: f.path }));
        const safeFilesPaths = filterSensitiveFiles(filesWithPaths);
        const safeFiles = files.filter(f => safeFilesPaths.some(sf => sf.path === f.path));

        return { directoryHandle, files: safeFiles };
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            // User cancelled the picker. Return empty array, not an error.
            return { directoryHandle: null as any, files: [] };
        }
        logger.error('Error opening directory:', err);
        throw new Error('Failed to open directory. Please grant the necessary permissions.');
    }
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        // Security check: validate file size
        if (file.size > FILE_SIZE_LIMITS.LOCAL_FILE_MAX) {
            reject(new Error(`File ${file.name} is too large (max ${FILE_SIZE_LIMITS.LOCAL_FILE_MAX / 1024}KB)`));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}


export async function getFilesFromInput(fileList: FileList): Promise<CodeFile[]> {
    const filePromises: Promise<CodeFile | null>[] = [];
    const ignoreDirs = new Set(['node_modules', 'dist', '.git', 'build', 'vendor', 'target']);

    for (const file of Array.from(fileList)) {
        // The path property on File objects is 'webkitRelativePath'
        const path = (file as any).webkitRelativePath;
        const pathParts = path.split('/');

        if (pathParts.some((part: string) => ignoreDirs.has(part))) {
            continue;
        }

        const language = getLanguageForFile(path);
        if (language) {
            const promise = readFileAsText(file).then(content => ({
                path: path,
                language,
                content, // Content is read immediately
                // No handle is available with this method
            })).catch(err => {
                logger.error(`Failed to read file ${path}`, err);
                return null; // Return null on failure to read a file
            });
            filePromises.push(promise);
        }
    }

    const resolvedFiles = await Promise.all(filePromises);
    const validFiles = resolvedFiles.filter((file): file is CodeFile => file !== null);

    // Filter out sensitive files (.env, API keys, etc.)
    const validFilesWithPaths = validFiles.map(f => ({ path: f.path }));
    const safeValidFilesPaths = filterSensitiveFiles(validFilesWithPaths);
    const safeValidFiles = validFiles.filter(f => safeValidFilesPaths.some(sf => sf.path === f.path));

    return safeValidFiles;
}


export async function readFileContent(file: CodeFile): Promise<string> {
    if (!file.handle) {
        throw new Error('No file handle available for this local file.');
    }
    try {
        const fileObject = await file.handle.getFile();

        // Security check: validate file size
        if (fileObject.size > FILE_SIZE_LIMITS.LOCAL_FILE_MAX) {
            throw new Error(`File ${file.path} is too large (max ${FILE_SIZE_LIMITS.LOCAL_FILE_MAX / 1024}KB)`);
        }

        return await fileObject.text();
    } catch (err) {
        logger.error('Error reading file content:', err);
        throw new Error(`Failed to read content of ${file.path}.`);
    }
}

export async function saveFileWithBakExtension(
    directoryHandle: FileSystemDirectoryHandle,
    relativePath: string,
    newContent: string
): Promise<void> {
    try {
        const pathParts = relativePath.split('/');
        const fileName = pathParts.pop();
        if (!fileName) throw new Error("Invalid file path");

        let currentHandle = directoryHandle;
        // Traverse to the correct subdirectory
        for (const part of pathParts) {
            currentHandle = await currentHandle.getDirectoryHandle(part, { create: false });
        }

        const newFileName = `${fileName}.bak`;
        const fileHandle = await currentHandle.getFileHandle(newFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(newContent);
        await writable.close();
    } catch (err) {
        logger.error("Error saving file:", err);
        throw new Error("Failed to save file. Please try again.");
    }
}