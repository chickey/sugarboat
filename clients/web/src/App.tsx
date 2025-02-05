import React, { ReactNode, useCallback, useEffect, useState } from "react";
import "./App.css";
import { Model } from "./Model";
import {
  calibrateIMU,
  onConnectRequest,
  setCoeffs,
  Orientation,
  Config,
  SensorData,
  Coeffs,
  setRealtimeRun,
} from "./ble";
// import Switch from "react-switch";
import { Quaternion } from "three";

// @ts-ignore
import logo from "./sugarboat.png";
// @ts-ignore
import bluetoothIcon from "./bluetooth.svg";
import Switch from "./Switch";

type HeaderProps = {
  connected: boolean;
  onConnectClick: () => void;
};
function Header({ connected, onConnectClick }: HeaderProps) {
  const [checked, setChecked] = useState(false);
  const onRealtimeRunChange = useCallback((checked: boolean) => {
    setChecked(checked);
    setRealtimeRun(checked);
  }, []);
  return (
    <div className="Header-container">
      <img src={logo} alt="sugarboat Logo" className="Logo" />
      <button
        onClick={onConnectClick}
        disabled={connected}
        className="Header-connectButton"
      >
        <img src={bluetoothIcon} alt="Bluetooth icon" width={28} />
        {connected ? "Connected!" : "Connect"}
      </button>
      <label>
        <Switch
          disabled={!connected}
          checked={checked}
          onChange={onRealtimeRunChange}
          label="Real time"
        />
      </label>
    </div>
  );
}

type ValueBoxProps = {
  name: string;
  children: ReactNode;
};
function ValueBox({ name, children }: ValueBoxProps) {
  return (
    <div className="ValueBox-container">
      <div className="ValueBox-title">{name}</div>
      <div className="ValueBox-content">{children}</div>
    </div>
  );
}

type DataSectionProps = {
  sensorData: SensorData;
};
function DataSection({ sensorData }: DataSectionProps) {
  return (
    <div className="ValueBoxes-container">
      <ValueBox name="Tilt Angle">
        <p className="DataBox-content">{sensorData.angle.toFixed(1) + " °"}</p>
      </ValueBox>
      <ValueBox name="Temperature">
        <p className="DataBox-content">
          {sensorData.tempCelcius.toFixed(1) + " °C"}
        </p>
      </ValueBox>
      <ValueBox name="Humidity">
        <p className="DataBox-content">
          {(100 * sensorData.relHumidity).toFixed(0) + " %"}
        </p>
      </ValueBox>
      <ValueBox name="Battery">
        <p className="DataBox-content">
          {sensorData.battVoltage.toFixed(1) + " V"}
        </p>
      </ValueBox>
    </div>
  );
}

