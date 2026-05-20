export function usePdfRenderer() {
  return {
    renderPage: async (pageNumber: number) => {
      void pageNumber;
      return true;
    }
  };
}
