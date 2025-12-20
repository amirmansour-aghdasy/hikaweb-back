/**
 * Media Folder Helper
 * Organizes media files into structured folders based on file type and metadata
 * 
 * Folder structure:
 * - icons/ - Icon files
 * - gifs/ - GIF animations
 * - videos/ - Video files
 * - logo/ - Logo files
 * - images/ - General images
 * - profile-avatars/ - User profile avatars
 * - documents/ - PDF and document files
 * - audio/ - Audio files
 * - other/ - Other file types
 */

/**
 * Determine folder path based on file type and metadata
 * @param {string} mimeType - MIME type of the file
 * @param {string} fileType - File type category (image, video, audio, document, other)
 * @param {Object} metadata - File metadata (may contain folder, category, etc.)
 * @param {string} originalName - Original filename
 * @returns {string} Folder path (e.g., 'images', 'videos/thumbnails', 'profile-avatars')
 */
export function getMediaFolder(mimeType, fileType, metadata = {}, originalName = '') {
    // If folder is explicitly provided in metadata, use it (but validate)
    if (metadata.folder && metadata.folder !== '/') {
        const customFolder = metadata.folder.trim();
        // Validate folder name (only allow alphanumeric, dash, underscore, and forward slash)
        if (/^[a-zA-Z0-9\-_\/]+$/.test(customFolder)) {
            return customFolder.startsWith('/') ? customFolder.substring(1) : customFolder;
        }
    }

    // Check for specific categories in metadata
    if (metadata.category) {
        const category = metadata.category.toLowerCase();
        if (['icon', 'icons'].includes(category)) return 'icons';
        if (['logo', 'logos'].includes(category)) return 'logo';
        if (['avatar', 'profile', 'profile-avatar', 'profile-avatars'].includes(category)) {
            return 'profile-avatars';
        }
        if (['gif', 'gifs'].includes(category)) return 'gifs';
    }

    // Check filename for keywords
    const lowerName = originalName.toLowerCase();
    if (lowerName.includes('icon') || lowerName.includes('آیکون')) return 'icons';
    if (lowerName.includes('logo') || lowerName.includes('لوگو')) return 'logo';
    if (lowerName.includes('avatar') || lowerName.includes('profile') || lowerName.includes('پروفایل')) {
        return 'profile-avatars';
    }
    if (lowerName.includes('.gif') || lowerName.includes('gif')) return 'gifs';

    // Determine folder based on file type and MIME type
    switch (fileType) {
        case 'image':
            // Check if it's a GIF
            if (mimeType === 'image/gif') {
                return 'gifs';
            }
            // Check if it's an icon (usually small images)
            if (mimeType === 'image/x-icon' || mimeType === 'image/vnd.microsoft.icon') {
                return 'icons';
            }
            // Check dimensions if available (icons are usually small)
            if (metadata.dimensions) {
                const { width, height } = metadata.dimensions;
                if (width && height && width <= 128 && height <= 128) {
                    // Small images might be icons
                    if (lowerName.includes('icon') || lowerName.includes('آیکون')) {
                        return 'icons';
                    }
                }
            }
            // Default for images
            return 'images';

        case 'video':
            return 'videos';

        case 'audio':
            return 'audio';

        case 'document':
            return 'documents';

        default:
            return 'other';
    }
}

/**
 * Get subfolder based on metadata or file characteristics
 * @param {Object} metadata - File metadata
 * @param {string} fileType - File type category
 * @returns {string|null} Subfolder path or null
 */
export function getMediaSubfolder(metadata = {}, fileType) {
    // For videos, can have subfolders like 'thumbnails', 'previews'
    if (fileType === 'video' && metadata.subfolder) {
        return metadata.subfolder;
    }

    // For images, can have subfolders like 'thumbnails', 'featured', 'gallery'
    if (fileType === 'image' && metadata.subfolder) {
        return metadata.subfolder;
    }

    return null;
}

/**
 * Build complete folder path
 * @param {string} baseFolder - Base folder (from getMediaFolder)
 * @param {string|null} subfolder - Subfolder (from getMediaSubfolder)
 * @returns {string} Complete folder path
 */
export function buildFolderPath(baseFolder, subfolder = null) {
    if (!subfolder) return baseFolder;
    return `${baseFolder}/${subfolder}`;
}

/**
 * Normalize folder path (remove leading/trailing slashes, ensure proper format)
 * @param {string} folderPath - Folder path to normalize
 * @returns {string} Normalized folder path
 */
export function normalizeFolderPath(folderPath) {
    if (!folderPath || folderPath === '/') return '';
    return folderPath
        .replace(/^\/+/, '') // Remove leading slashes
        .replace(/\/+$/, '') // Remove trailing slashes
        .replace(/\/+/g, '/'); // Replace multiple slashes with single slash
}

