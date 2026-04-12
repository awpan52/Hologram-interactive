import * as THREE from 'three';

/**
 * Manages THREE.AnimationMixer for a loaded model.
 * Supports playing, stopping, cross-fading, and listing animations.
 */
export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private clips: Map<string, THREE.AnimationClip> = new Map();
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private activeAction: THREE.AnimationAction | null = null;

  constructor(root: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(root);
  }

  /** Register available animation clips (typically from glTF) */
  setClips(clips: THREE.AnimationClip[]): void {
    this.clips.clear();
    this.actions.clear();
    for (const clip of clips) {
      this.clips.set(clip.name, clip);
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    }
  }

  /** Get list of available animation names */
  listAnimations(): string[] {
    return Array.from(this.clips.keys());
  }

  /** Play an animation by name */
  play(
    name: string,
    options: {
      loop?: boolean;
      crossFadeDuration?: number;
      timeScale?: number;
    } = {},
  ): boolean {
    const action = this.actions.get(name);
    if (!action) return false;

    const { loop = true, crossFadeDuration = 0.3, timeScale = 1 } = options;

    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.timeScale = timeScale;

    if (this.activeAction && this.activeAction !== action) {
      action.reset();
      action.play();
      this.activeAction.crossFadeTo(action, crossFadeDuration, true);
    } else {
      action.reset();
      action.play();
    }

    this.activeAction = action;
    return true;
  }

  /** Play an animation once and return to the previous animation */
  playOnce(name: string, onComplete?: () => void): boolean {
    const action = this.actions.get(name);
    if (!action) return false;

    const previousAction = this.activeAction;

    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset();
    action.play();

    if (previousAction && previousAction !== action) {
      previousAction.crossFadeTo(action, 0.2, true);
    }

    this.activeAction = action;

    // Listen for completion
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === action) {
        this.mixer.removeEventListener('finished', onFinished);
        if (previousAction) {
          previousAction.reset();
          previousAction.play();
          action.crossFadeTo(previousAction, 0.3, true);
          this.activeAction = previousAction;
        }
        onComplete?.();
      }
    };
    this.mixer.addEventListener('finished', onFinished);

    return true;
  }

  /** Stop all animations */
  stop(): void {
    this.mixer.stopAllAction();
    this.activeAction = null;
  }

  /** Update the mixer — call this every frame with delta time */
  update(delta: number): void {
    this.mixer.update(delta);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
