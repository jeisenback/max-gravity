# Pins

A pin is a record of what some code plays, kept in `tests/fixtures/*-pin.json`. It is how a change that must not change behavior (turning code into data, moving words into the text layer, a refactor) is shown to have changed nothing: the pin is written from the code as it is, the code is changed, and the pin must pass unchanged.

## Writing one

1. A harness, `tests/xxxplay.js`, exports a function that runs in the page and returns a list of records. Each record has a `key` (or an `id`) and holds what a scene shows (title, text, labels) and, for each choice, what it returns and what it changes, over several seeded dice. Seed each case on its own (`__seed(n)`), so that cases do not depend on how many dice the one before drew.
2. `tests/xxxpin.test.js` is three lines with the helper in `tests/pin.js`:

   ```js
   const { pinTests } = require('./pin');
   const { playXxx } = require('./xxxplay');
   pinTests({ name: 'the xxx scenes', fixture: 'xxx-pin.json', play: playXxx, min: 20 });
   ```

3. Write the fixture once with `PIN_WRITE=1 node --test tests/xxxpin.test.js`, commit it, then change the code. The pin must pass with no change to the fixture.

## Effects and words

A pin that names `words` in `pinTests` (the keys that hold prose, at any depth) is compared twice:

- **Effects** (`... do what they always did`): the record without its words, and without the `changes` of a memory or the home log. This is the refactor proof. It is sacred: it passes unchanged through a prose pass, and a commit that changes its fixture says why in its message.
- **Words** (`... say what the fixture holds`): the whole record. A prose pass fails it on purpose. Write the fixture again with `PIN_WRITE=1` and read the diff as a proofread. If only this test fails, no behavior changed.

Both read the same fixture, so one `PIN_WRITE=1` run updates both. A pin of nothing but words (`family-pin.json`, `line-tables-pin.json`) names no `words` and stays one test; the `*lines.test.js` checks that every line is read cover the same ground from the other side.

## Checks before you trust one

- **Does it record what you are about to change?** A pin only protects what it records. Before a conversion, break the thing on purpose (change one word or one effect) and see the pin fail. If it does not, extend the harness.
- **Is it repeatable?** `pinTests` plays the harness twice and compares. Randomness that depends on the engine (a sort on a random comparator, the order of an object) differs between browsers: record a normalized value (say `CAT` for a name drawn by a shuffle) or force the dice (`seq([(k + 0.5) / n])` picks the k-th of n).
- **Can each branch be reached?** A choice that rolls is played once on a good roll and once on a bad one; a pick among several lines is played with the dice forced to each. The tests of the text layer (`*lines.test.js`) show which line is never read.

## Extending a pin after the fact

When the harness is extended to record more (a memory, a log line), the new records must come from the code before the change, not after it. `tools/pin-from.js` does this:

```
npm run pin:from -- tests/xxxpin.test.js              # compare only
npm run pin:from -- --ignore mem,log --write tests/xxxpin.test.js
```

It makes a clean checkout of `--ref` (default `origin/main`), puts the working tree's `tests/` in it, runs the named tests there with `PIN_WRITE=1`, and compares each fixture that came out with the working tree's, record by record: how many changed, are new or are gone, and the first names. `--ignore` names fields the harness now records, so that a record that differs only in them counts as the same. `--write` takes the new fixtures into the working tree. Read the report: every record that changed and is not the field you added is a difference in what the old code plays, not in the pin.

## What not to pin

A number that is meant to be tuned (prices, pay, pacing) belongs in `npm run soak`, which checks a distribution with a stated sample and tolerance. A pin of it fails on every tuning and says nothing.
