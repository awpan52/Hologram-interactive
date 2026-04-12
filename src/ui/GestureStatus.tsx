import type { GestureState } from '../input/useGestures';

interface GestureStatusProps {
  gestureState: GestureState;
  gesturesEnabled: boolean;
  onToggle: () => void;
}

const GESTURE_LABELS: Record<string, string> = {
  none: '--',
  open_palm: 'Open Palm  →  rotate',
  point: 'Point  →  spin',
  thumbs_up: 'Thumbs Up  →  zoom in',
  thumbs_down: 'Thumbs Down  →  zoom out',
};

export function GestureStatus({ gestureState, gesturesEnabled, onToggle }: GestureStatusProps) {
  const { gesture, isActive, isLoading, error } = gestureState;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 12,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        color: '#fff',
        fontSize: 13,
        zIndex: 10,
        minWidth: 160,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Gestures</span>
        <button
          onClick={onToggle}
          style={{
            padding: '3px 10px',
            background: gesturesEnabled ? 'rgba(68, 200, 100, 0.3)' : 'rgba(255, 255, 255, 0.15)',
            border: `1px solid ${gesturesEnabled ? '#44c864' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 4,
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {gesturesEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ff6666', fontSize: 11, marginBottom: 6 }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ color: '#aaa', fontSize: 11 }}>Loading camera...</div>
      )}

      {isActive && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: gesture !== 'none' ? '#44c864' : '#555',
                transition: 'background 0.2s',
              }}
            />
            <span>{GESTURE_LABELS[gesture] ?? gesture}</span>
          </div>
          <div style={{ color: '#888', fontSize: 10 }}>
            Open palm · Point · Thumbs up/down
          </div>
        </>
      )}

      {!gesturesEnabled && !isLoading && (
        <div style={{ color: '#888', fontSize: 11 }}>
          Click ON to start camera
        </div>
      )}
    </div>
  );
}
