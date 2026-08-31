# Horde Bot

Webapp companion per partite di Magic: The Gathering in formato **Horde**: 4 giocatori reali contro 1 bot. L'app non sostituisce le regole di Magic — i giocatori giocano i propri turni fisicamente, come sempre. Il suo unico compito è gestire il turno del bot: tenere lo stato del suo mazzo/board/vita e decidere, in modo leggibile, cosa fa a ogni turno (creature evocate, rimozioni, danni, attacchi).

## Come funziona in breve

- **Nessun backend.** Tutto gira nel browser, lo stato è salvato in `localStorage`.
- **L'app traccia solo il bot** — vita, mazzo, mano, board, cimitero ed esilio. Vita e board dei 4 giocatori restano gestite fisicamente al tavolo (l'app non le tocca).
- **Le carte del bot sono "template", non testo Oracle.** Ogni carta del mazzo del bot è associata a un effetto semplice (evoca una creatura, rimuovi una minaccia, infliggi danno, ecc.) con pochi parametri — non c'è parsing del testo delle carte. Questo permette di usare qualsiasi carta reale, anche complessa, scegliendo l'effetto che le si avvicina di più.
- I dati delle carte (nome, costo, immagine) vengono recuperati dall'[API di Scryfall](https://scryfall.com/docs/api).

Per i dettagli di design vedi la cartella [docs/](docs/).

## Avvio rapido

Prerequisiti: Node.js 20.x (qualsiasi patch — le dipendenze sono fissate apposta per evitare il requisito Node ≥20.19 di alcune versioni più recenti dei tool).

```bash
npm install
npm run dev
```

Apri http://localhost:5173.

## Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il server di sviluppo Vite (con hot reload) |
| `npm run build` | Typecheck (`tsc -b`) + build di produzione in `dist/` |
| `npm run preview` | Serve la build di produzione in locale, per un ultimo controllo |
| `npm test` | Esegue i test Vitest |

## Uso rapido dell'app

1. **Mazzo del bot** — rivedi/modifica il mazzo precompilato (o carica uno dei mazzi tematici pronti, Zombie o Dinosauri, dal pulsante "Carica mazzo precompilato"), cerca altre carte su Scryfall e assegna loro un effetto.
2. **Partita** — imposta numero di giocatori, pescate per turno del bot e vita iniziale, poi avvia.
3. **Gioca turno bot** — il motore pesca, risolve la mano (prima rimozioni/danni, poi creature e utility) e dichiara gli attaccanti.
4. **Esito del combattimento** — dopo che il tavolo ha risolto i blocchi fisicamente, clicca sugli attaccanti del bot che sono morti in combattimento.
5. **Board del bot** — durante i turni dei giocatori, click sinistro su una creatura per mandarla al cimitero (il caso più comune), click destro per scegliere un'altra destinazione (mano, mazzo, esilio).

## Stack tecnico

Vite + React + TypeScript + Tailwind CSS. Nessun backend. Persistenza in `localStorage` (più export/import JSON). Dati carte dall'API pubblica di Scryfall. Test con Vitest.

## Documentazione

- [docs/architettura.md](docs/architettura.md) — struttura del progetto, scelte tecniche, gestione dello stato
- [docs/design-di-gioco.md](docs/design-di-gioco.md) — modello di gioco, flusso del turno, sistema di effetti/template
- [docs/formato-mazzo.md](docs/formato-mazzo.md) — schema JSON del mazzo, per chi vuole modificarlo a mano o costruirsi strumenti esterni
