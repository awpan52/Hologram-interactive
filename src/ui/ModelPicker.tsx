import { useCallback, useState, type DragEvent, type ChangeEvent } from 'react';

interface ModelPickerProps {
  onModelSelect: (url: string, format: 'glb' | 'fbx' | 'obj') => void;
}

function detectFormat(filename: string): 'glb' | 'fbx' | 'obj' | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'glb' || ext === 'gltf') return 'glb';
  if (ext === 'fbx') return 'fbx';
  if (ext === 'obj') return 'obj';
  return null;
}

export function ModelPicker({ onModelSelect }: ModelPickerProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const format = detectFormat(file.name);
      if (!format) {
        alert(`Unsupported format: ${file.name}\nSupported: .glb, .gltf, .fbx, .obj`);
        return;
      }
      const url = URL.createObjectURL(file);
      onModelSelect(url, format);
    },
    [onModelSelect],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: '12px 20px',
        background: isDragging ? 'rgba(68, 136, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        border: `2px dashed ${isDragging ? '#4488ff' : 'rgba(255, 255, 255, 0.3)'}`,
        borderRadius: 8,
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.2s',
        zIndex: 10,
      }}
    >
      <label style={{ cursor: 'pointer' }}>
        Drop 3D model or click to upload
        <input
          type="file"
          accept=".glb,.gltf,.fbx,.obj"
          onChange={onFileInput}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}
