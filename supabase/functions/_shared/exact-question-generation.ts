export interface QuestionDrop {
  reason: string;
  stem?: string;
}

export interface ExactQuestionDiagnostics {
  requested: number;
  raw: number;
  valid: number;
  duplicate: number;
  dropped: QuestionDrop[];
  attempts: number;
}

export class QuestionGenerationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export class ExactQuestionCountError extends Error {
  constructor(public readonly diagnostics: ExactQuestionDiagnostics) {
    super(`Generated ${diagnostics.valid} of ${diagnostics.requested} valid unique questions. Please try again.`);
  }
}

const normalizeStem = (value: unknown) => String(value ?? "")
  .toLowerCase()
  .replace(/<[^>]*>/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function generateExactQuestions<T>(options: {
  requested: number;
  batchSize?: number;
  maxAttempts?: number;
  getStem: (question: T) => unknown;
  validate: (question: T) => { valid: boolean; reason?: string };
  generateBatch: (count: number, excludedStems: string[], attempt: number) => Promise<T[]>;
}): Promise<{ questions: T[]; diagnostics: ExactQuestionDiagnostics }> {
  const requested = Math.max(1, Math.floor(options.requested));
  const batchSize = options.batchSize ?? 5;
  const maxAttempts = options.maxAttempts ?? Math.max(6, Math.ceil(requested / batchSize) * 3);
  const questions: T[] = [];
  const seen = new Set<string>();
  const dropped: QuestionDrop[] = [];
  let raw = 0;
  let duplicate = 0;
  let attempts = 0;

  while (questions.length < requested && attempts < maxAttempts) {
    const need = Math.min(batchSize, requested - questions.length);
    attempts += 1;
    let batch: T[];
    try {
      batch = await options.generateBatch(
        need,
        questions.map((question) => String(options.getStem(question) ?? "")).filter(Boolean),
        attempts,
      );
    } catch (error) {
      if (error instanceof QuestionGenerationError && (error.status === 429 || error.status >= 500) && attempts < maxAttempts) {
        const backoff = error.retryAfterSeconds
          ? error.retryAfterSeconds * 1000
          : Math.min(8000, 500 * (2 ** (attempts - 1))) + Math.floor(Math.random() * 250);
        console.warn(`Retryable question generation error ${error.status}; waiting ${backoff}ms`);
        await wait(backoff);
        continue;
      }
      throw error;
    }

    raw += batch.length;
    for (const question of batch) {
      if (questions.length >= requested) break;
      const stem = String(options.getStem(question) ?? "").trim();
      const normalized = normalizeStem(stem);
      if (!normalized || seen.has(normalized)) {
        duplicate += 1;
        dropped.push({ reason: normalized ? "duplicate stem" : "empty stem", stem: stem.slice(0, 160) });
        continue;
      }
      const validation = options.validate(question);
      if (!validation.valid) {
        dropped.push({ reason: validation.reason ?? "invalid question", stem: stem.slice(0, 160) });
        continue;
      }
      seen.add(normalized);
      questions.push(question);
    }
  }

  const diagnostics: ExactQuestionDiagnostics = {
    requested,
    raw,
    valid: questions.length,
    duplicate,
    dropped,
    attempts,
  };
  console.log("Exact question generation diagnostics:", JSON.stringify(diagnostics));
  if (questions.length !== requested) throw new ExactQuestionCountError(diagnostics);
  return { questions, diagnostics };
}