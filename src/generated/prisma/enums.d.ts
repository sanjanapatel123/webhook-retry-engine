export declare const DeliveryStatus: {
    readonly PENDING: "PENDING";
    readonly PROCESSING: "PROCESSING";
    readonly SUCCEEDED: "SUCCEEDED";
    readonly DEAD: "DEAD";
};
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];
export declare const AttemptStatus: {
    readonly SUCCESS: "SUCCESS";
    readonly FAILED: "FAILED";
};
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];
//# sourceMappingURL=enums.d.ts.map