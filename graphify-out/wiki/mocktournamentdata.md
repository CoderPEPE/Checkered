# mockTournamentData()

## Nodes

- **buildApp()** — `/Users/nkt/dev/iman/checkered/checkered/backend/test/api.test.js`
- **mockContract()** — `/Users/nkt/dev/iman/checkered/checkered/backend/test/api.test.js`
- **mockTournamentData()** — `/Users/nkt/dev/iman/checkered/checkered/backend/test/api.test.js`
- **api.test.js** — `/Users/nkt/dev/iman/checkered/checkered/backend/test/api.test.js`

## Relationships

- buildApp() --**contains**--> api.test.js [EXTRACTED]
- buildApp() --**calls**--> mockContract() [EXTRACTED]
- mockContract() --**contains**--> api.test.js [EXTRACTED]
- mockContract() --**calls**--> mockTournamentData() [EXTRACTED]
- mockContract() --**calls**--> buildApp() [EXTRACTED]
- mockTournamentData() --**contains**--> api.test.js [EXTRACTED]
- mockTournamentData() --**calls**--> mockContract() [EXTRACTED]
- api.test.js --**contains**--> mockTournamentData() [EXTRACTED]
- api.test.js --**contains**--> mockContract() [EXTRACTED]
- api.test.js --**contains**--> buildApp() [EXTRACTED]