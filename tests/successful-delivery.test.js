import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { processPendingJobs } from "../src/workers/delivery.worker.js";
describe("Successful delivery", () => {
    it("should deliver a pending event successfully", async () => {
        await fetch("http://localhost:4000/recover", {
            method: "POST",
        });
        const event = await prisma.event.create({
            data: {
                eventId: `success-${Date.now()}`,
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
        await processPendingJobs(event.deliveryJob.id);
        const job = await prisma.deliveryJob.findUnique({
            where: {
                eventId: event.id,
            },
            include: {
                attempts: true,
            },
        });
        expect(job?.status).toBe("SUCCEEDED");
        expect(job?.attemptCount).toBe(1);
        expect(job?.attempts).toHaveLength(1);
        expect(job?.attempts[0].status).toBe("SUCCESS");
        expect(job?.attempts[0].httpStatus).toBe(200);
    });
});
//# sourceMappingURL=successful-delivery.test.js.map