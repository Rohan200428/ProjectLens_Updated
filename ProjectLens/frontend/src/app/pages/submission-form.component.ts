import { RevealDirective } from "../reveal.directive";
import { toSignal } from "@angular/core/rxjs-interop";
import { SkeletonComponent } from "../skeleton.component";
import { Component, computed, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import {
  ApiService,
  AuthService,
  ToastService,
  errorMessage,
  canRevise,
} from "../core";
import { CriteriaSet, Submission, Technology } from "../models";
import { TechnologySelectorComponent } from "../technology-selector.component";
import { IconComponent } from "../icon.component";
@Component({
  selector: "pl-submission-form",
  standalone: true,
  imports: [RevealDirective, 
    ReactiveFormsModule,
    RouterLink,
    IconComponent,
    TechnologySelectorComponent,
    SkeletonComponent,
  ],
  template: `
    <a routerLink="/pod/submissions" class="back-link"
      ><pl-icon name="back" [size]="16" />Back to submissions</a
    >
    <div class="page-heading">
      <div>
        <div class="eyebrow">{{ auth.user?.podName }} · PROJECT IDEA</div>
        <h1>
          {{
            editing
              ? "Revise submission"
              : "New submission"
          }}
        </h1>
        <p>
          {{
            editing
              ? "Use the evaluation and trainer feedback to refine your proposal."
              : "Start with a real problem. Show how your idea fits the cohort."
          }}
        </p>
      </div>
      <span class="count-pill">{{
        editing ? "Revision" : "New submission"
      }}</span>
    </div>
    @if (loading()) {
      <pl-skeleton />
    } @else if (loadError()) {
      <div class="panel empty-state" role="alert">
        <h2>Cannot open this submission</h2>
        <p>{{ loadError() }}</p>
        <a class="btn btn-secondary" routerLink="/pod/submissions"
          >Back to submissions</a
        >
        <button class="btn btn-primary ml-3" (click)="retry()">
          <pl-icon name="refresh" [size]="16" />Try again
        </button>
      </div>
    } @else {
      <div class="form-layout">
        <form
          class="panel submission-form"
          [formGroup]="form"
          (ngSubmit)="submit()"
        >
          <div class="composer-progress" aria-label="Proposal completeness"><span>PROPOSAL STUDIO</span><strong>{{ completion() }}% complete</strong><div><i [style.width.%]="completion()"></i></div></div>
          <div class="form-chapter" plReveal>
          <div class="form-intro" id="project-overview">
            <span class="section-marker">01</span>
            <div>
              <h2>Define the idea.</h2>
              <p>
                All fields are required. Be specific about the problem and your
                approach.
              </p>
            </div>
          </div>
          <div class="form-field">
            <label for="projectTitle">Project title <span>*</span></label
            ><input
              id="projectTitle"
              formControlName="projectTitle"
              maxlength="150"
              placeholder="A concise name that captures your idea"
              [class.invalid]="invalid('projectTitle')"
            />
            <div class="field-help">
              <span>Clear and descriptive, 3–150 characters.</span
              ><span>{{ form.controls.projectTitle.value.length }} / 150</span>
            </div>
            @if (invalid("projectTitle")) {
              <p class="field-error">
                Enter a project title of 3–150 characters.
              </p>
            }
          </div>
          <div class="form-field">
            <label for="problemStatement"
              >Problem statement <span>*</span></label
            ><textarea
              id="problemStatement"
              formControlName="problemStatement"
              rows="4"
              maxlength="1000"
              placeholder="Who faces this problem? What is difficult today, and why does it matter?"
              [class.invalid]="invalid('problemStatement')"
            ></textarea>
            <p class="field-help">
              Describe the people, context, and pain point your project
              addresses.
              <span class="character-counter" [class.at-limit]="form.controls.problemStatement.value.length === 1000"
                >{{ form.controls.problemStatement.value.length }} / 1000</span
              >
            </p>
            @if (invalid("problemStatement")) {
              <p class="field-error">
                Describe the problem in 10–1,000 characters.
              </p>
            }
          </div>
          </div>
          <div class="form-chapter" plReveal>
          <div class="form-intro" id="project-outcomes"><span class="section-marker">02</span><div><h2>Set the outcomes.</h2><p>Turn your ambition into capabilities you can measure.</p></div></div>
          <div class="form-field">
            <label for="objectives">Objectives <span>*</span></label
            ><textarea
              id="objectives"
              formControlName="objectives"
              rows="5"
              maxlength="1000"
              placeholder="List the outcomes you want to achieve, the capabilities you will build, and how you will measure success."
              [class.invalid]="invalid('objectives')"
            ></textarea>
            <p class="field-help">
              Explain the planned features. Include how you will test and
              document your approach.
              <span class="character-counter" [class.at-limit]="form.controls.objectives.value.length === 1000"
                >{{ form.controls.objectives.value.length }} / 1000</span
              >
            </p>
            @if (invalid("objectives")) {
              <p class="field-error">
                Describe your objectives in 10–1,000 characters.
              </p>
            }
          </div>
          </div>
          <div class="form-chapter" plReveal>
          <div class="form-intro secondary" id="technology-documentation">
            <span class="section-marker">03</span>
            <div>
              <h2>Plan the build.</h2>
              <p>Connect your technology choices to the idea.</p>
            </div>
          </div>
          <div class="form-field">
            <label for="technologyStack">Technology stack <span>*</span></label
            ><pl-technology-selector
              [options]="technologies()"
              [value]="form.controls.technologyStack.value"
              (valueChange)="form.controls.technologyStack.setValue($event)"
              (touched)="form.controls.technologyStack.markAsTouched()"
            />
            @if (invalid("technologyStack")) {
              <p class="field-error">Select at least one technology.</p>
            }
          </div>
          <div class="form-field">
            <label for="documentationLink"
              >Supporting documentation link <span>*</span></label
            ><input
              id="documentationLink"
              type="url"
              formControlName="documentationLink"
              maxlength="2048"
              placeholder="https://docs.example.com/your-project"
              [class.invalid]="invalid('documentationLink')"
            />
            <p class="field-help">
              Link to your proposal or design. Use a complete HTTP or HTTPS URL.
            </p>
            @if (invalid("documentationLink")) {
              <p class="field-error">
                Enter a valid HTTP or HTTPS documentation URL.
              </p>
            }
          </div>
          </div>
          @if (error()) {
            <div class="error-banner mb-5" role="alert">{{ error() }}</div>
          }
          <div class="form-footer">
            <a class="btn btn-secondary" routerLink="/pod/submissions">Cancel</a
            ><button type="submit" class="btn btn-primary" [disabled]="busy()">
              @if (busy()) {
                <span class="spinner"></span>Evaluating your idea…
              } @else {
                {{ editing ? "Resubmit for evaluation" : "Submit & evaluate"
                }}<pl-icon name="arrow" [size]="17" />
              }
            </button>
          </div>
          <p class="form-note">
            Your proposal is saved before evaluation. One submission per pod;
            revise this idea whenever feedback calls for a change.
          </p>
        </form>
        <aside class="form-aside">
          <nav class="proposal-outline" aria-label="Proposal sections">
            <div class="eyebrow">THE PROPOSAL PATH</div><h3>Give your idea a clear direction.</h3>
            <a href="#project-overview"><span>01</span>Define the idea</a>
            <a href="#project-outcomes"><span>02</span>Set the outcomes</a>
            <a href="#technology-documentation"><span>03</span>Plan the build</a>
          </nav>
          <section class="draft-preview">
            <div class="eyebrow">
              <pl-icon name="spark" [size]="15" />EVALUATION PREVIEW
            </div>
            <h3>Draft readiness</h3>
            <p>Draft keyword coverage</p>
            <div class="draft-score">
              {{ coverage()
              }}<span>/ {{ criteria()?.criteria?.length ?? 10 }} criteria</span>
            </div>
            <div class="score-track">
              <span
                [style.width.%]="
                  (coverage() / (criteria()?.criteria?.length || 10)) * 100
                "
              ></span>
            </div>
            <small
              >Provisional coverage. Final evaluation runs on submit.</small
            >
            <div class="draft-completion">
              <span>Proposal completeness</span
              ><strong>{{ completion() }}%</strong>
            </div>
            <div class="score-track">
              <span [style.width.%]="completion()"></span>
            </div>
          </section>
          @if (criteria(); as c) {
            <div class="aside-block">
              <div class="eyebrow">ACTIVE COHORT THEME</div>
              <h3>{{ c.theme }}</h3>
              <p>One shared direction. {{ c.criteria.length }} evaluation criteria.</p>
              <a routerLink="/criteria" class="text-link"
                >Read the full criteria<pl-icon name="external" [size]="15"
              /></a>
            </div>
            <div class="aside-block">
              <h3>Aim for {{ c.reviewThreshold }}% or above</h3>
              <p>
                Matching enough criteria qualifies your idea for trainer review.
                Below the threshold, you can revise and try again.
              </p>
              <details class="criteria-disclosure"><summary>Explore all criteria<pl-icon name="chevron" [size]="16" /></summary><div class="mini-criteria">
                @for (item of c.criteria; track item.id) {
                  <div>
                    <pl-icon name="check" [size]="15" />{{ item.title }}
                  </div>
                }
              </div></details>
            </div>
          }
          @if (existing(); as s) {
            @if (s.evaluation.missingCriteria.length) {
              <div class="aside-block revision-hints">
                <h3>Room to strengthen your idea</h3>
                @for (item of s.evaluation.missingCriteria; track item.id) {
                  <p>
                    <strong>{{ item.title }}</strong
                    ><br />{{ item.description }}
                  </p>
                }
              </div>
            }
            @if (s.decisions.length) {
              <div class="aside-block">
                <h3>Latest trainer feedback</h3>
                <p class="preserve-text">{{ s.decisions[0].comments }}</p>
              </div>
            }
          }
          <div class="aside-footnote">
            <pl-icon name="info" [size]="17" />
            <p>
              Evaluation uses ProjectLens rules or optional Gemini AI, with a
              reliable rule-engine fallback. Explain capabilities honestly; the
              trainer makes the final decision.
            </p>
          </div>
        </aside>
      </div>
    }
  `,
})
export class SubmissionFormComponent {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  readonly editing = !!this.route.snapshot.paramMap.get("id");
  readonly existing = signal<Submission | null>(null);
  readonly technologies = signal<Technology[]>([]);
  readonly criteria = signal<CriteriaSet | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly error = signal("");
  readonly busy = signal(false);
  readonly form = this.fb.nonNullable.group({
    projectTitle: [
      "",
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
        this.nonWhitespace,
      ],
    ],
    problemStatement: [
      "",
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(1000),
        this.nonWhitespace,
      ],
    ],
    objectives: [
      "",
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(1000),
        this.nonWhitespace,
      ],
    ],
    technologyStack: this.fb.nonNullable.control<Technology[]>(
      [],
      [Validators.required, Validators.maxLength(40)],
    ),
    documentationLink: [
      "",
      [
        Validators.required,
        Validators.maxLength(2048),
        Validators.pattern(/^https?:\/\/[^\s]+$/i),
        this.urlValidator,
      ],
    ],
  });
  readonly draft = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  readonly completion = computed(() => {
    const d = this.draft();
    return Math.round(
      ([
        d.projectTitle?.trim(),
        d.problemStatement?.trim(),
        d.objectives?.trim(),
        d.technologyStack?.length,
        d.documentationLink?.trim(),
      ].filter(Boolean).length /
        5) *
        100,
    );
  });
  readonly coverage = computed(() => {
    const d = this.draft();
    const text =
      " " +
      [
        d.projectTitle,
        d.problemStatement,
        d.objectives,
        d.technologyStack?.map((t) => t.name).join(" "),
      ]
        .join(" ")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim() +
      " ";
    return (
      this.criteria()?.criteria.filter((c) =>
        c.keywords.some((k) =>
          text.includes(
            " " +
              k
                .normalize("NFKC")
                .toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, " ")
                .trim() +
              " ",
          ),
        ),
      ).length ?? 0
    );
  });
  constructor() {
    this.api
      .technologies()
      .subscribe({
        next: (t) => this.technologies.set(t),
        error: (e) => this.loadError.set(errorMessage(e)),
      });
    this.api.criteria().subscribe({
      next: (c) => this.criteria.set(c),
      error: (e) => this.loadError.set(errorMessage(e)),
    });
    if (this.editing) {
      this.api
        .submission(Number(this.route.snapshot.paramMap.get("id")))
        .subscribe({
          next: (s) => {
            if (!canRevise(s)) {
              this.loadError.set(
                "This idea is already under review or approved.",
              );
            } else {
              this.existing.set(s);
              this.form.patchValue(s);
            }
            this.loading.set(false);
          },
          error: (e) => {
            this.loadError.set(errorMessage(e));
            this.loading.set(false);
          },
        });
    } else {
      this.api.mine().subscribe({
        next: (list) => {
          if (list.length) {
            this.loadError.set(
              "Your pod already has an idea. Open its evaluation to revise it when required.",
            );
          }
          this.loading.set(false);
        },
        error: (e) => {
          this.loadError.set(errorMessage(e));
          this.loading.set(false);
        },
      });
    }
  }
  private nonWhitespace(control: import("@angular/forms").AbstractControl) {
    return typeof control.value === "string" &&
      control.value.trim().length === 0
      ? { whitespace: true }
      : null;
  }
  private urlValidator(control: import("@angular/forms").AbstractControl) {
    try {
      const url = new URL(control.value);
      return ["http:", "https:"].includes(url.protocol) &&
        url.hostname &&
        !url.username &&
        !url.password
        ? null
        : { url: true };
    } catch {
      return { url: true };
    }
  }
  invalid(field: keyof typeof this.form.controls) {
    const c = this.form.controls[field];
    return c.touched && c.invalid;
  }
  retry() {
    window.location.reload();
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.error.set("");
    this.busy.set(true);
    const data = {
      ...this.form.getRawValue(),
      version: this.existing()?.version,
    };
    const request = this.editing
      ? this.api.revise(this.existing()!.id, data)
      : this.api.submit(data);
    request.subscribe({
      next: (s) => {
        this.busy.set(false);
        this.toast.show(
          s.status === "NEEDS_IMPROVEMENT"
            ? "Idea saved. Review the missing criteria and refine your proposal."
            : "Evaluation complete. Your idea qualified for trainer review.",
          s.status === "NEEDS_IMPROVEMENT" ? "warning" : "success",
        );
        void this.router.navigate(["/submissions", s.id]);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
        this.toast.show(errorMessage(e), "error");
      },
    });
  }
}
