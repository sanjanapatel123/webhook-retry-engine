import { prisma } from "../lib/prisma.js";

interface CreateEventInput {
  eventId: string;
  type: string;
  occurredAt: string;
  payload: unknown;
}

export async function createEvent(data: CreateEventInput) {
  const event = await prisma.event.create({
    data: {
      eventId: data.eventId,
      type: data.type,
      occurredAt: new Date(data.occurredAt),
      payload: data.payload as any,

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

export async function getEventByEventId(eventId: string) {
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
