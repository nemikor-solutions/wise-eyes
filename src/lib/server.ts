import type Express from 'express';
import type {
    AthleteState,
} from './athlete';
import type {
    BreakType,
    CeremonyType,
    FopState,
    Mode,
    OwlcmsLiftType,
    PlatformState,
} from './platform';
import {
    klona,
} from 'klona/json';

import cors from 'cors';
import equal from 'deep-equal';
import express from 'express';
import expressWs from 'express-ws';
import Platform from './platform';
import WebSocket from 'ws';

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
    indefiniteBreak: BooleanString;
    mode: Mode;
}

interface UpdateBody {
    attemptNumber: string;
    breakType?: BreakType;
    ceremonyType?: CeremonyType;
    fop: string;
    fopState: FopState;
    groupAthletes: string;
    groupDescription: string;
    groupInfo: string;
    groupName: string;
    leaders: string;
    liftingOrderAthletes: string;
    liftTypeKey: OwlcmsLiftType;
    liftType: string;
    mode: Mode;
    startNumber: string;
    translationMap: string;
}

export default function createApp({
    debug = false,
}: {
    debug?: boolean;
} = {}): Express.Application {
    const app = express();
    const appWs = expressWs(app);
    const socketMaps = {
        liftingOrder: new Map<string, Set<WebSocket>>(),
        status: new Map<string, Set<WebSocket>>(),
    };

    function broadcastLiftingOrder(
        platformName: string,
        liftingOrder: AthleteState[]
    ): void {
        socketMaps.liftingOrder.get(platformName)?.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN) {
                return;
            }

            client.send(JSON.stringify(liftingOrder));
        });
    }

    function broadcastStatus(state: PlatformState): void {
        socketMaps.status.get(state.name)?.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN) {
                return;
            }

            client.send(JSON.stringify(state));
        });
    }

    function withPlatformForClient(
        request: express.Request,
        callback: PlatformCallback
    ): void {
        const platform = Platform.getPlatform(request.params.platform, {
            noPersist: true,
        });

        callback(platform);
    }

    function withPlatformForServer(
        platformName: string,
        callback: PlatformCallback
    ): void {
        const platform = Platform.getPlatform(platformName);
        const prevState = klona(platform.getState());
        const prevLiftingOrder = klona(
            platform.getLiftingOrder()
                .map((athlete) => athlete.getState())
        );

        callback(platform);

        const currentState = platform.getState();
        if (!equal(prevState, currentState)) {
            broadcastStatus(currentState);
        }

        const currentLiftingOrder = platform.getLiftingOrder()
            .map((athlete) => athlete.getState());
        if (!equal(prevLiftingOrder, currentLiftingOrder)) {
            broadcastLiftingOrder(currentState.name, currentLiftingOrder);
        }
    }

    app.use(cors());
    app.use(express.urlencoded({
        extended: true,
    }));

    // TODO: Jury decisions
    // TODO: Record attempts

    app.post('/decision', (request: Request<DecisionBody>, response) => {
        response.end();

        if (debug) {
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

        withPlatformForServer(fop, (platform) => {
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
                    if (debug) {
                        console.log(`!! UNHANDLED DECISION EVENT decisionEventType=${eventType}`);
                    }
            }
        });
    });

    app.post('/timer', (request: Request<TimerBody>, response) => {
        response.end();

        if (debug) {
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
            indefiniteBreak,
            mode,
        } = request.body;

        withPlatformForServer(fopName, (platform) => {
            platform.setBreakType(breakType || null);
            platform.setCeremonyType(ceremonyType || null);
            platform.setFopState(fopState);
            platform.setMode(mode);

            if (breakTimerEventType) {
                // When a break ends, we will not receive `indefiniteBreak`, but we
                // can consider the end of a break to always considered indefinite since
                // we're waiting for the next part of the competition to start with no
                // running clock.
                const isIndefinite = !indefiniteBreak || indefiniteBreak === 'true'

                platform.getBreakClock().update({
                    isStopped: breakTimerEventType !== 'BreakStarted',
                    milliseconds: isIndefinite
                        ? Number.POSITIVE_INFINITY
                        : breakMillisRemaining as number,
                });
            }

            if (athleteTimerEventType) {
                platform.getAthleteClock().update({
                    isStopped: athleteTimerEventType !== 'StartTime',
                    milliseconds: athleteMillisRemaining as number,
                });
            }
        });
    });

    app.post('/update', (request: Request<UpdateBody>, response) => {
        response.end();

        if (debug) {
            console.log('/update');
            (({
                /* eslint-disable @typescript-eslint/no-unused-vars */
                groupAthletes,
                leaders,
                liftingOrderAthletes,
                translationMap,
                /* eslint-enable @typescript-eslint/no-unused-vars */
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
            groupDescription,
            groupInfo,
            groupName,
            liftingOrderAthletes,
            liftType,
            liftTypeKey,
            mode,
            startNumber,
        } = request.body;

        withPlatformForServer(fop, (platform) => {
            platform.setBreakType(breakType || null);
            platform.setCeremonyType(ceremonyType || null);
            platform.setFopState(fopState);
            platform.setLiftType({
                key: liftTypeKey,
                name: liftType,
            });
            platform.setMode(mode);
            platform.setSession({
                description: groupDescription,
                info: groupInfo,
                name: groupName,
            });
            // TODO: determine when this is undefined
            platform.updateAthletes(JSON.parse(liftingOrderAthletes));
            platform.setCurrentAthlete(parseInt(startNumber));
        });
    });

    app.get('/', (_request, response) => {
        response.json({
            platforms: Platform.getPlatforms(),
        });
    });

    app.get('/platform/:platform/athlete-clock', (request, response) => {
        withPlatformForClient(request, (platform) => {
            response.json([platform.getAthleteClock().getState()]);
        });
    });

    app.get('/platform/:platform/break-clock', (request, response) => {
        withPlatformForClient(request, (platform) => {
            response.json([platform.getBreakClock().getState()]);
        });
    });

    app.get('/platform/:platform/current-athlete', (request, response) => {
        withPlatformForClient(request, (platform) => {
            response.json([{
                athlete: platform.getCurrentAthlete()?.getState(),
                clock: platform.getAthleteClock()?.getState(),
            }]);
        });
    });

    app.get('/platform/:platform/lifting-order', (request, response) => {
        withPlatformForClient(request, (platform) => {
            response.json(
                platform.getLiftingOrder()
                    .map((athlete) => athlete.getState())
            );
        });
    });

    app.get('/platform/:platform/status', (request, response) => {
        withPlatformForClient(request, (platform) => {
            response.json([platform.getState()]);
        });
    });

    appWs.app.ws('/ws/platform/:platform/lifting-order', (client, request) => {
        const platformName = request.params.platform;
        let clients = socketMaps.liftingOrder.get(platformName);

        if (!clients) {
            clients = new Set();
            socketMaps.liftingOrder.set(platformName, clients);
        }

        clients.add(client);

        withPlatformForClient(request, (platform) => {
            client.send(JSON.stringify(
                platform.getLiftingOrder()
                    .map((athlete) => athlete.getState())
            ));
        });
    });

    appWs.app.ws('/ws/platform/:platform/status', (client, request) => {
        const platformName = request.params.platform;
        let clients = socketMaps.status.get(platformName);

        if (!clients) {
            clients = new Set();
            socketMaps.status.set(platformName, clients);
        }

        clients.add(client);

        withPlatformForClient(request, (platform) => {
            client.send(JSON.stringify(platform.getState()));
        });
    });

    return app;
}
