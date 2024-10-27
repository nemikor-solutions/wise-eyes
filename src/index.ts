import createApp from './lib/server';

if (require.main === module) {
    const app = createApp();
    app.listen(process.env.PORT || 8082);
}

export type {
    AthleteState,
    AttemptState,
    Meta,
} from './lib/athlete';
export { default as Athlete } from './lib/athlete';

export type {
    ClockState,
} from './lib/clock';
export { default as Clock } from './lib/clock';

export type {
    BreakType,
    CeremonyType,
    Decision,
    FopState,
    LiftTypeKey,
    Mode,
    PlatformState,
    Session,
} from './lib/platform';
export { default as Platform } from './lib/platform';

export { default as createApp } from './lib/server';
