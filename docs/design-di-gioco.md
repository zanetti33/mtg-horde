# Design di gioco

## Filosofia

L'app **non** è un motore di regole di Magic. Non gestisce mana, priorità, stack, fasi del turno dei giocatori, blocchi, o le regole di combattimento in generale. I 4 giocatori giocano i propri turni fisicamente, come farebbero senza l'app.

L'app entra in gioco solo quando è il turno del bot: tiene lo stato del bot e, quando le si chiede di giocare un turno, decide e mostra in modo leggibile la sequenza di azioni del bot (rimozioni, creature evocate, attacchi).

Da qui discendono due scelte deliberate:

1. **L'app non traccia vita né board dei giocatori.** Farlo richiederebbe che l'operatore tenesse l'app sincronizzata con lo stato reale del tavolo ad ogni singola mossa dei 4 giocatori — troppo overhead per un beneficio marginale. Gli effetti del bot che agirebbero sui giocatori diventano quindi **istruzioni testuali generiche** che il tavolo esegue da sé (es. "Distruggi la creatura con potere più alto tra quelle dei giocatori"), invece di bersagli scelti dall'app.
2. **Le carte del bot non hanno testo Oracle interpretato dall'app.** Ogni carta del mazzo del bot viene invece associata a un **template di effetto** con pochi parametri semplici. Questo è ciò che permette di includere qualunque carta reale, anche con abilità complesse, senza dover scrivere un motore di regole completo: si sceglie il template più vicino all'effetto della carta.

## Cosa traccia l'app

Solo lo stato del **bot** ([`BotState`](../src/types.ts)):

