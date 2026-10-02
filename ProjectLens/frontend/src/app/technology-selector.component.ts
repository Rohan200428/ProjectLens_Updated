import {
  Component,
  computed,
  input,
  output,
  signal,
  inject,
  ElementRef,
  HostListener,
} from "@angular/core";
import { Technology } from "./models";
import { IconComponent } from "./icon.component";
export const categoryLabel = (s: string) =>
  ({
    FRONTEND: "Frontend",
    BACKEND: "Backend",
    DATABASE: "Database",
    LANGUAGE: "Programming language",
    DEVOPS_CLOUD: "DevOps / Cloud",
    TOOLS_OTHER: "Tools / Other",
  })[s] ?? s;
@Component({
  selector: "pl-technology-selector",
  standalone: true,
  imports: [IconComponent],
  template: ` <div class="tech-selector" (focusout)="onBlur($event)">
    <button
      id="technologyStack"
      type="button"
      class="tech-trigger"
      [attr.aria-expanded]="open()"
      aria-controls="technology-options"
      (click)="open.set(!open())"
    >
      <pl-icon name="code" [size]="18" /><span>{{
        value().length
          ? value().length + " technologies selected"
          : "Choose your technologies"
      }}</span
      ><pl-icon name="chevron" [size]="16" />
    </button>
    @if (value().length) {
      <div class="selected-technologies" aria-label="Selected technologies">
        @for (t of value(); track t.name) {
          <span class="technology-chip" [attr.data-category]="t.category" animate.enter="chip-enter" animate.leave="chip-leave"
            ><small>{{ label(t.category) }}</small
            ><span class="technology-name">{{ t.name }}</span><button
              type="button"
              [attr.aria-label]="'Remove ' + t.name"
              (click)="toggle(t)"
            >
              <pl-icon name="close" [size]="14" /></button
          ></span>
        }
      </div>
    }
    @if (open()) {
      <div
        id="technology-options"
        class="tech-dropdown"
        animate.enter="dropdown-enter"
        animate.leave="dropdown-leave"
      >
        <div class="tech-search">
          <pl-icon name="search" [size]="16" /><input
            aria-label="Search technologies"
            placeholder="Search technologies…"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            (keydown.escape)="closeDropdown()"
            (keydown.enter)="$event.preventDefault()"
          />
        </div>
        <div
          class="tech-options"
          role="group"
          aria-label="Technology categories"
          tabindex="0"
        >
          @for (group of groups(); track group.category) {
            <div class="tech-group">
              <h4>{{ label(group.category) }}</h4>
              @for (t of group.items; track t.name) {
                <button
                  type="button"
                  class="tech-option"
                  [class.selected]="selected(t)"
                  [attr.aria-pressed]="selected(t)"
                  (click)="toggle(t)"
                >
                  <span class="checkbox-box">
                    @if (selected(t)) {
                      <pl-icon name="check" [size]="13" />
                    }</span
                  >{{ t.name }}
                </button>
              }
            </div>
          } @empty {
            <p class="field-help">No technologies match this search.</p>
          }
        </div>
        <div class="tech-dropdown-footer">
          <span>{{ value().length }} selected · up to 40</span
          ><button type="button" class="text-link" (click)="closeDropdown()">
            Done
          </button>
        </div>
      </div>
    }
  </div>`,
})
export class TechnologySelectorComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly value = input<Technology[]>([]);
  readonly options = input<Technology[]>([]);
  readonly valueChange = output<Technology[]>();
  readonly touched = output<void>();
  readonly open = signal(false);
  readonly query = signal("");
  readonly label = categoryLabel;
  readonly groups = computed(() =>
    [
      "FRONTEND",
      "BACKEND",
      "DATABASE",
      "LANGUAGE",
      "DEVOPS_CLOUD",
      "TOOLS_OTHER",
    ]
      .map((category) => ({
        category,
        items: this.options().filter(
          (t) =>
            t.category === category &&
            t.name.toLowerCase().includes(this.query().toLowerCase()),
        ),
      }))
      .filter((g) => g.items.length),
  );
  selected(t: Technology) {
    return this.value().some(
      (v) => v.name.toLowerCase() === t.name.toLowerCase(),
    );
  }
  toggle(t: Technology) {
    this.touched.emit();
    this.valueChange.emit(
      this.selected(t)
        ? this.value().filter((v) => v.name !== t.name)
        : this.value().length < 40
          ? [...this.value(), t]
          : this.value(),
    );
  }
  closeDropdown() {
    this.open.set(false);
    this.element.nativeElement
      .querySelector<HTMLButtonElement>(".tech-trigger")
      ?.focus();
  }
  @HostListener("document:pointerdown", ["$event"]) outsideClick(
    event: PointerEvent,
  ) {
    if (
      this.open() &&
      !this.element.nativeElement.contains(event.target as Node)
    ) {
      this.open.set(false);
      this.touched.emit();
    }
  }
  onBlur(event: FocusEvent) {
    if (
      event.relatedTarget &&
      !this.element.nativeElement.contains(event.relatedTarget as Node)
    ) {
      this.open.set(false);
      this.touched.emit();
    }
  }
}