type CalibrationSectionProps = {
  connected: boolean;
  config: Config;
};
function CalibrationSection({
  connected,
  config: { hasIMUOffsets, hasCoeffs, coeffs },
}: CalibrationSectionProps) {
  const [stateCoeffs, setStateCoeffs] = useState<Coeffs>(coeffs);

  useEffect(() => {
    setStateCoeffs(coeffs);
  }, [coeffs]);

  // React.ChangeEventHandler<HTMLInputElement>
  const onCoeffChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const degree = event.target.getAttribute("data-degree");
      // const value = parseFloat(event.target.value);
      const value = event.target.value;
      setStateCoeffs({ ...stateCoeffs, [degree!]: value });
    },
    [stateCoeffs]
  );

  const renderCoeffs = useCallback(() => {
    if (!connected) {
      return <p style={{ fontSize: "2rem" }}>🤷‍♂️</p>;
    }
    if (true || hasCoeffs) {
      return (
        <table>
          <thead>
            <tr>
              <th>Poly Degree</th>
              <th>Coefficient</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2</td>
              <td>
                <input
                  type="text"
                  value={stateCoeffs.a2}
                  onChange={onCoeffChange}
                  data-degree="a2"
                />
              </td>
            </tr>
            <tr>
              <td>1</td>
              <td>
                <input
                  type="text"
                  value={stateCoeffs.a1}
                  onChange={onCoeffChange}
                  data-degree="a1"
                />
              </td>
            </tr>
            <tr>
              <td>0</td>
              <td>
                <input
                  type="text"
                  value={stateCoeffs.a0}
                  onChange={onCoeffChange}
                  data-degree="a0"
                />
              </td>
            </tr>
          </tbody>
        </table>
      );
    } else {
      return null;
    }
  }, [connected, hasCoeffs, stateCoeffs, onCoeffChange]);

  const renderIMUOffsets = useCallback(() => {
    if (!connected) {
      return <p style={{ fontSize: "2rem" }}>🤷‍♂️</p>;
    }
    return <p style={{ fontSize: "2rem" }}>{hasIMUOffsets ? "👌" : "👎"}</p>;
  }, [connected, hasIMUOffsets]);

  return (
    <div>
      <h1>Calibration</h1>
      <div className="ValueBoxes-container">
        <ValueBox name="Accel / Gyro">
          <p className="DataBox-content"></p>
          {renderIMUOffsets()}
          <button disabled={!connected} onClick={calibrateIMU}>
            Calibrate
          </button>
        </ValueBox>
        <ValueBox name="Brix Scale">
          <p className="DataBox-content"></p>
          {renderCoeffs()}
          <button disabled={!connected} onClick={() => setCoeffs(stateCoeffs)}>
            Upload Coefficients
          </button>
        </ValueBox>
      </div>
    </div>
  );
}

type EstimatesSectionProps = {
  connected: boolean;
  sensorData: SensorData;
};

function EstimatesSection({ connected, sensorData }: EstimatesSectionProps) {
  return (
    <div>
      <h1>Estimates</h1>
      <div className="ValueBoxes-container">
        <ValueBox name="Brix">
          <p className="DataBox-content">{sensorData.brix} °Bx</p>
        </ValueBox>
        <ValueBox name="Specific Gravity">
          <p className="DataBox-content">{sensorData.sg}</p>
        </ValueBox>
      </div>
    </div>
  );
}

function App() {
  const [orientation, setOrientation] = useState<Orientation>({
    quaternion: new Quaternion(),
    eulerAngles: {
      psi: 0,
      theta: 0,
      phi: 0,
    },
  });

  const [sensorData, setSensorData] = useState<SensorData>({
    angle: 0,
    brix: 0,
    sg: 0,
    tempCelcius: 0,
    relHumidity: 0,
    battVoltage: 0,
  });

  const [config, setConfig] = useState<Config>({
    version: 0,
    hasIMUOffsets: false,
    hasCoeffs: false,
    coeffs: {
      a2: 0,
      a1: 0,
      a0: 0,
    },
  });

  const [connected, setConnected] = useState(false);
  const onConnect = useCallback(() => {
    console.log("Connected!");
    setConnected(true);
  }, []);

  const onDisconnect = useCallback(() => {
    console.log("Disconnected!");
    setConnected(false);
  }, []);

  const onSensorData = useCallback(setSensorData, [setSensorData]);

  const onConfig = useCallback(
    (config: Config) => {
      // console.log(
      //   "Version",
      //   config.version,
      //   "hasImu",
      //   config.hasIMUOffsets,
      //   "hasCoeff",
      //   config.hasCoeffs,
      //   config.coeffs
      // );
      setConfig(config);
    },
    [setConfig]
  );

  // @ts-ignore
  const onConnectClickCB = useCallback(
    onConnectRequest(
      onConnect,
      onDisconnect,
      setOrientation,
      onSensorData,
      onConfig
    ),
    []
  );

  return (
    <div className="App">
      <Header onConnectClick={onConnectClickCB} connected={connected} />
      <div className="Container">
        <div className="Container-left">
          <DataSection sensorData={sensorData} />
          <CalibrationSection connected={connected} config={config} />
          <EstimatesSection connected={connected} sensorData={sensorData} />
        </div>
        <div className="Container-right">
          <Model orientation={orientation.quaternion} />
        </div>
      </div>
    </div>
  );
}

export default App;
