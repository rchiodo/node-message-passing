import { Worker, parentPort } from 'worker_threads';
import * as fs from 'fs';

class WorkerThreadOne {
    private _dispatcher: boolean = false;
    private _secondWorker: Worker | undefined;

    run() {
        console.log('Worker thread one started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        if (message.type === 'start_dispatch') {
            this._dispatcher = true;
            this._secondWorker = new Worker(message.workerPath);
            this._secondWorker.on('message', this._handleMessage.bind(this));
        }
        if (message.type === 'stop_dispatch') {
            this._dispatcher = false;
            this._secondWorker?.postMessage({ type: 'quit' });
            this._secondWorker?.terminate();
        }
        if (message.type === 'quit') {
            if (this._dispatcher) {
                this._secondWorker?.postMessage(message);
            }
            parentPort?.postMessage({ type: 'quit' });
            parentPort?.close();
        }
        if (message.type === 'read_notebook') {
            if (this._dispatcher) {
                this._secondWorker?.postMessage(message);
            } else {
                const notebook = this._readNotebook(message.path);
                parentPort?.postMessage({ type: 'notebook', notebook, id: message.id, owner: 'one' });
            }
        }
        if (message.type === 'notebook') {
            if (!this._dispatcher) {
                console.log(`First worker is not dispatcher, ignoring notebook message`);
            } else {
                parentPort?.postMessage(message);
            }
        }
    }

    private _readNotebook(path: string) {
        // Reread each time to mimic some actual processing
        const nb = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return nb;
    }
}

const workerThreadOne = new WorkerThreadOne();
workerThreadOne.run();
