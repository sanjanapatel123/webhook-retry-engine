import { createEvent, getEventByEventId } from "../services/event.service.js";
export async function createEventController(req, res) {
    const { eventId, type, occurredAt, payload } = req.body;
    if (!eventId || !type || !occurredAt || !payload) {
        return res.status(400).json({
            message: "eventId, type, occurredAt and payload are required",
        });
    }
    try {
        const event = await createEvent({
            eventId,
            type,
            occurredAt,
            payload,
        });
        return res.status(201).json({
            message: "Event accepted",
            eventId: event.eventId,
            status: event.deliveryJob?.status,
        });
    }
    catch (error) {
        console.error(error);
        if (error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002") {
            const existingEvent = await getEventByEventId(eventId);
            return res.status(200).json({
                message: "Event already exists",
                eventId: existingEvent?.eventId,
                status: existingEvent?.deliveryJob?.status,
            });
        }
        return res.status(500).json({
            message: "Failed to create event",
        });
    }
}
export async function getEventController(req, res) {
    try {
        const { eventId } = req.params;
        if (!eventId || Array.isArray(eventId)) {
            return res.status(400).json({
                message: "Invalid eventId",
            });
        }
        const event = await getEventByEventId(eventId);
        if (!event) {
            return res.status(404).json({
                message: "Event not found",
            });
        }
        return res.json({
            eventId: event.eventId,
            type: event.type,
            status: event.deliveryJob?.status,
            attemptCount: event.deliveryJob?.attemptCount,
            attempts: event.deliveryJob?.attempts ?? [],
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch event",
        });
    }
}
//# sourceMappingURL=event.controllers.js.map