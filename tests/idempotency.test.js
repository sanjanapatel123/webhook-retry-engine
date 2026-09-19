import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { createEvent, getEventByEventId, } from "../src/services/event.service.js";
describe("Idempotency", () => {
    it("should not create a second delivery job for the same eventId", async () => {
        const eventId = `idempotent-${Date.now()}`;
        const eventData = {
            eventId,
            type: "incident.created",
            occurredAt: new Date().toISOString(),
            payload: {
                incidentId: "inc_idempotent_test",
            },
        };
        // First ingestion
        const firstEvent = await createEvent(eventData);
        // Second ingestion with SAME eventId
        let secondEvent;
        try {
            secondEvent = await createEvent(eventData);
        }
        catch (error) {
            expect(error.code).toBe("P2002");
            secondEvent = await getEventByEventId(eventId);
        }
        // Both refer to the same event
        expect(secondEvent?.eventId).toBe(firstEvent.eventId);
        expect(secondEvent?.id).toBe(firstEvent.id);
        // Only one delivery job exists
        const jobs = await prisma.deliveryJob.findMany({
            where: {
                eventId: firstEvent.id,
            },
        });
        expect(jobs).toHaveLength(1);
    });
});
//# sourceMappingURL=idempotency.test.js.map