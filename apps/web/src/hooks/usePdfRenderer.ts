export function usePdfRenderer() {
  return {
    renderPage: async (_page: number) => {
      return true;
    }
  };
}
