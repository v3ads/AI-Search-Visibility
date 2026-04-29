/**
 * Scheduled scan runner.
 * Checks for due scan schedules every 5 minutes and fires runAnalysis for each.
 * Only runs on Growth plan and above (hasScheduledScans = true).
 */
import cron from "node-cron";
import * as storage from "./storage";
import { runAnalysis } from "./ai-analysis";
import { log } from "./index";

export function startScanScheduler(): void {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const schedules = await storage.getAllActiveScanSchedules();

      for (const schedule of schedules) {
        if (!schedule.nextRunAt) continue;
        const nextRun = new Date(schedule.nextRunAt);
        if (nextRun > now) continue;

        // Verify the org still has scheduled scan access
        const project = await storage.getProject(schedule.projectId);
        if (!project) continue;
        const org = await storage.getOrgById(project.orgId);
        if (!org?.hasScheduledScans) continue;

        // Check scan quota
        const canScan = await storage.canRunScan(project.orgId);
        if (!canScan.allowed) {
          log(`Skipping scheduled scan for project ${schedule.projectId}: ${canScan.reason}`, "scheduler");
          continue;
        }

        log(`Running scheduled scan for project ${schedule.projectId}`, "scheduler");

        try {
          const activePrompts = (await storage.getPrompts(schedule.projectId)).filter((p) => p.isActive);
          if (activePrompts.length === 0) {
            log(`No active prompts for project ${schedule.projectId}, skipping`, "scheduler");
          } else {
            const run = await storage.createAnalysisRun({
              projectId: schedule.projectId,
              status: "running",
              totalPrompts: activePrompts.length * 4,
              completedPrompts: 0,
              modelsUsed: ["ChatGPT", "Claude", "Google Gemini", "Grok"],
            });

            await storage.incrementScanCount(project.orgId);

            // Fire and forget — cron will move on
            runAnalysis(schedule.projectId, run.id).catch((err) =>
              log(`Scheduled scan failed for project ${schedule.projectId}: ${err.message}`, "scheduler")
            );
          }
        } catch (err: any) {
          log(`Error starting scheduled scan for project ${schedule.projectId}: ${err.message}`, "scheduler");
        }

        // Calculate next run time
        const nextRunAt = computeNextRun(schedule.frequency, schedule.dayOfWeek ?? 1, schedule.hour ?? 8);
        await storage.upsertScanSchedule(schedule.projectId, {
          lastRunAt: now,
          nextRunAt,
        });
      }
    } catch (err: any) {
      log(`Scheduler error: ${err.message}`, "scheduler");
    }
  });

  log("Scan scheduler started (runs every 5 minutes)", "scheduler");
}

function computeNextRun(
  frequency: string,
  dayOfWeek: number,
  hour: number
): Date {
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(0);
  next.setHours(hour);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;

    case "weekly": {
      // Advance to the next occurrence of dayOfWeek (0=Sun)
      const currentDay = now.getDay();
      const target = dayOfWeek % 7;
      let daysUntil = (target - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7; // same weekday = next week
      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1); // first of next month
      break;

    default:
      next.setDate(next.getDate() + 7);
  }

  return next;
}
