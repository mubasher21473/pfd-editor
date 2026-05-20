import BulkActionBar from "@/components/editor/BulkActionBar";
import EditorCanvas from "@/components/editor/EditorCanvas";
import FilterPanel from "@/components/editor/FilterPanel";
import PageThumbnails from "@/components/editor/PageThumbnails";
import PropertyPanel from "@/components/editor/PropertyPanel";
import Toolbar from "@/components/editor/Toolbar";

export default function EditorPage() {
  return (
    <div className="space-y-4">
      <Toolbar />
      <div className="grid grid-cols-[260px_1fr_300px] gap-4">
        <FilterPanel />
        <EditorCanvas />
        <PropertyPanel />
      </div>
      <BulkActionBar />
      <PageThumbnails />
    </div>
  );
}
