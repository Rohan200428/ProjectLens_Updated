import { Injectable, inject, signal } from "@angular/core";
import {
  HttpClient,
  HttpInterceptorFn,
  HttpErrorResponse,
} from "@angular/common/http";
import { Router, CanActivateFn } from "@angular/router";
import { catchError, throwError, tap } from "rxjs";
import {
  Session,
  User,
  Submission,
  SubmissionRequest,
  Decision,
  Dashboard,
  CriteriaSet,
  Notification,
  Role,
  Technology,
} from "./models";
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly session = signal<Session | null>(this.restore());
  get user(): User | null {
    return this.session()?.user ?? null;
  }
  get home(): string {
    return this.user?.role === "TRAINER"
      ? "/trainer/dashboard"
      : "/pod/dashboard";
  }
  valid(): boolean {
    const s = this.session();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  }
  login(email: string, password: string) {
    return this.http.post<Session>("/api/auth/login", { email, password }).pipe(
      tap((s) => {
        sessionStorage.setItem("projectlens.session", JSON.stringify(s));
        this.session.set(s);
      }),
    );
  }
  logout(expired = false) {
    sessionStorage.removeItem("projectlens.session");
    this.session.set(null);
    void this.router.navigateByUrl(
      expired ? "/login?reason=expired" : "/login",
    );
  }
  private restore(): Session | null {
    try {
      const value = JSON.parse(
        sessionStorage.getItem("projectlens.session") ?? "null",
      ) as Session | null;
      if (
        value &&
        value.token &&
        value.user &&
        Date.parse(value.expiresAt) > Date.now()
      )
        return value;
    } catch {}
    sessionStorage.removeItem("projectlens.session");
    return null;
  }
}
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService),
    router = inject(Router);
  if (!auth.valid()) {
    auth.logout();
    return router.createUrlTree(["/login"]);
  }
  const roles = route.data["roles"] as Role[] | undefined;
  return roles && !roles.includes(auth.user!.role)
    ? router.parseUrl(auth.home)
    : true;
};
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const s = auth.session();
  const api = request.url.startsWith("/api/");
  if (api && s && !request.url.endsWith("/auth/login"))
    request = request.clone({
      setHeaders: { Authorization: "Bearer " + s.token },
    });
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (api && error.status === 401 && !request.url.endsWith("/auth/login"))
        auth.logout(true);
      return throwError(() => error);
    }),
  );
};
@Injectable({ providedIn: "root" })
export class ApiService {
  private http = inject(HttpClient);
  readonly unreadNotifications = signal(0);
  dashboard(trainer: boolean) {
    return this.http.get<Dashboard>(
      "/api/dashboard/" + (trainer ? "trainer" : "pod"),
    );
  }
  reviews() {
    return this.http.get<Submission[]>("/api/reviews");
  }
  mine() {
    return this.http.get<Submission[]>("/api/submissions/my");
  }
  submission(id: number, review = false) {
    return this.http.get<Submission>(
      (review ? "/api/reviews/" : "/api/submissions/") + id,
    );
  }
  submit(data: SubmissionRequest) {
    return this.http.post<Submission>("/api/submissions", data);
  }
  revise(id: number, data: SubmissionRequest) {
    return this.http.post<Submission>(
      "/api/submissions/" + id + "/resubmit",
      data,
    );
  }
  decide(id: number, decision: Decision, comments: string, version: number) {
    return this.http.post<Submission>("/api/reviews/" + id + "/decision", {
      decision,
      comments,
      version,
    });
  }
  technologies() {
    return this.http.get<Technology[]>("/api/technologies");
  }
  criteria() {
    return this.http.get<CriteriaSet>("/api/criteria");
  }
  notifications() {
    return this.http
      .get<Notification[]>("/api/notifications")
      .pipe(
        tap((items) =>
          this.unreadNotifications.set(items.filter((n) => !n.read).length),
        ),
      );
  }
  readNotification(id: number) {
    return this.http
      .patch<Notification>("/api/notifications/" + id + "/read", {})
      .pipe(
        tap(() => this.unreadNotifications.update((n) => Math.max(0, n - 1))),
      );
  }
  profile() {
    return this.http.get<User>("/api/auth/me");
  }
}
@Injectable({ providedIn: "root" })
export class ToastService {
  readonly message = signal("");
  readonly type = signal<"success" | "warning" | "error" | "info">("success");
  private timer?: ReturnType<typeof setTimeout>;
  show(
    message: string,
    type: "success" | "warning" | "error" | "info" = "success",
  ) {
    this.type.set(type);
    clearTimeout(this.timer);
    this.message.set(message);
    this.timer = setTimeout(() => this.message.set(""), 5000);
  }
}
export function errorMessage(e: unknown): string {
  const error = e as HttpErrorResponse;
  return error.status === 0
    ? "Cannot reach ProjectLens. Check that the backend is running and try again."
    : (error.error?.message ?? "Something went wrong. Please try again.");
}
export function label(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" ");
}
export function canRevise(s: Submission): boolean {
  return ["NEEDS_IMPROVEMENT", "NEEDS_REVISION", "REJECTED"].includes(s.status);
}
