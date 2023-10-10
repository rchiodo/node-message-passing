import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import { HeaderIndex, HeaderSize, SyncSize } from './sharedBufferConstants';
import * as avro from 'avsc';

class WorkerSharedBuffer {
    private _sharedBuffer: SharedArrayBuffer | undefined;
    private _avroSchema: avro.Type | undefined;
    run() {
        console.log('Worker thread shared buffer avro started');
        parentPort?.on('message', this._handleMessage.bind(this));
    }

    private _handleMessage(message: any) {
        try {
            if (message.type === 'quit') {
                parentPort?.postMessage({ type: 'quit' });
                parentPort?.close();
            }
            if (message.type === 'shared_buffer') {
                this._sharedBuffer = message.sharedBuffer;
            }
            if (message.type === 'read_notebook_shared' && this._sharedBuffer) {
                const notebook = this._readNotebook(message.path);
                const schema = this._getSchema(notebook);

                // First write the notebook to the shared buffer
                const nb = schema.toBuffer(notebook);
                const requestOffset = SyncSize.total + HeaderSize.total;

                // Make sure it will fit
                if (requestOffset + nb.byteLength > this._sharedBuffer.byteLength) {
                    throw new Error('Notebook is too large to fit in shared buffer');
                }

                // Write the header
                const header = new Uint32Array(this._sharedBuffer, SyncSize.total, HeaderSize.total / 4);
                header[HeaderIndex.messageOffset] = requestOffset;
                header[HeaderIndex.messageByteLength] = nb.byteLength;

                // Write the notebook
                const raw = new Uint8Array(this._sharedBuffer);
                raw.set(nb, requestOffset);

                // Then notify the otherside that the notebook is ready
                const sync = new Int32Array(this._sharedBuffer, 0, 1);
                Atomics.store(sync, 0, 1);
                Atomics.notify(sync, 0);
            }
        } catch (ex) {
            console.error(`Error in worker thread shared buffer: ${ex}`);
        }
    }

    private _readNotebook(path: string) {
        // Reread each time to mimic some actual processing
        const nb = JSON.parse(fs.readFileSync(path, 'utf-8'));
        return nb;
    }

    private _getSchema(notebook: any) {
        if (!this._avroSchema) {
            this._avroSchema = avro.Type.forValue(notebook);
        }
        return this._avroSchema;
    }
}

const worker = new WorkerSharedBuffer();
worker.run();
