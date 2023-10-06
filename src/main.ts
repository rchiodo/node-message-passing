// Basic flow
// 1. Create a worker thread that reads a notebook
// 2. Send a message to worker thread to give back the notebook json
// 3. Handle message in main thread and output the notebook kernel section
// 4. Send a quit message to worker thread
// 5. Wait for quit response
// 6. Terminate the worker thread

import { Worker } from 'worker_threads';
import * as path from 'path';
import { Deferred } from './deferred';
import { Duration } from './duration';

class MainThread {
    private _worker: Worker;
    private _notebookPath = path.join(process.cwd(), 'notebooks', 'notebook_level_one.ipynb');
    private _logs: string[] = [];
    private _requestId: number = 0;
    private _pendingRequests: Map<number, Deferred<any>> = new Map<number, Deferred<any>>();

    constructor() {
        this._worker = new Worker('./build/worker_level_one.js');
        this._worker.on('message', this._handleMessage.bind(this));
        this._worker.on('error', this._handleError.bind(this));
        this._worker.on('exit', this._handleExit.bind(this));
    }

    async run(iterations: number = 1) {
        console.log('Main thread started');
        const singleThreadDuration = new Duration();
        for (let i = 0; i < iterations; i++) {
            await this.readNotebook();
        }
        const singleThreadTime = singleThreadDuration.getDurationInMilliseconds();
        const multiThreadDuration = new Duration();
        this._logs.push('Switching to dispatch mode');
        this._worker.postMessage({ type: 'start_dispatch', workerPath: './build/worker_level_two.js' });
        for (let i = 0; i < iterations; i++) {
            await this.readNotebook();
        }
        const multiThreadTime = multiThreadDuration.getDurationInMilliseconds();
        this._worker.postMessage({ type: 'stop_dispatch' });
        this._worker.postMessage({ type: 'quit' });
        console.log('Main thread finished');
        console.log(`Single time: ${singleThreadTime}ms`);
        console.log(`Multithread time: ${multiThreadTime}ms`);
    }

    async readNotebook() {
        const id = this._requestId++;
        const deferred = new Deferred<any>();
        this._pendingRequests.set(id, deferred);
        this._worker.postMessage({ type: 'read_notebook', path: this._notebookPath, id });
        return deferred.promise;
    }
    private _handleMessage(message: any) {
        if (message.type === 'notebook') {
            this._logs.push(`Got notebook from worker thread ${message.owner}`);
            this._logs.push(message.notebook.metadata.kernelspec);
            const deferred = this._pendingRequests.get(message.id);
            if (deferred) {
                deferred.resolve(message.notebook);
                this._pendingRequests.delete(message.id);
            }
        } else if (message.type === 'quit') {
            this._logs.push(`Got quit message from worker thread`);
            this._worker.terminate();
        }
    }

    private _handleError(error: Error) {
        console.log(`Worker thread error: ${error}`);
    }

    private _handleExit(code: number) {
        console.log(`Worker thread exited with code ${code}`);
    }
}

const mainThread = new MainThread();
mainThread.run(1);
