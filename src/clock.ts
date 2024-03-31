export interface ClockState {
    displayValue: string;
    indefinite: boolean;
    isStopped: boolean;
    milliseconds: number;
}

export default class Clock {
    private isStopped = true;

    private milliseconds = 0;

    private setAt!: number;

    public constructor({
        isStopped = true,
        milliseconds = 0,
    } = {}) {
        this.update({
            isStopped,
            milliseconds,
        });
    }

    public getCurrentMilliseconds(): number {
        if (this.isStopped) {
            return this.milliseconds;
        }

        return Math.max(0, this.milliseconds - (Date.now() - this.setAt));
    }

    private getDisplayValue(milliseconds: number): string {
        if (this.isIndefinite()) {
            return '';
        }

        const totalSeconds = Math.round(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds - minutes * 60;

        return [
            minutes,
            ':',
            seconds < 10 ? '0' : '',
            seconds,
        ].join('');
    }

    public getState(): ClockState {
        const milliseconds = this.getCurrentMilliseconds();

        return {
            displayValue: this.getDisplayValue(milliseconds),
            indefinite: this.isIndefinite(),
            isStopped: this.isStopped,
            milliseconds,
        }
    }

    public isIndefinite(): boolean {
        return this.milliseconds === Number.POSITIVE_INFINITY;
    }

    public update({
        isStopped,
        milliseconds,
    }: {
        isStopped: boolean;
        milliseconds: number;
    }): void {
        this.isStopped = isStopped;

        if (milliseconds == null) {
            return;
        }

        this.milliseconds = Math.max(0, milliseconds);
        this.setAt = Date.now();
    }
}
