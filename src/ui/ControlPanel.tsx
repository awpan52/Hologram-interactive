import { useState, useEffect, useCallback } from 'react';

interface ControlPanelProps {
  autoRotate: boolean;
  onAutoRotateChange: (v: boolean) => void;
  autoRotateSpeed: number;
  onAutoRotateSpeedChange: (v: number) => void;
  animationPlaying: boolean;
  onAnimationToggle: () => void;
  animationNames: string[];
  activeAnimation: string | null;
  onAnimationSelect: (name: string) => void;
  onReset: () => void;
  modelLoaded: boolean;
}

export function ControlPanel({
  autoRotate,
  onAutoRotateChange,
  autoRotateSpeed,
  onAutoRotateSpeedChange,
  animationPlaying,
  onAnimationToggle,
  animationNames,
  activeAnimation,
  onAnimationSelect,
  onReset,
  modelLoaded,
}: ControlPanelProps) {
  const [visible, setVisible] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    if (hideTimeout) clearTimeout(hideTimeout);
    const t = setTimeout(() => setVisible(false), 5000);
    setHideTimeout(t);
  }, [hideTimeout]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => resetHideTimer()}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        Settings
      </button>
    );
  }

  return (
    <div
      onPointerMove={resetHideTimer}
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        padding: 16,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        color: '#fff',
        fontSize: 13,
        zIndex: 10,
        minWidth: 200,
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Controls</div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={autoRotate}
          onChange={(e) => onAutoRotateChange(e.target.checked)}
        />
        Auto-rotate
      </label>

      {autoRotate && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          Speed
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.1}
            value={autoRotateSpeed}
            onChange={(e) => onAutoRotateSpeedChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </label>
      )}

      {animationNames.length > 0 && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={animationPlaying}
              onChange={onAnimationToggle}
            />
            Animation
          </label>
          {animationNames.length > 1 && (
            <select
              value={activeAnimation ?? ''}
              onChange={(e) => onAnimationSelect(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                marginBottom: 8,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                color: '#fff',
                fontSize: 12,
              }}
            >
              {animationNames.map((name) => (
                <option key={name} value={name} style={{ background: '#222' }}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      <button
        onClick={onReset}
        style={{
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 12,
          width: '100%',
        }}
      >
        {modelLoaded ? 'Remove Model' : 'Reset View'}
      </button>
    </div>
  );
}
