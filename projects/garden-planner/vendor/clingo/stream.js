/**
 * Wraps a run function into an async generator that yields each model as it
 * is found and returns the final result.
 */
export function makeStream(run) {
    return async function* stream(program, models = 1, options = []) {
        const queue = [];
        let wake = () => { };
        let final;
        run(program, models, options, (model) => {
            queue.push(model);
            wake();
        }).then((result) => {
            final = result;
            wake();
        });
        while (final === undefined || queue.length > 0) {
            if (queue.length > 0) {
                yield queue.shift();
            }
            else {
                await new Promise((resolve) => (wake = resolve));
            }
        }
        return final;
    };
}
