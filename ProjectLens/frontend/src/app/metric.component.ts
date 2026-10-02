import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** Presentation-only count animation. The accessible value is always final. */
@Component({
  selector: 'pl-metric',
  standalone: true,
  imports: [DecimalPipe],
  template: `<span class="metric-value" [attr.aria-label]="value()"><span aria-hidden="true">{{ display() | number:'1.0-1' }}</span></span>`,
})
export class MetricComponent {
  readonly value = input(0);
  readonly display = signal(0);
  constructor() {
    let frame = 0;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const snap = () => { if (media.matches) { cancelAnimationFrame(frame); this.display.set(this.value()); } };
    media.addEventListener('change', snap);
    inject(DestroyRef).onDestroy(() => { cancelAnimationFrame(frame); media.removeEventListener('change', snap); });
    effect(onCleanup => {
      cancelAnimationFrame(frame);
      const target = this.value();
      if (media.matches) { this.display.set(target); return; }
      const from = untracked(this.display);
      let start: number | undefined;
      const tick = (time: number) => {
        start ??= time;
        const progress = Math.min(1, (time - start) / 850);
        this.display.set(progress === 1 ? target : Math.round(from + (target - from) * (1 - (1 - progress) ** 4)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
