import { MetricComponent } from "../metric.component";
import { RevealDirective } from "../reveal.directive";
import { ScoreComponent } from "../score.component";
import { SkeletonComponent } from "../skeleton.component";
import { Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink, ActivatedRoute } from "@angular/router";
import {
  ApiService,
  AuthService,
  errorMessage,
  label,
  canRevise,
} from "../core";
import { Dashboard, Submission, Stats } from "../models";
import { TechnologyChipsComponent } from "../technology-chips.component";
import { IconComponent } from "../icon.component";

@Component({
  selector: "pl-dashboard",
  standalone: true,
  imports: [
    MetricComponent,
    RevealDirective,
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    TechnologyChipsComponent,
    ScoreComponent,
    SkeletonComponent,
  ],
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly search = signal("");
  readonly pod = signal("");
  readonly status = signal("");
  readonly overlap = signal("");
  readonly minScore = signal(0);
  readonly sort = signal("recent");
  readonly label = label;
  readonly canRevise = canRevise;
  readonly today = new Date();
  readonly trainer = this.auth.user?.role === "TRAINER";
  readonly mode = this.route.snapshot.data["mode"] as string;
  readonly page = signal(1);
  readonly pageSize = 8;
  readonly queue = computed(() =>
    (this.data()?.submissions ?? [])
      .filter((s) => s.status === "PENDING_REVIEW")
      .slice(0, 3),
  );
  readonly alerts = computed(() =>
    (this.data()?.submissions ?? [])
      .filter((s) => s.overlapFlag)
      .sort((a, b) => b.evaluation.similarity - a.evaluation.similarity)
      .slice(0, 3),
  );
  readonly distribution = computed(() =>
    [
      { label: "70–79%", min: 70, max: 80 },
      { label: "80–89%", min: 80, max: 90 },
      { label: "90–100%", min: 90, max: 101 },
    ].map((b) => ({
      ...b,
      count: (this.data()?.submissions ?? []).filter(
        (s) => s.alignmentScore >= b.min && s.alignmentScore < b.max,
      ).length,
    })),
  );
  readonly statusSegments = computed(() => {
    const stats = this.data()?.stats;
    return [
      { label: "Approved", count: stats?.approved ?? 0, color: "#21b39d" },
      {
        label: "Pending review",
        count: stats?.pendingReview ?? 0,
        color: "#7168f3",
      },
      {
        label: "Needs revision",
        count: stats?.needsRevision ?? 0,
        color: "#eca859",
      },
      { label: "Rejected", count: stats?.rejected ?? 0, color: "#e67286" },
    ];
  });
  readonly podNames = computed(() =>
    [...new Set(this.data()?.submissions.map((x) => x.podName) ?? [])].sort(),
  );
  readonly filtersActive = computed(
    () =>
      !!this.search() ||
      !!this.pod() ||
      !!this.status() ||
      !!this.overlap() ||
      !!this.minScore(),
  );
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    let list = (this.data()?.submissions ?? []).filter(
      (s) =>
        (!q ||
          (
            s.projectTitle +
            " " +
            s.podName +
            " " +
            s.technologyStack.map((t) => t.name).join(" ")
          )
            .toLowerCase()
            .includes(q)) &&
        (!this.pod() || s.podName === this.pod()) &&
        (!this.status() || s.status === this.status()) &&
        (!this.overlap() ||
          (this.overlap() === "FLAGGED"
            ? s.overlapFlag
            : s.overlapLevel === this.overlap())) &&
        s.alignmentScore >= this.minScore(),
    );
    return list.sort((a, b) =>
      this.sort() === "score-desc"
        ? b.alignmentScore - a.alignmentScore
        : this.sort() === "score-asc"
          ? a.alignmentScore - b.alignmentScore
          : this.sort() === "pod"
            ? a.podName.localeCompare(b.podName)
            : this.sort() === "status"
              ? a.status.localeCompare(b.status)
              : this.sort() === "overlap"
                ? { LOW: 0, MEDIUM: 1, HIGH: 2 }[b.overlapLevel] -
                  { LOW: 0, MEDIUM: 1, HIGH: 2 }[a.overlapLevel]
                : Date.parse(b.submissionDate) - Date.parse(a.submissionDate),
    );
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  readonly currentPage = computed(() =>
    Math.min(this.page(), this.pageCount()),
  );
  readonly paginated = computed(() =>
    this.filtered().slice(
      (this.currentPage() - 1) * this.pageSize,
      this.currentPage() * this.pageSize,
    ),
  );
  readonly previewId = signal<number | null>(null);
  readonly preview = computed<Submission | null>(() => this.paginated().find(s => s.id === this.previewId()) ?? this.paginated()[0] ?? null);
  selectPreview(id: number) {
    this.previewId.set(id);
    if (innerWidth < 1024) requestAnimationFrame(() => {
      const pane = document.querySelector<HTMLElement>('.project-preview');
      pane?.focus({ preventScroll: true });
      pane?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  }
  constructor() {
    if (this.mode === "reviews") this.status.set("PENDING_REVIEW");
    this.load();
  }
  get title() {
    return this.mode === "reviews"
      ? "The review queue"
      : this.mode === "submissions"
        ? "Project submissions"
        : this.trainer
          ? "Cohort overview"
          : "Your project workspace";
  }
  get subtitle() {
    return this.mode === "reviews"
      ? "Review the evidence, leave useful feedback, and help each pod move forward."
      : this.mode === "submissions"
        ? "Follow project alignment, overlap, and trainer decisions in one place."
        : this.trainer
          ? "A clear view of alignment, decisions, and the ideas ready for your attention."
          : "Track your pod’s progress from the first idea to trainer approval.";
  }
  load() {
    this.loading.set(true);
    this.error.set("");
    this.api.dashboard(this.trainer).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  resetFilters() {
    this.search.set("");
    this.pod.set("");
    this.status.set("");
    this.overlap.set("");
    this.minScore.set(0);
  }
}
