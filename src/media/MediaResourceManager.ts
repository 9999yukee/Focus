import type { ResourcePolicy, Settings } from '../settings/types';

const attachments = '[id^="chat-messages-"] video';

/** Manages attachment playback only. Audio, WebRTC and call/screen-share video are excluded. */
export class MediaResourceManager {
  private tracked = new Map<HTMLVideoElement, boolean>();
  private observer: IntersectionObserver;
  private background = false;
  private pauseOffscreen = true;
  private autoplay = false;
  private userPlayed = new WeakSet<HTMLVideoElement>();
  constructor() {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        this.tracked.set(video, entry.isIntersecting);
        this.apply(video);
      }
    }, { threshold: 0 });
    document.addEventListener('pointerdown', this.onInteraction, true);
    document.addEventListener('keydown', this.onInteraction, true);
  }
  configure(settings: Settings): void {
    this.pauseOffscreen = settings.pauseOffscreenMedia; this.autoplay = settings.autoplayVideo;
    for (const video of this.tracked.keys()) this.apply(video);
  }
  policy(policy: ResourcePolicy): void {
    this.background = policy.pauseAttachmentVideo;
    for (const video of this.tracked.keys()) this.apply(video);
  }
  discover(root: ParentNode): void {
    if (root instanceof HTMLVideoElement && root.matches(attachments)) this.track(root);
    for (const video of root.querySelectorAll<HTMLVideoElement>(attachments)) this.track(video);
  }
  private track(video: HTMLVideoElement): void {
    if (this.tracked.has(video) || video.srcObject) return;
    this.tracked.set(video, true); this.observer.observe(video);
    video.addEventListener('play', this.onPlay);
    this.apply(video);
  }
  private onInteraction = (event: Event): void => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    // Discord's play button can be a sibling overlay rather than a native video control.
    const message = event.target.closest('[id^="chat-messages-"]');
    for (const video of message?.querySelectorAll('video') ?? []) this.userPlayed.add(video);
  };
  private onPlay = (event: Event): void => { if (event.currentTarget instanceof HTMLVideoElement) this.apply(event.currentTarget); };
  private apply(video: HTMLVideoElement): void {
    if (video.srcObject || !video.closest('[id^="chat-messages-"]')) return;
    if (this.background || (this.pauseOffscreen && !this.tracked.get(video)) || (!this.autoplay && !this.userPlayed.has(video))) {
      if (!video.paused) video.pause();
    }
    // Do not resume automatically: the user may have paused intentionally.
  }
  prune(): void {
    for (const video of this.tracked.keys()) if (!video.isConnected) {
      this.observer.unobserve(video); this.tracked.delete(video);
      video.removeEventListener('play', this.onPlay);
    }
  }
  dispose(): void {
    this.observer.disconnect();
    for (const video of this.tracked.keys()) {
      video.removeEventListener('play', this.onPlay);
    }
    this.tracked.clear();
    document.removeEventListener('pointerdown', this.onInteraction, true);
    document.removeEventListener('keydown', this.onInteraction, true);
  }
}
