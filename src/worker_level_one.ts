import { Worker, parentPort } from 'worker_threads';
import * as fs from 'fs';
import { HeaderSize, MaxSharedBufferSize, SyncSize } from './sharedBufferConstants';
import { unpack } from 'msgpackr';
import * as avro from 'avsc';

class WorkerThreadOne {
    private _secondWorker: Worker | undefined;
    private _directWorker: Worker | undefined;
    private _sharedBufferWorker: Worker | undefined;
    private _sharedBuffer: SharedArrayBuffer | undefined;
    private _sharedBufferAvroWorker: Worker | undefined;
    private _avroSchema: avro.Type | undefined;

    run() {
        console.log('Worker thread one started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        switch (message.type) {
            case 'start_dispatch':
                this._secondWorker = new Worker(message.workerPath);
                this._secondWorker.on('message', this._handleMessage.bind(this));
                break;
            case 'stop_dispatch':
                this._secondWorker?.terminate();
                this._secondWorker = undefined;
                break;
            case 'start_direct':
                this._directWorker = new Worker(message.workerPath);
                this._directWorker.on('message', this._handleMessage.bind(this));
                // This doesn't work because then this thread can no longer receive or send messages
                this._directWorker.postMessage({ type: 'grandParentPort', port: parentPort }, [parentPort as any]);
                break;
            case 'stop_direct':
                this._directWorker?.terminate();
                this._directWorker = undefined;
                break;
            case 'start_shared':
                this._sharedBufferWorker = new Worker(message.workerPath);
                this._sharedBufferWorker.on('message', this._handleMessage.bind(this));
                // Allocate a really large buffer for the messages to the shared buffer worker.
                // This is because we don't want to have to reallocate it each time.
                this._sharedBuffer = new SharedArrayBuffer(
                    HeaderSize.total + SyncSize.total + MaxSharedBufferSize.total
                );
                this._sharedBufferWorker.postMessage({ type: 'shared_buffer', sharedBuffer: this._sharedBuffer });
                break;
            case 'stop_shared':
                this._sharedBufferWorker?.terminate();
                this._sharedBufferWorker = undefined;
                break;
            case 'start_shared_avro':
                this._sharedBufferAvroWorker = new Worker(message.workerPath);
                this._sharedBufferAvroWorker.on('message', this._handleMessage.bind(this));
                // Allocate a really large buffer for the messages to the shared buffer worker.
                // This is because we don't want to have to reallocate it each time.
                this._sharedBuffer = new SharedArrayBuffer(
                    HeaderSize.total + SyncSize.total + MaxSharedBufferSize.total
                );
                this._sharedBufferAvroWorker.postMessage({ type: 'shared_buffer', sharedBuffer: this._sharedBuffer });
                break;
            case 'stop_shared_avro':
                this._sharedBufferAvroWorker?.terminate();
                this._sharedBufferAvroWorker = undefined;
                break;
            case 'quit':
                if (this._secondWorker) {
                    this._secondWorker?.postMessage(message);
                }
                if (this._directWorker) {
                    this._directWorker?.postMessage(message);
                }
                parentPort?.postMessage({ type: 'quit' });
                parentPort?.close();
                break;
            case 'read_notebook':
                if (this._secondWorker) {
                    this._secondWorker?.postMessage(message);
                } else if (this._directWorker) {
                    this._directWorker?.postMessage(message);
                } else if (this._sharedBufferWorker && this._sharedBuffer) {
                    const sync = new Int32Array(this._sharedBuffer, 0, 1);
                    Atomics.store(sync, 0, 0);
                    this._sharedBufferWorker?.postMessage({
                        type: 'read_notebook_shared',
                        path: message.path,
                    });

                    // Wait on the shared buffer to be ready.
                    const result = Atomics.waitAsync(sync, 0, 0);
                    if (result.async) {
                        result.value.then(() => {
                            // Read the header
                            const header = new Uint32Array(this._sharedBuffer!, SyncSize.total, HeaderSize.total / 4);
                            const requestOffset = header[0];
                            const requestLength = header[1];

                            // Read the notebook
                            const raw = new Uint8Array(this._sharedBuffer!);
                            const nb = unpack(raw.slice(requestOffset, requestOffset + requestLength));

                            // Send the notebook back to the main thread
                            parentPort?.postMessage({
                                type: 'notebook',
                                notebook: nb,
                                id: message.id,
                                owner: 'shared',
                            });
                        });
                    }
                } else if (this._sharedBufferAvroWorker && this._sharedBuffer) {
                    const schema = this._getSchema(message.path);
                    const sync = new Int32Array(this._sharedBuffer, 0, 1);
                    Atomics.store(sync, 0, 0);
                    this._sharedBufferAvroWorker?.postMessage({
                        type: 'read_notebook_shared',
                        path: message.path,
                    });

                    // Wait on the shared buffer to be ready.
                    const result = Atomics.waitAsync(sync, 0, 0);
                    if (result.async) {
                        result.value.then(() => {
                            // Read the header
                            const header = new Uint32Array(this._sharedBuffer!, SyncSize.total, HeaderSize.total / 4);
                            const requestOffset = header[0];
                            const requestLength = header[1];

                            // Read the notebook
                            const raw = new Uint8Array(this._sharedBuffer!);
                            const nb = schema.decode(
                                Buffer.from(raw.slice(requestOffset, requestOffset + requestLength))
                            );

                            // Send the notebook back to the main thread
                            parentPort?.postMessage({
                                type: 'notebook',
                                notebook: nb.value,
                                id: message.id,
                                owner: 'shared',
                            });
                        });
                    }
                } else {
                    const notebook = this._readNotebook(message.path);
                    parentPort?.postMessage({ type: 'notebook', notebook, id: message.id, owner: 'one' });
                }
                break;
            case 'notebook':
                if (!this._secondWorker) {
                    console.log(`First worker is not dispatcher, ignoring notebook message`);
                } else {
                    parentPort?.postMessage(message);
                }
                break;
        }
    }

    private _readNotebook(path: string) {
        // Reread each time to mimic some actual processing
        const nb = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return nb;
    }

    private _getSchema(path: string) {
        if (!this._avroSchema) {
            this._avroSchema = avro.Type.forValue(this._readNotebook(path));
        }
        return this._avroSchema;
    }
}

try {
    const workerThreadOne = new WorkerThreadOne();
    workerThreadOne.run();
} catch (ex) {
    console.error('Error in worker thread one', ex);
}
