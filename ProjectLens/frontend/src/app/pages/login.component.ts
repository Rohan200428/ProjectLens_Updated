import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService, errorMessage } from "../core";
import { IconComponent } from "../icon.component";
@Component({
  selector: "pl-login",
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: ` <main class="login-layout">
    <section class="login-story">
      <a class="brand" href="/login"
        ><span class="brand-mark"><pl-icon name="lens" [size]="23" /></span
        >ProjectLens<span class="brand-dot">.</span></a
      >
      <div class="story-content">
        <span class="eyebrow story-eyebrow">THE COHORT PROJECT WORKSPACE</span>
        <div class="login-lens" aria-hidden="true"></div><h1>Good ideas.<br />Clear direction.</h1>
        <p>A shared workspace for pod ideas, cohort alignment, and trainer decisions.</p>
        <div class="login-workflow" aria-label="ProjectLens workflow">
          <div class="workflow-label">HOW PROJECTLENS WORKS</div>
          <div class="workflow-node">
            <span><pl-icon name="submissions" [size]="18" /></span>
            <div><strong>Define the project</strong><small>Describe the problem, objectives, and technology.</small></div>
          </div>
          <div class="workflow-node">
            <span><pl-icon name="chart" [size]="18" /></span>
            <div><strong>Understand the evidence</strong><small>Review alignment, missing criteria, and overlap.</small></div>
          </div>
          <div class="workflow-node">
            <span><pl-icon name="reviews" [size]="18" /></span>
            <div><strong>Decide the next step</strong><small>Trainer feedback stays with the proposal.</small></div>
          </div>
        </div>
      </div>
      <div class="story-footer">One proposal per pod. A shared direction for the cohort.</div>
    </section>
    <section class="login-form-side">
      <div class="login-form-wrap">
        <div class="login-tag">
          <span class="live-dot"></span>Your cohort workspace
        </div>
        <h2>Sign in to ProjectLens</h2>
        @if (expired) {
          <div class="info-banner session-notice" role="status">
            <pl-icon name="lock" [size]="16" />Your session expired. Sign in to
            continue.
          </div>
        }
        <p class="muted mb-8">Use your cohort account to continue.</p>
        <form [formGroup]="form" (ngSubmit)="login()">
          <label for="email">Email address</label
          ><input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="username"
            placeholder="you@projectlens.com"
            [class.invalid]="
              form.controls.email.touched && form.controls.email.invalid
            "
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="field-error">Enter a valid email address.</p>
          }
          <div class="mt-5">
            <label for="password">Password</label>
            <div class="password-field">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                placeholder="Enter your password"
              /><button
                type="button"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="
                  showPassword() ? 'Hide password' : 'Show password'
                "
              >
                <pl-icon
                  [name]="showPassword() ? 'eye-off' : 'eye'"
                  [size]="18"
                />
              </button>
            </div>
            @if (
              form.controls.password.touched && form.controls.password.invalid
            ) {
              <p class="field-error">Enter your password.</p>
            }
          </div>
          @if (error()) {
            <div class="error-banner mt-5" role="alert">{{ error() }}</div>
          }
          <button
            class="btn btn-primary login-submit"
            type="submit"
            [disabled]="busy()"
          >
            @if (busy()) {
              <span class="spinner"></span>Signing in…
            } @else {
              Sign in to workspace<pl-icon name="arrow" [size]="18" />
            }
          </button>
        </form>
        <div class="login-security">
          <pl-icon name="lock" [size]="14" />Secure access for trainers and pod
          members
        </div>
        <details class="demo-access">
          <summary>
            Explore the demo workspace <pl-icon name="external" [size]="15" />
          </summary>
          <p>
            Use any sample account with password <code>ProjectLens123!</code>.
          </p>
          <div class="demo-accounts">
            @for (account of accounts; track account.email) {
              <button type="button" (click)="fillDemo(account.email)">
                <span>{{ account.label }}</span
                ><small>{{ account.email }}</small
                ><pl-icon name="arrow" [size]="16" />
              </button>
            }
          </div>
          <p class="text-xs">
            Pod Nova (lead6) starts without an idea. Pod Atlas (lead1) has an
            idea to improve.
          </p>
        </details>
      </div>
      <div class="login-bottom">
        ProjectLens <span>Your cohort. Your project. Your next step.</span>
      </div>
    </section>
  </main>`,
})
export class LoginComponent {
  readonly expired =
    inject(ActivatedRoute).snapshot.queryParamMap.get("reason") === "expired";
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: [
      "",
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: ["", [Validators.required, Validators.maxLength(200)]],
  });
  readonly accounts = [
    { label: "Trainer", email: "trainer@projectlens.com" },
    { label: "Pod lead", email: "lead1@projectlens.com" },
    { label: "Pod member", email: "member2@projectlens.com" },
    { label: "Fresh pod", email: "lead6@projectlens.com" },
  ];
  constructor() {
    if (this.auth.valid()) void this.router.navigateByUrl(this.auth.home);
  }
  fillDemo(email: string) {
    this.form.setValue({ email, password: "ProjectLens123!" });
  }
  login() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    const v = this.form.getRawValue();
    this.auth.login(v.email.trim(), v.password).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl(this.auth.home);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
