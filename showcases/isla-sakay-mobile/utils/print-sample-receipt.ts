/** Open the original receipt design using the browser's print and Save as PDF options. */
export function printSampleReceipt(html: string) {
  if (typeof window === "undefined") throw new Error("Open this preview in a browser to print.");
  const receiptWindow = window.open("", "_blank");
  if (!receiptWindow) throw new Error("Allow pop-ups to open the sample receipt.");
  receiptWindow.opener = null;
  receiptWindow.document.open();
  receiptWindow.document.write(html.replace("<head>", "<head><title>Isla Sakay - Sample receipt</title>"));
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.setTimeout(() => receiptWindow.print(), 200);
}
