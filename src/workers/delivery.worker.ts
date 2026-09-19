import { prisma } from "../lib/prisma.js";

const WEBHOOK_URL = process.env.WEBHOOK_URL!;
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 1000);

const RETRYABLE_STATUS_CODES = [408, 425, 429, 500, 502, 503, 504];

function calculateRetryDelay(attemptNumber: number) {
  return RETRY_DELAY_MS * 2 ** (attemptNumber - 1);
}

export async function processPendingJobs(jobId?: string) {
  const now = new Date();

  // Jobs stuck in PROCESSING for too long are made retryable again.
  const processingTimeoutMs = 30_000;

  const staleBefore = new Date(Date.now() - processingTimeoutMs);

  await prisma.deliveryJob.updateMany({
    where: {
      status: "PROCESSING",
      processingStartedAt: {
        lt: staleBefore,
      },
    },
    data: {
      status: "PENDING",
      processingStartedAt: null,
    },
  });

  const jobs = await prisma.deliveryJob.findMany({
    where: {
      ...(jobId ? { id: jobId } : {}),
      status: "PENDING",
      nextAttemptAt: {
        lte: now,
      },
    },
    take: 10,
  });

  for (const job of jobs) {
    const claimed = await prisma.deliveryJob.updateMany({
      where: {
        id: job.id,
        status: "PENDING",
        nextAttemptAt: {
          lte: new Date(),
        },
      },
      data: {
        status: "PROCESSING",
        processingStartedAt: new Date(),
        attemptCount: {
          increment: 1,
        },
      },
    });

    if (claimed.count === 0) {
      continue;
    }

    const claimedJob = await prisma.deliveryJob.findUnique({
      where: {
        id: job.id,
      },
      include: {
        event: true,
      },
    });

    if (!claimedJob) {
      continue;
    }

    await deliverJob(claimedJob);
  }
}

async function deliverJob(job: any) {
  const attemptNumber = job.attemptCount;
  const startedAt = new Date();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId: job.event.eventId,
        type: job.event.type,
        occurredAt: job.event.occurredAt,
        payload: job.event.payload,
      }),
    });

    const finishedAt = new Date();

    if (response.ok) {
      await prisma.deliveryAttempt.create({
        data: {
          deliveryJobId: job.id,
          attemptNumber,
          status: "SUCCESS",
          httpStatus: response.status,
          startedAt,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      });

      await prisma.deliveryJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          processingStartedAt: null,
          lastError: null,
        },
      });

      console.log(`✅ ${job.event.eventId} delivered successfully`);

      return;
    }

    // Failed attempt
    await prisma.deliveryAttempt.create({
      data: {
        deliveryJobId: job.id,
        attemptNumber,
        status: "FAILED",
        httpStatus: response.status,
        error: `HTTP ${response.status}`,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });

    console.log(`❌ ${job.event.eventId} failed with HTTP ${response.status}`);

    // Check if this error is retryable
    const isRetryable = RETRYABLE_STATUS_CODES.includes(response.status);

    if (!isRetryable) {
      await markAsDead(job.id, `HTTP ${response.status}`);
      return;
    }

    // Check attempt limit
    if (attemptNumber >= job.maxAttempts) {
      await markAsDead(job.id, `Maximum attempts reached`);
      return;
    }

    // Schedule retry
    const nextAttemptAt = new Date(Date.now() + RETRY_DELAY_MS);

    await prisma.deliveryJob.update({
      where: { id: job.id },
      data: {
        status: "PENDING",
        processingStartedAt: null,
        nextAttemptAt,
        lastError: `HTTP ${response.status}`,
      },
    });

    console.log(`🔄 Retry scheduled for ${job.event.eventId}`);
  } catch (error) {
    const finishedAt = new Date();

    await prisma.deliveryAttempt.create({
      data: {
        deliveryJobId: job.id,
        attemptNumber,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });

    console.log(`❌ Network error for ${job.event.eventId}`);

    if (attemptNumber >= job.maxAttempts) {
      await markAsDead(job.id, "Maximum attempts reached");
      return;
    }

    await prisma.deliveryJob.update({
      where: { id: job.id },
      data: {
        status: "PENDING",
        processingStartedAt: null,
        nextAttemptAt: new Date(
          Date.now() + calculateRetryDelay(attemptNumber),
        ),
        lastError: error instanceof Error ? error.message : "Network error",
      },
    });

    console.log(`🔄 Retry scheduled for ${job.event.eventId}`);
  }
}

async function markAsDead(jobId: string, error: string) {
  await prisma.deliveryJob.update({
    where: { id: jobId },
    data: {
      status: "DEAD",
      processingStartedAt: null,
      lastError: error,
    },
  });

  console.log(`🛑 Job marked as DEAD`);
}
