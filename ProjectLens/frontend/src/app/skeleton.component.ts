import { Component, input } from "@angular/core";
@Component({
  selector: "pl-skeleton",
  standalone: true,
  template: `<div
    class="skeleton-workspace"
    role="status"
    aria-label="Loading workspace"
  >
    <span class="sr-only">Loading your workspace…</span>
    <div class="skeleton-hero"><i></i><i></i><i></i></div>
    <div class="skeleton-lines">
      @for (n of rows(); track n) {
        <div><i></i><i></i><i></i></div>
      }
    </div>
  </div>`,
})
export class SkeletonComponent {
  readonly rows = input([1, 2, 3, 4]);
}
