package com.mfrp.plens.config;

import com.mfrp.plens.model.*;
import com.mfrp.plens.repository.*;
import com.mfrp.plens.service.*;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final PodRepository pods;
    private final CohortCriteriaRepository criteria;
    private final ProjectSubmissionRepository submissions;
    private final TrainerDecisionRepository decisions;
    private final PasswordEncoder passwords;
    private final EvaluationService evaluations;
    private final NotificationService notifications;
    private final ProjectLensProperties properties;

    public DataSeeder(
            UserRepository users,
            PodRepository pods,
            CohortCriteriaRepository criteria,
            ProjectSubmissionRepository submissions,
            TrainerDecisionRepository decisions,
            PasswordEncoder passwords,
            EvaluationService evaluations,
            NotificationService notifications,
            ProjectLensProperties properties) {
        this.users = users;
        this.pods = pods;
        this.criteria = criteria;
        this.submissions = submissions;
        this.decisions = decisions;
        this.passwords = passwords;
        this.evaluations = evaluations;
        this.notifications = notifications;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!properties.isSeedEnabled() || users.count() != 0) return;
        criterion(
                "Angular interface",
                "Build a structured web interface with accessible navigation.",
                "Develop a component-based frontend.",
                "angular");
        criterion(
                "Spring Boot backend",
                "Use a Java service to implement business logic.",
                "Build services with Spring Boot.",
                "spring boot");
        criterion(
                "REST integration",
                "Connect the frontend and backend through a REST API.",
                "Design clear HTTP resources.",
                "rest api",
                "restful",
                "rest");
        criterion(
                "Persistent data",
                "Store structured application data in a relational database.",
                "Model relationships and durable data.",
                "mysql",
                "relational database",
                "sql");
        criterion(
                "Secure access",
                "Authenticate users and enforce role-based permissions.",
                "Protect resources and user data.",
                "authentication",
                "jwt",
                "role based",
                "security");
        criterion(
                "Intelligent assistance",
                "Provide explainable evaluation or useful intelligent automation.",
                "Apply an AI-inspired analysis technique.",
                "ai",
                "rule based",
                "machine learning",
                "intelligent",
                "automated analysis");
        criterion(
                "Actionable insights",
                "Show analytics, meaningful measurements, or clear reporting.",
                "Turn application data into decisions.",
                "analytics",
                "dashboard",
                "reporting",
                "metrics");
        criterion(
                "Reliable input",
                "Validate user input and handle errors clearly.",
                "Prevent invalid data and communicate failures.",
                "validation",
                "validate",
                "error handling");
        criterion(
                "Verification",
                "Include automated tests with measurable acceptance outcomes.",
                "Verify core business flows.",
                "testing",
                "tests",
                "junit",
                "automated tests");
        criterion(
                "Supporting documentation",
                "Explain the approach, architecture, and measurable objectives.",
                "Communicate the project design.",
                "documentation",
                "document",
                "architecture",
                "readme");
        User trainer = user("Maya Rao", "trainer@projectlens.com", Role.TRAINER, null);
        String[] names = {
            "Pod Atlas", "Pod Forge", "Pod Canopy", "Pod Orbit", "Pod Terra", "Pod Nova"
        };
        String[] leads = {
            "Aarav Shah", "Isha Mehta", "Rohan Das", "Diya Nair", "Kabir Sen", "Ananya Iyer"
        };
        List<User> leadUsers = new ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            Pod p = new Pod();
            p.setName(names[i]);
            pods.save(p);
            leadUsers.add(user(leads[i], "lead" + (i + 1) + "@projectlens.com", Role.POD_LEAD, p));
            user("Member " + (i + 1), "member" + (i + 1) + "@projectlens.com", Role.POD_MEMBER, p);
        }
        String codeProblem =
                "Engineering mentors spend hours reviewing student code. An AI code reviewer"
                    + " evaluates repository changes, identifies code issues and suggests focused"
                    + " improvements.";
        String codeObjectives =
                "Provide automated analysis of code, authentication for mentors, analytics on"
                        + " recurring issues, validation of repositories and JUnit tests. Include"
                        + " architecture documentation and REST API integration.";
        seed(
                leadUsers.get(0),
                "Campus noticeboard",
                "Students miss classroom announcements across scattered channels.",
                "Centralize announcements and improve communication for students.",
                "Angular, MySQL",
                null,
                null,
                trainer);
        seed(
                leadUsers.get(1),
                "AI Code Reviewer",
                codeProblem,
                codeObjectives,
                "Angular, Spring Boot, MySQL",
                Decision.NEEDS_REVISION,
                "Strong cohort alignment. Differentiate the repository analysis from Pod Orbit and"
                        + " define review accuracy targets.",
                trainer);
        seed(
                leadUsers.get(2),
                "ResourceGuard",
                "Laboratory energy meters collect electricity readings without revealing waste."
                    + " Facilities teams need to detect overnight consumption, forecast demand and"
                    + " prioritize maintenance.",
                "Provide automated analysis of energy usage with authentication for facilities"
                    + " teams, analytics on recurring issues, validation and JUnit tests. Include"
                    + " architecture documentation and REST API integration. Reduce idle"
                    + " consumption by 15 percent through intelligent forecasting.",
                "Angular, Spring Boot, MySQL",
                Decision.APPROVED,
                "Clear problem and measurable objectives. Proceed with a small pilot using the"
                        + " laboratory meter dataset.",
                trainer);
        seed(
                leadUsers.get(3),
                "Repository Review Assistant",
                codeProblem,
                codeObjectives,
                "Angular, Spring Boot, MySQL",
                null,
                null,
                trainer);
        seed(
                leadUsers.get(4),
                "Local Harvest Exchange",
                "Small growers lose surplus produce while neighborhood kitchens struggle to find"
                        + " affordable fresh ingredients. A harvest exchange matches pickup windows"
                        + " with seasonal supply.",
                "Record listings and pickup schedules. Use role based authentication, a REST API,"
                    + " validate quantity inputs, test reservation conflicts and write architecture"
                    + " documentation.",
                "Angular, Spring Boot, MySQL",
                Decision.REJECTED,
                "The proposed scope needs clearer intelligent assistance and measurable community"
                        + " outcomes. Reconsider the concept before resubmitting.",
                trainer);
        // Refresh cross-pod similarities after all sample ideas exist. Keep the seeded trainer
        // outcomes.
        for (ProjectSubmission s : submissions.findAll()) {
            SubmissionStatus status = s.getStatus();
            evaluations.evaluate(s);
            s.setStatus(status);
            submissions.saveAndFlush(s);
        }
    }

    private void criterion(String title, String description, String objective, String... keywords) {
        var c = new CohortCriteria();
        c.setTitle(title);
        c.setDescription(description);
        c.setLearningObjective(objective);
        c.setKeywords(new ArrayList<>(Arrays.asList(keywords)));
        criteria.save(c);
    }

    private User user(String name, String email, Role role, Pod pod) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setRole(role);
        u.setPod(pod);
        u.setPassword(passwords.encode(properties.getSeedPassword()));
        return users.save(u);
    }

    private void seed(
            User lead,
            String title,
            String problem,
            String objectives,
            String stack,
            Decision decision,
            String comments,
            User trainer) {
        ProjectSubmission s = new ProjectSubmission();
        s.setPod(lead.getPod());
        s.setSubmittedBy(lead);
        s.setProjectTitle(title);
        s.setProblemStatement(problem);
        s.setObjectives(objectives);
        s.setTechnologyStack(stack);
        s.setTechnologies(
                new java.util.ArrayList<>(
                        com.mfrp.plens.service.TechnologyCatalog.fromLegacy(stack)));
        s.setDocumentationLink(
                "https://example.com/projectlens/"
                        + lead.getPod().getName().toLowerCase().replace(' ', '-'));
        s.setSubmissionDate(Instant.now());
        s.setStatus(SubmissionStatus.ANALYZING);
        submissions.saveAndFlush(s);
        evaluations.evaluate(s);
        notifications.pod(
                s,
                s.getStatus() == SubmissionStatus.PENDING_REVIEW
                        ? "Idea qualified for review"
                        : "Your idea needs improvement",
                s.getStatus() == SubmissionStatus.PENDING_REVIEW
                        ? "Your project idea has qualified for trainer review."
                        : "Your project idea needs improvement. Please revise and resubmit.");
        if (s.getStatus() == SubmissionStatus.PENDING_REVIEW) notifications.trainers(s);
        if (decision != null && s.getStatus() == SubmissionStatus.PENDING_REVIEW) {
            TrainerDecision d = new TrainerDecision();
            d.setSubmission(s);
            d.setDecision(decision);
            d.setComments(comments);
            d.setDecidedBy(trainer);
            d.setDecidedAt(Instant.now());
            decisions.save(d);
            s.setStatus(SubmissionStatus.valueOf(decision.name()));
            submissions.saveAndFlush(s);
            notifications.pod(s, "Trainer feedback is available", comments);
        }
    }
}
