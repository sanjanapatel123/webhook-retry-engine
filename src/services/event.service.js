import { prisma } from "../lib/prisma.js";
export async function createEvent(data) {
    const event = await prisma.event.create({
        data: {
            eventId: data.eventId,
            type: data.type,
            occurredAt: new Date(data.occurredAt),
            payload: data.payload,
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
    return event;
}
export async function getEventByEventId(eventId) {
    return prisma.event.findUnique({
        where: {
            eventId,
        },
        include: {
            deliveryJob: {
                include: {
                    attempts: {
                        orderBy: {
                            attemptNumber: "asc",
                        },
                    },
                },
            },
        },
    });
}
//# sourceMappingURL=event.service.js.map