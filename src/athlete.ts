export interface AthleteState {
    attemptNumber: number | null;
    bestClean: number | null;
    bestSnatch: number | null;
    category: string;
    clean1State: AttemptState;
    clean1Weight: number | null;
    clean1WeightPounds: number | null;
    clean2State: AttemptState;
    clean2Weight: number | null;
    clean2WeightPounds: number | null;
    clean3State: AttemptState;
    clean3Weight: number | null;
    clean3WeightPounds: number | null;
    cleanRank: number | null;
    membership: string | null;
    meta: Record<string, unknown> | null;
    name: string;
    nextWeight: number | null;
    nextWeightPounds: number | null;
    snatch1State: AttemptState;
    snatch1Weight: number | null;
    snatch1WeightPounds: number | null;
    snatch2State: AttemptState;
    snatch2Weight: number | null;
    snatch2WeightPounds: number | null;
    snatch3State: AttemptState;
    snatch3Weight: number | null;
    snatch3WeightPounds: number | null;
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

export type Meta = Record<string, Record<string, unknown>>;

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
    membership: string;
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
    private static meta: Meta = {};

    private static metaFields: string[] = [];

    private state!: AthleteState;

    public static getMeta(membership: string) {
        const meta: Record<string, unknown> = this.meta[membership] || {};

        this.metaFields.forEach((field) => {
            if (meta[field] == null) {
                meta[field] = '';
            }
        });

        return meta;
    }

    public static loadMeta(meta: Meta) {
        this.metaFields = Object.keys(meta[Object.keys(meta)[0]]);
        this.meta = meta;
    }

    public constructor(data: OwlcmsAthlete) {
        this.update(data);
    }

    private getAttemptNumber(data: OwlcmsAthlete): number | null {
        const requestedAttemptIndex = [
            ...data.sattempts,
            ...data.cattempts,
        ].findIndex((attempt) => attempt.liftStatus === 'request');

        return requestedAttemptIndex == null
            ? null
            : (requestedAttemptIndex % 3) + 1;
    }

    private getNextWeight(data: OwlcmsAthlete): number | null {
        const requestedAttempt = [
            ...data.sattempts,
            ...data.cattempts,
        ].find((attempt) => attempt.liftStatus === 'request');

        return requestedAttempt
            ? parseInt(requestedAttempt.stringValue)
            : null;
    }

    private getNextWeightPounds(data: OwlcmsAthlete): number | null {
        const kilos = this.getNextWeight(data);
        return kilos === null ? kilos : Math.round(kilos * 2.204);
    }

    public getState(): AthleteState {
        return this.state;
    }

    private parseWeight(weight: string): number {
        return parseInt(weight.replace(/\D/g, ''));
    }

    private parseWeightPounds(weight: string): number {
        const kilos = this.parseWeight(weight);
        return Number.isNaN(kilos) ? kilos : Math.round(kilos * 2.204);
    }

    public update(data: OwlcmsAthlete): void {
        this.state = {
            attemptNumber: this.getAttemptNumber(data),
            bestClean: parseInt(data.bestCleanJerk) || null,
            bestSnatch: parseInt(data.bestSnatch) || null,
            cleanRank: parseInt(data.cleanJerkRank) || null,
            clean1State: data.cattempts[0].liftStatus,
            clean1Weight: this.parseWeight(data.cattempts[0].stringValue) || null,
            clean1WeightPounds: this.parseWeightPounds(data.cattempts[0].stringValue) || null,
            clean2State: data.cattempts[1].liftStatus,
            clean2Weight: this.parseWeight(data.cattempts[1].stringValue) || null,
            clean2WeightPounds: this.parseWeightPounds(data.cattempts[1].stringValue) || null,
            clean3State: data.cattempts[2].liftStatus,
            clean3Weight: this.parseWeight(data.cattempts[2].stringValue) || null,
            clean3WeightPounds: this.parseWeightPounds(data.cattempts[2].stringValue) || null,
            category: data.category,
            membership: data.membership || null,
            meta: Athlete.getMeta(data.membership),
            name: data.fullName,
            nextWeight: this.getNextWeight(data),
            nextWeightPounds: this.getNextWeightPounds(data),
            snatch1State: data.sattempts[0].liftStatus,
            snatch1Weight: this.parseWeight(data.sattempts[0].stringValue) || null,
            snatch1WeightPounds: this.parseWeightPounds(data.sattempts[0].stringValue) || null,
            snatch2State: data.sattempts[1].liftStatus,
            snatch2Weight: this.parseWeight(data.sattempts[1].stringValue) || null,
            snatch2WeightPounds: this.parseWeightPounds(data.sattempts[1].stringValue) || null,
            snatch3State: data.sattempts[2].liftStatus,
            snatch3Weight: this.parseWeight(data.sattempts[2].stringValue) || null,
            snatch3WeightPounds: this.parseWeightPounds(data.sattempts[2].stringValue) || null,
            snatchRank: parseInt(data.snatchRank) || null,
            startNumber: parseInt(data.startNumber),
            team: data.teamName,
            total: parseInt(data.total) || null,
            totalRank: parseInt(data.totalRank) || null,
        };
    }
}
