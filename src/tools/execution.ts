export const FILE_TOOL_TIMEOUT_MS = 30_000;
export const BASH_TOOL_TIMEOUT_MS = 120_000;

const activeExecutions = new Set<Promise<unknown>>();

export async function waitForToolExecutions(): Promise<void> {
	while (activeExecutions.size > 0) {
		await Promise.allSettled([...activeExecutions]);
	}
}

export function withToolSignal<T>(
	parent: AbortSignal | undefined,
	timeoutMs: number,
	operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const execution = executeWithSignal(parent, timeoutMs, operation);
	activeExecutions.add(execution);
	void execution.then(
		() => activeExecutions.delete(execution),
		() => activeExecutions.delete(execution),
	);
	return execution;
}

async function executeWithSignal<T>(
	parent: AbortSignal | undefined,
	timeoutMs: number,
	operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const controller = new AbortController();
	const cancel = () => controller.abort(parent?.reason);
	if (parent?.aborted) cancel();
	else parent?.addEventListener("abort", cancel, { once: true });
	const timer = setTimeout(() => {
		controller.abort(new DOMException(`Tool timed out after ${timeoutMs} ms`, "TimeoutError"));
	}, timeoutMs);
	try {
		controller.signal.throwIfAborted();
		const result = await operation(controller.signal);
		controller.signal.throwIfAborted();
		return result;
	} catch (error) {
		controller.signal.throwIfAborted();
		throw error;
	} finally {
		clearTimeout(timer);
		parent?.removeEventListener("abort", cancel);
	}
}
