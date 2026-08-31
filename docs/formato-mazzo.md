# Formato del mazzo (JSON)

Riferimento per chi vuole modificare a mano un file esportato dal deck builder, scriversi uno script esterno per generare un mazzo, o semplicemente capire cosa viene salvato in `localStorage`. I tipi sorgente sono in [`src/types.ts`](../src/types.ts).

## Struttura generale

Un file di mazzo (quello scaricato con "Esporta" nel deck builder, chiave `horde-deck-config-v1` di `localStorage`) è un oggetto `DeckConfig`:

```json
{
  "cards": [ /* DeckCardConfig[] */ ]
}
```

Ogni carta è un `DeckCardConfig`:

```ts
{
  id: string            // identificativo univoco della voce nel mazzo (non l'id Scryfall — permette copie multiple della stessa carta)
  scryfallName: string  // nome esatto (o quasi: la ricerca è "fuzzy") della carta su Scryfall
  scryfall?: {           // opzionale: dati recuperati da Scryfall, ripopolati automaticamente dall'app se mancanti
    scryfallId: string
    name: string
    manaCost: string
    cmc: number
    typeLine: string
    imageUrl?: string
    colors: string[]
  }
  effect: EffectParams  // vedi sotto — determina cosa fa la carta quando il bot la gioca
  errata?: string        // opzionale — vedi "Errata / regole custom" più sotto
}
```

Se scrivi un mazzo a mano, puoi omettere `scryfall` — l'app lo recupera da sola al primo avvio (o al primo utilizzo, per le carte aggiunte dal deck builder) e lo salva in cache.

## `EffectParams`

Il campo `kind` seleziona il template (vedi [design-di-gioco.md](design-di-gioco.md) per la semantica di ciascuno). Ogni parametro numerico (`count`, `power`, `amount`, ...) accetta un `NumericValue`: **o** un numero fisso, **o** un oggetto domanda:

```ts
type NumericValue =
  | number
  | { query: string; multiplier: number; offset: number; min?: number; max?: number }
```

### `CreateCreature`

```json
{
  "kind": "CreateCreature",
  "count": 1,
  "power": 5,
  "toughness": 5,
  "keywords": ["flying", "trample"],
  "tokenName": "Drago"
}
```

`keywords` è un sottoinsieme di: `flying, trample, deathtouch, lifelink, firststrike, doublestrike, menace, vigilance, reach, haste`. `tokenName` è opzionale, usato solo quando `count` risolve a più di 1 (altrimenti la creatura è la carta stessa).

### `PumpBotBoard`

```json
{
  "kind": "PumpBotBoard",
  "powerBonus": 3,
  "toughnessBonus": 3,
  "grantKeywords": ["trample"]
}
```

### `GainLifeBot`

```json
{ "kind": "GainLifeBot", "amount": 8 }
```

### `DrawExtraBot`

```json
{ "kind": "DrawExtraBot", "amount": 2 }
```

### `RemovalInstruction`

```json
{
  "kind": "RemovalInstruction",
  "mode": "highestPower",
  "count": 1,
  "destroyOrExile": "destroy"
}
```

`mode`: `highestPower | highestToughness | highestManaValue | random | all` (con `all`, `count` viene ignorato). `destroyOrExile`: `destroy | exile`.

### `DamageInstruction`

```json
{
  "kind": "DamageInstruction",
  "amount": 3,
  "target": "eachPlayer"
}
```

`target`: `eachPlayer | creatureHighestPower | creatureHighestToughness | creatureRandom | allCreatures`.

### `SacrificeInstruction` / `DiscardInstruction`

```json
{ "kind": "SacrificeInstruction", "perPlayer": true, "count": 2 }
```

```json
{ "kind": "DiscardInstruction", "perPlayer": false, "count": 3 }
```

`perPlayer: true` → "ogni giocatore ×N"; `perPlayer: false` → "i giocatori scelgono insieme N in totale".

## Valori "da domanda" (query)

Al posto di un numero fisso, un parametro può scalare in base a una domanda posta all'operatore durante la risoluzione del turno:

