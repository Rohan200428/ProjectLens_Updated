import {
  Component,
  input,
  signal,
  effect,
  DestroyRef,
  inject,
} from "@angular/core";
import { DecimalPipe } from "@angular/common";
@Component({
  selector: "pl-score",
  standalone: true,
  imports: [DecimalPipe],
  template: ` <div
    class="animated-score"
    [class.radial]="kind() === 'radial'"
    [class.bar-score]="kind() === 'bar'"
    [class.qualified]="value() >= threshold()"
    role="img"
    [attr.aria-label]="
      value() +
      ' percent alignment. ' +
      (value() >= threshold()
        ? 'Qualifies for review.'
        : 'Below review threshold.')
    "
  >
    @if (kind() === "radial") {
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="score-ring-track" cx="60" cy="60" r="51" />
        <circle
          class="score-ring-value"
          cx="60"
          cy="60"
          r="51"
          stroke-dasharray="320.44"
          [attr.stroke-dashoffset]="320.44 * (1 - display() / 100)"
        />
      </svg>
    }
    <strong class="alignment-number"
      >{{ display() | number: "1.0-1" }}<span>%</span></strong
    >
    @if (kind() === "bar") {
      <div class="score-track">
        <span [style.transform]="'scaleX(' + display() / 100 + ')'"></span
        ><i
          [style.left.%]="threshold()"
          [title]="threshold() + '% review threshold'"
        ></i>
      </div>
    }
  </div>`,
})
export class ScoreComponent {
  readonly value = input(0);
  readonly threshold = input(70);
  readonly kind = input<"radial" | "bar">("radial");
  readonly display = signal(0);
  constructor() {
    let frame = 0;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const snap = () => {
      if (media.matches) {
        cancelAnimationFrame(frame);
        this.display.set(this.value());
      }
    };
    media.addEventListener("change", snap);
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", snap);
    });
    effect((onCleanup) => {
      cancelAnimationFrame(frame);
      const target = Math.min(100, Math.max(0, this.value()));
      if (media.matches) {
        this.display.set(target);
        return;
      }
      this.display.set(0);
      let start: number | undefined;
      const tick = (time: number) => {
        start ??= time;
        const t = Math.min(1, (time - start) / 850);
        this.display.set(
          t === 1 ? target : Math.round(target * (1 - Math.pow(1 - t, 3))),
        );
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
