import { RevealDirective } from "../reveal.directive";
import { SkeletonComponent } from "../skeleton.component";
import { Component, inject, signal } from "@angular/core";
import { ApiService, errorMessage } from "../core";
import { CriteriaSet } from "../models";
import { IconComponent } from "../icon.component";
@Component({
  selector: "pl-criteria",
  standalone: true,
  imports: [RevealDirective, IconComponent, SkeletonComponent],
  template: `
    <div class="page-heading">
      <div>
        <div class="eyebrow">COHORT / EVALUATION RUBRIC</div>
        <h1>Cohort criteria</h1>
        <p>The capabilities and learning objectives used to evaluate every proposal.</p>
      </div>
      <span class="count-pill"
        ><pl-icon name="lock" [size]="13" />Read-only</span
      >
    </div>
    @if (loading()) {
      <pl-skeleton />
    } @else if (error()) {
      <div class="panel empty-state" role="alert">
        <p>{{ error() }}</p>
        <button class="btn btn-primary" (click)="load()">Try again</button>
      </div>
    }
    @if (!loading() && !error() && data(); as c) {
      <div class="rubric-layout"><aside class="rubric-context"><section class="theme-overview" plReveal>
        <div>
          <div class="eyebrow">ACTIVE THEME</div>
          <h2>{{ c.theme }}</h2>
          <p>
            Build an enterprise application that connects a real-world problem
            with a secure full-stack solution and useful intelligent assistance.
          </p>
          <span class="theme-active"
            ><span class="live-dot"></span>{{ c.criteria.length }} active
            evaluation criteria</span
          >
        </div>
        <div class="threshold-display">
          <strong>{{ c.reviewThreshold }}<span>%</span></strong>
          <p>alignment needed<br />for trainer review</p>
        </div>
      </section></aside><div class="rubric-main">
      <div class="criteria-page-heading">
        <h2>What a well-aligned idea includes</h2>
        <p>
          In the rule engine, each criterion carries equal weight. Matching at
          least one listed keyword or phrase earns that criterion’s share of the
          score.
        </p>
      </div>
      <div class="criteria-grid">
        @for (item of c.criteria; track item.id; let i = $index) {
          <details class="rubric-entry" [open]="i === 0" plReveal>
            <summary><span class="criterion-index">{{ (i + 1).toString().padStart(2, "0") }}</span><h3>{{ item.title }}</h3><span class="criterion-weight">{{ (100 / c.criteria.length).toFixed(0) }}% weight</span><pl-icon name="chevron" [size]="18" /></summary>
            <div class="rubric-body"><div class="criterion-content"><p>{{ item.description }}</p><div class="keyword-list">@for (k of item.keywords; track k) { <span>{{ k }}</span> }</div></div><div class="learning-objective"><span>LEARNING OBJECTIVE</span>{{ item.learningObjective }}<small class="criterion-weight">{{ (100 / c.criteria.length).toFixed(0) }}% of rule-based score</small></div></div>
          </details>
        }
      </div>
      <div class="criteria-explanation">
        <pl-icon name="info" [size]="20" />
        <div>
          <h3>How the evaluation works</h3>
          <p>
            In rule mode, your project title, problem, objectives, and stack are
            normalized and checked against the keywords above. Score = matched
            criteria ÷ active criteria × 100. Ideas below
            {{ c.reviewThreshold }}% return to the Pod Lead for revision.
          </p>
          <p>
            Cross-pod overlap uses meaningful shared terms: medium at
            {{ (c.overlapMedium * 100).toFixed(0) }}% similarity, high at
            {{ (c.overlapHigh * 100).toFixed(0) }}%. Optional Gemini AI
            evaluates the same criteria. The review threshold always applies,
            and the trainer makes the final decision.
          </p>
        </div>
      </div></div></div>
    }
  `,
})
export class CriteriaComponent {
  private api = inject(ApiService);
  readonly data = signal<CriteriaSet | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set("");
    this.api.criteria().subscribe({
      next: (c) => {
        this.data.set(c);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