```json
{
  "power": {
    "query": "Quanti artefatti e incantesimi controllano i giocatori?",
    "multiplier": 1,
    "offset": 4,
    "min": 4
  }
}
```

Calcolo: `risultato = risposta_operatore × multiplier + offset`, poi vincolato a `[min, max]` se presenti (entrambi opzionali). Se più campi della stessa carta usano **testo identico** in `query`, l'app pone la domanda una sola volta e riusa la risposta per tutti.

## Errata / regole custom

Il campo opzionale `errata` su `DeckCardConfig` è un testo libero che **sostituisce interamente** l'istruzione generata dal `effect` per quella carta, quando il turno viene risolto (vedi `resolveBotTurn` in [`botTurnEngine.ts`](../src/engine/botTurnEngine.ts)).

Serve per i pochi casi in cui la vera carta ha una risoluzione che dipende dalla board dei giocatori — che il bot non vede — e nessun singolo template la esprime da solo. L'esempio principale è una carta modale come *Extinction Event* ("distruggi le creature con mana value 3 o meno, OPPURE quelle con mana value 4 o più"): nessun `RemovalMode` esistente sa dire "il tavolo sceglie l'opzione che colpisce più creature", quindi lo si scrive come regola esplicita:

```json
{
  "kind": "RemovalInstruction",
  "mode": "all",
  "count": 1,
  "destroyOrExile": "destroy"
}
```
```json
"errata": "Scegli l'opzione che colpirebbe più creature dei giocatori: distruggi tutte le loro creature con valore di mana 3 o inferiore, oppure distruggi tutte le loro creature con valore di mana 4 o superiore."
```

`mode`/`count`/`destroyOrExile` restano valorizzati per validità dello schema ma sono ignorati a favore del testo di `errata` quando quest'ultimo è presente.

Da non confondere con le [query](#valori-da-domanda-query): se la carta richiede solo un **numero** che l'operatore può stimare guardando il tavolo (es. *Toxic Deluge*, "-X/-X a tutte le creature" con X a scelta), basta una `NumericValue` con `query` — non serve `errata`. `errata` è per le scelte **modali** (tra opzioni qualitativamente diverse), non per i valori scalari.

Vedi [`src/data/zombieDeck.ts`](../src/data/zombieDeck.ts) e [`src/data/dinosaurDeck.ts`](../src/data/dinosaurDeck.ts) per entrambi gli esempi in un mazzo reale.

## Esempio completo

Un mini-mazzo con un template per famiglia:

```json
{
  "cards": [
    {
      "id": "d1",
      "scryfallName": "Colossal Dreadmaw",
      "effect": { "kind": "CreateCreature", "count": 1, "power": 6, "toughness": 6, "keywords": ["trample"] }
    },
    {
      "id": "d2",
      "scryfallName": "Wrath of God",
      "effect": { "kind": "RemovalInstruction", "mode": "all", "count": 1, "destroyOrExile": "destroy" }
    },
    {
      "id": "d3",
      "scryfallName": "Bane of Progress",
      "effect": {
        "kind": "CreateCreature",
        "count": 1,
        "power": { "query": "Quanti artefatti e incantesimi controllano i giocatori?", "multiplier": 1, "offset": 4, "min": 4 },
        "toughness": { "query": "Quanti artefatti e incantesimi controllano i giocatori?", "multiplier": 1, "offset": 4, "min": 4 },
        "keywords": []
      }
    }
  ]
}
```

## Import/export dall'app

Nella scheda **Mazzo del bot**:

- **Esporta** — scarica il mazzo corrente come file `horde-deck.json` (usa `downloadJSON` in [`persistence.ts`](../src/state/persistence.ts)).
- **Importa** — carica un file `DeckConfig` e sostituisce integralmente il mazzo corrente (`SET_DECK`). Non c'è merge: importare rimpiazza tutte le carte esistenti.

Il mazzo del bot vive separatamente dalla partita in corso: modificarlo non altera una partita già avviata, perché all'avvio l'app ne salva uno snapshot (`GameState.deckSnapshot`, vedi [design-di-gioco.md](design-di-gioco.md)).
