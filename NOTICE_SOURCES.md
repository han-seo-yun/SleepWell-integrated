# Integrated source provenance

- Model-layer base: <https://github.com/iuniion3287-web/SleepWell>, commit `91797e3c26415f1513b81b73bb181f4dcaeeba09`.
- Android collection/UI base: <https://github.com/soin7563-ops/---SleepWell>, commit `b95c4d93daf42cc0e8ecab9e562f57331ecaff69`.

The Android UI repository provides the `HealthDataSource` contract, fake source, 30-second export, chart, and Compose screen. Its `SamsungHealthSource` implementation is still a TODO in the upstream code. The integrated recommendation path is implemented in this repository without representing the fake source as real Watch data.
