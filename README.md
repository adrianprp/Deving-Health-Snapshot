# "Deving" Health Snapshot

*A GitLab/Jira-based telemetry tool for engineering teams.*

The inspiration for this tool came from *Measure What Matters* by John Doerr and *High Output Management*
by Andrew S. Grove.

> Measurement is a prerequisite for management.  
> — Andrew Grove, *High Output Management*

> Without clear goals and accountability, execution suffers.  
> — John Doer, *Measure What Matters*

Careful tho, as: 
> Tell me what you measure, and I will tell you what people will optimize for.
> — Eliyahu M. Goldratt

## Overview

The tool gathers Merge Request/ Jira tickets data and computes a set of metrics designed to answer questions such as:
- How long does it take for code reviews to complete?
- How quickly does the team react to new Merge Requests?
- Are review responsibilities shared evenly across the team?
- Is the review process improving over time?

The result is a structured health snapshot that can be used for:
- engineering leadership monitoring
- 1:1 coaching discussions
- OKR tracking
- identifying process bottlenecks

## Architecture
System follows a data pipeline: 

API → services → normalize → enrich → metricsEngine → snapshotBuilder

### 1. Service: 
retrive data from apis
### 2. Normalization Layer
 Transforms raw API responses into a consistent internal format.
### 3. Enrichment Layer 
The enrichment step adds MR-level facts from the normalized data.
 - Approval Timestamp: Detects the moment a Merge Request reaches the required number of approvals.
 - Review Cycle Time: time between MR creation and approval threshold reached
### 4. Metrics Engine
Aggregates MR-level facts into team metrics.

- Average Review Cycle Time (Year-to-Date): Average time a Merge Request spends in code review.
**Reflects the efficiency of the team's review process.**

- Average Feedback Time: Measures how long it takes for the first reviewer interaction to occur after an MR is opened. 
**Reflects review responsiveness. Slow feedback cycles often indicate: overloaded reviewers, unclear ownership, process bottlenecks**

- Reviewer Response Time: calculates, average response time, total review opportunities, number of MRs the reviewer interacted with, participation rate

```
Reviewer: Adrian
Total Opportunities: 18
Interacted: 12
Participation Rate: 66%
Average Response Time: 3h 20m
```

**Reflects uneven review load, reviewers avoiding participation, slow responders**

### 5. Time Accuracy
All time calculations use business time, not calendar time.
For example Friday 18:00 → Monday 09:00, calendar diffrence is 63 hours, business-time diffrence is 1 hour. 

### 6. Time Zone Awareness

Developers may operate in different regions. 
For example my current team's distributio is Bucharest and Thailand.
Each developer's time zone is configured in timeConfig.js.

Review timing is calculated using the author's local working hours.

This prevents distorted metrics when teams are spread globally.

## Snapshot Output

```
{
  "period": "Monday, March 2 - Friday, March 6",
  "averageTimeYearToDate": {
    "days": 0,
    "hours": 6,
    "mins": 30
  },
  "averageFeedbackTime": {
    "days": 0,
    "hours": 2,
    "mins": 10
  },
  "reviewerResponseTimes": {
    "Alice": {
      "average": 7200000,
      "participationRate": 0.8
    }
  }
}
```


##SPACE Mapping

https://queue.acm.org/detail.cfm?id=3454124

| Metric                 | S | P | A | C | E |
| ---------------------- | - | - | - | - | - |
| Review Cycle Time      |   | ✔ |   |   | ✔ |
| Time to First Feedback |   |   |   | ✔ | ✔ |
| Reviewer Response Time |   |   |   | ✔ | ✔ |
| Participation Rate     |   |   | ✔ | ✔ |   |





Planned 
| Review Distribution    |   |   |   | ✔ |   |
| MR Size                |   | ✔ |   |   | ✔ |
| Review Iterations      |   | ✔ |   | ✔ |   |
