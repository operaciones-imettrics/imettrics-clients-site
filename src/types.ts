import type { JSONContent } from "@tiptap/core";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Guide {
  id: string;
  title: string;
  content: JSONContent;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuideStore {
  guides: Guide[];
  folders: Folder[];
}

export type StatusType = 'new' | 'deprecated' | 'update';
export type CalloutType = 'info' | 'warning' | 'success';

export interface ParameterRow {
  parameter: string;
  value: string;
  type: string;
}
