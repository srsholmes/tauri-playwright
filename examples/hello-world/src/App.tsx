import { useState } from 'react';
import { api } from './lib/tauri';

export default function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState('');
  const [dialogResult, setDialogResult] = useState('');
  const [dragResult, setDragResult] = useState('');
  const [delayedVisible, setDelayedVisible] = useState(false);
  const [apiData, setApiData] = useState<string[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleGreet = async () => {
    try {
      const message = await api.greet(name);
      setGreeting(message);
    } catch (e) {
      setGreeting(`Error: ${e}`);
    }
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div data-testid="app" style={{ maxWidth: 600, margin: '0 auto', padding: 40 }}>
      <h1 data-testid="heading">Hello, Tauri Playwright!</h1>

      {/* Counter Section */}
      <section data-testid="counter-section" style={{ marginTop: 32 }}>
        <h2>Counter</h2>
        <p data-testid="counter-value">Count: {count}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button data-testid="btn-decrement" onClick={() => setCount(c => c - 1)}>
            -
          </button>
          <button data-testid="btn-increment" onClick={() => setCount(c => c + 1)}>
            +
          </button>
          <button data-testid="btn-reset" onClick={() => setCount(0)}>
            Reset
          </button>
        </div>
      </section>

      {/* Greet Section (Tauri IPC) */}
      <section data-testid="greet-section" style={{ marginTop: 32 }}>
        <h2>Greet (Tauri IPC)</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            data-testid="greet-input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGreet()}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #444', background: '#1a1a1a', color: '#e5e5e5', flex: 1 }}
          />
          <button data-testid="btn-greet" onClick={handleGreet}>
            Greet
          </button>
        </div>
        {greeting && (
          <p data-testid="greet-result" style={{ marginTop: 8, color: '#4ade80' }}>
            {greeting}
          </p>
        )}
      </section>

      {/* Todo List Section */}
      <section data-testid="todo-section" style={{ marginTop: 32 }}>
        <h2>Todo List</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            data-testid="todo-input"
            type="text"
            placeholder="Add a todo item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #444', background: '#1a1a1a', color: '#e5e5e5', flex: 1 }}
          />
          <button data-testid="btn-add-todo" onClick={handleAddItem}>
            Add
          </button>
        </div>
        <ul data-testid="todo-list" style={{ marginTop: 12, listStyle: 'none' }}>
          {items.map((item, i) => (
            <li
              key={i}
              data-testid={`todo-item-${i}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}
            >
              <span>{item}</span>
              <button
                data-testid={`btn-remove-${i}`}
                onClick={() => handleRemoveItem(i)}
                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 && (
          <p data-testid="todo-empty" style={{ marginTop: 8, color: '#666' }}>
            No items yet. Add one above!
          </p>
        )}
        <p data-testid="todo-count" style={{ marginTop: 8, color: '#888' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </section>

      {/* API Fetch Section */}
      <section data-testid="api-section" style={{ marginTop: 32 }}>
        <h2>API Data</h2>
        <button
          data-testid="btn-fetch-api"
          onClick={async () => {
            setApiLoading(true);
            setApiError('');
            try {
              const resp = await fetch('/api/users');
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
              const text = await resp.text();
              let data;
              try { data = JSON.parse(text); } catch { throw new Error('Not JSON — is the network mock installed?'); }
              setApiData(data.users || []);
            } catch (e) {
              setApiError(String(e));
              setApiData([]);
            } finally {
              setApiLoading(false);
            }
          }}
        >
          Fetch Users
        </button>
        {apiLoading && <p data-testid="api-loading">Loading...</p>}
        {apiError && <p data-testid="api-error" style={{ color: '#ef4444' }}>{apiError}</p>}
        {apiData.length > 0 && (
          <ul data-testid="api-list">
            {apiData.map((user, i) => (
              <li key={i} data-testid={`api-user-${i}`}>{user}</li>
            ))}
          </ul>
        )}
        {!apiLoading && !apiError && apiData.length === 0 && (
          <p data-testid="api-empty" style={{ color: '#666' }}>No data yet. Click Fetch Users.</p>
        )}
      </section>

      {/* Delayed Element Section (for auto-waiting tests) */}
      <section data-testid="delayed-section" style={{ marginTop: 32 }}>
        <h2>Delayed Element</h2>
        <button
          data-testid="btn-show-delayed"
          onClick={() => {
            setDelayedVisible(false);
            setTimeout(() => setDelayedVisible(true), 1000);
          }}
        >
          Show After 1s
        </button>
        {delayedVisible && (
          <p data-testid="delayed-element">I appeared after a delay!</p>
        )}
      </section>

      {/* File Upload Section */}
      <section data-testid="upload-section" style={{ marginTop: 32 }}>
        <h2>File Upload</h2>
        <input
          data-testid="file-input"
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setUploadedFile(file ? `${file.name} (${file.size} bytes)` : '');
          }}
        />
        {uploadedFile && <p data-testid="upload-result">{uploadedFile}</p>}
      </section>

      {/* Dialog Section */}
      <section data-testid="dialog-section" style={{ marginTop: 32 }}>
        <h2>Dialogs</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button data-testid="btn-alert" onClick={() => { alert('Hello from alert!'); setDialogResult('alert fired'); }}>
            Alert
          </button>
          <button data-testid="btn-confirm" onClick={() => { const r = confirm('Are you sure?'); setDialogResult(`confirm: ${r}`); }}>
            Confirm
          </button>
          <button data-testid="btn-prompt" onClick={() => { const r = prompt('Enter name:', 'default'); setDialogResult(`prompt: ${r}`); }}>
            Prompt
          </button>
        </div>
        {dialogResult && <p data-testid="dialog-result">{dialogResult}</p>}
      </section>

      {/* Drag and Drop Section */}
      <section data-testid="drag-section" style={{ marginTop: 32 }}>
        <h2>Drag & Drop</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div
            data-testid="drag-source"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', 'dragged-item')}
            style={{ padding: 16, background: '#333', borderRadius: 4, cursor: 'grab' }}
          >
            Drag me
          </div>
          <div
            data-testid="drop-target"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragResult('Dropped: ' + e.dataTransfer.getData('text/plain'));
            }}
            style={{ padding: 16, background: '#222', borderRadius: 4, border: '2px dashed #555', minWidth: 120 }}
          >
            {dragResult || 'Drop here'}
          </div>
        </div>
        {dragResult && <p data-testid="drag-result">{dragResult}</p>}
      </section>

      {/* Modal Section */}
      <section data-testid="modal-section" style={{ marginTop: 32 }}>
        <h2>Modal</h2>
        <button data-testid="btn-open-modal" onClick={() => setShowModal(true)}>
          Open Modal
        </button>
      </section>

      {showModal && (
        <div
          data-testid="modal-backdrop"
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
        >
          <div
            data-testid="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#1a1a1a', borderRadius: 8, padding: 24, maxWidth: 400, width: '90%' }}
          >
            <h3>Modal Title</h3>
            <p style={{ marginTop: 8, color: '#ccc' }}>
              This is a modal dialog. Click the button below or the backdrop to close it.
            </p>
            <button
              data-testid="btn-close-modal"
              onClick={() => setShowModal(false)}
              style={{ marginTop: 16 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
