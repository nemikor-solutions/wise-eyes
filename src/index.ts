import type {
    Mode,
} from './platform';

import cors from 'cors';
import express from 'express';
import Platform from './platform';

type PlatformCallback = (platform: Platform) => void;

const app = express();

const DEBUG = false;

app.use(cors());
app.use(express.urlencoded({
    extended: true,
}));

// TODO: Jury decisions

function withPlatform(
    request: express.Request,
    response: express.Response,
    callback: PlatformCallback
): void {
    const platform = Platform.getPlatform(request.params.platform);

    callback(platform);
}

function handleMode({
    breakType,
    mode,
    platform,
}: {
    breakType: Mode;
    mode: string;
    platform: Platform;
}): void {
    switch (mode) {
        case 'CEREMONY':
        case 'CURRENT_ATHLETE':
        case 'INTERRUPTION':
        case 'INTRO_COUNTDOWN':
        case 'LIFT_COUNTDOWN':
            platform.setMode(breakType || 'LIFTING');
            break;
        case 'WAIT':
            platform.setMode('BEFORE_SESSION');
            break;
        default:
            if (DEBUG) {
                console.log(`!! UNHANDLED MODE mode=${mode}`)
            }
    }
}

app.post('/decision', (request, response) => {
    response.end();

    if (DEBUG) {
        console.log('/decision');
        console.log(request.body);
    }

    const platform = Platform.getPlatform(request.body.fop);

    switch (request.body.eventType) {
        case 'FULL_DECISION':
            platform.setDecisions({
                centerReferee: !request.body.d2
                    ? null
                    : request.body.d2 === 'true'
                        ? 'good'
                        : 'bad',
                leftReferee: !request.body.d1
                    ? null
                    : request.body.d1 === 'true'
                        ? 'good'
                        : 'bad',
                rightReferee: !request.body.d3
                    ? null
                    : request.body.d3 === 'true'
                        ? 'good'
                        : 'bad',
            });
            break;
        case 'DOWN_SIGNAL':
            platform.setDownSignal(request.body.down === 'true');
            break;
        // TODO: Potentially ignore resets and just use other clock events
        // or some custom timeout for resetting
        case 'RESET':
            platform.resetDecisions();
            break;
        default:
            if (DEBUG) {
                console.log(`!! UNHANDLED DECISION EVENT eventType=${request.body.eventType}`);
            }
    }
});

app.post('/timer', (request, response) => {
    response.end();

    if (DEBUG) {
        console.log('/timer');
        console.log(request.body);
    }

    const platform = Platform.getPlatform(request.body.fopName);
    const athleteClock = platform.getAthleteClock();
    const breakClock = platform.getBreakClock();

    switch (request.body.eventType) {
        case 'BreakPaused':
        case 'BreakSetTime':
        case 'BreakStarted':
            breakClock.update({
                isStopped: request.body.eventType !== 'BreakStarted',
                milliseconds: request.body.milliseconds
                    ? request.body.milliseconds
                    : Number.POSITIVE_INFINITY,
            });
            break;
        case 'SetTime':
        case 'StartTime':
        case 'StopTime':
            athleteClock.update({
                isStopped: request.body.eventType !== 'StartTime',
                milliseconds: request.body.milliseconds,
            });
            break;
        default:
            if (DEBUG) {
                console.log(`!! UNHANDLED TIMER EVENT eventType=${request.body.eventType}`);
            }
    }

    handleMode({
        breakType: request.body.breakType,
        mode: request.body.mode,
        platform,
    });
});

app.post('/update', (request, response) => {
    response.end();

    if (DEBUG) {
        console.log('/update');
        // console.log(request.body);
    }

    const platform = Platform.getPlatform(request.body.fop);

    platform.setSession({
        description: request.body.groupInfo,
        name: request.body.groupName,
    });
    platform.updateAthletes(JSON.parse(request.body.liftingOrderAthletes));
    platform.setCurrentAthlete(parseInt(request.body.startNumber));

    // This is our first update for this session, so get the current mode
    // from the update event. All future mode updates will come from
    // timer events.
    if (platform.getState().mode === 'BEFORE_SESSION') {
        const breakType = request.body.breakType;
        handleMode({
            breakType,
            mode: request.body.mode,
            platform,
        });

        if (breakType) {
            const breakClock = platform.getBreakClock();
            const indefinite = request.body.breakIsIndefinite === 'true';

            breakClock.update({
                isStopped: !indefinite,
                milliseconds: indefinite
                    ? Number.POSITIVE_INFINITY
                    : request.body.breakRemaining,
            });
        }
    }
});

app.get('/platform/:platform/athlete-clock', (request, response) => {
    withPlatform(request, response, (platform) => {
        response.json([platform.getAthleteClock().getState()]);
    });
});

app.get('/platform/:platform/break-clock', (request, response) => {
    withPlatform(request, response, (platform) => {
        response.json([platform.getBreakClock().getState()]);
    });
});

app.get('/platform/:platform/current-athlete', (request, response) => {
    withPlatform(request, response, (platform) => {
        response.json([{
            athlete: platform.getCurrentAthlete()?.getState(),
            clock: platform.getAthleteClock()?.getState(),
        }]);
    });
});

app.get('/platform/:platform/lifting-order', (request, response) => {
    withPlatform(request, response, (platform) => {
        response.json(platform.getLiftingOrder().map((athlete) => athlete.getState()));
    });
});

app.get('/platform/:platform/status', (request, response) => {
    withPlatform(request, response, (platform) => {
        response.json([platform.getState()]);
    });
});

app.listen(8082);
