# Heartbeat Manager
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** October 20, 2026  
**Product Type:** Cloud Infrastructure Monitoring and Scheduled Health-Check Platform  
**Deployment Platform:** Cloudflare Workers  
**Target Integrations:** Supabase, Appwrite, and generic HTTP APIs  
**Primary Schedule:** Every Sunday at a configurable time  
**Document Status:** Ready for MVP planning and implementation

---

## 1. Product Overview

### 1.1 Purpose

Heartbeat Manager is a centralized web application that enables users to register, monitor, and manage multiple cloud-hosted projects through a single dashboard.

The system will execute scheduled heartbeat requests from Cloudflare Workers to configured Supabase projects, Appwrite projects, and other supported HTTP endpoints. These requests will help verify endpoint availability, detect connectivity issues, and reduce inactivity-related interruptions where periodic activity is supported by the relevant provider's policies.

Users will manage projects, heartbeat configurations, scheduling, deployment, and execution history through a clean administrative interface rather than manually editing Worker code.

### 1.2 Problem Statement

Developers frequently maintain several small applications using free-tier or low-cost cloud infrastructure. These applications may experience inactivity-related pausing, cold starts, or other availability issues, depending on the hosting provider and its policies.

Managing each project individually creates several problems:

- No centralized view of all registered cloud projects.
- Manual effort required to test project endpoints.
- Difficulty tracking whether scheduled requests executed successfully.
- No unified record of failures, response times, and past executions.
- Repeated code changes when adding new projects or APIs.
- Difficulty deploying and updating scheduled Worker programs.
- Limited visibility into the overall health of a portfolio of applications.

Heartbeat Manager addresses these issues through a single configurable dashboard and a centralized scheduled execution service.

**Important limitation:** A heartbeat does not guarantee that a project will never pause. The application must follow each provider's acceptable-use policies, and the dashboard must distinguish endpoint availability from the provider's actual project-running or suspension status.

---

## 2. Product Goals

The product should:

1. Execute configured heartbeat checks automatically every Sunday.
2. Support multiple Supabase and Appwrite projects.
3. Allow users to add, edit, enable, disable, and remove projects.
4. Provide a clean dashboard for project health and recent activity.
5. Allow authorized users to deploy and manage Cloudflare Workers from the UI.
6. Display all scheduled jobs, execution results, errors, and response times.
7. Maintain historical execution and administrative activity logs.
8. Support adding new projects and endpoint types without rewriting the Worker.
9. Store API credentials and deployment secrets securely.
10. Support future scheduling options without requiring an architectural redesign.

### 2.1 Non-goals

The initial release will not:

- Guarantee that third-party providers never suspend or pause a project.
- Bypass provider inactivity policies or account restrictions.
- Automatically modify production databases.
- Execute arbitrary SQL or database migrations.
- Store customer application data beyond the minimum required for health checks.
- Replace a complete infrastructure monitoring or incident management platform.

---

## 3. Target Users

### Primary user: Independent developer

Maintains several applications hosted on Supabase, Appwrite, or similar platforms and wants centralized health monitoring.

### Secondary user: Small development team

Needs a shared dashboard for monitoring project availability and reviewing operational history.

### Administrator

Manages Cloudflare deployment credentials, worker configuration, user access, scheduling, and audit records.

---

## 4. Core Features

### 4.1 Dashboard

The dashboard will be the primary landing page after authentication.

**Summary cards**

- Total registered projects.
- Enabled projects.
- Healthy endpoints.
- Endpoints with warnings or failures.
- Heartbeat jobs completed.
- Failed executions.
- Last successful scheduled run.
- Next scheduled execution.

**Dashboard sections**

- Project health overview.
- Recent heartbeat executions.
- Upcoming scheduled run.
- Latest errors and warnings.
- Execution success-rate chart.
- Response-time trends.
- Cloudflare Worker deployment status.

Project health and provider lifecycle status must be displayed separately. A successful HTTP response must not automatically imply that the underlying project is exempt from inactivity policies.

### 4.2 Project Management

Users must be able to register and manage multiple projects from the UI.

Each project record should contain:

| Field | Description |
|---|---|
| Project name | User-defined display name |
| Provider | Supabase, Appwrite, or Generic HTTP |
| Environment | Development, staging, or production |
| Project URL | Base URL or configured endpoint |
| Endpoint path | Health-check path, if applicable |
| HTTP method | GET by default |
| Authentication | None, bearer token, or supported provider credential |
| Schedule | Default Sunday schedule or an allowed custom schedule |
| Timeout | Maximum request duration |
| Retry policy | Number of permitted retries |
| Expected status | HTTP status codes considered successful |
| Enabled | Whether the project participates in scheduled jobs |
| Last checked | Timestamp of the most recent attempt |
| Last successful check | Timestamp of the most recent success |
| Last result | Success, warning, or failure |

**Required actions**

- Add a project.
- Edit project configuration.
- Test an endpoint immediately.
- Enable or pause scheduled checks.
- View project details and history.
- Duplicate configuration without copying secrets.
- Archive or delete a project.
- Filter by provider, environment, status, and enabled state.

