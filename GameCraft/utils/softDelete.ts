/**
 * Soft delete implementation with recovery window
 */

const TRASH_KEY = 'craftus_trash';
const RECOVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DeletedProject {
  project: any;
  deletedAt: number;
}

/**
 * Move project to trash instead of permanent deletion
 */
export const moveToTrash = (project: any): void => {
  try {
    const trash = getTrash();
    trash.push({
      project,
      deletedAt: Date.now(),
    });
    
    // Clean old items
    const cleaned = trash.filter(
      item => Date.now() - item.deletedAt < RECOVERY_WINDOW_MS
    );
    
    localStorage.setItem(TRASH_KEY, JSON.stringify(cleaned));
  } catch (error) {
    console.error('Failed to move project to trash:', error);
  }
};

/**
 * Get all trashed projects
 */
export const getTrash = (): DeletedProject[] => {
  try {
    const stored = localStorage.getItem(TRASH_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

/**
 * Restore project from trash
 */
export const restoreFromTrash = (projectId: string): any | null => {
  try {
    const trash = getTrash();
    const index = trash.findIndex(item => item.project.id === projectId);
    
    if (index === -1) return null;
    
    const [restored] = trash.splice(index, 1);
    localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
    
    return restored.project;
  } catch (error) {
    console.error('Failed to restore project:', error);
    return null;
  }
};

/**
 * Permanently delete old trashed items
 */
export const emptyTrash = (): void => {
  localStorage.removeItem(TRASH_KEY);
};
