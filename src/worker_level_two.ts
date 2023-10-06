import { parentPort } from 'worker_threads';
import * as fs from 'fs';

class WorkerThreadTwo {
    run() {
        console.log('Worker thread two started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        if (message.type === 'quit') {
            parentPort?.postMessage({ type: 'quit' });
            parentPort?.close();
        }
        if (message.type === 'read_notebook') {
            const notebook = this._readNotebook(message.path);
            parentPort?.postMessage({ type: 'notebook', notebook, id: message.id, owner: 'two' });
        }
    }

    private _readNotebook(path: string) {
        // Reread each time to mimic some actual processing
        const nb = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return nb;
    }
}

const workerThreadTwo = new WorkerThreadTwo();
workerThreadTwo.run();