The application should validate URLs, reject unsupported protocols, and prevent requests to private or restricted network destinations.

### 4.3 Supabase Integration

Users can register multiple Supabase projects.

For each project, the application should support:

- Project URL configuration.
- A configurable, documented health-check endpoint.
- Optional authentication where required.
- Response status and latency measurement.
- Connection failure and timeout reporting.
- Last successful heartbeat timestamp.
- Historical success and failure records.

The application should use the least-privileged supported method for each check. Public health endpoints should be preferred when appropriate.

For database connectivity checks, use a provider-supported health endpoint or a dedicated, read-only health-check mechanism. Do not execute arbitrary SQL or write records into business tables simply to generate activity.

A generic HTTP success should be described as an endpoint health result, not definitive proof of the project's internal database or lifecycle status.

### 4.4 Appwrite Integration

Users can register multiple Appwrite projects.

Each configuration should support:

- Appwrite endpoint URL.
- Project identifier.
- Optional health-check endpoint.
- Required authentication credentials, where applicable.
- Response validation.
- Request duration measurement.
- Failure and timeout reporting.
- Execution history.

The system must not assume that every Appwrite deployment exposes an unauthenticated health endpoint. Users should configure an appropriate endpoint supported by their deployment.

The application should not make unnecessary reads or writes to production collections. A dedicated health-check mechanism should be used where available.

### 4.5 Generic HTTP Integration

The application should provide an extensible generic HTTP integration so additional applications can be added without modifying the Worker source code.

Supported configuration should include:

- HTTPS URL.
- GET and other explicitly permitted methods.
- Optional request headers.
- Secure authentication references.
- Timeout.
- Expected response status.
- Optional lightweight response validation.
- Retry count and backoff settings.

The MVP should prefer GET requests and avoid side-effecting operations unless explicitly configured and reviewed by an administrator.

### 4.6 Weekly Scheduling

The default schedule will be every Sunday.

**Recommended initial schedule:** Sunday at 9:00 AM IST, equivalent to 3:30 AM UTC.

The schedule must be configurable in the UI. Cloudflare Cron Triggers use UTC, so the application should display both the selected local time zone and the corresponding UTC schedule.

Default cron expression:

`30 3 * * SUN`

This means the scheduled Worker starts every Sunday at 03:30 UTC.

Scheduling requirements:

- Run all enabled projects during each scheduled execution.
- Skip disabled or archived projects.
- Process requests in controlled batches.
- Enforce per-request timeouts.
- Apply bounded retries for transient failures.
- Record an execution result for each project.
- Record an overall result for the scheduled run.
- Avoid duplicate processing when a scheduled event is retried.
- Preserve execution history across deployments.
- Provide a manual test action independent of the Sunday schedule.

**Important:** Cloudflare Cron Triggers execute according to the deployed Worker's configured schedule. Updating a schedule in the database alone does not change the actual Cron Trigger unless the deployment configuration is also updated.

### 4.7 Job History

The Jobs page will display every scheduled run and manual test.

Each job should include:

- Job ID.
- Job type: scheduled or manual.
- Start and finish timestamps.
- Total projects selected.
- Successful checks.
- Failed checks.
- Skipped checks.
- Total duration.
- Overall execution status.

Users can open a job to inspect individual project results.

Each project result should show:

- Project name.
- Provider.
- Request timestamp.
- HTTP status code, if received.
- Response time.
- Retry attempts.
- Result status.
- Sanitized error message.
- Associated run ID.

Provide filters by date range, provider, project, job type, and status.

### 4.8 Activity and Audit Logs

The Activity page records important operational and administrative events.

Examples:

- Project created, updated, enabled, or disabled.
- Endpoint tested manually.
- Scheduled run started or completed.
- Request failed or timed out.
- Worker deployment initiated or completed.
- Worker configuration changed.
- Credentials rotated.
- Schedule updated.
- Authentication or permission failure.

Audit records should include a timestamp, actor where applicable, action, target resource, outcome, and a safe summary.

Never store raw authorization headers, secret values, or sensitive request payloads in logs.

### 4.9 Cloudflare Worker Management

The application should provide a Worker Management section.

**Required capabilities**

- Connect a Cloudflare account through a securely configured API token.
- Select the intended Cloudflare account.
- Display the configured Worker name and deployment environment.
- Display current deployment status.
- Show the active cron schedule.
- Validate configuration before deployment.
- Deploy the Worker from the UI.
- Show deployment progress and outcome.
- Display the most recent deployment timestamp.
- Show sanitized deployment errors.
- View Worker runtime logs when supported by the connected deployment.
- Update the schedule and redeploy the required configuration.
- Keep a deployment history.

Cloudflare credentials must never be embedded in frontend JavaScript or exposed to the browser.

Use a restricted API token with only the permissions needed for the selected account, Worker scripts, and required configuration changes. Keep the token in encrypted server-side storage or a deployment secret store.

A failed deployment must not be reported as successful. The dashboard should show the actual result returned by the deployment operation.
