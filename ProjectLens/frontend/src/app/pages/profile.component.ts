import { RevealDirective } from "../reveal.directive";
import { SkeletonComponent } from "../skeleton.component";
import { Component, inject, signal } from "@angular/core";
import { ApiService, AuthService, errorMessage, label } from "../core";
import { User } from "../models";
import { IconComponent } from "../icon.component";
@Component({
  selector: "pl-profile",
  standalone: true,
  imports: [RevealDirective, IconComponent, SkeletonComponent],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">ACCOUNT / ACCESS</div>
        <h1>Profile</h1>
        <p>Your role and pod determine what you can access.</p>
      </div>
    </div>
    @if (error()) {
      <div class="error-banner" role="alert">
        {{ error()
        }}<button class="text-button" (click)="load()">Try again</button>
      </div>
    }
    @if (!error() && user(); as u) {
      <section class="panel profile-panel" plReveal>
        <div class="profile-top"><span class="eyebrow">YOUR WORKSPACE IDENTITY</span>
          <span class="avatar large-avatar">{{
            u.name.split(" ").map(initial).slice(0, 2).join("")
          }}</span>
          <div>
            <h2>{{ u.name }}</h2>
            <p>{{ u.email }}</p>
          </div>
          <span class="count-pill">{{ label(u.role) }}</span>
        </div>
        <dl>
          <dt>Email address</dt>
          <dd>{{ u.email }}</dd>
          <dt>Role</dt>
          <dd>{{ label(u.role) }}</dd>
          <dt>Pod</dt>
          <dd>{{ u.podName ?? "Trainer · all qualifying pods" }}</dd>
          <dt>Access</dt>
          <dd>
            {{
              u.role === "TRAINER"
                ? "Review qualifying ideas and record decisions"
                : u.role === "POD_LEAD"
                  ? "Submit and revise your pod’s idea"
                  : "View your pod’s idea and trainer feedback"
            }}
          </dd>
        </dl>
        <div class="profile-footer">
          <p>
            <pl-icon name="lock" [size]="16" />Access is managed by your cohort
            administrator.
          </p>
          <button class="btn btn-secondary" (click)="auth.logout()">
            <pl-icon name="logout" [size]="17" />Sign out
          </button>
        </div>
      </section>
    } @else if (!error()) {
      <pl-skeleton />
    }
  `,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  readonly user = signal<User | null>(null);
  readonly error = signal("");
  readonly label = label;
  readonly initial = (s: string) => s[0];
  constructor() {
    this.load();
  }
  load() {
    this.error.set("");
    this.user.set(null);
    this.api.profile().subscribe({
      next: (u) => this.user.set(u),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
