import ObjectOverlay from "@/components/editor/ObjectOverlay";

export default function EditorCanvas() {
  return (
    <section className="min-h-[600px] rounded border bg-white p-4">
      Canvas (PDF.js + Konva scaffold)
      <ObjectOverlay />
    </section>
  );
}
