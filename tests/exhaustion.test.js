import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { processPendingJobs } from "../src/workers/delivery.worker.js";
describe("Exhaustion", () => {
    it("should stop retrying after maximum attempts", async () => {
        const event = await prisma.event.create({
            data: {
                eventId: `exhaust-${Date.now()}`,
                type: "incident.created",
                occurredAt: new Date(),
                payload: {
                    incidentId: "inc_test",
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
        // Receiver fail mode
        await fetch("http://localhost:4000/fail", {
            method: "POST",
        });
        // Attempt 1
        await processPendingJobs(event.deliveryJob.id);
        let job = await prisma.deliveryJob.findUnique({
            where: {
                eventId: event.id,
            },
            include: {
                attempts: true,
            },
        });
        expect(job?.attemptCount).toBe(1);
        expect(job?.status).toBe("PENDING");
        // Retry immediately
        await prisma.deliveryJob.update({
            where: {
                id: job.id,
            },
            data: {
                nextAttemptAt: new Date(0),
            },
        });
        // Attempt 2
        await processPendingJobs(event.deliveryJob.id);
        job = await prisma.deliveryJob.findUnique({
            where: {
                eventId: event.id,
            },
            include: {
                attempts: true,
            },
        });
        expect(job?.attemptCount).toBe(2);
        expect(job?.status).toBe("PENDING");
        // Retry immediately
        await prisma.deliveryJob.update({
            where: {
                id: job.id,
            },
            data: {
                nextAttemptAt: new Date(0),
            },
        });
        // Attempt 3
        await processPendingJobs(event.deliveryJob.id);
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
        expect(job?.attemptCount).toBe(3);
        expect(job?.status).toBe("DEAD");
        expect(job?.attempts).toHaveLength(3);
        expect(job?.attempts[0].httpStatus).toBe(503);
        expect(job?.attempts[1].httpStatus).toBe(503);
        expect(job?.attempts[2].httpStatus).toBe(503);
        // Important: maximum 3 attempts
        expect(job?.attempts[0].attemptNumber).toBe(1);
        expect(job?.attempts[1].attemptNumber).toBe(2);
        expect(job?.attempts[2].attemptNumber).toBe(3);
        // Receiver remains in failure mode
    });
});
//# sourceMappingURL=exhaustion.test.js.map