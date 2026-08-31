# Architettura

## Perché nessun backend

L'app è pensata per essere usata da un solo dispositivo condiviso al tavolo (un laptop o un tablet che tutti guardano). Non serve sincronizzare stato tra più dispositivi, quindi tutto lo stato vive nel browser e viene salvato in `localStorage`. L'unica chiamata di rete che l'app fa è verso l'[API pubblica di Scryfall](https://scryfall.com/docs/api), usata per recuperare nome/costo/immagine delle carte (Scryfall supporta CORS per l'uso diretto da browser).

## Stack

- **Vite + React 19 + TypeScript** — SPA, nessun router (la navigazione tra "Mazzo" e "Partita" è uno state locale in [App.tsx](../src/App.tsx)).
- **Tailwind CSS** — styling.
- **Vitest** — unit test sulla logica di motore (non ci sono test sui componenti React: la superficie a rischio di bug è quasi tutta nella logica pura di `src/engine`).
- Versioni di `vite`/`@vitejs/plugin-react`/`vitest` fissate esplicitamente in `package.json` per restare compatibili con Node 20.x generico (le versioni più recenti di questi tool richiedono Node ≥20.19).

## Struttura delle cartelle

```
src/
  types.ts                    Tutti i tipi di dominio (vedi design-di-gioco.md e formato-mazzo.md)
  App.tsx                     Shell: navigazione Mazzo/Partita
  main.tsx                    Entry point

  scryfall/
    api.ts                    Client Scryfall: autocomplete, ricerca per nome, cache in localStorage,
                               coda di richieste serializzata per rispettare il rate limit di Scryfall

  engine/                     Logica pura, senza React — testata con Vitest
    templates.ts               Risoluzione dei parametri numerici (fissi o da query) e degli effetti
                                che modificano lo stato del bot (CreateCreature, PumpBotBoard, ...)
    instructionText.ts         Genera il testo delle istruzioni verso il tavolo (rimozioni, danni, ...)
    effectSummary.ts           Riassunto leggibile di un effetto per la UI del deck builder
    effectDefaults.ts          Valori di default per ogni template, usati quando se ne crea uno nuovo
    botTurnEngine.ts            Orchestratore: pesca, raccoglie le query, risolve il turno, dichiara gli
                                attaccanti

  state/
    gameReducer.ts              Reducer puro (AppState = { deck, game }) + tutte le azioni
    AppContext.tsx               Provider React: collega il reducer, persiste su localStorage,
                                 idrata i dati Scryfall mancanti all'avvio
    persistence.ts               Lettura/scrittura localStorage, export/import JSON

  data/
    defaultDeck.ts               Il mazzo Horde precompilato (vedi design-di-gioco.md)

  components/                  UI (vedi sotto)
```

### Componenti UI

| Componente | Responsabilità |
|---|---|
| `SetupScreen` | Configurazione e avvio di una nuova partita |
| `DeckBuilder` / `AddCardForm` (in `DeckBuilder.tsx`) | Lista del mazzo, ricerca Scryfall, aggiunta/modifica/rimozione carte |
| `EffectForm` | Form per impostare template + parametri di un effetto |
| `NumericValueEditor` | Editor di un `NumericValue`: valore fisso oppure formula da query |
| `KeywordPicker` | Selettore di keyword (volare, travolgere, ...) |
| `GameBoard` | Vista principale di una partita in corso: pulsante "Gioca turno bot", coordina query/log/esito |
| `BotPanel` | Vita, contatori zone, board del bot (click/click destro per spostare le creature tra le zone) |
| `CardContextMenu` | Menu contestuale generico posizionato al cursore (usato da `BotPanel`) |
| `TurnLog` | Log leggibile dell'ultimo turno del bot, con l'immagine di ogni carta giocata |
| `AttackOutcome` | Conferma di quali attaccanti del bot sono sopravvissuti al combattimento |
| `QueryInputModal` | Raccoglie le risposte alle domande "stile Archenemy" prima di risolvere il turno |

## Gestione dello stato

Un solo `useReducer` in [AppContext.tsx](../src/state/AppContext.tsx) con stato `{ deck: DeckCardConfig[], game: GameState | null }` (vedi [gameReducer.ts](../src/state/gameReducer.ts) per l'elenco completo delle azioni). Il Context espone `{ state, dispatch }` tramite l'hook `useAppState()`.

Punti di attenzione voluti nel design:

- **Il motore di risoluzione turno è puro.** `drawForTurn` e `resolveBotTurn` (in `botTurnEngine.ts`) non toccano React né lo stato globale: prendono un `BotState` e restituiscono un nuovo `BotState`. Il reducer li richiama e applica il risultato. Questo è ciò che li rende facilmente testabili con Vitest senza dover montare componenti.
- **Le domande "da query" si raccolgono tutte prima di risolvere il turno**, non una alla volta durante la risoluzione: `GameBoard` chiama `drawForTurn` + `getPendingQueries` per ottenere un'anteprima della mano e capire se servono input, mostra eventualmente `QueryInputModal`, e solo dopo la conferma invia `RESOLVE_BOT_TURN` al reducer (che rifà `drawForTurn`+`resolveBotTurn` in modo deterministico, dato che pescare dallo stesso array di libreria dà sempre lo stesso risultato). Risolvere un turno "a metà", in attesa di input dell'utente, avrebbe richiesto uno stato intermedio nel reducer stesso — evitato apposta.

## Persistenza

`localStorage` con due chiavi (vedi `persistence.ts`):

- `horde-deck-config-v1` — il mazzo del bot
- `horde-game-state-v1` — la partita in corso (assente se nessuna partita è attiva)

Più una cache separata dei dati Scryfall già risolti: `horde-scryfall-cache-v1` (in `scryfall/api.ts`), per non richiedere due volte la stessa carta.

Il deck builder offre anche export/import in JSON (`downloadJSON` / `readJSONFile` in `persistence.ts`) per backup manuali o per spostare la configurazione su un altro dispositivo.

## Integrazione con Scryfall: una lezione imparata

La prima versione idratava i dati Scryfall mancanti con un `useEffect` che reagiva a `state.deck`: ogni volta che una carta veniva idratata con successo, `state.deck` cambiava riferimento, il che rilanciava l'effetto per le carte ancora mancanti. Il problema: il passaggio "vecchio" (cancellato) continuava comunque a fare fetch in background — solo la `dispatch` finale veniva saltata — quindi ogni nuovo passaggio si sommava al precedente invece di sostituirlo. Il risultato erano decine di richieste duplicate verso Scryfall in pochi secondi, abbastanza da far scattare il loro rate limit e lasciare alcune carte permanentemente senza immagine per la sessione.

La soluzione adottata: l'idratazione all'avvio gira **una sola volta** (`useEffect` con dipendenze vuote, vedi `AppContext.tsx`), su uno snapshot fisso del mazzo caricato all'avvio — non reagisce più ai propri stessi effetti collaterali. Le carte aggiunte in un secondo momento dal deck builder vengono invece risolte **prima** di essere aggiunte allo stato (`AddCardForm.addCard` in `DeckBuilder.tsx` chiama `getCardByName` e aspetta il risultato prima della `dispatch`), quindi non serve nessuna reattività aggiuntiva. In più, il client Scryfall (`scryfall/api.ts`) usa una coda di richieste vera (una promise chain), non solo un controllo "tempo trascorso dall'ultima chiamata" — quest'ultimo approccio non basta a serializzare chiamate concorrenti (es. il doppio invoke degli effetti di React StrictMode in sviluppo).
