import { RevealDirective } from "../reveal.directive";
import { ScoreComponent } from "../score.component";
import { SkeletonComponent } from "../skeleton.component";
import {
  Component,
  inject,
  signal,
  afterNextRender,
  Injector,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { RouterLink, ActivatedRoute } from "@angular/router";
import {
  ApiService,
  AuthService,
  ToastService,
  errorMessage,
  label,
  canRevise,
} from "../core";
import { Submission, CriteriaSet, Decision } from "../models";
import { TechnologyChipsComponent } from "../technology-chips.component";
import { IconComponent } from "../icon.component";
@Component({
  selector: "pl-detail",
  standalone: true,
  imports: [RevealDirective, 
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IconComponent,
    TechnologyChipsComponent,
    SkeletonComponent,
    ScoreComponent,
  ],
  template: `
    <a [routerLink]="auth.home" class="back-link"
      ><pl-icon name="back" [size]="16" />Back to dashboard</a
    >
    @if (loading()) {
      <pl-skeleton />
    } @else if (error() && !submission()) {
      <div class="panel empty-state" role="alert">
        <pl-icon name="info" [size]="30" />
        <h2>We couldn’t open this idea</h2>
        <p>{{ error() }}</p>
        <button class="btn btn-primary" (click)="load()">Try again</button>
      </div>
    }
    @if (!loading() && submission(); as s) {
      <div class="page-heading detail-heading">
        <div>
          <div class="eyebrow">
            {{ s.podName }} ·
            {{ trainer ? "TRAINER REVIEW" : "PROJECT EVALUATION" }}
          </div>
          <h1>{{ s.projectTitle }}</h1>
          <p>
            Submitted by {{ s.submittedBy }} <span class="mx-2">·</span>
            {{ s.submissionDate | date: "d MMM yyyy, h:mm a" }}
          </p>
        </div>
        <div class="evaluation-state">
          <span class="badge large" [attr.data-status]="s.status">{{ label(s.status) }}</span>
          <span class="evaluation-provenance"><pl-icon [name]="s.evaluation.source === 'GEMINI' ? 'spark' : 'criteria'" [size]="14" />{{ s.evaluation.source === 'GEMINI' ? 'Gemini evaluation' : 'ProjectLens rule engine' }}</span>
        </div>
      </div>
      @if (s.status === "NEEDS_IMPROVEMENT") {
        <div class="revision-banner">
          <pl-icon name="info" [size]="21" />
          <div>
            <strong>Your idea has room to grow.</strong>
            <p>
              Reach {{ criteria()?.reviewThreshold }}% alignment to qualify for
              trainer review. Use the missing criteria below to guide your
              revision.
            </p>
          </div>
          @if (auth.user?.role === "POD_LEAD") {
            <a
              class="btn btn-secondary"
              [routerLink]="['/pod/submissions', s.id, 'edit']"
              >Revise idea<pl-icon name="arrow" [size]="16"
            /></a>
          }
        </div>
      }
      @if (s.status === "NEEDS_REVISION" || s.status === "REJECTED") {
        <div class="revision-banner">
          <pl-icon name="reviews" [size]="21" />
          <div>
            <strong>{{
              s.status === "NEEDS_REVISION"
                ? "Your trainer has requested a revision."
                : "Your trainer has rejected this proposal."
            }}</strong>
            <p>Read the feedback below before reworking your idea.</p>
          </div>
          @if (auth.user?.role === "POD_LEAD") {
            <a
              class="btn btn-secondary"
              [routerLink]="['/pod/submissions', s.id, 'edit']"
              >Revise & resubmit</a
            >
          }
        </div>
      }
      <div class="review-workbench"><aside class="insight-rail"><div class="evaluation-summary" plReveal>
        <section class="alignment-summary">
          <div>
            <div class="eyebrow">COHORT ALIGNMENT</div>
            <pl-score
              [value]="s.alignmentScore"
              [threshold]="criteria()?.reviewThreshold ?? 70"
            />
            <strong>{{
              s.alignmentScore >= (criteria()?.reviewThreshold ?? 70)
                ? "Qualified for trainer review"
                : "Below review threshold"
            }}</strong>
          </div>
          <div class="alignment-context">
            <div class="evidence-dots" aria-label="Matched and missing criteria">@for (c of s.evaluation.matchedCriteria; track c.id) { <span class="matched" [title]="c.title + ': matched'"></span> } @for (c of s.evaluation.missingCriteria; track c.id) { <span [title]="c.title + ': missing'"></span> }</div>
            <div class="score-track">
              <span [style.width.%]="s.alignmentScore"></span>
            </div>
            <p>
              {{ s.evaluation.matchedCriteria.length }} of
              {{
                s.evaluation.matchedCriteria.length +
                  s.evaluation.missingCriteria.length
              }}
              criteria matched
            </p>
            <small
              >{{ criteria()?.reviewThreshold }}% minimum for trainer
              review</small
            >
          </div>
        </section>
        <section class="overlap-summary" [class.flagged]="s.overlapFlag">
          <div class="eyebrow">CROSS-POD OVERLAP</div>
          <div class="overlap-summary-heading">
            <pl-icon name="flag" [size]="21" />
            <h3>{{ label(s.overlapLevel) }} overlap</h3>
            <span class="count-pill"
              >{{ s.evaluation.similarity | number: "1.0-1" }}% similarity</span
            >
          </div>
<div class="overlap-meter" [attr.aria-label]="s.evaluation.similarity + ' percent cross-pod similarity'"><span [style.width.%]="s.evaluation.similarity"></span></div><p>{{ s.evaluation.overlapDetails }}</p>
          <small
            >Jaccard similarity of meaningful terms. Own-pod ideas are
            excluded.</small
          >
        </section>
      </div>
      </aside><div class="review-body"><div class="detail-tabs" role="tablist" aria-label="Evaluation sections">
        @for (item of tabs; track item.id; let i = $index) {
          <button
            role="tab"
            [attr.aria-selected]="tab() === item.id"
            [attr.aria-controls]="item.id + '-panel'"
            [id]="item.id + '-tab'"
            [attr.tabindex]="tab() === item.id ? 0 : -1"
            [class.active]="tab() === item.id"
            (click)="tab.set(item.id)"
            (keydown)="navigateTabs($event, i)"
          >
            {{ item.title }}
            @if (item.id === "history") {
              <span>{{ s.decisions.length }}</span>
            }
          </button>
        }
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          @if (tab() === "analysis") {
            <section
              id="analysis-panel"
              role="tabpanel"
              aria-labelledby="analysis-tab"
              class="panel criteria-analysis"
              animate.enter="panel-enter"
            >
              <div class="section-heading">
                <div>
                  <h2>Matched criteria</h2>
                  <p>
                    {{
                      s.evaluation.source === "GEMINI"
                        ? "Semantic assessment against the active cohort criteria."
                        : "Keyword evidence from the ProjectLens rule engine."
                    }}
                  </p>
                </div>
                <span class="count-pill"
                  >{{ s.evaluation.matchedCriteria.length }} matched</span
                >
              </div>
              @for (c of s.evaluation.matchedCriteria; track c.id) {
                <div class="criterion-row">
                  <span class="criterion-check"
                    ><pl-icon name="check" [size]="16"
                  /></span>
                  <div>
                    <h3>{{ c.title }}</h3>
                    <p>{{ c.description }}</p>
                    <div class="keyword-list">
                      @for (k of c.matchedKeywords; track k) {
                        <span class="matched-keyword">{{ k }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
              @if (!s.evaluation.matchedCriteria.length) {
                <p class="muted p-6">
                  No criteria matched yet. Review the missing criteria to
                  strengthen your proposal.
                </p>
              }
              <div class="section-heading missing-heading">
                <div>
                  <h2>Missing criteria</h2>
                  <p>
                    {{
                      s.evaluation.missingCriteria.length
                        ? "Add clear plans for these capabilities."
                        : "Your proposal covers every active criterion."
                    }}
                  </p>
                </div>
                <span class="count-pill"
                  >{{ s.evaluation.missingCriteria.length }} missing</span
                >
              </div>
              @for (c of s.evaluation.missingCriteria; track c.id) {
                <div class="criterion-row missing-row">
                  <span class="criterion-missing"
                    ><pl-icon name="plus" [size]="16"
                  /></span>
                  <div>
                    <h3>{{ c.title }}</h3>
                    <p>{{ c.description }}</p>
                    <div class="keyword-list">
                      @for (k of c.keywords; track k) {
                        <span>{{ k }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
              <div class="scoring-note">
                <pl-icon name="info" [size]="17" />
                <p>
                  {{ s.evaluation.scoringExplanation }}<br /><strong>{{
                    s.evaluation.source === "GEMINI"
                      ? "Evaluated using Gemini AI"
                      : "Evaluated using ProjectLens Rule Engine"
                  }}</strong
                  ><br />Evaluated
                  {{ s.evaluation.evaluatedAt | date: "d MMM yyyy, h:mm a" }}.
                </p>
              </div>
            </section>
            @if (s.evaluation.sharedTerms.length) {
              <section class="panel shared-terms">
                <h3>Terms shared with the closest idea</h3>
                <p class="muted text-sm">
                  Similar vocabulary is a signal for review; it does not prove
                  duplicate scope.
                </p>
                <div class="keyword-list">
                  @for (term of s.evaluation.sharedTerms; track term) {
                    <span>{{ term }}</span>
                  }
                </div>
              </section>
            }
          }
          @if (tab() === "proposal") {
            <section
              id="proposal-panel"
              role="tabpanel"
              aria-labelledby="proposal-tab"
              class="panel proposal-panel"
              animate.enter="panel-enter"
            >
              <div class="proposal-section">
                <div class="eyebrow">THE PROBLEM</div>
                <h2>What the pod wants to solve</h2>
                <p class="preserve-text">{{ s.problemStatement }}</p>
              </div>
              <div class="proposal-section">
                <div class="eyebrow">THE OBJECTIVES</div>
                <h2>What success looks like</h2>
                <p class="preserve-text">{{ s.objectives }}</p>
              </div>
              <div class="proposal-section">
                <div class="eyebrow">TECHNOLOGY STACK</div>
                <pl-technology-chips [items]="s.technologyStack" />
              </div>
              <div class="proposal-section">
                <div class="eyebrow">SUPPORTING DOCUMENTATION</div>
                <a
                  [href]="s.documentationLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-link break-all"
                  >{{ s.documentationLink
                  }}<pl-icon name="external" [size]="17"
                /></a>
              </div>
            </section>
          }
          @if (tab() === "history") {
            <section
              id="history-panel"
              role="tabpanel"
              aria-labelledby="history-tab"
              class="panel history-panel"
              animate.enter="panel-enter"
            >
              <div class="section-heading">
                <div>
                  <h2>Trainer decision history</h2>
                  <p>Feedback stays with your idea through every revision.</p>
                </div>
              </div>
              @if (!s.decisions.length) {
                <div class="empty-state">
                  <pl-icon name="clock" [size]="28" />
                  <h3>No trainer decisions yet</h3>
                  <p>
                    {{
                      s.status === "NEEDS_IMPROVEMENT"
                        ? "Improve your alignment to enter the review queue."
                        : "Your idea is waiting for trainer review."
                    }}
                  </p>
                </div>
              }
              @for (d of s.decisions; track d.id) {
                <article class="decision-history">
                  <div class="flex items-center justify-between gap-3">
                    <span class="badge" [attr.data-status]="d.decision">{{
                      label(d.decision)
                    }}</span
                    ><small class="muted">{{
                      d.decidedAt | date: "d MMM yyyy, h:mm a"
                    }}</small>
                  </div>
                  <blockquote class="preserve-text">
                    {{ d.comments }}
                  </blockquote>
                  <div class="history-author">
                    <span class="avatar">{{ d.trainerName.slice(0, 1) }}</span>
                    <div>
                      <strong>{{ d.trainerName }}</strong
                      ><small>Trainer</small>
                    </div>
                  </div>
                </article>
              }
            </section>
          }
        </div>
        <aside class="detail-aside">
          @if (trainer && s.status === "PENDING_REVIEW") {
            <section class="panel decision-panel" plReveal>
              <div class="eyebrow">YOUR REVIEW</div>
              <h2>Record a decision</h2>
              <p>
                Consider the proposal, alignment evidence, and overlap before
                deciding.
              </p>
              <form [formGroup]="reviewForm">
                <label for="comments">Trainer comments <span>*</span></label
                ><textarea
                  id="comments"
                  formControlName="comments"
                  rows="6"
                  maxlength="3000"
                  placeholder="What works well? What should the pod improve? Include a concrete next step."
                  [class.invalid]="
                    reviewForm.controls.comments.touched &&
                    reviewForm.controls.comments.invalid
                  "
                ></textarea>
                @if (
                  reviewForm.controls.comments.touched &&
                  reviewForm.controls.comments.invalid
                ) {
                  <p class="field-error">
                    Add comments before recording a decision.
                  </p>
                }
                <span class="field-help"
                  >Visible to the Pod Lead and members.</span
                >
                <div class="decision-buttons">
                  <button
                    class="btn btn-primary"
                    type="button"
                    (click)="choose('APPROVED')"
                    [disabled]="busy()"
                  >
                    <pl-icon name="check" [size]="17" />Approve idea</button
                  ><button
                    class="btn btn-secondary"
                    type="button"
                    (click)="choose('NEEDS_REVISION')"
                    [disabled]="busy()"
                  >
                    <pl-icon name="edit" [size]="17" />Request revision</button
                  ><button
                    class="btn btn-danger"
                    type="button"
                    (click)="choose('REJECTED')"
                    [disabled]="busy()"
                  >
                    <pl-icon name="close" [size]="17" />Reject proposal
                  </button>
                </div>
              </form>
              @if (error()) {
                <div class="error-banner mt-4" role="alert">{{ error() }}</div>
              }
            </section>
          }
          @if (s.decisions.length) {
            <section class="panel feedback-panel" plReveal>
              <div class="eyebrow">LATEST TRAINER FEEDBACK</div>
              <span
                class="badge mt-3"
                [attr.data-status]="s.decisions[0].decision"
                >{{ label(s.decisions[0].decision) }}</span
              >
              <blockquote class="preserve-text">
                {{ s.decisions[0].comments }}
              </blockquote>
              <div class="feedback-author">
                {{ s.decisions[0].trainerName
                }}<small>{{
                  s.decisions[0].decidedAt | date: "d MMM yyyy"
                }}</small>
              </div>
              <p class="feedback-readonly">
                <pl-icon name="lock" [size]="13" />Read-only trainer comments
              </p>
            </section>
          }
          <section class="aside-block details-meta">
            <h3>Project at a glance</h3>
            <dl>
              <dt>Pod</dt>
              <dd>{{ s.podName }}</dd>
              <dt>Submitted by</dt>
              <dd>{{ s.submittedBy }}</dd>
              <dt>Technology</dt>
              <dd><pl-technology-chips [items]="s.technologyStack" /></dd>
              <dt>Last updated</dt>
              <dd>{{ s.updatedAt | date: "d MMM yyyy, h:mm a" }}</dd>
            </dl>
            <a
              [href]="s.documentationLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-link"
              >Open documentation<pl-icon name="external" [size]="15"
            /></a>
          </section>
          @if (
            !trainer &&
            auth.user?.role === "POD_LEAD" &&
            canRevise(s) &&
            s.status !== "NEEDS_IMPROVEMENT"
          ) {
            <a
              [routerLink]="['/pod/submissions', s.id, 'edit']"
              class="btn btn-primary w-full"
              >Revise & resubmit<pl-icon name="arrow" [size]="17"
            /></a>
          }
        </aside>
      </div></div></div>
    }
    @if (pendingDecision(); as decision) {
      <div
        class="modal-backdrop"
        animate.enter="modal-enter"
        animate.leave="modal-leave"
        (keydown.escape)="!busy() && dismissDecision()"
        (keydown)="trapFocus($event)"
        (click)="!busy() && dismissDecision()"
      >
        <section
          class="confirmation-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          (click)="$event.stopPropagation()"
        >
          <span class="empty-icon"><pl-icon name="reviews" [size]="26" /></span>
          <h2 id="confirm-title">
            {{
              decision === "APPROVED"
                ? "Approve this idea?"
                : decision === "NEEDS_REVISION"
                  ? "Request a revision?"
                  : "Reject this proposal?"
            }}
          </h2>
          <p>
            Your decision and comments will be saved and shared with the pod. A
            new review becomes available after a Pod Lead revision.
          </p>
          <div class="confirm-comments preserve-text">
            {{ reviewForm.controls.comments.value }}
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              class="btn btn-secondary"
              [disabled]="busy()"
              (click)="dismissDecision()"
            >
              Cancel</button
            ><button
              class="btn btn-primary"
              [disabled]="busy()"
              (click)="confirm()"
            >
              @if (busy()) {
                <span class="spinner"></span>Saving…
              } @else {
                Confirm decision
              }
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class DetailComponent {
  private readonly injector = inject(Injector);
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  readonly trainer = this.auth.user?.role === "TRAINER";
  readonly submission = signal<Submission | null>(null);
  readonly criteria = signal<CriteriaSet | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly busy = signal(false);
  readonly tab = signal("analysis");
  readonly pendingDecision = signal<Decision | null>(null);
  readonly label = label;
  readonly canRevise = canRevise;
  readonly tabs = [
    { id: "analysis", title: "Criteria analysis" },
    { id: "proposal", title: "Project proposal" },
    { id: "history", title: "Decision history" },
  ];
  navigateTabs(event: KeyboardEvent, index: number) {
    const destination = event.key === "ArrowRight" ? (index + 1) % this.tabs.length
      : event.key === "ArrowLeft" ? (index + this.tabs.length - 1) % this.tabs.length
      : event.key === "Home" ? 0 : event.key === "End" ? this.tabs.length - 1 : null;
    if (destination === null) return;
    event.preventDefault();
    const item = this.tabs[destination];
    this.tab.set(item.id);
    document.getElementById(item.id + "-tab")?.focus();
  }
  readonly reviewForm = this.fb.nonNullable.group({
    comments: [
      "",
      [
        Validators.required,
        Validators.maxLength(3000),
        (c: import("@angular/forms").AbstractControl) =>
          c.value?.trim() ? null : { whitespace: true },
      ],
    ],
  });
  constructor() {
    this.api
      .criteria()
      .subscribe({ next: (c) => this.criteria.set(c), error: () => {} });
    this.route.paramMap.subscribe(() => this.load());
  }
  load() {
    this.loading.set(true);
    this.error.set("");
    this.api
      .submission(Number(this.route.snapshot.paramMap.get("id")), this.trainer)
      .subscribe({
        next: (s) => {
          this.submission.set(s);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.toast.show(errorMessage(e), "error");
          this.loading.set(false);
        },
      });
  }
  private returnFocus?: HTMLElement;
  trapFocus(rawEvent: Event) {
    const event = rawEvent as KeyboardEvent;
    if (event.key !== "Tab") return;
    const items = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        ".confirmation-modal button:not(:disabled)",
      ),
    );
    const first = items[0],
      last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  dismissDecision() {
    this.pendingDecision.set(null);
    this.returnFocus?.focus();
  }
  choose(decision: Decision) {
    this.reviewForm.markAllAsTouched();
    if (this.reviewForm.valid) {
      this.returnFocus = document.activeElement as HTMLElement;
      this.pendingDecision.set(decision);
      afterNextRender(
        () =>
          document
            .querySelector<HTMLElement>(".confirmation-modal button")
            ?.focus(),
        { injector: this.injector },
      );
    }
  }
  confirm() {
    const s = this.submission(),
      d = this.pendingDecision();
    if (!s || !d || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.api
      .decide(
        s.id,
        d,
        this.reviewForm.controls.comments.value.trim(),
        s.version,
      )
      .subscribe({
        next: (s) => {
          this.submission.set(s);
          this.dismissDecision();
          this.busy.set(false);
          this.toast.show(
            "Decision saved. Your feedback has been shared with the pod.",
          );
          this.tab.set("history");
        },
        error: (e) => {
          this.busy.set(false);
          this.dismissDecision();
          this.error.set(errorMessage(e));
          this.toast.show(errorMessage(e), "error");
        },
      });
  }
}
