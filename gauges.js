const moistureGauge = new RadialGauge({
    renderTo: 'moistureGauge',
    width: 180,
    height: 180,
    units: "%",
    minValue: 0,
    maxValue: 100
}).draw();

const tempGauge = new RadialGauge({
    renderTo: 'tempGauge',
    width: 180,
    height: 180,
    units: "°C",
    minValue: 0,
    maxValue: 50
}).draw();

const pressureGauge = new RadialGauge({
    renderTo: 'pressureGauge',
    width: 180,
    height: 180,
    units: "hPa",
    minValue: 950,
    maxValue: 1050
}).draw();