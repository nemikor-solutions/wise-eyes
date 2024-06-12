import type Express from 'express';
import type {
    BreakType,
    CeremonyType,
    FopState,
    Mode,
} from './platform';

import cors from 'cors';
import express from 'express';
import Platform from './platform';

type BooleanString =
    | 'false'
    | 'true';

interface DecisionBody {
    d1?: BooleanString;
    d2?: BooleanString;
    d3?: BooleanString;
    down?: BooleanString;
    decisionEventType:
        | 'DOWN_SIGNAL'
        | 'FULL_DECISION'
        | 'RESET';
    fop: string;
    fopState: FopState;
    mode: Mode;
}

type PlatformCallback = (platform: Platform) => void;

interface Request<Body> extends Express.Request {
    body: Body;
}

interface TimerBody {
    athleteMillisRemaining?: number
    athleteTimerEventType?:
        | 'SetTime'
        | 'StartTime'
        | 'StopTime';
    break: BooleanString;
    breakMillisRemaining?: number;
    breakTimerEventType?:
        | 'BreakPaused'
        | 'BreakSet'
        | 'BreakStarted';
    breakType?: BreakType;
    ceremonyType?: CeremonyType;
    fopName: string;
    fopState: FopState;
    mode: Mode;
}

interface UpdateBody {
    breakType?: BreakType;
    ceremonyType?: CeremonyType;
    fop: string;
    fopState: FopState;
    groupAthletes: string;
    groupInfo: string;
    groupName: string;
    leaders: string;
    liftingOrderAthletes: string;
    mode: Mode;
    startNumber: string;
    translationMap: string;
}

const app = express();

const DEBUG = process.env.DEBUG;

app.use(cors());
app.use(express.urlencoded({
    extended: true,
}));

// TODO: Jury decisions
// TODO: Record attempts

function withPlatform(
    request: express.Request,
    _response: express.Response,
    callback: PlatformCallback
): void {
    const platform = Platform.getPlatform(request.params.platform);

    callback(platform);
}

app.post('/decision', (request: Request<DecisionBody>, response) => {
    response.end();

    if (DEBUG) {
        console.log('/decision');
        console.log(request.body);
    }

    const {
        d1,
        d2,
        d3,
        decisionEventType: eventType,
        down,
        fop,
        fopState,
        mode,
    } = request.body;

    const platform = Platform.getPlatform(fop);

    platform.setFopState(fopState);
    platform.setMode(mode);

    switch (eventType) {
        case 'DOWN_SIGNAL':
            platform.setDownSignal(down === 'true');
            break;
        case 'FULL_DECISION':
            platform.setDecisions({
                centerReferee: !d2
                    ? null
                    : d2 === 'true'
                        ? 'good'
                        : 'bad',
                leftReferee: !d1
                    ? null
                    : d1 === 'true'
                        ? 'good'
                        : 'bad',
                rightReferee: !d3
                    ? null
                    : d3 === 'true'
                        ? 'good'
                        : 'bad',
            });
            break;
        case 'RESET':
            platform.resetDecisions();
            break;
        default:
            if (DEBUG) {
                console.log(`!! UNHANDLED DECISION EVENT decisionEventType=${eventType}`);
            }
    }
});

app.post('/timer', (request: Request<TimerBody>, response) => {
    response.end();

    if (DEBUG) {
        console.log('/timer');
        console.log(request.body);
    }

    const {
        athleteMillisRemaining,
        athleteTimerEventType,
        breakTimerEventType,
        breakMillisRemaining,
        breakType,
        ceremonyType,
        fopName,
        fopState,
        mode,
    } = request.body;

    const platform = Platform.getPlatform(fopName);
    platform.setBreakType(breakType || null);
    platform.setCeremonyType(ceremonyType || null);
    platform.setFopState(fopState);
    platform.setMode(mode);

    if (breakTimerEventType) {
        platform.getBreakClock().update({
            isStopped: breakTimerEventType !== 'BreakStarted',
            milliseconds: breakMillisRemaining ?? Number.POSITIVE_INFINITY,
        });
    }

    if (athleteTimerEventType) {
        platform.getAthleteClock().update({
            isStopped: athleteTimerEventType !== 'StartTime',
            milliseconds: athleteMillisRemaining as number,
        });
    }
});

app.post('/update', (request: Request<UpdateBody>, response) => {
    response.end();

    if (DEBUG) {
        console.log('/update');
        (({
            groupAthletes,
            leaders,
            liftingOrderAthletes,
            translationMap,
            ...params
        }) => {
            console.log(
                Object.fromEntries(
                    Object.entries(params)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                )
            );
        })(request.body);
    }

    const {
        breakType,
        ceremonyType,
        fop,
        fopState,
        groupInfo,
        groupName,
        liftingOrderAthletes,
        mode,
        startNumber,
    } = request.body;

    const platform = Platform.getPlatform(fop);
    platform.setBreakType(breakType || null);
    platform.setCeremonyType(ceremonyType || null);
    platform.setFopState(fopState);
    platform.setMode(mode);
    platform.setSession({
        description: groupInfo,
        name: groupName,
    });
    platform.updateAthletes(JSON.parse(liftingOrderAthletes));
    platform.setCurrentAthlete(parseInt(startNumber));
});

app.get('/', (request, response) => {
    response.json({
        platforms: Platform.getPlatforms(),
    });
})
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
