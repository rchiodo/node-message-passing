// Class that holds a promise so that it can be resolved at a later time.
export class Deferred<T> {
    private _resolve!: (value: T | PromiseLike<T>) => void;
    private _reject!: (reason?: any) => void;
    private _resolved = false;
    private _rejected = false;
    private _promise: Promise<T>;

    constructor(private _scope: any = null) {
        this._promise = new Promise<T>((res, rej) => {
            this._resolve = res;
            this._reject = rej;
        });
    }

    get promise(): Promise<T> {
        return this._promise;
    }

    get resolved(): boolean {
        return this._resolved;
    }

    get rejected(): boolean {
        return this._rejected;
    }

    get completed(): boolean {
        return this._rejected || this._resolved;
    }

    resolve(_value?: T | PromiseLike<T>) {
        // eslint-disable-next-line prefer-rest-params
        this._resolve.apply(this._scope ? this._scope : this, arguments as any);
        this._resolved = true;
    }

    reject(_reason?: any) {
        // eslint-disable-next-line prefer-rest-params
        this._reject.apply(this._scope ? this._scope : this, arguments as any);
        this._rejected = true;
    }
}
