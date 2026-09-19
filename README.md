# Vireon Safety Institute — System Architecture & Background Worker Flow

Comprehensive architectural documentation for the **Vireon Safety Institute** background worker, job scheduling, and multi-channel notification engine.

---

## 🏗️ 1. High-Level Worker Architecture Diagram

```mermaid
flowchart TB
    subgraph Supervisor ["🖥️ Process Supervisor & Cluster Layer (PM2)"]
        PM2["PM2 Process Manager<br/>(Cluster Mode: CPU Max Instances)"]
        W1["Worker Instance #1<br/>(server.ts)"]
        W2["Worker Instance #2<br/>(server.ts)"]
        WN["Worker Instance #N<br/>(server.ts)"]
        PM2 --> W1
        PM2 --> W2
        PM2 --> WN
    end

    subgraph AgendaEngine ["⚙️ Agenda.js Job Engine (v5.0)"]
        direction TB
        Sched["Job Scheduler & Poller<br/>(processEvery: '30s', maxConcurrency: 10)"]
        LockMgr["Distributed Lock Manager<br/>(lockLifetime: 10m, atomic findAndModify)"]
        JobDef["Job Definitions Registry<br/>(agenda.jobs.ts)"]
        Sched <--> LockMgr
        Sched --> JobDef
    end

    subgraph MongoStore ["🗄️ MongoDB Storage Layer"]
        AgendaJobs[("agenda_jobs Collection<br/>• name<br/>• nextRunAt<br/>• lockedAt<br/>• data")]
        ClassCol[("classes Collection<br/>• scheduledAt, status<br/>• reminderSent, attendees")]
        UserCol[("users Collection<br/>• fcmTokens, email<br/>• status, role")]
        NotifCol[("notifications Collection<br/>• recipientId, type<br/>• isSent, dataPayload")]
    end

    subgraph WorkerJobs ["🔄 Background Job Processors"]
        J1["Job 1: send-class-reminders<br/>(Every 1 Minute)"]
        J2["Job 2: mark-live-classes<br/>(Every 1 Minute)"]
        J3["Job 3: mark-completed-classes<br/>(Every 5 Minutes)"]
        J4["Job 4: scheduled-notification<br/>(Ad-hoc / Delayed)"]
    end

    subgraph DispatchPipeline ["📡 Multi-Channel Dispatch Pipeline"]
        FCM["Firebase Cloud Messaging (FCM)<br/>• Multicast (500 tokens/chunk)<br/>• Priority: Max / High<br/>• Channels: vireon_alerts, vireon_reminders"]
        Expo["Expo Push Service API<br/>(exp.host/--/api/v2/push/send)"]
        SMTP["Nodemailer SMTP Worker<br/>(Connection Pool: 5 conn, 100 msgs)"]
        InApp["In-App Notification Store<br/>(Persisted in DB for Bell icon)"]
    end

    subgraph Clients ["📱 Client Destinations"]
        AndroidApp["Android Native Devices"]
        IOSApp["iOS Native Devices"]
        EmailClient["Student Email Inboxes"]
        InAppUI["Mobile / Web App Notification Center"]
    end

    %% Wiring
    W1 & W2 & WN <--> AgendaEngine
    LockMgr <--> AgendaJobs
    JobDef --> J1 & J2 & J3 & J4

    J1 --> ClassCol
    J1 --> UserCol
    J2 --> ClassCol
    J3 --> ClassCol
    J4 --> NotifCol

    J1 & J2 & J4 --> DispatchPipeline
    DispatchPipeline --> FCM & Expo & SMTP & InApp

    FCM --> AndroidApp & IOSApp
    Expo --> AndroidApp & IOSApp
    SMTP --> EmailClient
    InApp --> InAppUI
```

---

## ⚡ 2. End-to-End Worker Execution & Dispatch Sequence

```mermaid
sequenceDiagram
    autonumber
    participant PM2 as PM2 Cluster Node
    participant Agenda as Agenda.js Engine
    participant DB as MongoDB (agenda_jobs)
    participant ClassDB as MongoDB (classes / users)
    participant FCM as Firebase Admin (FCM)
    participant Mailer as SMTP Transporter
    participant NotifDB as MongoDB (notifications)

    Note over PM2,Agenda: 30-Second Polling Loop (processEvery: 30s)
    Agenda->>DB: Atomic Query & Lock (findAndModify: nextRunAt <= now && lockedAt == null)
    DB-->>Agenda: Acquired Job Document (Locked for 10 min)

    alt Job: send-class-reminders (Runs Every 1 min)
        Agenda->>ClassDB: Query: scheduledAt in [now+30m, now+31m] & reminderSent == false
        ClassDB-->>Agenda: Return eligible scheduled classes + attendees
        
        par Multi-Channel Fan-out
            Agenda->>FCM: sendEachForMulticast(fcmTokens, Title, Body, ZoomJoinUrl)
            FCM-->>Agenda: Batch Result (successCount, failureCount)
            Agenda->>Mailer: sendClassReminderEmail(email, title, scheduledAt, zoomUrl)
            Mailer-->>Agenda: Delivery Status (via SMTP pool)
            Agenda->>NotifDB: NotificationModel.create({ recipientId, type: 'CLASS_REMINDER' })
        end

        Agenda->>ClassDB: Update Class: { reminderSent: true }

    else Job: mark-live-classes (Runs Every 1 min)
        Agenda->>ClassDB: Query: scheduledAt <= now & status == 'SCHEDULED'
        ClassDB-->>Agenda: Return classes ready to go LIVE
        Agenda->>ClassDB: Update Class: { status: 'LIVE' }
        Agenda->>NotifDB: NotificationModel.create({ title: '🚨 LIVE NOW: ...' })
        Agenda->>FCM: Broadcast push to active users (channel: vireon_alerts)
        FCM-->>Agenda: Multicast ACK

    else Job: mark-completed-classes (Runs Every 5 min)
        Agenda->>ClassDB: Query: status == 'LIVE'
        ClassDB-->>Agenda: Return live sessions
        Note over Agenda: Calculate: endTime = scheduledAt + durationMinutes
        opt now >= endTime
            Agenda->>ClassDB: Update Class: { status: 'COMPLETED' }
        end

    else Job: scheduled-notification (Ad-hoc)
        Agenda->>NotifDB: NotificationModel.findById(notificationId)
        NotifDB-->>Agenda: Return notification data payload
        opt isSent == false
            Agenda->>FCM: sendEachForMulticast(audienceTokens)
            Agenda->>NotifDB: Update: { isSent: true, sentAt: now }
        end
    end

    Agenda->>DB: Release Job Lock & Update nextRunAt
```

