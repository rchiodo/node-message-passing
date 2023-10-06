export class Duration {
    private _startTime: number;

    constructor() {
        this._startTime = Date.now();
    }

    getDurationInMilliseconds() {
        const curTime = Date.now();
        return curTime - this._startTime;
    }

    getDurationInSeconds() {
        return this.getDurationInMilliseconds() / 1000;
    }
}
