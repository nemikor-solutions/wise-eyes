export interface AthleteState {
    bestClean: number | null;
    bestSnatch: number | null;
    category: string;
    clean1State: AttemptState;
    clean1Weight: number | null;
    clean2State: AttemptState;
    clean2Weight: number | null;
    clean3State: AttemptState;
    clean3Weight: number | null;
    cleanRank: number | null;
    name: string;
    nextWeight: number | null;
    snatch1State: AttemptState;
    snatch1Weight: number | null;
    snatch2State: AttemptState;
    snatch2Weight: number | null;
    snatch3State: AttemptState;
    snatch3Weight: number | null;
    snatchRank: number | null;
    startNumber: number;
    team: string;
    total: number | null;
    totalRank: number | null;
}

type AttemptState =
    | 'bad'
    | 'empty'
    | 'good'
    | 'request';

export interface OwlcmsAthlete {
    bestCleanJerk: string;
    bestSnatch: string;
    category: string;
    cattempts: OwlcmsAttempt[];
    cleanJerkRank: string;
    custom1: string;
    custom2: string;
    flagURL: string;
    fullName: string;
    group: string;
    sattempts: OwlcmsAttempt[];
    sinclair: string;
    sinclairRank: string;
    snatchRank: string;
    startNumber: string;
    subCategory: string;
    teamName: string;
    total: string;
    totalRank: string;
    yearOfBirth: string;
}

export type OwlcmsAthleteList = Array<OwlcmsAthlete | OwlcmsAthleteSpacer>;

export interface OwlcmsAthleteSpacer {
    isSpacer: true;
}

export interface OwlcmsAttempt {
    liftStatus: AttemptState;
    stringValue: string;
}

export default class Athlete {
    private state!: AthleteState;

    public constructor(data: OwlcmsAthlete) {
        this.update(data);
    }

    private getNextWeight(data: OwlcmsAthlete): number | null {
        let requestedAttempt = [
            ...data.sattempts,
            ...data.cattempts,
        ].find((attempt) => attempt.liftStatus === 'request');

        return requestedAttempt
            ? parseInt(requestedAttempt.stringValue)
            : null;
    }

    public getState(): AthleteState {
        return this.state;
    }

    private parseWeight(weight: string): number {
        return parseInt(weight.replace(/\D/g, ''));
    }

    public update(data: OwlcmsAthlete): void {
        this.state = {
            bestClean: parseInt(data.bestCleanJerk) || null,
            bestSnatch: parseInt(data.bestSnatch) || null,
            cleanRank: parseInt(data.cleanJerkRank) || null,
            clean1State: data.cattempts[0].liftStatus,
            clean1Weight: this.parseWeight(data.cattempts[0].stringValue) || null,
            clean2State: data.cattempts[1].liftStatus,
            clean2Weight: this.parseWeight(data.cattempts[1].stringValue) || null,
            clean3State: data.cattempts[2].liftStatus,
            clean3Weight: this.parseWeight(data.cattempts[2].stringValue) || null,
            category: data.category,
            name: data.fullName,
            nextWeight: this.getNextWeight(data),
            snatch1State: data.sattempts[0].liftStatus,
            snatch1Weight: this.parseWeight(data.sattempts[0].stringValue) || null,
            snatch2State: data.sattempts[1].liftStatus,
            snatch2Weight: this.parseWeight(data.sattempts[1].stringValue) || null,
            snatch3State: data.sattempts[2].liftStatus,
            snatch3Weight: this.parseWeight(data.sattempts[2].stringValue) || null,
            snatchRank: parseInt(data.snatchRank) || null,
            startNumber: parseInt(data.startNumber),
            team: data.teamName,
            total: parseInt(data.total) || null,
            totalRank: parseInt(data.totalRank) || null,
        };
    }
}
