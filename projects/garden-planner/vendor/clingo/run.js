import { supportsThreads } from "./threads.js";
import { WitnessParser } from "./witnesses.js";
export class Runner {
    extraParams;
    results = [];
    errors = [];
    parser;
    clingo;
    constructor(extraParams = {}) {
        this.extraParams = extraParams;
    }
    async init() {
        // only initialize once
        if (!this.clingo) {
            const { singleThreaded, ...rest } = this.extraParams;
            const params = {
                print: (line) => {
                    this.results.push(line);
                    try {
                        this.parser?.feed(line);
                    }
                    catch (e) {
                        // a parser problem must only degrade streaming, never the run
                        this.parser = undefined;
                        console.warn("stopped streaming models:", e);
                    }
                },
                printErr: (line) => this.errors.push(line),
                ...rest,
            };
            // load lazily so that only the module for this environment is fetched
            const { default: factory } = supportsThreads() && !singleThreaded
                ? await import("./clingo-mt.js")
                : await import("./clingo.js");
            this.clingo = await factory(params);
        }
    }
    // Exit codes that indicate a failed run, as defined by clasp
    // (clasp/cli/clasp_app.h): out of memory (33), internal error (65), and
    // syntax or command line error (128). With native wasm exceptions, errors
    // are caught inside the wasm module and reported through the exit status
    // instead of an exception propagating to JavaScript.
    static ERROR_STATUS = new Set([33, 65, 128]);
    run(program, models = 1, options = [], onModel) {
        this.results = [];
        this.errors = [];
        this.parser = onModel && new WitnessParser(onModel);
        try {
            const status = this.clingo.ccall("run", "number", ["string", "string"], [program, `--outf=2 ${options.join(" ")} ${models}`]);
            if (Runner.ERROR_STATUS.has(status)) {
                throw new Error(`clingo run failed with status ${status}`);
            }
            const parsedResults = JSON.parse(this.results.join(""));
            delete parsedResults.Input;
            parsedResults.Warnings = this.errors.join("\n").split("\n\n");
            return parsedResults;
        }
        catch (e) {
            return {
                Result: "ERROR",
                Error: this.errors.join("\n") || String(e),
            };
        }
    }
}
export async function init(extraParams = {}) {
    const runner = new Runner(extraParams);
    await runner.init();
    return runner.run.bind(runner);
}
