export interface EditOperation {
  object_id: string;
  op: string;
  value: unknown;
}

export interface EditorState {
  fileId?: string;
  selectedObjectIds: string[];
  historyDepth: number;
}
