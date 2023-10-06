import { parentPort, MessagePort } from 'worker_threads';
import * as fs from 'fs';
import { Worker } from 'cluster';

class WorkerDirectResponse {
    private _grandParentPort: MessagePort | undefined;
    run() {
        console.log('Worker direct response started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        if (message.type === 'grandParentPort') {
            this._grandParentPort = message.port;
        }
        if (message.type === 'quit') {
            parentPort?.postMessage({ type: 'quit' });
            parentPort?.close();
        }
        if (message.type === 'read_notebook') {
            const notebook = this._readNotebook(message.path);
            if (this._grandParentPort) {
                this._grandParentPort.postMessage({ type: 'notebook', notebook, id: message.id, owner: 'direct' });
            } else {
                parentPort?.postMessage({ type: 'notebook', notebook, id: message.id, owner: 'direct' });
            }
        }
    }

    private _readNotebook(path: string) {
        // Reread each time to mimic some actual processing
        const nb = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return nb;
    }
}

const worker = new WorkerDirectResponse();
worker.run();
