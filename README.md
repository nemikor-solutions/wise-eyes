# Wise Eyes

![logo](./assets/wise-eyes.svg)

A web server to monitor the status of owlcms. Originally designed for use with [vMix](https://www.vmix.com/) for custom livestream content during weightlifting meets, but flexible enough to drive any system that wants to poll the current state.

## Routes

### `/platform/:platform/status`

The current state of the platform, including the current athlete, the athlete clock, the break clock, and decision information.

### `/platform/:platform/athlete-clock`

The current state of the athlete clock.

### `/platform/:platform/break-clock`

The current state of the break clock.

### `/platform/:platform/current-athlete`

Information about the current athlete.

### `/platform/:platform/lifting-order`

Information about all athletes, in lifting order.
