# Graph Report - /Users/nkt/dev/iman/checkered  (2026-05-06)

## Corpus Check
- 40 files · ~30,353 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 118 nodes · 164 edges · 33 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `iRacingFetch()` - 20 edges
2. `ok()` - 10 edges
3. `fail()` - 10 edges
4. `main()` - 10 edges
5. `CreateTournament()` - 9 edges
6. `processTournament()` - 8 edges
7. `pollLeagueTournaments()` - 8 edges
8. `testIRacingOAuth()` - 6 edges
9. `testMemberInfo()` - 6 edges
10. `testRecentRaces()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `testIRacingOAuth()` --calls--> `iRacingAuth()`  [INFERRED]
  checkered/backend/test/iracing-integration.js → /Users/nkt/dev/iman/checkered/checkered/backend/src/iracing-api.js
- `testMemberInfo()` --calls--> `fetchMemberInfo()`  [INFERRED]
  checkered/backend/test/iracing-integration.js → /Users/nkt/dev/iman/checkered/checkered/backend/src/iracing-api.js
- `testRecentRaces()` --calls--> `fetchRecentRaces()`  [INFERRED]
  checkered/backend/test/iracing-integration.js → /Users/nkt/dev/iman/checkered/checkered/backend/src/iracing-api.js
- `testSubsessionResults()` --calls--> `fetchSubsessionResults()`  [INFERRED]
  checkered/backend/test/iracing-integration.js → /Users/nkt/dev/iman/checkered/checkered/backend/src/iracing-api.js
- `pollLeagueTournaments()` --calls--> `CreateTournament()`  [INFERRED]
  /Users/nkt/dev/iman/checkered/checkered/backend/src/index.js → checkered/checkered/app/components/CreateTournament.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.2
Nodes (20): pollLeagueTournaments(), fetchDriverLookup(), fetchLeagueAllSessions(), fetchLeagueOwnerCustId(), fetchLeagueRosterMember(), fetchLeagueSeasons(), fetchLeagueSeasonSessions(), fetchLeagueSeasonStandings() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (8): main(), main(), main(), CreateTournament(), main(), createTournamentFixture(), fullTournamentFixture(), stuckTournamentFixture()

### Community 2 - "Community 2"
Cohesion: 0.48
Nodes (13): fail(), main(), ok(), skip(), testBackendHealth(), testBackendTournaments(), testContractConnection(), testIRacingOAuth() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.38
Nodes (4): buildApp(), mockContract(), mockTournamentData(), createApp()

### Community 4 - "Community 4"
Cohesion: 0.6
Nodes (5): generateMockResults(), pollTournaments(), pollTournamentsAndLeagueTournaments(), processTournament(), submitResults()

### Community 5 - "Community 5"
Cohesion: 0.6
Nodes (4): main(), rawFetch(), iRacingAuth(), refreshAccessToken()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (3): refreshSelectedTournament(), selectTournament(), sanitizeError()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): fmt(), formatTokenAmount()

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 10`** (2 nodes): `mint-usdc.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `grant-oracle-admin.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `transfer-chex.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `deploy.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `main()`, `advance-tournament.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `rootProvider.tsx`, `RootProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `buildRegisterCalls()`, `calls.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `Header.tsx`, `connectBrowserWallet()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `TournamentList.tsx`, `formatTokenAmount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `useIsAdmin.ts`, `useIsAdmin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `hardhat.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `contracts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `OracleStatus.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Overlay.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `sanitizeError.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `calls.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pollLeagueTournaments()` connect `Community 0` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `CreateTournament()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `iRacingFetch()` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `CreateTournament()` (e.g. with `createTournamentFixture()` and `fullTournamentFixture()`) actually correct?**
  _`CreateTournament()` has 8 INFERRED edges - model-reasoned connections that need verification._