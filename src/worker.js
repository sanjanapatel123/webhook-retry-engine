import "dotenv/config";
import { processPendingJobs } from "./workers/delivery.worker.js";
processPendingJobs()
    .then(() => {
    console.log("Worker finished");
    process.exit(0);
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map