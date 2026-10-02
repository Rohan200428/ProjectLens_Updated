import { Routes } from "@angular/router";
import { authGuard } from "./core";
import { LoginComponent } from "./pages/login.component";
import { ShellComponent } from "./shell.component";
import { DashboardComponent } from "./pages/dashboard.component";
import { SubmissionFormComponent } from "./pages/submission-form.component";
import { DetailComponent } from "./pages/detail.component";
import { CriteriaComponent } from "./pages/criteria.component";
import { NotificationsComponent } from "./pages/notifications.component";
import { ProfileComponent } from "./pages/profile.component";
export const routes: Routes = [
  { path: "login", component: LoginComponent },
  {
    path: "",
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: "trainer/dashboard",
        component: DashboardComponent,
        data: { roles: ["TRAINER"], mode: "dashboard" },
      },
      {
        path: "trainer/submissions",
        component: DashboardComponent,
        data: { roles: ["TRAINER"], mode: "submissions" },
      },
      {
        path: "trainer/reviews",
        component: DashboardComponent,
        data: { roles: ["TRAINER"], mode: "reviews" },
      },
      {
        path: "pod/dashboard",
        component: DashboardComponent,
        data: { roles: ["POD_LEAD", "POD_MEMBER"], mode: "dashboard" },
      },
      {
        path: "pod/submissions",
        component: DashboardComponent,
        data: { roles: ["POD_LEAD", "POD_MEMBER"], mode: "submissions" },
      },
      {
        path: "pod/new",
        component: SubmissionFormComponent,
        data: { roles: ["POD_LEAD"] },
      },
      {
        path: "pod/submissions/:id/edit",
        component: SubmissionFormComponent,
        data: { roles: ["POD_LEAD"] },
      },
      { path: "submissions/:id", component: DetailComponent },
      {
        path: "reviews/:id",
        component: DetailComponent,
        data: { roles: ["TRAINER"] },
      },
      { path: "criteria", component: CriteriaComponent },
      { path: "notifications", component: NotificationsComponent },
      { path: "profile", component: ProfileComponent },
      { path: "", pathMatch: "full", redirectTo: "login" },
    ],
  },
  { path: "**", redirectTo: "login" },
];
