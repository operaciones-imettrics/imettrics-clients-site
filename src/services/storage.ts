import { v4 as uuidv4 } from "uuid";
import type { Folder, Guide, GuideStore } from "../types";
import type { GuideBackup } from "./markdownExporter";
import { api } from "../lib/api";

const STORAGE_KEY = "ga4_measurement_guides";

export const storage = {
  getStore(): GuideStore {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { guides: [], folders: [] };
    try {
      const parsed = JSON.parse(data);
      return {
        guides: parsed.guides || [],
        folders: parsed.folders || [],
      };
    } catch (e) {
      console.error("Error parsing storage", e);
      localStorage.removeItem(STORAGE_KEY);
      return { guides: [], folders: [] };
    }
  },

  saveStore(store: GuideStore) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  },

  // ---- NEW: API Synchronization ----
  async syncFromRemote() {
    try {
      const [remoteGuides, remoteFolders] = await Promise.all([
        api.get<Guide[]>('/api/guides'),
        api.get<Folder[]>('/api/folders')
      ]);
      const store = this.getStore();
      // Optimistic overwrite strategy for MVP
      store.guides = remoteGuides;
      store.folders = remoteFolders;
      this.saveStore(store);
      window.dispatchEvent(new Event("storage_synced"));
    } catch (e) {
      console.error('Failed to sync from remote', e);
    }
  },

  // ---- existing methods ----
  getGuides(): Guide[] {
    return this.getStore().guides;
  },

  getGuide(id: string): Guide | undefined {
    return this.getGuides().find((g) => g.id === id);
  },

  saveGuide(guide: Guide) {
    const store = this.getStore();
    const index = store.guides.findIndex((g) => g.id === guide.id);
    if (index >= 0) {
      store.guides[index] = { ...guide, updatedAt: new Date().toISOString() };
    } else {
      store.guides.push({
        ...guide,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.saveStore(store);
    // Broadcast to backend
    return api.put(`/api/guides/${guide.id}`, { guide });
  },

  deleteGuide(id: string) {
    const store = this.getStore();
    store.guides = store.guides.filter((g) => g.id !== id);
    this.saveStore(store);
    // Broadcast to backend
    api.delete(`/api/guides/${id}`).catch(console.error);
  },

  getFolders(): Folder[] {
    return this.getStore().folders;
  },

  saveFolder(folder: Folder) {
    const store = this.getStore();
    const index = store.folders.findIndex((f) => f.id === folder.id);
    if (index >= 0) {
      store.folders[index] = folder;
    } else {
      store.folders.push(folder);
    }
    this.saveStore(store);
    return api.put(`/api/folders/${folder.id}`, { folder });
  },

  clearStore() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing storage', e);
    }
  },

  deleteFolder(id: string) {
    const store = this.getStore();

    const collectFolderIds = (folderId: string): string[] => {
      const ids = [folderId];
      const children = store.folders.filter(f => f.parentId === folderId);
      children.forEach(c => {
        ids.push(...collectFolderIds(c.id));
      });
      return ids;
    };

    const foldersToDelete = collectFolderIds(id);
    const guidesToDelete = store.guides.filter(g => g.folderId && foldersToDelete.includes(g.folderId));

    store.folders = store.folders.filter(f => !foldersToDelete.includes(f.id));
    store.guides = store.guides.filter(g => !g.folderId || !foldersToDelete.includes(g.folderId));

    this.saveStore(store);

    // Sync deletions to remote
    foldersToDelete.forEach(fid => api.delete(`/api/folders/${fid}`).catch(console.error));
    guidesToDelete.forEach(g => api.delete(`/api/guides/${g.id}`).catch(console.error));
  },

  moveGuide(guideId: string, folderId: string | null) {
    const store = this.getStore();
    const guide = store.guides.find(g => g.id === guideId);
    if (guide) {
      guide.folderId = folderId;
      guide.updatedAt = new Date().toISOString();
      this.saveStore(store);
      api.put(`/api/guides/${guide.id}`, { guide }).catch(console.error);
    }
  },

  moveFolder(folderId: string, parentId: string | null) {
    if (folderId === parentId) return; 
    const store = this.getStore();
    const folder = store.folders.find(f => f.id === folderId);
    if (folder) {
      folder.parentId = parentId;
      this.saveStore(store);
      api.put(`/api/folders/${folder.id}`, { folder }).catch(console.error);
    }
  },

  reorderItems(
    sourceId: string, 
    sourceType: 'guide' | 'folder', 
    targetId: string, 
    targetType: 'guide' | 'folder', 
    position: 'before' | 'after'
  ) {
    const store = this.getStore();
    
    // Find the target's parent
    let parentId: string | null = null;
    if (targetType === 'guide') {
      const g = store.guides.find(g => g.id === targetId);
      if (g) parentId = g.folderId;
    } else {
      const f = store.folders.find(f => f.id === targetId);
      if (f) parentId = f.parentId;
    }

    // Prevent folder from being its own parent or child's parent
    if (sourceType === 'folder' && sourceType === targetType && sourceId === targetId) return;

    // Move source to target's parent
    if (sourceType === 'guide') {
      const g = store.guides.find(g => g.id === sourceId);
      if (g) {
        g.folderId = parentId;
        g.updatedAt = new Date().toISOString();
      }
    } else {
      const f = store.folders.find(f => f.id === sourceId);
      if (f) f.parentId = parentId;
    }

    // Get all items in this parent
    const itemsInParent = [
      ...store.folders.filter(f => f.parentId === parentId).map(f => ({ ...f, type: 'folder' as const })),
      ...store.guides.filter(g => g.folderId === parentId).map(g => ({ ...g, type: 'guide' as const }))
    ];

    // Sort by existing order
    itemsInParent.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Remove source from items
    const filteredItems = itemsInParent.filter(i => !(i.id === sourceId && i.type === sourceType));
    
    // Find target index
    const targetIndex = filteredItems.findIndex(i => i.id === targetId && i.type === targetType);
    if (targetIndex === -1) return; // Should not happen
    
    // Insert source at target index
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    
    const sourceItem = itemsInParent.find(i => i.id === sourceId && i.type === sourceType);
    if (!sourceItem) return;
    
    filteredItems.splice(insertIndex, 0, sourceItem);

    // Reassign order
    filteredItems.forEach((item, index) => {
      if (item.type === 'guide') {
        const g = store.guides.find(g => g.id === item.id);
        if (g) g.order = index;
      } else {
        const f = store.folders.find(f => f.id === item.id);
        if (f) f.order = index;
      }
    });

    this.saveStore(store);
    
    // Sync to backend for all modified items
    filteredItems.forEach(item => {
      if (item.type === 'guide') {
        const g = store.guides.find(g => g.id === item.id);
        if (g) api.put(`/api/guides/${g.id}`, { guide: g }).catch(console.error);
      } else {
        const f = store.folders.find(f => f.id === item.id);
        if (f) api.put(`/api/folders/${f.id}`, { folder: f }).catch(console.error);
      }
    });
  },

  copyGuide(guideId: string, targetFolderId: string | null = null) {
    const store = this.getStore();
    const guide = store.guides.find(g => g.id === guideId);
    if (guide) {
      const newGuide = {
        ...guide,
        id: uuidv4(),
        title: `${guide.title} (Copia)`,
        folderId: targetFolderId !== null ? targetFolderId : guide.folderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.guides.push(newGuide);
      this.saveStore(store);
      api.put(`/api/guides/${newGuide.id}`, { guide: newGuide }).catch(console.error);
      return newGuide;
    }
  },

  copyFolder(folderId: string, targetParentId: string | null = null) {
    const store = this.getStore();
    const folder = store.folders.find(f => f.id === folderId);
    if (folder) {
      const newFolderId = uuidv4();
      const newFolder: Folder = {
        ...folder,
        id: newFolderId,
        name: `${folder.name} (Copia)`,
        parentId: targetParentId !== null ? targetParentId : folder.parentId,
      };
      store.folders.push(newFolder);
      this.saveStore(store);
      api.put(`/api/folders/${newFolder.id}`, { folder: newFolder }).catch(console.error);
      
      const childFolders = store.folders.filter(f => f.parentId === folderId);
      childFolders.forEach(cf => this.copyFolder(cf.id, newFolderId));
      
      const childGuides = store.guides.filter(g => g.folderId === folderId);
      childGuides.forEach(cg => this.copyGuide(cg.id, newFolderId));
      
      return newFolder;
    }
  },

  importGuideFromBackup(backup: GuideBackup, targetFolderId?: string | null): Guide {
    const store = this.getStore();
    const newGuide: Guide = {
      id: uuidv4(),
      title: backup.title,
      folderId: targetFolderId !== undefined ? targetFolderId : backup.folderId,
      content: backup.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.guides.push(newGuide);
    this.saveStore(store);
    api.put(`/api/guides/${newGuide.id}`, { guide: newGuide }).catch(console.error);
    return newGuide;
  },
};
