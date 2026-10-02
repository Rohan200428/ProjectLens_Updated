import { Component, inject, signal } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from "@angular/router";
import { AuthService, ApiService } from "./core";
import { IconComponent } from "./icon.component";
@Component({
  selector: "pl-shell",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: "./shell.component.html",
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly navigationExpanded = signal(false);
  private api = inject(ApiService);
  readonly unread = this.api.unreadNotifications;
  constructor() {
    this.api.notifications().subscribe({ error: () => {} });
  }
  get pageName() {
    const path = this.router.url.split("?")[0];
    if (path.endsWith("/dashboard")) return "Overview";
    if (path === "/criteria") return "Cohort criteria";
    if (path === "/notifications") return "Notifications";
    if (path === "/profile") return "Account";
    if (path === "/pod/new") return "New submission";
    if (path.endsWith("/edit")) return "Revise submission";
    if (path === "/trainer/reviews") return "Review queue";
    if (path.endsWith("/submissions")) return "Submissions";
    return path.startsWith("/reviews/") ? "Trainer review" : "Evaluation";
  }
  get initials() {
    return (
      this.auth.user?.name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("") ?? ""
    );
  }
  get roleName() {
    return this.auth.user?.role === "TRAINER"
      ? "Trainer"
      : this.auth.user?.role === "POD_LEAD"
        ? "Pod lead"
        : "Pod member";
  }
  get navigation() {
    const trainer = this.auth.user?.role === "TRAINER";
    return [
      { name: "Dashboard", icon: "dashboard", path: this.auth.home },
      { name: "Cohort criteria", icon: "criteria", path: "/criteria" },
      {
        name: "Submissions",
        icon: "submissions",
        path: trainer ? "/trainer/submissions" : "/pod/submissions",
      },
      ...(trainer
        ? [{ name: "Reviews", icon: "reviews", path: "/trainer/reviews" }]
        : []),
      { name: "Notifications", icon: "bell", path: "/notifications" },
    ];
  }
}
