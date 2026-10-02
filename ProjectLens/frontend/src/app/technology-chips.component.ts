import { Component, input } from "@angular/core";
import { Technology } from "./models";
import { categoryLabel } from "./technology-selector.component";
@Component({
  selector: "pl-technology-chips",
  standalone: true,
  template: `<div class="selected-technologies">
    @for (t of items(); track t.name) {
      <span class="technology-chip" [title]="label(t.category)"
        ><small>{{ label(t.category) }}</small
        ><span class="technology-name">{{ t.name }}</span></span
      >
    }
  </div>`,
})
export class TechnologyChipsComponent {
  readonly items = input<Technology[]>([]);
  readonly label = categoryLabel;
}