---

## 🔄 3. Class Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Admin / Instructor Creates Session
    
    SCHEDULED --> REMINDER_SENT: T-30 Min Trigger (send-class-reminders)
    note right of REMINDER_SENT
        • FCM Multicast (High Priority)
        • HTML Email with Zoom Link
        • In-app Notification persisted
        • reminderSent = true
    end note

    REMINDER_SENT --> LIVE: T = scheduledAt (mark-live-classes)
    SCHEDULED --> LIVE: T = scheduledAt (Direct transition if reminder skipped)
    note right of LIVE
        • status = 'LIVE'
        • Broadcast notification: "🚨 LIVE NOW"
        • Channel: vireon_alerts_v4
    end note

    LIVE --> COMPLETED: T >= scheduledAt + durationMinutes (mark-completed-classes)
    note right of COMPLETED
        • status = 'COMPLETED'
        • Session locked for attendance & recordings
    end note

    COMPLETED --> [*]
```

---

## 🧹 4. FCM Token Pipeline & Auto-Pruning Flow

```mermaid
flowchart TD
    Start([Worker Triggers Push Dispatch]) --> GetTokens[Retrieve User FCM Tokens from MongoDB]
    GetTokens --> SplitTokens{Check Token Format}

    SplitTokens -->|Starts with ExponentPushToken| ExpoWorker[Expo Push HTTP Service<br/>api/v2/push/send]
    SplitTokens -->|Native FCM Token| ChunkBatch[Chunk into Batches of 500 Tokens]

    ChunkBatch --> FCMCall[getFirebaseMessaging.sendEachForMulticast]
    FCMCall --> ParseResponses{Inspect Individual Responses}

    ParseResponses -->|Success| DeliverSuccess[Delivered to Android / iOS Device]
    ParseResponses -->|Unregistered Token<br/>messaging/registration-token-not-registered| PruneDB[Auto-Prune from DB<br/>UserModel.updateMany: $pull fcmTokens]
    ParseResponses -->|Transient Network Error| LogWarn[Log Warning / Sentry Alert]

    DeliverSuccess --> Done([Dispatch Cycle Complete])
    PruneDB --> Done
    LogWarn --> Done
```

---

## 📋 5. Registered Worker Jobs Reference

| Job Name | Schedule | Target Collection | Primary Action | Side Effects & Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `send-class-reminders` | `every 1 minute` | `classes`, `users` | Detects sessions starting in 30 minutes (`[now+30m, now+31m]`) | Dispatches FCM push, sends transactional reminder email, creates in-app notification, updates `reminderSent: true` |
| `mark-live-classes` | `every 1 minute` | `classes` | Detects scheduled classes where `scheduledAt <= now` | Updates class status to `LIVE`, triggers urgent lock-screen broadcast notification to all active users |
| `mark-completed-classes` | `every 5 minutes` | `classes` | Scans live classes where `now >= scheduledAt + durationMinutes` | Updates status to `COMPLETED`, archives live session state |
| `scheduled-notification` | Ad-hoc / On-demand | `notifications`, `users` | Fetches scheduled broadcast by `notificationId` | Resolves target audience (direct user, role group, or broadcast), dispatches FCM, sets `isSent: true` |

---

## ⚙️ 6. Core Infrastructure & Configuration

### Agenda.js Job Engine (`backend/src/config/agenda.ts`)
- **Collection**: `agenda_jobs`
- **Polling Interval**: `30 seconds` (`processEvery: '30 seconds'`)
- **Concurrency**: `maxConcurrency: 10`, `defaultConcurrency: 5`
- **Lock Lifetime**: `10 minutes` (`defaultLockLifetime: 600000 ms`)
- **Connection Resilience**: Enforced IPv4, 30s connection/selection timeout for DNS and network IP resilience, graceful stop on `SIGTERM` / `SIGINT`.

### PM2 Process Clustering (`backend/ecosystem.config.js`)
- **Execution Mode**: `cluster`
- **Instances**: `max` (Utilizes all available CPU cores)
- **Memory Restart Guard**: Auto-restarts instances exceeding `512MB`
- **Zero-Downtime Reload**: Graceful kill timeout of `5000ms` with rolled cluster restarts.
