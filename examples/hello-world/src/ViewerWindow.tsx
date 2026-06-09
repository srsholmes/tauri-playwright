export function ViewerWindow() {
  const handleClose = async () => {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    await getCurrentWebviewWindow().close();
  };

  return (
    <div data-testid="viewer-root" style={{ padding: 24 }}>
      <h1 data-testid="viewer-heading">Viewer window</h1>
      <p data-testid="viewer-body">Hello from the second window!</p>
      <button data-testid="btn-viewer-close" onClick={handleClose}>
        Close
      </button>
    </div>
  );
}
