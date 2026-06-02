# HIMS Smart Parcha – Advanced Offline Synchronization & Multi-System Hospital Architecture

# 1. Problem Overview

The HIMS system must support:

* Front Desk
* Nurse
* Doctor
* Lab
* Pharmacy

working on:

* different machines
* different roles
* unstable internet
* low bandwidth
* intermittent connectivity

while ensuring:

* no data loss
* no duplicate Visit IDs
* smooth synchronization
* backend stability
* offline continuity

---

# 2. Core Enterprise Principle

The system must become:

```text id="qz05kt"
DISTRIBUTED OFFLINE-FIRST HOSPITAL SYSTEM
```

NOT:

```text id="c0smz4"
SINGLE SERVER DEPENDENT WEB APP
```

---

# 3. Correct Hospital Architecture

# Recommended Architecture

```text id="vb01w4"
                 ┌────────────────────┐
                 │ Central HIMS Cloud │
                 │ Main Backend APIs  │
                 └─────────┬──────────┘
                           │
                    Batch Sync Layer
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
┌─────▼─────┐      ┌───────▼──────┐     ┌──────▼─────┐
│ FrontDesk │      │ Nurse System │     │ Doctor EXE │
│ Local DB  │      │ Local DB     │     │ Local DB   │
└───────────┘      └──────────────┘     └────────────┘
```

Each machine:

* independent
* local-first
* syncs later
* survives offline mode

---

# 4. MOST IMPORTANT ISSUE – Backend Overload During Sync

# Problem

When internet reconnects:

```text id="z4u2wo"
1000 pending requests →
all sent simultaneously →
backend overload →
API crash
```

This is VERY common.

---

# 5. Correct Solution – Batch Synchronization

# NEVER

```text id="1mo9lr"
Promise.all(all_requests)
```

❌ dangerous

---

# ALWAYS USE

```text id="0x0wb6"
BATCHED QUEUE SYNCHRONIZATION
```

---

# 5.1 Correct Batch Flow

```text id="v9hq0q"
Reconnect →
Read Pending Queue →
Take 10 Items →
Sync →
Wait →
Take Next 10 →
Sync →
Continue
```

---

# 5.2 Recommended Batch Size

| Data Type          | Batch Size |
| ------------------ | ---------- |
| Registration       | 10         |
| Vitals             | 20         |
| Canvas strokes     | 5          |
| Large prescription | 2          |
| Images             | 1          |

---

# 5.3 Recommended Sync Delay

```text id="v4s9eo"
batch →
wait 1-2 seconds →
next batch
```

This protects:

* backend
* DB
* Redis
* API gateway

---

# 5.4 Recommended Sync Priority

# Highest Priority

```text id="0i66a8"
patient registration
visit creation
doctor consultation start
```

---

# Medium Priority

```text id="g64pjx"
vitals
history
notes
```

---

# Lowest Priority

```text id="81vm49"
canvas snapshots
analytics
logs
```

---

# 5.5 Queue Table Example

```json id="d0hifg"
{
  "queueId": "q1",
  "priority": 1,
  "api": "/visit/create",
  "payload": {},
  "status": "pending",
  "retryCount": 0
}
```

---

# 6. Duplicate Visit ID Problem

# VERY IMPORTANT

You correctly identified:

```text id="1e0u90"
offline registration may create duplicate Visit IDs
```

This is a real distributed systems problem.

---

# 7. WRONG APPROACH

```text id="2qgimz"
generate sequential IDs locally
```

❌ dangerous

Because:

* multiple systems
* multiple front desks
* offline machines
* race conditions

will create duplicates.

---

# 8. BEST APPROACH – Hybrid ID Strategy

Use TWO IDs.

# 8.1 Local Temporary ID

Generated locally:

```text id="xtv17k"
TEMP-DEVICEID-TIMESTAMP-RANDOM
```

Example:

```text id="p3d0e9"
TMP-FD01-171234234-AB12
```

This NEVER duplicates.

---

# 8.2 Server Final Visit ID

When synced online:

```text id="hr40cw"
server generates official Visit ID
```

Example:

```text id="7m9yg6"
OP260602000001
```

---

# 8.3 Local Mapping Table

```json id="p27lmh"
{
  "tempVisitId": "TMP-FD01-171234",
  "serverVisitId": "OP260602000001"
}
```

---

# 8.4 Why This Is Best

Benefits:

* no duplicate IDs
* supports offline
* supports many machines
* safer distributed architecture

---

# 9. Alternative Enterprise Option

If hospital insists:

```text id="m2wn31"
Visit ID visible immediately offline
```

Then use:

# Machine Prefix Allocation

Example:

| Machine | Range         |
| ------- | ------------- |
| FD01    | 000001–009999 |
| FD02    | 010000–019999 |

This avoids duplicates.

