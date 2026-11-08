import { serve } from "./worker.js";
const post = postMessage;
const handle = serve(post);
onmessage = (event) => handle(event.data);
