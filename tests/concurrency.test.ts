import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { processPendingJobs } from "../src/workers/delivery.worker.js";

describe("Concurrent workers", () => {
  it("should allow only one worker to claim the same job", async () => {
    const event = await prisma.event.create({
      data: {
        eventId: `concurrent-${Date.now()}`,
        type: "incident.created",
        occurredAt: new Date(),
        payload: {
          incidentId: "inc_concurrent_test",
        },
        deliveryJob: {
          create: {
            maxAttempts: 3,
          },
        },
      },
      include: {
        deliveryJob: true,
      },
    });

    // Receiver should be healthy
    await fetch("http://localhost:4000/recover", {
      method: "POST",
    });

    // Two workers try to process the same job at the same time
    await Promise.all([
      processPendingJobs(event.deliveryJob!.id),
      processPendingJobs(event.deliveryJob!.id),
    ]);

    const job = await prisma.deliveryJob.findUnique({
      where: {
        id: event.deliveryJob!.id,
      },
      include: {
        attempts: true,
      },
    });

    expect(job?.status).toBe("SUCCEEDED");

    // Only ONE worker should have delivered
    expect(job?.attemptCount).toBe(1);
    expect(job?.attempts).toHaveLength(1);

    expect(job?.attempts[0]!.attemptNumber).toBe(1);
    expect(job?.attempts[0]!.status).toBe("SUCCESS");
    expect(job?.attempts[0]!.httpStatus).toBe(200);
  });
});
