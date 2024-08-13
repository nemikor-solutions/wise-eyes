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

        let seconds = Math.round(milliseconds / 1000);

        const hours = Math.floor(seconds / 60 / 60);
        seconds -= hours * 60 * 60;

        const minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;

        let parts: Array<string | number> = [];

        if (hours > 0) {
            parts = [
                hours,
                ':',
                minutes < 10 ? '0' : '',
            ];
        }

        parts = [
            ...parts,
            minutes,
            ':',
            seconds < 10 ? '0' : '',
            seconds,
        ];

        return parts.join('');
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
