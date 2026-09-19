interface CreateEventInput {
    eventId: string;
    type: string;
    occurredAt: string;
    payload: unknown;
}
export declare function createEvent(data: CreateEventInput): Promise<{
    deliveryJob: {
        id: string;
        eventId: string;
        createdAt: Date;
        status: import("../generated/prisma/enums.js").DeliveryStatus;
        attemptCount: number;
        maxAttempts: number;
        nextAttemptAt: Date;
        processingStartedAt: Date | null;
        lastError: string | null;
        updatedAt: Date;
    } | null;
} & {
    id: string;
    eventId: string;
    type: string;
    occurredAt: Date;
    payload: import("@prisma/client/runtime/client").JsonValue;
    createdAt: Date;
}>;
export declare function getEventByEventId(eventId: string): Promise<({
    deliveryJob: ({
        attempts: {
            error: string | null;
            id: string;
            status: import("../generated/prisma/enums.js").AttemptStatus;
            attemptNumber: number;
            deliveryJobId: string;
            httpStatus: number | null;
            startedAt: Date;
            finishedAt: Date | null;
            durationMs: number | null;
        }[];
    } & {
        id: string;
        eventId: string;
        createdAt: Date;
        status: import("../generated/prisma/enums.js").DeliveryStatus;
        attemptCount: number;
        maxAttempts: number;
        nextAttemptAt: Date;
        processingStartedAt: Date | null;
        lastError: string | null;
        updatedAt: Date;
    }) | null;
} & {
    id: string;
    eventId: string;
    type: string;
    occurredAt: Date;
    payload: import("@prisma/client/runtime/client").JsonValue;
    createdAt: Date;
}) | null>;
export {};
//# sourceMappingURL=event.service.d.ts.map