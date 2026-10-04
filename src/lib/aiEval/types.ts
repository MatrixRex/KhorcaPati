/** Item expectation; `name` may list accepted alternatives (e.g. ['dim', 'egg']). */
export interface ExpectedItem {
    name: string | string[];
    qty: number;
    unit: string;
}

export interface ExpectedTransaction {
    amount: number;
    type: 'expense' | 'income';
    /** Accepted category, or a list of acceptable categories. */
    category: string | string[];
    /** Defaults to the case's referenceDate. */
    date?: string;
    /** Only checked when present. */
    items?: ExpectedItem[];
}

export interface EvalCase {
    id: string;
    /** Language tag first (en | banglish | bangla | mixed), then feature tags. */
    tags: string[];
    note: string;
    referenceDate: string;
    expected: ExpectedTransaction[];
}

/** Per-call performance numbers an engine may report. */
export interface GenerationStats {
    promptTokens?: number;
    completionTokens?: number;
    prefillTokPerSec?: number;
    decodeTokPerSec?: number;
    timeToFirstTokenMs?: number;
}

export interface GenerateRequest {
    systemPrompt: string;
    userMessage: string;
    /** Standard JSON Schema the reply must follow (engines that support constrained output enforce it). */
    jsonSchema: object;
    /** The raw note and its date, for engines that don't use prompts (offline rules). */
    note: string;
    referenceDate: string;
    signal?: AbortSignal;
}

export interface GenerateResult {
    text: string;
    stats?: GenerationStats;
}

/** Anything that can turn a prompt into a JSON reply: an on-device model, Chrome's built-in AI, or a cloud API. */
export interface AIEngine {
    id: string;
    label: string;
    generate(req: GenerateRequest): Promise<GenerateResult>;
}

/** The subset of a parsed transaction that the evaluation scores. */
export interface PredictedTransaction {
    amount: number;
    type: 'expense' | 'income';
    category: string;
    date: string;
    items: Array<{ name: string; qty: number; unit: string }>;
}
