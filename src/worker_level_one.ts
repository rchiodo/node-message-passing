import { Worker, parentPort } from 'worker_threads';
import * as fs from 'fs';

class WorkerThreadOne {
    private _secondWorker: Worker | undefined;
    private _directWorker: Worker | undefined;

    run() {
        console.log('Worker thread one started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        if (message.type === 'start_dispatch') {
            this._secondWorker = new Worker(message.workerPath);
            this._secondWorker.on('message', this._handleMessage.bind(this));
        }
        if (message.type === 'stop_dispatch') {
            this._secondWorker?.terminate();
            this._secondWorker = undefined;
        }
        if (message.type === 'start_direct') {
            this._directWorker = new Worker(message.workerPath);
            this._directWorker.on('message', this._handleMessage.bind(this));
            // This doesn't work because then this thread can no longer receive or send messages
            this._directWorker.postMessage({ type: 'grandParentPort', port: parentPort }, [parentPort as any]);
        }
        if (message.type === 'stop_direct') {
            this._directWorker?.terminate();
            this._directWorker = undefined;
        }
        if (message.type === 'quit') {
            if (this._secondWorker) {
                this._secondWorker?.postMessage(message);
            }
            if (this._directWorker) {
                this._directWorker?.postMessage(message);
            }
            parentPort?.postMessage({ type: 'quit' });
            parentPort?.close();
        }
        if (message.type === 'read_notebook') {
            if (this._secondWorker) {
                this._secondWorker?.postMessage(message);
            } else if (this._directWorker) {
                this._directWorker?.postMessage(message);
            } else {
                const notebook = this._readNotebook(message.path);
                parentPort?.postMessage({ type: 'notebook', notebook, id: message.id, owner: 'one' });
            }
        }
        if (message.type === 'notebook') {
            if (!this._secondWorker) {
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

try {
    const workerThreadOne = new WorkerThreadOne();
    workerThreadOne.run();
} catch (ex) {
    console.error('Error in worker thread one', ex);
}
