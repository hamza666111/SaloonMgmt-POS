export const runPrintJob = () => {
  window.print();
};

// You will wrap your non-print components in a block that hides them during printing
// e.g., <div className="print:hidden">...App Content...</div>
