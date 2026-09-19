import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { processPendingJobs } from "../src/workers/delivery.worker.js";

describe("Retry delivery", () => {
  it("should retry after temporary failure and eventually succeed", async () => {
    const event = await prisma.event.create({
      data: {
        eventId: `retry-${Date.now()}`,
        type: "incident.created",
        occurredAt: new Date(),
        payload: {
          incidentId: "inc_retry_test",
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

    // Receiver ko fail mode me daalo
    await fetch("http://localhost:4000/fail", {
      method: "POST",
    });

    // First attempt -> 503
    await processPendingJobs(event.deliveryJob!.id);

    let job = await prisma.deliveryJob.findUnique({
      where: {
        eventId: event.id,
      },
      include: {
        attempts: true,
      },
    });

    expect(job?.status).toBe("PENDING");
    expect(job?.attemptCount).toBe(1);
    expect(job?.attempts).toHaveLength(1);
    expect(job?.attempts[0]!.status).toBe("FAILED");
    expect(job?.attempts[0]!.httpStatus).toBe(503);

    // Retry immediately ke liye nextAttemptAt ko past me set kar rahe hain
    await prisma.deliveryJob.update({
      where: {
        id: job!.id,
      },
      data: {
        nextAttemptAt: new Date(0),
      },
    });

    // Receiver recover
    await fetch("http://localhost:4000/recover", {
      method: "POST",
    });

    // Second attempt -> 200
    await processPendingJobs(job!.id);

    job = await prisma.deliveryJob.findUnique({
      where: {
        eventId: event.id,
      },
      include: {
        attempts: {
          orderBy: {
            attemptNumber: "asc",
          },
        },
      },
    });

    expect(job?.status).toBe("SUCCEEDED");
    expect(job?.attemptCount).toBe(2);
    expect(job?.attempts).toHaveLength(2);

    expect(job?.attempts[0]!.status).toBe("FAILED");
    expect(job?.attempts[0]!.httpStatus).toBe(503);

    expect(job?.attempts[1]!.status).toBe("SUCCESS");
    expect(job?.attempts[1]!.httpStatus).toBe(200);
  });
});
