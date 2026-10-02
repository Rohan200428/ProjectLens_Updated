import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastService } from "./core";
import { IconComponent } from "./icon.component";
@Component({
  selector: "pl-root",
  standalone: true,
  imports: [RouterOutlet, IconComponent],
  template: `<router-outlet />
    @if (toast.message()) {
      <div
        class="toast"
        [attr.data-type]="toast.type()"
        role="status"
        animate.enter="toast-enter"
        animate.leave="toast-leave"
      >
        <pl-icon
          [name]="
            toast.type() === 'error'
              ? 'error'
              : toast.type() === 'warning'
                ? 'warning'
                : toast.type() === 'info'
                  ? 'info'
                  : 'success'
          "
        /><span>{{ toast.message() }}</span
        ><button
          aria-label="Dismiss notification"
          (click)="toast.message.set('')"
        >
          <pl-icon name="close" [size]="16" />
        </button>
      </div>
    }`,
})
export class AppComponent {
  readonly toast = inject(ToastService);
}
