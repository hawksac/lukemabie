import { makeStream } from "./stream.js";
/**
 * The client API around a clingo worker, shared by the browser and Node entry
 * points: runs one program at a time, streams models to the caller, and can
 * abort a running solve by terminating the worker.
 */
export function createClient(spawn) {
    let worker;
    /** The one outstanding request, if any (requests are serialized). */
    let active;
    let queue = Promise.resolve();
    function fail(error) {
        active?.resolve({ Result: "ERROR", Error: String(error) });
        active = undefined;
    }
    function getWorker() {
        if (!worker) {
            const w = (worker = spawn());
            // ignore stray messages from a worker that restart() replaced
            w.onReply((reply) => {
                if (worker !== w) {
                    return;
                }
                if (reply.type === "model") {
                    active?.onModel?.(reply.model);
                }
                else {
                    active?.resolve(reply.result);
                    active = undefined;
                }
            });
            w.onError((error) => {
                if (worker !== w) {
                    return;
                }
                worker = undefined;
                fail(error);
                w.terminate();
            });
        }
        return worker;
    }
    /** Sends one request and resolves with its result reply. */
    function request(message, onModel) {
        return new Promise((resolve) => {
            active = { resolve, onModel };
            try {
                const w = getWorker();
                // keep the process alive while solving, but not while idle
                w.ref?.();
                w.postMessage(message);
            }
            catch (e) {
                // e.g. spawning the worker failed
                fail(e);
            }
        }).finally(() => worker?.unref?.());
    }
    /** Serializes requests so only one is outstanding at a time. */
    function enqueue(message, onModel) {
        const result = queue.then(() => request(message, onModel));
        queue = result.catch(() => { });
        return result;
    }
    async function run(...args) {
        const [program, models, options, onModel] = args;
        // run replies always carry a result
        return (await enqueue({ type: "run", args: [program, models, options], stream: !!onModel }, onModel));
    }
    /** Initializes clingo up front, optionally with a custom wasm url. */
    async function init(wasmUrl) {
        const result = await enqueue({ type: "init", wasmUrl });
        if (result?.Result === "ERROR") {
            throw new Error(result.Error);
        }
    }
    /**
     * Terminates the worker, aborting a running solve: the pending run resolves
     * with an error result, queued runs continue on a fresh worker, and a given
     * wasm url applies to the runs submitted after this call.
     */
    async function restart(wasmUrl) {
        if (worker) {
            const terminated = worker.terminate();
            worker = undefined;
            fail("Aborted by restart().");
            await terminated;
        }
        if (wasmUrl !== undefined) {
            await init(wasmUrl);
        }
    }
    return { run, init, restart, stream: makeStream(run) };
}
