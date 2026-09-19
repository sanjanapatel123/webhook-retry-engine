import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { processPendingJobs } from "../src/workers/delivery.worker.js";
describe("Process recovery", () => {
    it("should recover a stuck PROCESSING job", async () => {
        const event = await prisma.event.create({
            data: {
                eventId: `recovery-${Date.now()}`,
                type: "incident.created",
                occurredAt: new Date(),
                payload: { incidentId: "inc_recovery_test" },
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
        await fetch("http://localhost:4000/recover", {
            method: "POST",
        });
        // Simulate a worker/process crash:
        // job was claimed but never completed.
        await prisma.deliveryJob.update({
            where: {
                id: event.deliveryJob.id,
            },
            data: {
                status: "PROCESSING",
                processingStartedAt: new Date(Date.now() - 60_000),
                attemptCount: 1,
                nextAttemptAt: new Date(0),
            },
        });
        await processPendingJobs(event.deliveryJob.id);
        const job = await prisma.deliveryJob.findUnique({
            where: {
                id: event.deliveryJob.id,
            },
            include: {
                attempts: true,
            },
        });
        expect(job?.status).toBe("SUCCEEDED");
        expect(job?.attemptCount).toBe(2);
        expect(job?.attempts).toHaveLength(1);
        expect(job?.attempts[0].attemptNumber).toBe(2);
        expect(job?.attempts[0].status).toBe("SUCCESS");
        expect(job?.attempts[0].httpStatus).toBe(200);
    });
});
//# sourceMappingURL=process-recovery.test.js.map