But harder to manage.

---

# 10. Recommended Final Strategy

BEST:

```text id="v9vwlc"
temporary local ID →
server official ID later
```

---

# 11. Multi-System Synchronization Problem

# Problem

Front Desk machine creates patient.

Need:

* doctor machine sees patient
* nurse machine sees patient
* lab sees patient

even on local network.

---

# 12. Recommended Architecture

# Use Local Sync Broadcast

---

# 12.1 Option 1 – Best Enterprise Approach

Use:

```text id="g8w8x0"
Central Hospital Local Gateway
```

Architecture:

```text id="5hqdcx"
All Machines →
Hospital Local Gateway →
Cloud Sync
```

---

# 12.2 Local Gateway Responsibilities

* local synchronization
* LAN communication
* queue aggregation
* local caching
* retry management
* device coordination

---

# 12.3 Why Gateway Is Powerful

Benefits:

* machines sync locally fast
* less internet usage
* backend protected
* hospital survives internet outage

---

# 13. Alternative Lightweight Solution

If no gateway possible:

Use:

```text id="k55xcm"
WebSocket + Local Polling
```

---

# Flow

```text id="my4dxg"
Front Desk Registers →
Sync API →
Doctor machine pulls updates every 10 sec
```

Less scalable but easier.

---

# 14. BEST Enterprise Recommendation

For hospitals:

```text id="ggh71j"
Hospital Local Gateway + Cloud Sync
```

This is enterprise-grade.

---

# 15. System-to-System Synchronization

# Example Flow

## Front Desk

Creates:

* patient
* visit
* token

Stored locally first.

---

## Sync Layer

Broadcasts:

* new patient
* new visit

to:

* doctor systems
* nurse systems

---

## Doctor System

Receives:

* new visit
* patient details

stores locally.

Doctor instantly sees:

* queue
* visit
* patient

without cloud dependency.

---

# 16. Recommended Local Sync Methods

| Method        | Recommendation  |
| ------------- | --------------- |
| WebSocket     | Best            |
| Redis Pub/Sub | Enterprise      |
| Polling       | Simple fallback |
| Peer-to-peer  | Not recommended |

---

# 17. Role-Based Architecture

# Front Desk

Owns:

* registration
* visit creation
* token generation

---

# Nurse

Owns:

* vitals
* triage

---

# Doctor

Owns:

* consultation
* prescription
* smart parcha

---

# Lab

Owns:

* reports
* diagnostics

---

# Pharmacy

Owns:

* medicine dispense

---

# 18. Each System Must Have

```text id="l91u3o"
Local DB
Sync Queue
Retry Engine
Network Manager
Auth Manager
Conflict Resolver
```

---

# 19. Recommended Sync Rules

# Immediate Local Save

ALWAYS:

```text id="9w7hl6"
UI →
Local DB First
```

---

# NEVER

```text id="3yr3d9"
UI →
API →
wait →
save
```

---

# 20. Retry Strategy

Example:

| Retry | Delay  |
| ----- | ------ |
| 1     | 5 sec  |
| 2     | 30 sec |
| 3     | 2 min  |
| 4     | 10 min |

Use:

* exponential backoff

---

# 21. Conflict Handling

Use:

```json id="jwqfce"
{
  "version": 1,
  "updatedAt": "",
  "deviceId": ""
}
```

Rule:

```text id="c3vgdz"
latest version wins
```

or

```text id="7m0jwo"
server priority wins
```

---

# 22. Recommended Hospital Network Setup

# BEST PRACTICE

```text id="2ijqz0"
Hospital LAN
    ↓
Local Gateway Server
    ↓
Cloud HIMS Backend
```

---

# 23. Benefits of This Architecture

# Doctor Experience

* instant canvas
* no waiting
* offline working
* no API blocking

---

# Backend Stability

* batched sync
* controlled retries
* reduced overload

---

# Hospital Reliability

* survives internet outage
* local communication continues
* systems continue working

---

# Enterprise Scalability

* supports many hospitals
* many devices
* many departments
* low bandwidth areas

---

# 24. Final Recommended Flow

```text id="ag9z9d"
Front Desk Registration
    ↓
Local Save
    ↓
Generate Temp Visit ID
    ↓
Sync Queue
    ↓
Doctor/Nurse Systems Receive Local Sync
    ↓
Doctor Starts Consultation
    ↓
Canvas Stored Locally
    ↓
Background Batch Sync
    ↓
Server Generates Official Visit ID
    ↓
Local Mapping Updated
    ↓
Keep Synced Data 2 Days
    ↓
Cleanup Old Synced Data
```

---

# 25. MOST IMPORTANT RULE

The hospital workflow must NEVER stop because:

* internet failed
* API slow
* backend overloaded
* Keycloak unavailable
* cloud unreachable

The hospital must continue operating locally first.