| Campo | Cosa rappresenta |
|---|---|
| `life` | Vita del bot. A 0 o meno, il bot è sconfitto. |
| `library` | Il mazzo del bot, mescolato all'avvio della partita. |
| `hand` | Le carte pescate ma non ancora risolte (di norma vuota tra un turno e l'altro: l'engine gioca tutta la mano ogni turno — l'unica eccezione sono le carte pescate da un effetto `DrawExtraBot`, vedi sotto). |
| `battlefield` | Le creature/token del bot attualmente in gioco. |
| `graveyard` | Le carte del bot finite nel cimitero. |
| `exile` | Le carte del bot esiliate. |

Vita e board dei giocatori **non** sono rappresentate in nessuna struttura dati dell'app: restano sul tavolo fisico (contatori vita, carte in gioco).

## Ciclo di una partita

I turni si alternano fisicamente come in una partita normale (giocatore 1 → 2 → 3 → 4 → bot → di nuovo 1...). L'app entra in gioco in due momenti:

- **Durante i turni dei giocatori**: se accade qualcosa che riguarda il bot (i giocatori attaccano il bot, distruggono una sua creatura, lo curano, ecc.), l'operatore aggiorna manualmente `BotPanel` — modifica il campo vita, oppure clicca/click-destro su una creatura della board per spostarla in un'altra zona (vedi [Zone del bot](#zone-del-bot-e-spostamento-delle-creature)).
- **Al turno del bot**: l'operatore clicca "Gioca turno bot" e l'app risolve l'intero turno in automatico (vedi sotto), fermandosi solo per raccogliere eventuali input numerici e per far confermare l'esito del combattimento.

## Flusso del turno del bot

Implementato in [`resolveBotTurn`](../src/engine/botTurnEngine.ts), orchestrato da `GameBoard`:

1. **Pesca.** Il bot pesca `config.drawPerTurn` carte dalla cima della libreria (vedi `drawForTurn`). Questo numero è la leva principale per rendere il bot più o meno sfidante contro 4 giocatori.
2. **Raccolta delle domande.** L'app scansiona l'intera mano (carte pescate + eventuali carte residue da un turno precedente) e raccoglie tutte le domande "da query" necessarie (vedi [NumericValue](#numericvalue-valori-fissi-o-da-domanda)) in un'unica schermata (`QueryInputModal`), così l'operatore risponde una sola volta guardando il tavolo, invece di essere interrotto carta per carta.
3. **Risoluzione della mano.** Il bot gioca **tutta** la mano in un turno (non esiste gestione del mana: se una carta è in mano, viene lanciata). L'ordine di risoluzione è:
   1. Prima le `TableInstruction` (rimozioni, danni, sacrifici, scarti) — così il tavolo "pulisce" la minaccia prima che il bot sviluppi altre creature.
   2. Poi le `BotStateEffect` (creature, pump, guadagno vita, pescate extra), nell'ordine in cui sono state pescate.

   Ogni carta risolta produce una riga di log leggibile con l'immagine della carta (`TurnLogEntry`).
4. **Dichiarazione degli attaccanti.** Tutte le creature del bot senza malattia da evocazione attaccano. Le creature già presenti a inizio turno perdono la malattia da evocazione (sono sotto controllo del bot dall'inizio del suo turno precedente); quelle appena evocate questo turno restano "malate" a meno che non abbiano la keyword `haste`.
5. **Esito del combattimento.** L'app si mette in attesa (`phase: 'awaitingAttackOutcome'`): dopo che il tavolo ha risolto i blocchi fisicamente, l'operatore clicca sugli attaccanti del bot morti in `AttackOutcome`. Le creature non-token cadute vanno al cimitero del bot; i token cessano semplicemente di esistere.
6. **Fine turno.** Si ricalcolano vita/libreria per determinare lo stato della partita (vedi sotto).

### Carte pescate da `DrawExtraBot`

Se una carta ha un effetto `DrawExtraBot`, le carte pescate in più **non** vengono risolte nello stesso turno: risolverle richiederebbe raccogliere eventuali loro domande "a metà turno", cosa che l'app evita deliberatamente (punto 2 sopra). Restano quindi in mano e vengono giocate al turno successivo, insieme alla pescata normale.

## Zone del bot e spostamento delle creature

Dalla board (`BotPanel`), una creatura può essere spostata in 4 zone (`BattlefieldDestination`):

| Destinazione | Quando usarla |
|---|---|
| Cimitero | La creatura è morta (in combattimento durante i turni dei giocatori, o per un effetto di rimozione) — è l'azione di default: click sinistro sulla carta. |
| Mano | Un effetto l'ha rimessa in mano al bot (bounce). |
| Mazzo | Un effetto l'ha rimessa nella libreria del bot. |
| Esilio | Un effetto l'ha esiliata. |

Click destro su una creatura apre il menu con tutte e 4 le opzioni. **I token ignorano la destinazione scelta**: per regola di Magic, un token cessa di esistere se dovrebbe cambiare zona, quindi qualunque opzione si scelga per un token il risultato è sempre "rimosso definitivamente" (il menu per i token mostra infatti una sola voce).

## Condizioni di vittoria/sconfitta

L'app rileva solo la sconfitta del **bot** (`recomputeStatus` in `botTurnEngine.ts`), perché è l'unico stato che traccia:

- **Vita del bot ≤ 0** → bot sconfitto.
- **Libreria del bot vuota** → bot sconfitto (coerente con il formato Horde ufficiale: se al mazzo horde finiscono le carte, vince la squadra).

La sconfitta dei giocatori (vita di squadra a 0) è invece decisa dal tavolo stesso con i propri segnapunti fisici — l'app non la traccia.

## Sistema di effetti a template

Ogni carta nel mazzo del bot ([`DeckCardConfig`](../src/types.ts)) ha un campo `effect` con un `kind` che ne determina il comportamento. Ci sono due famiglie:

### `BotStateEffect` — modificano lo stato tracciato del bot

| Template | Parametri | Effetto |
|---|---|---|
| `CreateCreature` | `count`, `power`, `toughness`, `keywords[]`, `tokenName?` | Mette `count` creature sulla board del bot. Se `count` risolve a 1, è la carta stessa (non-token, con la sua immagine); se >1, sono token (senza immagine, nome = `tokenName` o il nome della carta). Malattia da evocazione a meno che non abbiano `haste`. |
| `PumpBotBoard` | `powerBonus`, `toughnessBonus`, `grantKeywords[]` | Buff **permanente** (non "fino a fine turno" — semplificazione voluta, vedi sotto) a tutte le creature del bot in gioco al momento della risoluzione. |
| `GainLifeBot` | `amount` | Il bot guadagna vita. |
| `DrawExtraBot` | `amount` | Il bot pesca carte extra (risolte al turno successivo, vedi sopra). |

### `TableInstruction` — generano solo testo, non toccano stato tracciato

| Template | Parametri | Effetto |
|---|---|---|
| `RemovalInstruction` | `mode` (`highestPower` \| `highestToughness` \| `highestManaValue` \| `random` \| `all`), `count`, `destroyOrExile` | Istruzione tipo "Distruggi/Esilia [la creatura / le N creature / tutte le creature] [con potere più alto / ... / a caso]". |
| `DamageInstruction` | `amount`, `target` (`eachPlayer` \| `creatureHighestPower` \| `creatureHighestToughness` \| `creatureRandom` \| `allCreatures`) | Istruzione tipo "Infliggi N danni a ..." o "Ogni giocatore perde N vita". |
| `SacrificeInstruction` | `perPlayer` (bool), `count` | "Ogni giocatore sacrifica N creature" oppure "I giocatori scelgono insieme N creature da sacrificare in totale". |
| `DiscardInstruction` | `perPlayer` (bool), `count` | Stesso schema, per lo scarto di carte. |

Il testo esatto è generato da [`instructionText.ts`](../src/engine/instructionText.ts).

Per le `TableInstruction`, preferisci sempre modalità/target **simmetrici o a scelta del tavolo senza arbitrio del bot** (`all`, `allCreatures`, `eachPlayer`, i due `*Instruction` di sacrificio/scarto) rispetto a `highestPower`/`highestToughness`/`highestManaValue`/`random`: i primi corrispondono a carte reali già non a bersaglio (cappe, edict), i secondi sono un ripiego per reinterpretare carte a bersaglio singolo (es. "Doom Blade") che il bot, non vedendo la board, non potrebbe altrimenti puntare in modo sensato. I mazzi [zombie](../src/data/zombieDeck.ts) e [dinosauri](../src/data/dinosaurDeck.ts) seguono questo criterio in modo stretto.

### `errata`: regole custom per le carte che nessun template esprime da solo

Un `DeckCardConfig` può avere un campo opzionale `errata: string` che **sostituisce** il testo generato dal template per quella carta (vedi [formato-mazzo.md](formato-mazzo.md#errata--regole-custom)). Va usato con parsimonia, solo quando la vera carta ha una risoluzione modale che dipende dalla board dei giocatori (che il bot non vede) e nessun `mode`/`target` esistente la cattura — es. *Extinction Event*, che chiede di scegliere l'opzione (mana value ≤3 o ≥4) che colpirebbe più creature dei giocatori. Non va usato per valori scalari stimabili a occhio: quelli restano `NumericValue` con `query` (vedi sopra).

### `NumericValue`: valori fissi o da domanda

Qualunque parametro numerico di un template (`count`, `power`, `amount`, ...) può essere:

- **un numero fisso**, oppure
- **una domanda** (stile Archenemy): `{ query: string, multiplier: number, offset: number, min?: number, max?: number }`. Al momento della risoluzione, l'app chiede all'operatore un numero (es. "Quanti artefatti controllano i giocatori?") e calcola `risultato = risposta × multiplier + offset`, poi lo vincola a `[min, max]` se specificati.

Esempio reale dal mazzo precompilato — *Bane of Progress*, che diventa una creatura 4/4 + 1/+1 per ogni artefatto/incantesimo dei giocatori:

```json
{
  "power": { "query": "Quanti artefatti e incantesimi controllano i giocatori?", "multiplier": 1, "offset": 4, "min": 4 },
  "toughness": { "query": "Quanti artefatti e incantesimi controllano i giocatori?", "multiplier": 1, "offset": 4, "min": 4 }
}
```

Se due campi della stessa carta condividono la stessa domanda (come sopra), l'app la chiede **una sola volta** e riusa la risposta per entrambi (dedup per testo della domanda, non per campo — vedi `collectQueriesForCard` in `templates.ts`).

## Criterio di curatela del mazzo

L'app include tre mazzi precompilati, caricabili dal deck builder ("Carica mazzo precompilato"): quello [di default](../src/data/defaultDeck.ts) e due mazzi tematici più grandi con più copie delle stesse carte, [zombie](../src/data/zombieDeck.ts) e [dinosauri](../src/data/dinosaurDeck.ts) (49 carte ciascuno). Le carte scelte per questi mazzi — e quelle che si aggiungono a mano dal deck builder — devono avere un effetto reale che mappa in modo pulito e diretto su uno dei template sopra: creature vanilla o con keyword semplici, rimozioni non condizionate, danno piatto, buff piatti, effetti scalabili a singola variabile. Si evitano di proposito carte con testo Oracle complesso, condizioni multiple, sostituzioni, interazioni con lo stack — non perché il sistema non le supporterebbe in teoria, ma perché forzarle in un template ne snaturerebbe l'effetto. Quando una carta reale ha più sfumature di quelle rappresentabili (es. "distruggi creatura non nera" diventa semplicemente "distruggi una creatura"), si sceglie sempre la lettura più semplice, anche se questo la rende leggermente più o meno forte dell'originale — è un compromesso accettato, bilanciato dalle leve di difficoltà (vedi sotto).

## Leve di difficoltà

Impostate in `SetupScreen` all'avvio partita (`GameConfig`):

- **`drawPerTurn`** — quante carte pesca il bot ogni turno. La leva principale: più carte pescate, più minacce/rimozioni per turno.
- **`startingLife`** — vita iniziale del bot, per assorbire il fatto di affrontare 4 giocatori contemporaneamente.
- **`playerCount`** — numero di giocatori al tavolo; salvato per riferimento ma non usato in nessun calcolo dell'engine (dato che i giocatori sono trattati collettivamente, non individualmente).
