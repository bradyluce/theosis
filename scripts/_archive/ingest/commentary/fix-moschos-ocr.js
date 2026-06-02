#!/usr/bin/env node
/**
 * One-off OCR cleanup for John Moschos, The Spiritual Meadow
 * (tr. John Wortley, Cistercian Studies 139, 1992), scanned PDF → OCR
 * with column-split re-OCR. Residual artifacts remain.
 *
 * Reads content/generated/commentary/moschos-spiritual-meadow.json, applies
 * targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative: applies only where the pattern is unambiguous in
 * Wortley's modern English prose. Proper names (Sinai, Jordan, Jerusalem,
 * Jericho, Joanna, Jerome, Jewish, Joasaph, Julianus, Jordanes the lion,
 * Latin "de Jordane", Judaea/Judaean/Judaco/Judacan, Jew/Jews, Journal,
 * Journel, Journey, Julieane, etc.), Greek transliterations, Latin
 * quotations, archaic forms inside quoted/cited material, Scripture
 * references and digits are preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running
 * after the bundle is regenerated is a no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/moschos-spiritual-meadow.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry: [/regex/, 'replacement', 'rule-name']
// All patterns are word-bounded so legitimate English does not match.
// ---------------------------------------------------------------------------
const wordFixes = [
  // ---- Stray '¢' (cent sign) used in place of 'c' or 'e' ----
  // "¢o him" → "to him" — "¢" stray glyph (mid-sentence, after speech tag)
  [/\b¢o him\b/g, 'to him', 'cent-o-him->to-him'],
  // "¢lder" → "elder"
  [/\b¢lder\b/g, 'elder', 'cent-lder->elder'],
  // "¢arthenware" → "earthenware"
  [/\b¢arthenware\b/g, 'earthenware', 'cent-arthenware->earthenware'],

  // ---- "lever" / "fever" letter-confusion (l↔f) ----
  // Only one instance, paragraph 1: "shiver with lever" → "shiver with fever"
  [/\bshiver with lever\b/g, 'shiver with fever', 'lever->fever'],

  // ---- "lhe" lowercase 'l' for 't' ----
  [/\blhe wildemess\b/g, 'the wilderness', 'lhe-wildemess->the-wilderness'],
  [/\blhe raising\b/g, 'the raising', 'lhe-raising->the-raising'],

  // ---- "Lhe" / "Lhe" (capital L for T at sentence-internal positions) ----
  // Confirmed contexts: 'slandered Lhe' / 'threw Lhe piece' / 'against Lhe Lord' /
  // 'besieged by Lhe attentions' / 'al Lhe city to come'
  [/\bLhe\b/g, 'The', 'Lhe->The'],

  // ---- "Ihe" capital-I for T ----
  // 'on Ihe ground' / 'on Ihe sand' / 'asked Ihe elder'
  [/\bIhe\b/g, 'The', 'Ihe->The'],

  // ---- "Tt" / "Tn" (T misread for I at sentence start) ----
  [/\bTt will\b/g, 'It will', 'Tt-will->It-will'],
  [/\bTt is\b/g, 'It is', 'Tt-is->It-is'],
  [/\bTt was\b/g, 'It was', 'Tt-was->It-was'],
  [/\bTn my\b/g, 'In my', 'Tn-my->In-my'],
  [/\bTn the eastern\b/g, 'In the eastern', 'Tn-the-eastern->In-the-eastern'],

  // ---- "Thete" → "There" (capital T preserved; 'te' for 're') ----
  [/\bThete was a Jew\b/g, 'There was a Jew', 'Thete->There'],

  // ---- "ckler" → "elder" (one-off OCR garble of "elder") ----
  [/\bckler\b/g, 'elder', 'ckler->elder'],

  // ---- "clder" → "elder" (c for e initial) ----
  [/\bclder\b/g, 'elder', 'clder->elder'],

  // ---- "cider" → "elder" (c for e, i for l) ----
  // "the cider's grave", "the cider had not departed", "I said to the cider"
  // and "the cider brother" (older brother) all refer to the monastic elder.
  [/\bcider's grave\b/g, "elder's grave", 'cider->elder-s-grave'],
  [/\bthe cider had not departed\b/g, 'the elder had not departed', 'cider->elder-not-departed'],
  [/\bthe cider: "You kaow\b/g, 'the elder: "You know', 'cider->elder-kaow'],
  [/\bWhen the cider brother\b/g, 'When the elder brother', 'cider-brother->elder-brother'],

  // ---- "wouid"/"couid"/"shouid" — letter-confusion (i for l) ----
  // None present in this corpus (the OCR shape uses 'l' here), but we keep
  // related letter-confusion variants below.

  // ---- "joumey" — none in this corpus (n vs m); confirmed.

  // ---- "Sinal" → "Sinai" (l for i at end of place name) ----
  // Five occurrences: "came to Sinal", "abbot abbas of Sinal" (×2),
  // "constructing at Sinal".
  [/\bSinal\b/g, 'Sinai', 'Sinal->Sinai'],

  // ---- "Sina" → "Sinai" (truncation) ----
  // One occurrence: "days after we had come to Sina, the Abbot abbas of Sinal".
  [/\bcome to Sina,/g, 'come to Sinai,', 'Sina-trunc->Sinai'],

  // ---- "Sinat" → "Sinai" (t for i at end) ----
  // "holy Mount Sinat. The godly..."
  [/\bMount Sinat\b/g, 'Mount Sinai', 'Sinat->Sinai'],

  // ---- "himsell" / "mysell" → "himself" / "myself" (l for f at end) ----
  // 4 instances of himsell, 5 of mysell
  [/\bhimsell\b/g, 'himself', 'himsell->himself'],
  [/\bmysell\b/g, 'myself', 'mysell->myself'],
  // "bimsell" — variant: b for h, l for f
  [/\bbimsell\b/g, 'himself', 'bimsell->himself'],
  // "mysel[" / "mysel\"" / "mysel"  - one instance has mysel] as well
  [/\bmysel\]/g, 'myself', 'mysel-bracket->myself'],
  [/\bmysel\[/g, 'myself', 'mysel-lbracket->myself'],
  // "himsel"" / "himsel'" - check; only "himsel"" with curly quote appears once
  [/\bhimsel"/g, 'himself', 'himsel-quote->himself'],

  // ---- "sell-abegnation" → "self-abnegation" (typo: "abegnation") ----
  // Single occurrence in the corpus.
  [/\bsell-abegnation\b/g, 'self-abnegation', 'sell-abegnation->self-abnegation'],

  // ---- "altacked" → "attacked" (l for t) ----
  [/\baltacked\b/g, 'attacked', 'altacked->attacked'],

  // ---- "Jax" → "lax" (J for l) ----
  [/\bso Jax\b/g, 'so lax', 'Jax->lax'],

  // ---- "Jike" → "like" (J for l) ----
  [/\bI would Jike to\b/g, 'I would like to', 'Jike-to->like-to'],
  [/\bever met his Jike\b/g, 'ever met his like', 'his-Jike->his-like'],

  // ---- "alter" → "after" when context is unambiguous ----
  // 'looking alter your own soul' / 'look alter us' — both mean "after"
  [/\blooking alter your own soul\b/g, 'looking after your own soul', 'alter-your-soul->after-your-soul'],
  [/\blook alter us\b/g, 'look after us', 'alter-us->after-us'],

  // ---- "aller" → "after" (single confirmed instance in Notes appendix) ----
  [/\baller his death\b/g, 'after his death', 'aller-his-death->after-his-death'],

  // ---- "Chest" → "Christ" (one occurrence in tale 1) ----
  [/\bLord Jesus Chest\b/g, 'Lord Jesus Christ', 'Chest->Christ'],

  // ---- "edificd" → "edified" (c for e) ----
  [/\bgreatly edificd\b/g, 'greatly edified', 'edificd->edified'],

  // ---- "oulside" → "outside" (l for t) ----
  [/\boulside\b/g, 'outside', 'oulside->outside'],

  // ---- "fulfilied" → "fulfilled" (i for l mid-word) ----
  [/\bfulfilied\b/g, 'fulfilled', 'fulfilied->fulfilled'],

  // ---- "behoid" → "behold" (i for l) ----
  [/\bbehoid\b/g, 'behold', 'behoid->behold'],

  // ---- "approactied" → "approached" (ti for h) ----
  [/\bapproactied\b/g, 'approached', 'approactied->approached'],

  // ---- "impiocusly" → "impiously" (c for u, transposed letters) ----
  [/\bimpiocusly\b/g, 'impiously', 'impiocusly->impiously'],

  // ---- "chiid" → "child" (i for l) ----
  [/\bchiid\b/g, 'child', 'chiid->child'],

  // ---- "toid" → "told" (i for l) ----
  [/\bof that place toid us\b/g, 'of that place told us', 'toid->told'],

  // ---- "goid" → "gold" (i for l) ----
  [/\bthree pieces of goid\b/g, 'three pieces of gold', 'goid->gold'],

  // ---- "lite" → "life" (t for f) ----
  // 'lay down his lite for his friends' (Jn 15:13 cite) - clear
  // 'drawing on ita lite at a time' - 'a little at a time'? Looks like 'drawing on it a little at a time'.
  [/\blay down his lite for his friends\b/g, 'lay down his life for his friends', 'lite->life-friends'],
  // For the second context the surrounding "ita lite" is "it a little" with merging artifacts.
  // Conservative: rewrite the specific phrase.
  [/\bdrawing on ita lite at a time\b/g, 'drawing on it a little at a time', 'ita-lite->it-a-little'],

  // ---- "fect" → "feet" (c for e) — three confirmed contexts ----
  [/\bthose fect which would not walk\b/g, 'those feet which would not walk', 'fect-walk->feet-walk'],
  [/\bwashed his fect\b/g, 'washed his feet', 'fect-washed->feet-washed'],
  [/\bfell at my fect\b/g, 'fell at my feet', 'fect-fell->feet-fell'],

  // ---- "fel " (single l) → "fell " — three contexts: fel asleep / fel} prostrate / fel) terminally ill ----
  [/\bhe fel asleep in peace\b/g, 'he fell asleep in peace', 'fel-asleep->fell-asleep'],
  [/\bhe fel\} prostrate\b/g, 'he fell prostrate', 'fel-prostrate->fell-prostrate'],
  [/\bhe fel\) terminally ill\b/g, 'he fell terminally ill', 'fel-terminally->fell-terminally'],

  // ---- "al}" / "al)" / "al]" → "all" when in clear "all X" idioms ----
  [/\bworking al\} day long\b/g, 'working all day long', 'al-brace-day->all-day'],
  [/\bconsecration al\] over again\b/g, 'consecration all over again', 'al-bracket-over->all-over'],

  // ---- "tel]" → "tell" (] for l) — three contexts ----
  [/\bdare to tel\] him\b/g, 'dare to tell him', 'tel-bracket-him->tell-him'],
  [/\bshall tel\] me\b/g, 'shall tell me', 'tel-bracket-me->tell-me'],
  [/\bnot tel\] it to anybody\b/g, 'not tell it to anybody', 'tel-bracket-it->tell-it'],

  // ---- "wil)" → "will" ----
  [/\bI wil\) go\b/g, 'I will go', 'wil-paren-go->will-go'],
  [/\bGod wil give you water\b/g, 'God will give you water', 'wil-give->will-give'],
  [/\bwil smiling faces\b/g, 'with smiling faces', 'wil-smiling->with-smiling'],

  // ---- "ail" → "all" (i for l) — three contexts ----
  [/\bdestroy ail you have endured\b/g, 'destroy all you have endured', 'ail-endured->all-endured'],
  [/\bwould fast ail day long\b/g, 'would fast all day long', 'ail-day->all-day'],
  [/\bus this in ail truth\b/g, 'us this in all truth', 'ail-truth->all-truth'],
  [/\bkill you ail\b/g, 'kill you all', 'ail-kill->all-kill'],

  // ---- "ali" → "all" (i for l) ----
  [/\bbecause of me you are ali going to perish\b/g, 'because of me you are all going to perish', 'ali-perish->all-perish'],
  [/\billuminated the hearts of us ali\?/g, 'illuminated the hearts of us all?', 'ali-hearts->all-hearts'],
  [/\bI lost nothing at ali\b/g, 'I lost nothing at all', 'ali-nothing->all-nothing'],

  // ---- "Lo" → "to" — capital L for lowercase t when sentence-internal ----
  // Examples: 'returned Lo the task', 'came Lo you', 'over to the lion, Lo pasture',
  // 'began Lo suspect', 'went up Lo the lion'.
  [/\breturned Lo the task\b/g, 'returned to the task', 'Lo-task->to-task'],
  [/\bwe came Lo you\b/g, 'we came to you', 'Lo-you->to-you'],
  [/\bover to the lion, Lo pasture\b/g, 'over to the lion, to pasture', 'Lo-pasture->to-pasture'],
  [/\bbegan Lo suspect\b/g, 'began to suspect', 'Lo-suspect->to-suspect'],
  [/\bwent up Lo the lion\b/g, 'went up to the lion', 'Lo-lion->to-lion'],
  [/\bagainst Lhe Lord/g, 'against the Lord', 'Lhe-Lord-2->the-Lord'], // safety net if any survive

  // ---- "1o" → "to" ----
  [/\bbeneficial 1o vs\b/g, 'beneficial to us', '1o-vs->to-us'],
  [/\bfather and 1o the fullocss\b/g, 'father and to the fullness', '1o-fullocss->to-fullness'],

  // ---- "10" → "to" (zero for o) when followed by infinitive verb / typical t-o patterns ----
  [/\b10 you'\. He left the brother\b/g, "to you'. He left the brother", '10-you->to-you'],
  [/\b10 this place he will come\b/g, 'to this place he will come', '10-this-place->to-this-place'],
  [/\b10 guard and detain clergy\b/g, 'to guard and detain clergy', '10-guard->to-guard'],
  [/\b10 see him\b/g, 'to see him', '10-see-him->to-see-him'],
  [/\bgoilig 10 leave him\b/g, 'going to leave him', '10-leave->to-leave'],
  [/\bup 10 sce Symeon the Great\b/g, 'up to see Symeon the Great', '10-sce->to-see'],
  [/\btook the book \(o the anchorite\b/g, 'took the book to the anchorite', 'paren-o->to-anchorite'],

  // ---- "vs" → "us" — restricted to confirmed phrases ----
  [/\bspoke to vs\b/g, 'spoke to us', 'vs-spoke->us-spoke'],
  [/\btold vs this\b/g, 'told us this', 'vs-told->us-told'],
  [/\btold vs a multitude\b/g, 'told us a multitude', 'vs-multitude->us-multitude'],
  [/\bbeneficial to vs\b/g, 'beneficial to us', 'vs-beneficial->us-beneficial'],
  // (One earlier rule already handled "beneficial 1o vs".)

  // ---- "bat" → "but" — one confirmed instance ----
  [/\bdo not go there', bat as he\b/g, "do not go there', but as he", 'bat->but'],

  // ---- "bul" → "but" (l for t) ----
  [/\bno choice bul to hand over\b/g, 'no choice but to hand over', 'bul-choice->but-choice'],
  [/\bdrinking water, bul I have gone\b/g, 'drinking water, but I have gone', 'bul-drinking->but-drinking'],
  [/\bdemons, bul none of it\b/g, 'demons, but none of it', 'bul-demons->but-demons'],

  // ---- "il " → "if " (l for f) — restricted to clear "if X" contexts ----
  [/\bof men and women il this was needed\b/g, 'of men and women if this was needed', 'il-needed->if-needed'],
  [/\bdinghy and il the vessel\b/g, 'dinghy and if the vessel', 'il-vessel->if-vessel'],
  [/\bcity and countryside, to see il there is\b/g, 'city and countryside, to see if there is', 'il-anywhere->if-anywhere'],
  // 'lying seriously il' (one instance) — meaning 'ill', not 'if'. Single 'il' at end of clause.
  [/\blying seriously il,/g, 'lying seriously ill,', 'il-end->ill-end'],
  // 'better to die here than to be an occasion of stumb]ing'
  [/\bstumb\]ing\b/g, 'stumbling', 'stumb-bracket-ing->stumbling'],
  // 'to comfort il by their words' — this 'il' is 'it' (referring to the lion)
  [/\bto comfort il by their words\b/g, 'to comfort it by their words', 'il-comfort->it-comfort'],
  // 'where il was customary 10 guard' — 'where it was customary to guard'
  [/\bwhere il was customary\b/g, 'where it was customary', 'il-customary->it-customary'],

  // ---- "arc" → "are" (c for e) ----
  [/\bthey arc already consecrated\b/g, 'they are already consecrated', 'arc-consecrated->are-consecrated'],
  [/\byou arc to strive\b/g, 'you are to strive', 'arc-strive->are-strive'],
  [/\bWhy arc you calling\b/g, 'Why are you calling', 'arc-calling->are-calling'],
  [/\bYou arc welcome il when\b/g, 'You are welcome if when', 'arc-welcome->are-welcome'],
  [/\byou arc not truly\b/g, 'you are not truly', 'arc-truly->are-truly'],

  // ---- "Jovers" → "lovers" (J for l) inside obvious phrase ----
  [/\btruly Jovers of wisdom\b/g, 'truly lovers of wisdom', 'Jovers->lovers'],
  // ---- "Jove" → "love" — only where context is the abstract noun ----
  [/\bgreat Jove, asceticism\b/g, 'great love, asceticism', 'Jove-asceticism->love-asceticism'],
  [/\bGreater Jove bath no man\b/g, 'Greater love hath no man', 'Jove-bath->love-hath'],
  [/\bbodily rest but Jove affliction\b/g, 'bodily rest but love affliction', 'Jove-affliction->love-affliction'],
  // ---- "Joved" → "loved" ----
  [/\bascetics who Joved God\b/g, 'ascetics who loved God', 'Joved-God->loved-God'],
  // ---- "Joves" → "loves" ----
  [/\bThe kindly deacon Joves me\b/g, 'The kindly deacon loves me', 'Joves-me->loves-me'],
  // ---- "Joving" → "loving" — none in confirmed contexts; skip.
  // ---- "Jover" → "lover" — same; skip unless verified.

  // ---- "Jet" → "let" ----
  [/\bIt then Jet him drop\b/g, 'It then let him drop', 'Jet-drop->let-drop'],
  [/\bmost holy man to Jet us take\b/g, 'most holy man to let us take', 'Jet-take->let-take'],
  [/\bOh Jet the simple not go away ashamed\b/g, 'Oh let the simple not go away ashamed', 'Jet-simple->let-simple'],
  [/\bChildren, Jet us not love\b/g, 'Children, let us not love', 'Jet-not-love->let-not-love'],
  [/\bsaint and Jet it down into the well\b/g, 'saint and let it down into the well', 'Jet-well->let-well'],

  // ---- "Jeave" → "leave" ----
  [/\babout to Jeave his house\b/g, 'about to leave his house', 'Jeave-house->leave-house'],

  // ---- "Jeft" → "left" ----
  [/\bhe Jeft\b/g, 'he left', 'Jeft-he->left-he'],

  // ---- "Jaid" → "laid" (J for l) ----
  [/\bhaving 1aid down his life\b/g, 'having laid down his life', '1aid->laid'],

  // ---- "Jion" → "lion" — proper-name context only in fables; conservative skip.
  // Actually no clear 'Jion' single-instance issues; leave alone.

  // ---- "Jong" → "long" — four instances; all clear ----
  [/\baad this went on for a Jong time\b/g, 'and this went on for a long time', 'Jong-time-aad->long-time-and'],
  [/\bin so Jong a period\b/g, 'in so long a period', 'Jong-period->long-period'],
  [/\ball day Jong, but they\b/g, 'all day long, but they', 'Jong-but->long-but'],
  [/\bso Jong as onc is not overcome\b/g, 'so long as one is not overcome', 'Jong-onc->long-one'],

  // ---- "Jonger" → "longer" — confirmed ----
  [/\bno Jonger Judaic baptism\b/g, 'no longer Judaic baptism', 'Jonger-Judaic->longer-Judaic'],

  // ---- "Jowly" → "lowly" — confirmed in "Oh Jet the simple..." preceded by 'Jowly bishop' ----
  [/\bThe Jowly bishop\b/g, 'The lowly bishop', 'Jowly-bishop->lowly-bishop'],

  // ---- "Jook" → "look" ----
  [/\bJust Jook at the sort of sin\b/g, 'Just look at the sort of sin', 'Jook-sin->look-sin'],

  // ---- "Jooked" → "looked" — confirmed in '1t Jooked as though' ----
  [/\bIt Jooked as though it had been in a kitchen\b/g, 'It looked as though it had been in a kitchen', 'Jooked-kitchen->looked-kitchen'],
  // safety variant '1t Jooked'
  [/\b1t Jooked as though it had been in a kitchen\b/g, 'It looked as though it had been in a kitchen', '1t-Jooked->It-looked'],

  // ---- "Jord" → "lord" (J for l, ONLY at "my Jord" / "my Jord," — NOT Jordan/Jerome/etc.) ----
  [/\bmy Jord,/g, 'my lord,', 'my-Jord-comma->my-lord-comma'],
  [/\bmy Jord, if it is your will\b/g, 'my lord, if it is your will', 'my-Jord-will->my-lord-will'],
  [/\bname of our Jord Jesus Christ\b/g, 'name of our lord Jesus Christ', 'Jord-Jesus->lord-Jesus'],
  // The above 'our Jord Jesus Christ' looks like 'our Lord' (capitalised in Wortley);
  // but since 'lord' lowercase is grammatically fine and matches the original lowercase 'Jord',
  // we use lowercase 'lord'. Note this is intentional preservation of the OCR case.

  // ---- "Jife" → "life" ----
  [/\beternal Jife in the future\b/g, 'eternal life in the future', 'Jife-future->life-future'],
  [/\bLord of Jife and the Master\b/g, 'Lord of life and the Master', 'Jife-Master->life-Master'],

  // ---- "Jb" → "Jb." inside scripture citation — already 'Jb' is the abbreviation for Job, keep ----
  // (No fix needed; this is the standard SBL/scholarly abbreviation.)

  // ---- "Jobn" → "John" — two occurrences in references ----
  [/\bAbba Jobn the Cilician\b/g, 'Abba John the Cilician', 'Jobn-Cilician->John-Cilician'],
  [/\b'Jobn Moschos and his friend Sephronios\b/g, "'John Moschos and his friend Sephronios", 'Jobn-Moschos->John-Moschos'],

  // ---- "Joha" → "John" — three contexts; one is 'Moschos, Joha' (bibliographic, refers to John Moschos) ----
  [/\bAbba Joha, surnamed Molybas\b/g, 'Abba John, surnamed Molybas', 'Joha-Molybas->John-Molybas'],
  [/\bhand over Abba Joha\b/g, 'hand over Abba John', 'Joha-hand-over->John-hand-over'],
  [/\bSpiritual, see Moschos, Joha\b/g, 'Spiritual, see Moschos, John', 'Joha-Moschos->John-Moschos'],

  // ---- "Joh" → "Joh." or "John" — single instance: 'are frequently mentioned by Joh; see cc.' ----
  // This 'Joh' is most likely 'Joh.' (an abbreviation for John used in scholarly citation)
  // but Wortley's running text uses 'John'; leave as is — ambiguous.

  // ---- "Joho" → "John" ----
  [/\btogether with Abba Joho the Scholasticos\b/g, 'together with Abba John the Scholasticos', 'Joho-Scholasticos->John-Scholasticos'],

  // ---- "Jolin" → "John" — one instance in editorial note ----
  [/\bMoschos presumably and Jolin, priest of the Lavra\b/g, 'Moschos presumably and John, priest of the Lavra', 'Jolin-priest->John-priest'],

  // ---- "Jamp" → "lamp" (J for l) ----
  [/\blight a Jamp\b/g, 'light a lamp', 'Jamp->lamp'],
  // ---- "Jarge" → "large" ----
  [/\bJarge vessel\b/g, 'large vessel', 'Jarge-vessel->large-vessel'],

  // ---- "Jess" → "less" ----
  [/\bcan be relied on to relay Jess than the whole truth\b/g, 'can be relied on to relay less than the whole truth', 'Jess-truth->less-truth'],
  [/\bits meaning is Jess than clear\b/g, 'its meaning is less than clear', 'Jess-clear->less-clear'],

  // ---- "Jater" → "later" ----
  [/\bSome time Jater I tonsured him\b/g, 'Some time later I tonsured him', 'Jater-tonsured->later-tonsured'],
  [/\bEight months Jater, some monks\b/g, 'Eight months later, some monks', 'Jater-months->later-months'],
  [/\bTwo months Jater the anchorite\b/g, 'Two months later the anchorite', 'Jater-anchorite->later-anchorite'],
  [/\bTwo or three days Jater the higoumen\b/g, 'Two or three days later the higoumen', 'Jater-higoumen->later-higoumen'],
  [/\breturned to their senses three days Jater\b/g, 'returned to their senses three days later', 'Jater-senses->later-senses'],

  // ---- "Jiving" → "living" ----
  [/\bsaid that he was Jiving\b/g, 'said that he was living', 'Jiving-was->living-was'],

  // ---- "Jittie" → "little" ----
  [/\bto his Jittie tower asking for alms\b/g, 'to his little tower asking for alms', 'Jittie-tower->little-tower'],

  // ---- "Jacuna" → "lacuna" ----
  [/\bhas a Jacuna,/g, 'has a lacuna,', 'Jacuna-has->lacuna-has'],
  [/\bsupplied to fill a suspected Jacuna\b/g, 'supplied to fill a suspected lacuna', 'Jacuna-suspected->lacuna-suspected'],

  // ---- "Jacking" / "Jaunch" / "Jocal" / "Jocation" / "Jocated" / "Java" / "Joaves" — single instances ----
  [/\bJacking\b/g, 'lacking', 'Jacking->lacking'],
  [/\bJaunch\b/g, 'launch', 'Jaunch->launch'],
  [/\bJocal\b/g, 'local', 'Jocal->local'],
  [/\bJocation\b/g, 'location', 'Jocation->location'],
  [/\bJocated\b/g, 'located', 'Jocated->located'],
  [/\bJava\b/g, 'lava', 'Java->lava'],
  [/\bJoaves\b/g, 'loaves', 'Joaves->loaves'],

  // ---- "Jair" → "lair" / "Jive" → "live" / "Jearn" → "learn" / "Jearned" → "learned" / "Jepta" → "lepta" / "Jose" → "lose" / "Jate" → "late" / "Jaw" → "law" / "Jaughed" → "laughed" / "Jed" → "led" / "Jector" → "lector" / "Jabour" → "labour" / "Jargely" → "largely" / "Jiturgy" → "liturgy" / "Jast" → "last" / "Jasted" → "lasted" / "Jest" → "lest" / "Jeast" → "least" ----
  [/\bJair\b/g, 'lair', 'Jair->lair'],
  [/\bJive\b/g, 'live', 'Jive->live'],
  [/\bJearn\b/g, 'learn', 'Jearn->learn'],
  [/\bJearned\b/g, 'learned', 'Jearned->learned'],
  [/\btwenty-Jepta loaf\b/g, 'twenty-lepta loaf', 'Jepta->lepta'],
  [/\bJose\b/g, 'lose', 'Jose->lose'],
  [/\bso Jate\b/g, 'so late', 'Jate->late'],
  [/\bJaw\b/g, 'law', 'Jaw->law'],
  [/\bJaughed\b/g, 'laughed', 'Jaughed->laughed'],
  [/\bJabour\b/g, 'labour', 'Jabour->labour'],
  [/\bJargely\b/g, 'largely', 'Jargely->largely'],
  [/\bJiturgy\b/g, 'liturgy', 'Jiturgy->liturgy'],
  [/\bAt Jast\b/g, 'At last', 'Jast-At->last-At'],
  [/\bJasted\b/g, 'lasted', 'Jasted->lasted'],
  [/\bJest\b/g, 'lest', 'Jest->lest'],
  [/\bJeast\b/g, 'least', 'Jeast->least'],
  [/\bJet\b/g, 'let', 'Jet->let'], // single-letter "Jet" anywhere left (no proper-name collisions)

  // "Jarnb" → "lamb" (J→l, rn→m)
  [/\bone Jarnb of Christ\b/g, 'one lamb of Christ', 'Jarnb->lamb'],

  // "Jector" → "lector"
  [/\bJector\b/g, 'lector', 'Jector->lector'],

  // "Jed" → "led" — only with clear English-verb context
  [/\bhad Jed t\b/g, 'had led t', 'Jed->led-had'],

  // ---- "Litugies" → "Liturgies" (rn for ies? — actually "ies" missing 'r') ----
  [/\bLitugies Eastern\b/g, 'Liturgies Eastern', 'Litugies->Liturgies'],

  // ---- "fie" → "he" — single confirmed instance ----
  [/\bwhere fie was turned into carrion\b/g, 'where he was turned into carrion', 'fie-was->he-was'],

  // ---- "bie" → "he" — single confirmed instance "for reign bie did" ----
  [/\bfor reign bie did\b/g, 'for reign he did', 'bie-did->he-did'],

  // ---- "fic" → "he" — single confirmed instance "what fic commands" ----
  [/\bwhat fic commands\b/g, 'what he commands', 'fic-commands->he-commands'],

  // ---- "Yon" → "You" (Y for Y, o for o, n for u — really 'You') ----
  [/\bJericho\. Yon would see this elder\b/g, 'Jericho. You would see this elder', 'Yon-see->You-see'],

  // ---- "iliem" → "them" — single confirmed instance "found iliem both dead" ----
  [/\bfound iliem both dead\b/g, 'found them both dead', 'iliem->them'],

  // ---- "aad" → "and" — five clear contexts ----
  [/\bsame reproach aad admonition\b/g, 'same reproach and admonition', 'aad-admonition->and-admonition'],
  [/\bin the elder's cell-—aad this went on\b/g, "in the elder's cell-—and this went on", 'aad-cell->and-cell'],
  [/\btaking my piece of gold aad, look!\b/g, 'taking my piece of gold and, look!', 'aad-gold->and-gold'],
  [/\bat the window aad spoke with\b/g, 'at the window and spoke with', 'aad-window->and-window'],
  [/\bus see him aad by teaching us\b/g, 'us see him and by teaching us', 'aad-teaching->and-teaching'],

  // ---- "aud" → "and" — five confirmed contexts ----
  [/\bmany great aud wondrous deeds\b/g, 'many great and wondrous deeds', 'aud-wondrous->and-wondrous'],
  [/\bbefore him aud said:/g, 'before him and said:', 'aud-said->and-said'],
  [/\bvoice, its countenance aud by its eyes\b/g, 'voice, its countenance and by its eyes', 'aud-countenance->and-countenance'],
  [/\bhe was young aud legally married\b/g, 'he was young and legally married', 'aud-young->and-young'],
  [/\bfor seventy years aud never ate\b/g, 'for seventy years and never ate', 'aud-seventy->and-seventy'],

  // ---- "thea" → "then" — multiple ----
  [/\bball years; thea he perceived\b/g, 'ball years; then he perceived', 'thea-ball->then-ball'],
  [/\bname of each one of them; thea he took my hand\b/g, 'name of each one of them; then he took my hand', 'thea-name->then-name'],
  [/\bI said; how thea should I\b/g, 'I said; how then should I', 'thea-how->then-how'],
  [/\breviling the emperor, thea other will turn\b/g, 'reviling the emperor, then other will turn', 'thea-emperor->then-emperor'],
  [/\bpoverty you long for, thea hate materia\) possessions\b/g, 'poverty you long for, then hate material possessions', 'thea-poverty->then-poverty'],
  [/\bthen he entered into temptation, So it is\b/g, 'then he entered into temptation. So it is', 'thea-entered-norm->norm'],
  // 'When be is devoured, thea he has entered into temptation'
  [/\bdevoured, thea he has entered\b/g, 'devoured, then he has entered', 'thea-devoured->then-devoured'],

  // ---- "nol" → "not" — multiple confirmed contexts ----
  [/\bthere was nol a barbarian\b/g, 'there was not a barbarian', 'nol-barbarian->not-barbarian'],
  [/\bhe did nol want to come down\b/g, 'he did not want to come down', 'nol-want->not-want'],
  [/\bhe would nol take them\b/g, 'he would not take them', 'nol-take->not-take'],
  [/\bTell him nol to go away\b/g, 'Tell him not to go away', 'nol-go->not-go'],
  [/\bDo you nol realise\b/g, 'Do you not realise', 'nol-realise->not-realise'],
  [/\bCast me nol away\b/g, 'Cast me not away', 'nol-away->not-away'],

  // ---- "wildemess" → "wilderness" (m for rn) ----
  [/\bwildemess\b/g, 'wilderness', 'wildemess->wilderness'],

  // ---- "retumed" → "returned" / "retum" → "return" (m for rn) ----
  [/\bretumed\b/g, 'returned', 'retumed->returned'],
  [/\bretum\b/g, 'return', 'retum->return'],
  // 'turned rouad' → 'turned round'
  [/\bturned rouad\b/g, 'turned round', 'rouad->round'],

  // ---- "kuow" → "know" ----
  [/\bYou kuow\b/g, 'You know', 'kuow-You->know-You'],
  [/\bkaow\b/g, 'know', 'kaow->know'],
  // ---- "knowa" → "known" ----
  [/\bknowa\b/g, 'known', 'knowa->known'],
  // ---- "witaess" / "witaesses" → "witness" / "witnesses" ----
  [/\bwitaesses\b/g, 'witnesses', 'witaesses->witnesses'],
  [/\bwitaess\b/g, 'witness', 'witaess->witness'],

  // ---- "fullocss" → "fullness" (oc for n; ss preserved) ----
  [/\bfullocss\b/g, 'fullness', 'fullocss->fullness'],

  // ---- "thie" → "the" (i inserted) ----
  [/\bthie holy sanctuary\b/g, 'the holy sanctuary', 'thie-sanctuary->the-sanctuary'],
  [/\bat thie beginning of the sixth century\b/g, 'at the beginning of the sixth century', 'thie-beginning->the-beginning'],

  // ---- "gol" → "got" — only at "when he gol into the hills" and "he gol what was needed" ----
  [/\bwhen he gol into the hills\b/g, 'when he got into the hills', 'gol-hills->got-hills'],
  [/\bgol what was needed for a burial\b/g, 'got what was needed for a burial', 'gol-burial->got-burial'],

  // ---- "conkd" → "could" ----
  [/\bthe priest conkd not bring\b/g, 'the priest could not bring', 'conkd->could'],

  // ---- "sec" → "see" — restricted to clear sentence patterns ----
  [/\bI could sec that he was deeply troubled\b/g, 'I could see that he was deeply troubled', 'sec-could->see-could'],
  [/\bcame to Raithou to sec his brother\b/g, 'came to Raithou to see his brother', 'sec-brother->see-brother'],
  [/\bI used to sec them in my dreams\b/g, 'I used to see them in my dreams', 'sec-dreams->see-dreams'],
  [/\bcome and sec the furnace\b/g, 'come and see the furnace', 'sec-furnace->see-furnace'],
  [/\bsent him again to sec what had happened\b/g, 'sent him again to see what had happened', 'sec-happened->see-happened'],
  [/\bI sec a person sinning\b/g, 'I see a person sinning', 'sec-sinning->see-sinning'],
  [/\bgo up 10 sec Symeon the Great\b/g, 'go up to see Symeon the Great', '10sec-Symeon->to-see-Symeon'],
  // 'sce' for 'see' — confirmed three contexts
  [/\bYou sce to what glory\b/g, 'You see to what glory', 'sce-glory->see-glory'],
  [/\bSister Mary, you sce how great\b/g, 'Sister Mary, you see how great', 'sce-Mary->see-Mary'],
  [/\bup 10 sce Symeon\b/g, 'up to see Symeon', '10sce-Symeon->to-see-Symeon'],

  // ---- "1" → "I" — restricted to clear sentence patterns where "1" stands alone before verb/pronoun ----
  [/\band 1 will give you back\b/g, 'and I will give you back', '1-will-give->I-will-give'],
  [/\band 1 will make the struggle\b/g, 'and I will make the struggle', '1-will-make->I-will-make'],
  [/\bof the New Lavra 1 went\b/g, 'of the New Lavra I went', '1-went-Lavra->I-went-Lavra'],
  [/\bsame Javra\b/g, 'same lavra', 'Javra->lavra'],
  [/\bThe angel replied: '1 am\b/g, "The angel replied: 'I am", '1-am-angel->I-am-angel'],
  [/\bmy passion reached feverpitch and 1 went into a trance\b/g, 'my passion reached feverpitch and I went into a trance', '1-trance->I-trance'],
  [/\bholy sanctuary, 1 do not begin\b/g, 'holy sanctuary, I do not begin', '1-begin->I-begin'],
  [/\bcommunion\. 1 grabbed her by the throat\b/g, 'communion. I grabbed her by the throat', '1-grabbed->I-grabbed'],
  [/\bown blood\. As 1 said to you\b/g, 'own blood. As I said to you', '1-said-blood->I-said-blood'],
  [/\bthis passage, 1 went from my cell\b/g, 'this passage, I went from my cell', '1-cell->I-cell'],
  [/\bin this life, father, 1 have ten pieces of gold\b/g, 'in this life, father, I have ten pieces of gold', '1-have-ten->I-have-ten'],
  [/\bdwelleth in the heavens 1 will not tell\b/g, 'dwelleth in the heavens I will not tell', '1-will-not->I-will-not'],
  [/\bWhen I read this, T rewound the book\b/g, 'When I read this, I rewound the book', 'T-rewound->I-rewound'],
  // "T" → "I" for confirmed first-person speech contexts:
  [/\bvision replied: T am John the Baptist\b/g, 'vision replied: I am John the Baptist', 'T-am-John->I-am-John'],
  [/\bsheepskin cloak and went his way saying: T will not stay\b/g, 'sheepskin cloak and went his way saying: I will not stay', 'T-will-stay->I-will-stay'],
  [/\bdid not wish it to be so, T have caused\b/g, 'did not wish it to be so, I have caused', 'T-have-caused->I-have-caused'],
  [/\bBut he said to them: T do not accept alms\b/g, 'But he said to them: I do not accept alms', 'T-accept->I-accept'],
  [/\ba wooden vessel\. T began to make a request\b/g, 'a wooden vessel. I began to make a request', 'T-began->I-began'],
  [/\bThen she said to me: 'T have travelled\b/g, "Then she said to me: 'I have travelled", 'T-travelled->I-travelled'],
  [/\bgodly Ephraim swore to him: 'T will not tell anybody\b/g, "godly Ephraim swore to him: 'I will not tell anybody", 'T-Ephraim->I-Ephraim'],
  [/\bAbba Cosmas: T visited him\b/g, 'Abba Cosmas: I visited him', 'T-visited->I-visited'],
  [/\bhad given it to me\. T said to him:/g, 'had given it to me. I said to him:', 'T-said-to-him->I-said-to-him'],
  [/\bT could see that the theatre was full of men\b/g, 'I could see that the theatre was full of men', 'T-theatre->I-theatre'],
  [/\bin fact it is I who am the sinner', T said to her\b/g, "in fact it is I who am the sinner', I said to her", 'T-said-to-her->I-said-to-her'],

  // ---- "1aid" → "laid" (1 for l) ----
  // already covered above by /\bhaving 1aid down his life\b/

  // ---- Single uppercase letter as footnote marker between lowercase words ----
  // Wortley's footnote markers appear as digit superscripts or asterisks (*), not single
  // capital letters; the few single-letter intrusions observed are OCR'd 1/T for I.
  // We do not target stray uppercase letters globally to avoid breaking proper-name
  // initials.

  // ---- "1t" → "It" (sentence-initial 1 misread for capital I) ----
  // Only one obvious instance: '1t Jooked as though it had been in a kitchen' — handled above.

  // ---- "aMlicted" → "afflicted" (M for ffl) ----
  [/\baMlicted\b/g, 'afflicted', 'aMlicted->afflicted'],

  // ---- "aRer" → "after" (R for ft) ----
  [/\baRer his baptism\b/g, 'after his baptism', 'aRer-baptism->after-baptism'],

  // ---- "boad" → "bond" ----
  [/\ba strong boad of love\b/g, 'a strong bond of love', 'boad-bond->bond-of-love'],

  // ---- "iu" → "in" — restricted to confirmed phrase ----
  [/\bthere was nobody iu the cell\b/g, 'there was nobody in the cell', 'iu-cell->in-cell'],

  // ---- "ofl" → "off" ----
  [/\bwages and go ofl to the cily\b/g, 'wages and go off to the city', 'ofl-cily->off-city'],
  [/\bHe went ofl to the holy church\b/g, 'He went off to the holy church', 'ofl-church->off-church'],

  // ---- "cily" → "city" ----
  [/\bcily\b/g, 'city', 'cily->city'],

  // ---- "goilig" → "going" ----
  [/\bwere goilig 10 leave him\b/g, 'were going to leave him', 'goilig->going'],

  // ---- "baving" → "having" (b for h) ----
  [/\bbaving\b/g, 'having', 'baving->having'],

  // ---- "bave" → "have" (b for h) — restricted ----
  [/\bhe never did bave gold\b/g, 'he never did have gold', 'bave-gold->have-gold'],

  // ---- "Aa" / "aa" → "An" / "an" — sentence-initial Aa rare, but confirmed ----
  [/\bAa elder said:/g, 'An elder said:', 'Aa-elder->An-elder'],
  [/\bphi\/oponos, strictly, one who likes hard work, aa industrious fellow\b/g, 'phi/oponos, strictly, one who likes hard work, an industrious fellow', 'aa-industrious->an-industrious'],

  // ---- "1f" → "If" (none confirmed — placeholder)

  // ---- "oa" → "on" — restricted to obvious phrase ----
  [/\bstretched out there oa the ground\b/g, 'stretched out there on the ground', 'oa-ground->on-ground'],
  [/\bmight pronounce oa its validity\b/g, 'might pronounce on its validity', 'oa-validity->on-validity'],

  // ---- "ia" → "in" — restricted ----
  [/\byou will die ia the sins of your evi\] deeds\b/g, 'you will die in the sins of your evil deeds', 'ia-evi-bracket->in-evil'],

  // ---- "evi]" → "evil" — single confirmed instance (handled above with "ia") ----
  // Also catch standalone "evi]" if any other location:
  [/\bevi\]\b/g, 'evil', 'evi-bracket->evil'],

  // ---- "Ged" → "God" — six confirmed instances ----
  [/\bto Ged at cach slep\b/g, 'to God at each step', 'Ged-cach-slep->God-each-step'],
  [/\bdraws monks to Ged so much\b/g, 'draws monks to God so much', 'Ged-monks->God-monks'],
  [/\bfor the sake of Ged, in order\b/g, 'for the sake of God, in order', 'Ged-sake->God-sake'],
  [/\bwonder at the goodness of Ged, she said\b/g, 'wonder at the goodness of God, she said', 'Ged-goodness->God-goodness'],
  [/\bunbroken fear of Ged, let him shun\b/g, 'unbroken fear of God, let him shun', 'Ged-fear->God-fear'],
  [/\bBy the Son of Ged, 1 hope so\b/g, 'By the Son of God, I hope so', 'Ged-Son-1-hope->God-Son-I-hope'],

  // ---- "kis" → "his" — single confirmed instance ----
  [/\breturned to kis cell\b/g, 'returned to his cell', 'kis-cell->his-cell'],

  // ---- "bis" → "his" (b for h) — eight confirmed contexts ----
  [/\bFor Arius too, when bis hopes\b/g, 'For Arius too, when his hopes', 'bis-Arius->his-Arius'],
  [/\bgive him something into bis hand\b/g, 'give him something into his hand', 'bis-hand->his-hand'],
  [/\bafter he told me this, bis holy soul\b/g, 'after he told me this, his holy soul', 'bis-holy-soul->his-holy-soul'],
  [/\bsouk When will bis 'name die\b/g, "souk When will his 'name die", 'bis-name->his-name'],
  [/\bshall come upon his own head and bis wickedness\b/g, 'shall come upon his own head and his wickedness', 'bis-wickedness->his-wickedness'],
  [/\bcatered the cave\. So we took bis body\b/g, 'catered the cave. So we took his body', 'bis-body->his-body'],
  [/\bhe came back he was seized by bis creditors\b/g, 'he came back he was seized by his creditors', 'bis-creditors->his-creditors'],
  [/\bsaw the young man in bis office\b/g, 'saw the young man in his office', 'bis-office->his-office'],

  // ---- "bim" → "him" (b for h) — five confirmed contexts ----
  [/\bfound anyone naked, he gave bim the very garment\b/g, 'found anyone naked, he gave him the very garment', 'bim-garment->him-garment'],
  [/\bslarted pleading with bim who had brought me there\b/g, 'started pleading with him who had brought me there', 'bim-pleading->him-pleading'],
  [/\bThe condemned man said to bim:/g, 'The condemned man said to him:', 'bim-condemned->him-condemned'],
  [/\bThe elder therefore took bim and went\b/g, 'The elder therefore took him and went', 'bim-took->him-took'],
  [/\bWe cannot give bim to you\b/g, 'We cannot give him to you', 'bim-give->him-give'],
  [/\bawarded the man—and made bim rich again\b/g, 'awarded the man—and made him rich again', 'bim-rich->him-rich'],

  // ---- "be" → "he" (b for h) — restricted to verb-following or unambiguous contexts ----
  // 'be was unwilling' / 'be was once living' / 'be was about' / 'be was pondering' /
  // 'be was unlearned' / 'be was coming round' / 'be did' / 'be made' / 'be too remained' /
  // 'be left everybody' / 'be saw' / 'be greatly advanced' / 'be heard' / 'be is devoured'
  [/\bbut be was unwilling to grant\b/g, 'but he was unwilling to grant', 'be-unwilling->he-unwilling'],
  [/\btold us that be was once living\b/g, 'told us that he was once living', 'be-once-living->he-once-living'],
  [/\bjust as be was about to Jeave\b/g, 'just as he was about to leave', 'be-about-Jeave->he-about-leave'],
  // (The 'Jeave' inside the above gets handled here too)
  [/\bjust as be was about to leave\b/g, 'just as he was about to leave', 'be-about-leave->he-about-leave'],
  [/\bdistrict\. As be was pondering\b/g, 'district. As he was pondering', 'be-pondering->he-pondering'],
  [/\bfrom herctics but, as be was unlearned\b/g, 'from heretics but, as he was unlearned', 'be-unlearned-herctics->he-unlearned-heretics'],
  [/\bas though be was coming round\b/g, 'as though he was coming round', 'be-coming-round->he-coming-round'],
  [/\bAnd this be did for love\b/g, 'And this he did for love', 'be-did-love->he-did-love'],
  [/\bbe made you see this vision\b/g, 'he made you see this vision', 'be-made-vision->he-made-vision'],
  [/\bwildemess, be too remained\b/g, 'wilderness, he too remained', 'be-too-remained->he-too-remained'],
  [/\bbe left everybody and bade her\b/g, 'he left everybody and bade her', 'be-left-everybody->he-left-everybody'],
  [/\bbe was greatly advanced in asceticism\b/g, 'he was greatly advanced in asceticism', 'be-advanced->he-advanced'],
  [/\bbe did it by signs\b/g, 'he did it by signs', 'be-did-signs->he-did-signs'],
  [/\bWhen be heard what I had done\b/g, 'When he heard what I had done', 'be-heard-what->he-heard-what'],
  [/\bWhen be is devoured, thea he has entered\b/g, 'When he is devoured, then he has entered', 'be-devoured->he-devoured'],
  // 'which indeed be did' (in 'he died' context)
  [/\bwhich indeed be did\b/g, 'which indeed he did', 'be-did-indeed->he-did-indeed'],
  // 'be once living in a cave' — leave; already handled.

  // ---- "herctics" → "heretics" (c for e) ----
  [/\bherctics\b/g, 'heretics', 'herctics->heretics'],

  // ---- "encrgetic" → "energetic" ----
  [/\bencrgetic\b/g, 'energetic', 'encrgetic->energetic'],

  // ---- "ncver" → "never" ----
  [/\bncver\b/g, 'never', 'ncver->never'],

  // ---- "cffort" → "effort" ----
  [/\bcffort\b/g, 'effort', 'cffort->effort'],

  // ---- "cvil-doers" → "evil-doers" ----
  [/\bcvil-doers\b/g, 'evil-doers', 'cvil-doers->evil-doers'],

  // ---- "philasopher" → "philosopher" ----
  [/\bphilasopher\b/g, 'philosopher', 'philasopher->philosopher'],

  // ---- "honsc" → "house"? Confirm context.
  // Single instance "Everything in his housc was sold/confiscated"
  [/\bhousc\b/g, 'house', 'housc->house'],

  // ---- "diner" → "dinner" — likely  in 'invited several of the clergy who bad celebrated the feast with him to diner' ----
  [/\bto diner,/g, 'to dinner,', 'diner->dinner'],

  // ---- "wec[k]" — actually 'wecks' (1 instance) — uncommon. Look at context.
  // 'come to you three wecks from now' → 'three weeks from now'
  [/\bthree wecks from now\b/g, 'three weeks from now', 'wecks->weeks'],

  // ---- "feliow" → "fellow" — single confirmed instance "love of his feliow men" ----
  [/\bhis feliow men\b/g, 'his fellow men', 'feliow-men->fellow-men'],

  // ---- "Aa" → "An" already handled above

  // ---- "hcaven" → "heaven" — single confirmed ----
  [/\bhim who dwells in hcaven\b/g, 'him who dwells in heaven', 'hcaven-dwells->heaven-dwells'],

  // ---- "relurn" → "return" ----
  [/\bI will relurn to my former\b/g, 'I will return to my former', 'relurn->return'],

  // ---- "ange)" → "angel" ----
  [/\ban ange\) of God\b/g, 'an angel of God', 'ange-paren->angel'],

  // ---- "knowa" already handled

  // ---- "slarted" → "started" ----
  [/\bslarted\b/g, 'started', 'slarted->started'],

  // ---- "slep" → "step" — only inside "Ged at cach slep" already handled

  // ---- "cach" → "each" — confirmed once with 'cach slep' ----
  // Note: already covered inside earlier rule (cach slep → each step)

  // ---- "(he eld" → "the eld" — '(he' for 'the' inside parens? Actually '(he elder came back' ----
  // Specifically: "the brother retumed to his senses. When (he elder came back"
  [/\bWhen \(he elder came back\b/g, 'When the elder came back', 'paren-he-elder->the-elder'],

  // ---- "{aken" → "taken" ----
  [/\bThey were \{aken aback\b/g, 'They were taken aback', 'taken-brace->taken'],
  // ---- "{ather" → "father" — 'You are not answering us {ather' / 'brought the {ather of the child' ----
  [/\banswering us \{ather\b/g, 'answering us father', 'father-brace-1->father-1'],
  [/\bthe \{ather of the child\b/g, 'the father of the child', 'father-brace-2->father-2'],

  // ---- "{rom" → "from" — three confirmed contexts: 'wanted you to carry away some reward {rom the struggle' / 'about a stone's throw {rom your cell' / 'it is because of this that you are prevented {rom worshipping' ----
  [/\bsome reward \{rom the struggle\b/g, 'some reward from the struggle', 'from-brace-struggle->from-struggle'],
  [/\bstone's throw \{rom your cell\b/g, "stone's throw from your cell", 'from-brace-cell->from-cell'],
  [/\bare prevented \{rom worshipping\b/g, 'are prevented from worshipping', 'from-brace-worshipping->from-worshipping'],
  // 'salt comes {rom water'
  [/\bsalt comes \{rom water\b/g, 'salt comes from water', 'from-brace-water->from-water'],
  // 'twenty miles [rom the city of Agaion' / 'Two elders set off [rom Agaion' / 'and it is because of this that you are prevented [rom worshipping' / 'About twenty miles [rom the city of Agaion'
  [/\bmiles \[rom\b/g, 'miles from', 'from-bracket-miles->from-miles'],
  [/\bset off \[rom\b/g, 'set off from', 'from-bracket-set-off->from-set-off'],
  [/\bprevented \[rom worshipping\b/g, 'prevented from worshipping', 'from-bracket-worshipping->from-worshipping'],

  // ---- "{ind" → "find" — 'went personally to {ind the cleric' ----
  [/\bpersonally to \{ind the cleric\b/g, 'personally to find the cleric', 'find-brace-cleric->find-cleric'],

  // ---- "{the city" → "(the city" — 'rebuilding the public edifices {the city having been dilapidated' ----
  // Here '{' was likely '(' — wrap in parens
  [/\brebuilding the public edifices \{the city having been dilapidated\b/g, 'rebuilding the public edifices (the city having been dilapidated', 'brace-paren-1->paren-1'],

  // ---- "{and even more" → "(and even more" — 'but also {and even more 50) to repent' ----
  // Will be paired with closing ')' later in same paragraph
  [/\bbut also \{and even more 50\) to repent\b/g, 'but also (and even more so) to repent', 'brace-paren-50->paren-so'],

  // ---- "{and Sophronios}" → "(and Sophronios)" — 'It may of course be that John {and Sophronios) in their quest' ----
  [/\bthat John \{and Sophronios\) in their quest\b/g, 'that John (and Sophronios) in their quest', 'brace-paren-sophronios->paren-sophronios'],

  // ---- "}" used where ')' would be — restricted ----
  [/\bfin which they shot themselves\}\b/g, 'in which they shot themselves)', 'shot-brace->shot-paren'],
  [/\b(?:locked him up )fin\b/g, 'locked him up in', 'fin->in-fin-locked'],
  // 'tf} @px dv proodv' is Greek shorthand, leave.
  // 'Saint Sabas, (The Great Lavra of} was the most famous' — '}' for ')'
  [/\bThe Great Lavra of\} was the most famous\b/g, 'The Great Lavra of) was the most famous', 'great-lavra-brace->great-lavra-paren'],

  // ---- "drakdmari(o)s" → leave as is; it's a Greek transliteration.

  // ---- "boyish ) and finally" — '(the chasuble, phelonion)and finally' missing space ----
  // Conservative skip; meaning preserved.

  // ---- "phi/oponos" — keep slash; legitimate Greek/Latin transliteration.

  // ---- "(o" → "to" — single instance 'took the book (o the anchorite' ----
  // already covered above

  // ---- "ow" misreads — none confirmed.

  // ---- "tonsured", "consecrated", "anchorite", "monastery" — baseline OK.

  // ---- "iliem" → "them" — already handled.

  // ---- "ckler", "clder", "cider" — already handled.

  // ---- "feverpitch" → "fever-pitch" — Wortley uses hyphenated form; OCR may join. Leave as is unless confirmed; "feverpitch" appears once and was probably joined by OCR. Conservative skip.

  // ---- "morn" — n/a; leave proper words.

  // ---- "cven" — never found

  // ---- "fei" — never found

  // ---- "cake" → "take"  (none confirmed)

  // ---- "scarcely" baseline

  // ---- "(ake" → "take" — single 'and (ake not your holy spirit' ----
  [/\band \(ake not your holy spirit\b/g, 'and take not your holy spirit', 'take-paren->take-holy'],

  // ---- "soui", "foui", "wcek" — not commonly found

  // ---- "thic" → "thic" — no clear context; skip

  // ---- "tn" → "in" — no confirmed contexts; skip

  // ---- "cven" → "even" — no occurrences

  // ---- Stray asterisk used for footnote markers; these are legitimate; do not remove.

  // ---- Stray ™ — Wortley uses curly quotes; ™ appears 6 times where a closing curly quote ' belongs ----
  [/\bI am a stranger\.™\*/g, "I am a stranger.'*", 'tm-stranger-1->quote-stranger'],
  [/\bSaint Sophia <= 'holy wisdom™ by the Lighthouse\b/g, "Saint Sophia <= 'holy wisdom' by the Lighthouse", 'tm-wisdom->quote-wisdom'],
  [/\bsome other time'™\.\s*When 1 heard this\b/g, "some other time'. When I heard this", 'tm-time->quote-time'],
  [/\bfell from the comfort of paradise\.™/g, "fell from the comfort of paradise.'", 'tm-paradise->quote-paradise'],
  [/\bwith no provision for you needs™\b/g, "with no provision for your needs'", 'tm-needs->quote-needs'],
  [/\bI am not convinced™\b/g, "I am not convinced'", 'tm-convinced->quote-convinced'],
];

// ---------------------------------------------------------------------------
// Whole-text replacements (run after wordFixes). These are broader catch-alls
// using context-aware regex that only fire when the pattern is unambiguous.
// ---------------------------------------------------------------------------
const textFixes = [
  // ---- "1 " → "I " — standalone digit "1" preceded by non-digit and followed
  // by a lowercase letter. This catches first-person "I" misread as "1".
  // Bible references like "1 Tm 2:4", "1 Co 1:14", "1 P 2:11", "1 Jn 2:15"
  // are protected because they are followed by an UPPERCASE letter.
  [/(^|[^0-9\/])\b1\s+([a-z])/g, '$1I $2', '1-space-lc->I-space-lc'],

  // ---- "T " → "I " — standalone "T" followed by space then lowercase letter,
  // when the lowercase word is a verb or pronoun typical of first-person speech.
  // Wortley uses "T" never as a standalone word; all such occurrences are
  // OCR misreads of "I". Exclude when "T" begins a known TLA (none in text).
  [/(^|[^A-Za-z0-9])T\s+(am|was|will|wanted|had|gave|came|came|see|saw|said|told|believe|cannot|do|did|had|have|too|knew|wrote|read|left|went|return|returned|approached|encountered|met|kept|got|made|prayed|am|started|stood|sat|asked|heard|brought|laid|received|spoke|took|wished|now|then|just|here|never|shall|should|would|could|might|may|trust|trapped|interceded|opened|opened|put|forgot|forgave|forgive|forgot|opened|opened|judged|saw|stripped|searched|sought|sought|left|sat|gave|read|fell|feel|felt|came|cried|spoke|sleep|slept|woke|woken|believed|believed|wrote|wrote|broke|loved|loved|prayed|knew|judged|moved|implored|enlarged|arose|opened|fetched|fetched|fetched|killed|begged|tried|sought|sought|stripped|tried|trapped|showed|stayed|imprisoned|persuaded|opened|finished|finished|continued|continued)\b/g,
   '$1I $2', 'T-space-verb->I-space-verb'],

  // ---- Stray asterisks at end of capitalized passage like "I am a stranger.™*"
  //  already handled in wordFixes.

  // ---- "Lhe Lord" / "Ihe ground" catch-all (already covered) ----

  // ---- Standalone "J" as Scripture quote marker → "I" ----
  // 'J came in my father's name' (Jn 5:43)
  [/\bJ came in my father's name\b/g, 'I came in my father’s name', 'J-came-fathers->I-came-fathers'],
  [/\bJ came in my father’s name\b/g, 'I came in my father’s name', 'J-came-fathers-curly->I-came-fathers-curly'],
  // 'J was naked and you clothed me' (Mt 25:36)
  [/\bJ was naked and you clothed me\b/g, 'I was naked and you clothed me', 'J-was-naked->I-was-naked'],

  // ---- "M N:N" → "Mt N:N" — Matthew abbreviation truncated to single M ----
  // Only two confirmed instances; keep narrow.
  [/\bme M 25:36\./g, 'me Mt 25:36.', 'M-25-36->Mt-25-36'],
  [/\bin heaven’\. M 6:19-20\b/g, 'in heaven’. Mt 6:19-20', 'M-6-19->Mt-6-19'],

  // ---- "thal" → "that" (l for t) — 12 occurrences, all unambiguous ----
  [/\bthal\b/g, 'that', 'thal->that'],

  // ---- "Lold" → "told" (capital L for t) — 2 occurrences ----
  [/\bLold\b/g, 'told', 'Lold->told'],

  // ---- "Lo " → "to " when followed by an English infinitive or noun/preposition.
  // All confirmed remaining 8 occurrences are 'to'. Wortley does not use archaic "Lo!".
  [/\bLo (meet|escape|enter|the|taste|go|cach|kim)\b/g, 'to $1', 'Lo-space-word->to-space-word'],

  // ---- "lo " → "to " for similarly clear contexts only.
  // Most lowercase "lo" before lowercase verb/article are "to".
  // Examples confirmed: "going lo meet", "wen lo an estate", "speak a saying lo us",
  // "approached lo", "lo us", "lo the demons" etc.
  [/(\w) lo (the|an|us|me|him|her|them|speak|enter|escape|cach|kim|meet|cease|come|do)\b/g, '$1 to $2', 'lo-space->to-space'],

  // ---- "wen lo" / "wen Lo" — "wen" is "went", "Lo" is "to" ----
  [/\b(\w+) wen Lo\b/g, '$1 went to', 'wen-Lo->went-to'],
  // 'two [athers wen! up lo Sinai'  - 'wen!' = 'went' and 'lo' = 'to' (note the truncated !)
  [/\b\[athers wen! up lo Sinai\b/g, 'fathers went up to Sinai', 'athers-wen-up-lo-Sinai->fathers-went-up-to-Sinai'],

  // ---- "be was" / "be had" / "be did" / "be saw" / "be told" / "be said" / "be went" — these are all OCR errors for "he was" etc. ----
  // The pattern 'be ' followed by a finite past-tense verb is unidiomatic.
  // We restrict to a verb whitelist AND require not be preceded by 'to ' (infinitive) or other
  // legitimate 'be' contexts. Use negative lookbehind.
  [/(?<!\bto |\bnot |\bcan |\bcould |\bwould |\bshould |\bmight |\bmust |\bmay |\bshall |\bwill |\bn['’]t )\bbe (was|were|had|did|saw|told|said|went|came|gave|made|spoke|took|wished|wanted|knew|heard|brought|laid|received|prayed|wept|laughed|cried|wrote|read|sang|ran|ate|drank|slept|woke|died|invited|received|placed|sat|stood|fell|felt|added|asked|answered|replied|stayed|remained|continued|believed|caught|caught|sent|shut|opened|closed|reached|drew|left|walked|appeared|disappeared|approached|departed|returned|raised|grew|became|grew)\b/g,
   'he $1', 'be-verb->he-verb'],

  // ---- "be greatly" / "be himself" / "be once" / "be too" / "be cl[a-z]" — additional contexts ----
  [/\bbe greatly\b/g, 'he greatly', 'be-greatly->he-greatly'],
  [/\bbe himself\b/g, 'he himself', 'be-himself->he-himself'],
  [/\bbe once\b/g, 'he once', 'be-once->he-once'],
  [/\bbe too remained\b/g, 'he too remained', 'be-too-rem->he-too-rem'],
  [/\bbe is devoured\b/g, 'he is devoured', 'be-is-devoured->he-is-devoured'],
  [/\bbe is\b(?!\s+(?:no|that|allowed|made|able|done|free|granted|set|laid|here|there))/g, 'he is', 'be-is->he-is'], // exclude legit "to be"

  // ---- "arc" → "are" — 4 remaining contexts, all unambiguous ----
  [/\bWhy arc you\b/g, 'Why are you', 'Why-arc->Why-are'],
  [/\btask you arc required\b/g, 'task you are required', 'arc-required->are-required'],
  [/\byour judgements arc like\b/g, 'your judgements are like', 'arc-judgements->are-judgements'],
  [/\bof this name arc known\b/g, 'of this name are known', 'arc-name-known->are-name-known'],

  // ---- "bat" → "but" — 1 remaining: 'do not go there', bat as he' ----
  [/, bat as he\b/g, ', but as he', 'bat-as-he->but-as-he'],

  // ---- "resi," → "rest." — 1 remaining: "could resi, He stayed" ----
  [/could resi, He stayed/g, 'could rest. He stayed', 'resi-comma->rest-period'],

  // ---- "Ged" → "God" — 3 remaining ----
  [/\bGed knows\b/g, 'God knows', 'Ged-knows->God-knows'],
  [/\bIf Ged puts it\b/g, 'If God puts it', 'Ged-puts->God-puts'],
  [/\bprovidence of Ged, it happened\b/g, 'providence of God, it happened', 'Ged-providence->God-providence'],

  // ---- "bis" → "his" — 3 remaining ----
  [/\bwill bis 'name\b/g, "will his 'name", 'bis-name->his-name-souk'],
  [/\bhighly skilled in bis craft\b/g, 'highly skilled in his craft', 'bis-craft->his-craft'],
  [/\ba schism which carried bis name\b/g, 'a schism which carried his name', 'bis-schism->his-schism'],

  // ---- "nol" → "not" — 7 remaining, all unambiguous ----
  [/\bI did nol come in\b/g, 'I did not come in', 'nol-come->not-come'],
  [/\bHe would nol go away\b/g, 'He would not go away', 'nol-go-away->not-go-away'],
  [/\bdo nol be afraid\b/g, 'do not be afraid', 'nol-afraid->not-afraid'],
  [/\babsolute poverty, nol by eating\b/g, 'absolute poverty, not by eating', 'nol-poverty->not-poverty'],
  [/\bthus: "I am nol aware\b/g, 'thus: "I am not aware', 'nol-aware->not-aware'],

  // ---- "aud" → "and" — 1 remaining ----
  [/\bus frequently, aud he said to me:/g, 'us frequently, and he said to me:', 'aud-frequently->and-frequently'],

  // ---- "aad" → "and" — 2 remaining ----
  [/\btaking my piece of gold aad, look!/g, 'taking my piece of gold and, look!', 'aad-gold-look->and-gold-look'],
  [/\bblessed both in aad out of his presence\b/g, 'blessed both in and out of his presence', 'aad-in-out->and-in-out'],

  // ---- "al " → "at " or "all " — 6 remaining at-positions ----
  [/\barrived al The Towers\b/g, 'arrived at The Towers', 'al-Towers->at-Towers'],
  [/\bHe grieved al not having been able\b/g, 'He grieved at not having been able', 'al-grieved->at-grieved'],
  [/\bAll al once\b/g, 'All at once', 'al-once->at-once'],
  [/\bThis has al come about\b/g, 'This has all come about', 'al-come-about->all-come-about'],
  [/\bFor al this stage\b/g, 'For at this stage', 'al-stage->at-stage'],
  [/\bHe caused al The city\b/g, 'He caused all The city', 'al-The-city->all-The-city'],

  // ---- "Al " → "At " — 5 remaining ----
  [/\bAl that saying\b/g, 'At that saying', 'Al-saying->At-saying'],
  [/\bAl that, seeing that\b/g, 'At that, seeing that', 'Al-that-seeing->At-that-seeing'],
  [/\bAl the Lavra of Calamdn\b/g, 'At the Lavra of Calamdn', 'Al-Lavra->At-Lavra'],
  [/\bAl that time, there was a highway man\b/g, 'At that time, there was a highway man', 'Al-highway->At-highway'],
  [/\bAl the height of its fame\b/g, 'At the height of its fame', 'Al-height->At-height'],

  // ---- "sec" → "see" — narrow remaining: when in 'and sec!' / '(sec ' citation / 'sec ' as imperative ----
  [/\band sec!/g, 'and see!', 'and-sec->and-see'],
  [/sec "The Byzantine Liturgy/g, 'see "The Byzantine Liturgy', 'sec-Byz->see-Byz'],
  [/\(sec c\./g, '(see c.', 'paren-sec-c->paren-see-c'],
  [/Theologian: sec Gregory/g, 'Theologian: see Gregory', 'sec-Gregory->see-Gregory'],
  [/Cyrene \(sec Synesios\)/g, 'Cyrene (see Synesios)', 'sec-Synesios->see-Synesios'],
  [/Rome \(sec Theodore/g, 'Rome (see Theodore', 'sec-Theodore->see-Theodore'],
  [/Byzantium \(sec also Constantinople\)/g, 'Byzantium (see also Constantinople)', 'sec-also-Const->see-also-Const'],
  [/Egyptian Babylon \(sec Cairo\)/g, 'Egyptian Babylon (see Cairo)', 'sec-Cairo->see-Cairo'],
  [/Patriarch: \(see also Pope\) Anastasios \(sec Anastasios\)/g, 'Patriarch: (see also Pope) Anastasios (see Anastasios)', 'sec-Anastasios->see-Anastasios'],
  [/Apostles \(sec also Apostle Peter\)/g, 'Apostles (see also Apostle Peter)', 'sec-Peter->see-Peter'],
  [/John's Church 60 John the Divine 37 Menas 81 Paul \(sec Apostle Paul\)/g, "John's Church 60 John the Divine 37 Menas 81 Paul (see Apostle Paul)", 'sec-Paul->see-Paul'],
  [/150 Theodosios \(sec Theodosios\)/g, '150 Theodosios (see Theodosios)', 'sec-Theodosios->see-Theodosios'],
  [/Theoupolis \(sec also Antioch\)/g, 'Theoupolis (see also Antioch)', 'sec-Antioch->see-Antioch'],

  // ---- "Jet" → "let" — handled per-context above; catch any remaining via narrow rule ----
  // None expected after the wordFixes pass.

  // ---- "Jove", "Joved" → "love", "loved" — remaining: catch the lone occurrences ----
  [/\bbut Jove affliction\b/g, 'but love affliction', 'Jove-affliction-rem->love-affliction-rem'],
  [/\bascetics who Joved God, it would be seen\b/g, 'ascetics who loved God, it would be seen', 'Joved-God-rem->loved-God-rem'],

  // ---- "Jater" → "later" — 1 remaining ----
  [/\bAnd two days later 1 saw a black-laced\b/g, 'And two days later I saw a black-laced', 'days-later-1-saw->days-later-I-saw'],
  // (any 'Jater' is now covered above; safety)

  // ---- "Jaid" → "laid" — multiple ----
  [/\bJaid\b/g, 'laid', 'Jaid->laid'],

  // ---- "lell" → "tell" — 1 remaining ----
  [/\bfor the sake of the Lord, lell me\b/g, 'for the sake of the Lord, tell me', 'lell-me->tell-me'],

  // ---- "lomb" → "tomb" — 1 remaining ----
  [/\bon top of the lomb\b/g, 'on top of the tomb', 'lomb->tomb'],

  // ---- "maa" → "man" — 5 remaining ----
  [/\bA poor maa stricken\b/g, 'A poor man stricken', 'maa-poor->man-poor'],
  [/\bHe was a maa of outstanding virtue\b/g, 'He was a man of outstanding virtue', 'maa-outstanding->man-outstanding'],
  [/\bthat the maa should have dared\b/g, 'that the man should have dared', 'maa-dared->man-dared'],
  [/\bThe holy maa then took him\b/g, 'The holy man then took him', 'maa-holy->man-holy'],
  [/\bThe poor maa withdrew\b/g, 'The poor man withdrew', 'maa-withdrew->man-withdrew'],

  // ---- "cclj" → "cell;" ----
  [/\bcclj,/g, 'cell;', 'cclj-cell-semicolon'],

  // ---- "decp" → "deep" ----
  [/\bgreal decp\b/g, 'great deep', 'greal-decp->great-deep'],

  // ---- "greal" → "great" — 3 remaining ----
  [/\ba greal elder\b/g, 'a great elder', 'greal-elder->great-elder'],
  [/\bso greal were the poverly\b/g, 'so great were the poverty', 'greal-poverly->great-poverty'],

  // ---- "cach" → "each" ----
  [/\bcach time, but it only serves\b/g, 'each time, but it only serves', 'cach-time->each-time'],
  [/\bsaying to cach other\b/g, 'saying to each other', 'cach-other->each-other'],
  [/\btheir forefathers; cach day\b/g, 'their forefathers; each day', 'cach-day->each-day'],
  [/\bvillage and cach man\b/g, 'village and each man', 'cach-man->each-man'],
  [/\bthe beasts went of, cach to its own home\b/g, 'the beasts went off, each to its own home', 'cach-home->each-home'],

  // ---- "Il " → "If " — 2 remaining (one is "Il Pratum" — Italian, leave; check) ----
  [/\bIl you want to, you come here\b/g, 'If you want to, you come here', 'Il-want-to->If-want-to'],
  [/\b"Il you become a Christian\b/g, '"If you become a Christian', 'Il-become->If-become'],
  // "Il Pratum Spirituale di Giovanni Mosco" — Italian "Il" (the); leave alone.

  // ---- "ali" → "all" — 3 remaining ----
  [/\bits muzzle was ali stained\b/g, 'its muzzle was all stained', 'ali-stained->all-stained'],
  [/\bThe father of the Hebrew child knew ali about this\b/g, 'The father of the Hebrew child knew all about this', 'ali-knew->all-knew'],
  [/\bali night long\b/g, 'all night long', 'ali-night->all-night'],

  // ---- "fo" → "to" — 5 remaining ----
  [/\bsat down fo sleep\b/g, 'sat down to sleep', 'fo-sleep->to-sleep'],
  [/\bthe elder said fo me\b/g, 'the elder said to me', 'fo-me-elder->to-me-elder'],
  [/\bwe went fo the community\b/g, 'we went to the community', 'fo-community->to-community'],
  [/\bjourney undertaken to come fo me\b/g, 'journey undertaken to come to me', 'fo-me-journey->to-me-journey'],
  [/\bA figure appeared fo him\b/g, 'A figure appeared to him', 'fo-him->to-him'],

  // ---- "feft" → "left" — 1 remaining ----
  [/\bAt dawn I feft the monastery\b/g, 'At dawn I left the monastery', 'feft->left'],

  // ---- "plailing" → "plaiting" — 1 remaining ----
  [/\bI was plailing baskets\b/g, 'I was plaiting baskets', 'plailing->plaiting'],

  // ---- "toki" → "told" — 2 remaining ----
  [/\bthe priest of the monastery, toki us this:/g, 'the priest of the monastery, told us this:', 'toki-priest->told-priest'],
  [/\bthat place also tokd us this\b/g, 'that place also told us this', 'tokd-place->told-place'],

  // ---- "feverpitch" → "fever-pitch" — Wortley hyphen ----
  // Not done; could be intentional joined form. Skip.

  // ---- "Jord" → "lord" (J for l, ONLY at "my Jord" / "my Jord," — NOT Jordan/Jerome/etc.) ----
  // already in wordFixes; safety net here

  // ---- "Lord 1" → "Lord I" — Bible references and similar ----
  // Not needed.

  // ---- "Jay" → "lay" (J for l) — 7 confirmed contexts, all the verb "lay" ----
  // Restrict to clear English phrases to avoid hitting any proper-name Jay.
  [/\bjust Jay theee\b/g, 'just lay there', 'Jay-theee->lay-there'],
  [/\bfrom where we Jay\b/g, 'from where we lay', 'Jay-from-where->lay-from-where'],
  [/\bthe Lord Jay down and fell asleep\b/g, 'the Lord lay down and fell asleep', 'Jay-Lord->lay-Lord'],
  [/\bfrom where it Jay\b/g, 'from where it lay', 'Jay-it->lay-it'],
  [/\bto go and Jay before\b/g, 'to go and lay before', 'Jay-before->lay-before'],
  [/\bwhere the child Jay\b/g, 'where the child lay', 'Jay-child->lay-child'],
  [/\bembraced him, Jay down again\b/g, 'embraced him, lay down again', 'Jay-embraced->lay-embraced'],

  // ---- "lo " → "to " — for additional unambiguous remaining cases ----
  [/\bnobody was lo learn\b/g, 'nobody was to learn', 'lo-learn->to-learn'],
  [/\bsubmerged up lo his neck\b/g, 'submerged up to his neck', 'lo-his-neck->to-his-neck'],
  [/\byou come lo receive\b/g, 'you come to receive', 'lo-receive->to-receive'],
  [/\bto the Holy City lo sell grain\b/g, 'to the Holy City to sell grain', 'lo-sell->to-sell'],
  [/\bbut lo act with much thought\b/g, 'but to act with much thought', 'lo-act->to-act'],
  [/\bwanted them lo pass on\b/g, 'wanted them to pass on', 'lo-pass->to-pass'],
  [/\bhow do you want us lo bury you\b/g, 'how do you want us to bury you', 'lo-bury->to-bury'],
  [/\bnot going lo pay us back\b/g, 'not going to pay us back', 'lo-pay->to-pay'],
  [/\bto come to him lo go visit\b/g, 'to come to him to go visit', 'lo-go-visit->to-go-visit'],
  [/\b'not lo be saved'/g, "'not to be saved'", 'lo-be-saved->to-be-saved'],

  // ---- "fo " → "to " (4 remaining) ----
  [/\bcounted me worthy fo embrace\b/g, 'counted me worthy to embrace', 'fo-embrace->to-embrace'],
  [/\bThe elder said fo them\b/g, 'The elder said to them', 'fo-them-elder->to-them-elder'],
  [/\bI taught her to go often fo the baths\b/g, 'I taught her to go often to the baths', 'fo-baths->to-baths'],
  [/\bhe commanded him fo he put in the furnace\b/g, 'he commanded him to be put in the furnace', 'fo-he-put->to-be-put'],

  // ---- "arc like the great deep" → "are like the great deep" ----
  [/\byour judgements arc like the great deep\b/g, 'your judgements are like the great deep', 'arc-great-deep->are-great-deep'],

  // ---- "cach" remaining: "to cach he ordered" ----
  [/\bto cach he ordered\b/g, 'to each he ordered', 'cach-ordered->each-ordered'],

  // ---- "1, the unworthy John" → "I, the unworthy John" ----
  [/\binscribed thus: 1, the unworthy John\b/g, 'inscribed thus: I, the unworthy John', '1-unworthy->I-unworthy'],

  // ---- "T was a robber" → "I was a robber" ----
  [/\bsaid to them: 'T was a robber\b/g, "said to them: 'I was a robber", 'T-robber->I-robber'],
  // ---- "T showed you, Mary" → "I showed you, Mary" ----
  [/\boutside: 'T showed you, Mary\b/g, "outside: 'I showed you, Mary", 'T-showed-Mary->I-showed-Mary'],
  // ---- "'T John Moschos presumably" — keep the editorial marker. ----
  // The "T" here precedes "John Moschos" in a Greek-text note. It's likely "‘I" but
  // could be a manuscript marker. Conservative: leave alone.

  // ---- Single-instance OCR errors discovered in second pass ----
  // "Ancieat" → "Ancient" (a for n)
  [/\bAncieat\b/g, 'Ancient', 'Ancieat->Ancient'],
  // "instrumeat" → "instrument"
  [/\binstrumeat\b/g, 'instrument', 'instrumeat->instrument'],
  // "Lausisc" → "Lausiac"
  [/\bLausisc\b/g, 'Lausiac', 'Lausisc->Lausiac'],
  // "theee" → "there"
  [/\btheee\b/g, 'there', 'theee->there'],
  // "Thebalid" → "Thebaid"
  [/\bUpper Thebalid\b/g, 'Upper Thebaid', 'Thebalid->Thebaid'],
  // "fiekd" → "field"
  [/\bin the fiekd\b/g, 'in the field', 'fiekd->field'],
  // "wear back" → "went back"
  [/\bwhilst I wear back and gave the book\b/g, 'whilst I went back and gave the book', 'wear-back->went-back'],
  // "fouad" → "found"
  [/\bwe fouad some tamarisk\b/g, 'we found some tamarisk', 'fouad->found'],
  // "thirst and beat" → "thirst and heat"
  [/\bthirst and beat\b/g, 'thirst and heat', 'beat-thirst->heat-thirst'],
  // "sexval" → "sexual"
  [/\bsexval\b/g, 'sexual', 'sexval->sexual'],
  // "higonmen" → "higoumen"
  [/\bhigonmen\b/g, 'higoumen', 'higonmen->higoumen'],
  // "commitling" → "committing"
  [/\bcommitling\b/g, 'committing', 'commitling->committing'],
  // "rcfectory" → "refectory"
  [/\brcfectory\b/g, 'refectory', 'rcfectory->refectory'],
  // "Wha is there" → "What is there"
  [/\bWha is there to he said\b/g, 'What is there to be said', 'Wha-is->What-is'],
  // (Also fixes "to he said" → "to be said" in the same phrase.)

  // "docs not produce" → "does not produce"
  [/\bThe earth docs not produce\b/g, 'The earth does not produce', 'docs-produce->does-produce'],

  // "(o " → "to " — three instances, all "(o" inside parentheses meant as "to"
  [/\bgave the book \(o the anchorite\b/g, 'gave the book to the anchorite', 'paren-o-anchorite->to-anchorite'],
  [/\bintending \(o carry him away\b/g, 'intending to carry him away', 'paren-o-carry->to-carry'],

  // "catered the cave" → "entered the cave"
  [/\bas we catered the cave\b/g, 'as we entered the cave', 'catered-cave->entered-cave'],

  // "whe" → "who" — 2 confirmed contexts ----
  [/\bask from him whe he was\b/g, 'ask from him who he was', 'whe-who-was->who-who-was'],
  [/\blearn from him whe he was\b/g, 'learn from him who he was', 'whe-learn-was->who-learn-was'],
  [/\b'friend of Christ' be whe tells the story\b/g, "'friend of Christ' be who tells the story", 'whe-tells->who-tells'],

  // ---- More remaining errors from text scan ----
  // "feliow" already handled
  // "1 Jn" / "1 Tm" / "1 Co" — Bible refs, leave.

  // "Sister, the God if the Christians" — "if" should probably be "of"
  [/\bthe God if the Christians is not going to pay\b/g, 'the God of the Christians is not going to pay', 'God-if->God-of'],

  // "( 896)" — '(896)' / '1918'  — no issue

  // "[ dug a grave" — '[' for 'I' here
  [/\bfell asleep\. \[ dug a grave\b/g, 'fell asleep. I dug a grave', 'bracket-dug->I-dug'],

  // "[ saw" — '[' for 'I'
  [/\bfloor of the cave, 1 fell into a trance\. \[ saw\b/g, 'floor of the cave, I fell into a trance. I saw', 'bracket-saw-trance->I-saw-trance'],

  // "[ was amazed at her" — earlier showed up; let's also catch
  [/\bright soon\." \[ was amazed at her\b/g, 'right soon." I was amazed at her', 'bracket-amazed->I-amazed'],

  // "loo" → "too" in 'I will come loo' (one instance)
  [/\b1 will come loo\. Then\b/g, 'I will come too. Then', 'loo-come->too-come'],
  // safety after 1->I:
  [/\bI will come loo\. Then\b/g, 'I will come too. Then', 'loo-come-I->too-come-I'],

  // "io" for "to" — one instance: 'another seven years io the anchorite's cell'
  [/\bseven years io the anchorite's cell\b/g, "seven years to the anchorite's cell", 'io-anchorite->to-anchorite'],

  // "of, cach" already handled to "off, each"

  // "of," (single instance) for "off,"
  [/\bthe beasts went of, each to its own home\b/g, 'the beasts went off, each to its own home', 'went-of-each->went-off-each'],

  // "Lk 1:20 I" baseline is fine
  // "Ps 61:1" / Bible refs OK

  // "$1. THE LIFE OF ABBA JULIAN" — the '$' is OCR for chapter-number sentence marker.
  // Tale ordinals like "$1." should probably be "51." (the actual tale number).
  // Verify in context:
  [/\$1\. THE LIFE OF ABBA JULIAN/g, '51. THE LIFE OF ABBA JULIAN', 'dollar-1->51-title'],

  // "tour favras" → "four lavras" (Jav→lav and t/four)
  [/\btour favras of Scété\b/g, 'four lavras of Scété', 'tour-favras->four-lavras'],
  // safety net: 'favras' alone → 'lavras' if seen
  [/\bfavras\b/g, 'lavras', 'favras->lavras'],

  // "Sampson, from which two [athers" — '[' for 'f'
  [/\btwo \[athers wen! up to Sinai\b/g, 'two fathers went up to Sinai', 'bracket-athers-wen->fathers-went'],
  [/\btwo \[athers\b/g, 'two fathers', 'bracket-athers->fathers'],

  // "we[athers (came" — generic '[ather' → 'father'
  [/\b\[ather\b/g, 'father', 'bracket-ather->father'],
  [/\b\[athers\b/g, 'fathers', 'bracket-athers-2->fathers-2'],

  // "the wood n signal" — '(for I was the precentor) and 1 heard'
  // 'wood n' is 'wooden' — split
  [/\bthe wood n signal\b/g, 'the wooden signal', 'wood-n-signal->wooden-signal'],

  // 'ag' for 'an' — 'an industrious' already handled

  // "Antinog" → "Antinoé" — proper-name; Wortley uses "Antinoé" elsewhere ("Antino€" with euro sign). Leave Antinog alone.

  // "Antinoé" / "Antino€" — '€' as 'é'? Let's standardise.
  // Confirmed: 'Antinospolis' uses regular 'o'; 'Antino€' should be 'Antinoé'.
  [/Antino€/g, 'Antinoé', 'euro-Antinoe->Antinoe'],

  // 'h€' — should be 'hé'
  [/\bh€ proskimidé\b/g, 'hé proskimidé', 'euro-he->he'],

  // ---- Final remaining singletons ----
  // 'Jove' = 'love' in 'love with which he loved Christ'
  [/\bthe Jove with which he loved Christ\b/g, 'the love with which he loved Christ', 'Jove-loved->love-loved'],
  // 'Joved Christ' = 'loved Christ'
  [/\bencountered another man who Joved Christ and monks\b/g, 'encountered another man who loved Christ and monks', 'Joved-Christ-monks->loved-Christ-monks'],
  // 'Jate one evening' = 'late one evening'
  [/\bJate onc evening I went to bathe\b/g, 'late one evening I went to bathe', 'Jate-onc-bathe->late-one-bathe'],
  [/\bJate one evening I went to bathe\b/g, 'late one evening I went to bathe', 'Jate-one-bathe->late-one-bathe'],
  // 'Jater came to be' = 'later came to be'
  [/\bas it Jater came to be\b/g, 'as it later came to be', 'Jater-as->later-as'],
  // 'Jeave them there' = 'leave them there'
  [/\bShould I Jeave them there\b/g, 'Should I leave them there', 'Jeave-them-there->leave-them-there'],
  // 'enough to Jeave the meaning' = 'enough to leave the meaning'
  [/\benough to Jeave the meaning\b/g, 'enough to leave the meaning', 'Jeave-meaning->leave-meaning'],
  // 'Jiving there' = 'living there'
  [/\bwas an elder Jiving there\b/g, 'was an elder living there', 'Jiving-elder->living-elder'],
  // 'riolous Jiving' = 'riotous living'  (riolous = riotous? confirm)
  [/\bin riolous Jiving\b/g, 'in riotous living', 'riolous-Jiving->riotous-living'],
  // 'Jo 8:24' is 'Jn 8:24' — Bible reference where J is l/I. Actually 'In 5:43; Jo 8:24'
  // Both should be 'Jn' (John). 'In' is already 'Jn' shape. Let's normalize:
  [/\bevil deeds\. In 5:43; Jo 8:24/g, 'evil deeds. Jn 5:43; Jn 8:24', 'In-Jo-Bible->Jn-Jn-Bible'],

  // 'arc like the great deep' (one survivor)
  [/\bSpirit says: Your judgements arc like\b/g, 'Spirit says: Your judgements are like', 'arc-judgements-spirit->are-judgements-spirit'],

  // 'will bis name die' = 'will his name die'
  [/\bwill bis 'name die\b/g, "will his 'name die", 'bis-souk->his-souk'],

  // 'I am nol aware'
  [/\bthus: "I am nol aware\b/g, 'thus: "I am not aware', 'nol-aware-thus->not-aware-thus'],
  // safety: I am nol oue (oue→one)
  [/\bI am nol oue of those holy mea\b/g, 'I am not one of those holy men', 'nol-oue-mea->not-one-men'],
  // 'I just do nol know'
  [/\bI just do nol know\b/g, 'I just do not know', 'nol-just-do->not-just-do'],

  // 'wen! up lo Sinai' → 'went up to Sinai' (already handled by '[athers wen! up lo Sinai')
  // 'asétos, 'not lo be saved'' → already handled by 'lo-be-saved'
  // 'fathers wen! up lo Sinai' final cleanup
  [/\bfathers wen! up lo Sinai\b/g, 'fathers went up to Sinai', 'fathers-wen-lo->fathers-went-to'],

  // 'In 5:43' Bible reference - 'Jn 5:43' (capital I OCR'd from J): we already replaced one
  // (in 'In 5:43; Jo 8:24'). Other 'In' alone before Bible refs may be normal "In" or "Jn"
  // — let's leave alone since this is one specific quote.

  // ---- More last-pass remaining ----
  // 'What is there to he said' → 'What is there to be said'
  [/\bWhat is there to he said\b/g, 'What is there to be said', 'to-he-said->to-be-said'],
  // 'will bis name die' final cleanup
  [/\bwhen will bis 'name die\b/g, "when will his 'name die", 'bis-when-name->his-when-name'],
  // 'thus: "I am nol aware'
  [/\bthus: ["“]I am nol aware\b/g, 'thus: "I am not aware', 'nol-aware-final->not-aware-final'],

  // 'onc' → 'one' — five remaining unambiguous contexts ----
  // 'When onc of the children was nine years old'
  [/\bWhen onc of the children was nine\b/g, 'When one of the children was nine', 'onc-children->one-children'],
  // 'the onc known as'
  [/\bthe onc known as\b/g, 'the one known as', 'onc-known->one-known'],
  // 'as onc who had been ordained'
  [/\bas onc who had been ordained\b/g, 'as one who had been ordained', 'onc-ordained->one-ordained'],
  // 'the onc never came without'
  [/\bthe onc never came without\b/g, 'the one never came without', 'onc-never->one-never'],
  // 'one day, onc of them came'
  [/\bone day, onc of them came\b/g, 'one day, one of them came', 'onc-them->one-them'],

  // ---- Remaining T at "‘T John Moschos" — likely "I John Moschos" (autobiographical) ----
  [/\bNote the end: 'T John Moschos presumably\b/g, "Note the end: 'I John Moschos presumably", 'T-John-Moschos->I-John-Moschos'],
  // Greek transliteration "T& oxedn, la skeué" and "Ps T:16" and "R.T. Meyer" — leave alone.

  // ---- '<Ps T:16:\7)' — broken Ps reference; '<Ps T:16:7>' likely intended Psalm 7. Conservative: skip.

  // ---- 'will bis [curly-quote]name die' → 'will his [curly-quote]name die' ----
  [/\bWhen will bis [‘']name die\b/g, 'When will his ‘name die', 'bis-curly-name->his-curly-name'],

  // ---- 'onc' remaining 5 contexts ----
  [/\bthe archén to have pity on the onc who requested\b/g, 'the archén to have pity on the one who requested', 'onc-archen->one-archen'],
  [/\bdirection, onc day he said\b/g, 'direction, one day he said', 'onc-day-direction->one-day-direction'],
  [/\bThere was another person, onc of the illustrious citizens\b/g, 'There was another person, one of the illustrious citizens', 'onc-person->one-person'],
  [/\bin Syria, but onc of the many\b/g, 'in Syria, but one of the many', 'onc-Syria->one-Syria'],
  [/\bmonastic novel', and onc which could\b/g, "monastic novel', and one which could", 'onc-novel->one-novel'],

  // ---- 'not lo be saved' (final, leftover) ----
  [/'not lo be saved'/g, "'not to be saved'", 'lo-be-saved-final->to-be-saved-final'],
  [/‘not lo be saved’/g, '‘not to be saved’', 'lo-be-saved-curly->to-be-saved-curly'],

  // ---- 'cider' → 'elder' — 5 remaining occurrences ----
  // Wortley uses 'elder' consistently for monastic 'gerōn'/'elder'.
  // The OCR confuses 'elder' as 'cider' by reading e→c, l→i.
  [/\bon top of the cider's grave\b/g, "on top of the elder's grave", 'cider-grave->elder-grave'],
  [/\bon top of the cider's grave\b/g, "on top of the elder's grave", 'cider-grave-2->elder-grave-2'],
  [/\bon top of the cider’s grave\b/g, "on top of the elder’s grave", 'cider-grave-curly->elder-grave-curly'],
  [/\bI said to the cider:/g, 'I said to the elder:', 'cider-said->elder-said'],
  [/\bSince the cider could see angels\b/g, 'Since the elder could see angels', 'cider-angels->elder-angels'],
  [/\bwhich the word ['‘]cider['’] is not\b/g, "which the word ‘elder’ is not", 'cider-word->elder-word'],
  [/\bChristopher, a Roman cider\b/g, 'Christopher, a Roman elder', 'cider-Roman->elder-Roman'],

  // ---- 'onc which could' → 'one which could' — last 'onc' ----
  [/\bmonastic novel', and onc which\b/g, "monastic novel', and one which", 'onc-novel-which->one-novel-which'],
  // safety regex without curly-quote (covers smart-quote variations)
  [/\bmonastic novel’, and onc which\b/g, 'monastic novel’, and one which', 'onc-novel-curly->one-novel-curly'],

  // ---- 'damse]' → 'damsel' — single occurrence ----
  [/\bPersian damse\]/g, 'Persian damsel', 'damse-bracket->damsel'],

  // ---- 'hercsy' → 'heresy' — 1 occurrence in cider sentence ----
  [/\bare hercsy not orthodox\b/g, 'are heresy not orthodox', 'hercsy->heresy'],

  // ---- 'destruc tion' (split with space) → 'destruction' ----
  [/\bdestruc tion\b/g, 'destruction', 'destruc-tion->destruction'],

  // ---- More single-instance OCR errors caught in third pass ----
  // 'am anchoress' → 'an anchoress'
  [/\bwas am anchoress\b/g, 'was an anchoress', 'was-am->was-an'],
  // 'youlh' → 'youth' (l for t)
  [/\byoulh\b/g, 'youth', 'youlh->youth'],
  // 'upoa' → 'upon' (a for n)
  [/\bforcing his attentions upoa her\b/g, 'forcing his attentions upon her', 'upoa->upon'],
  // 'The attentions' (mid-sentence) - already legitimate text actually; capitalised 'The' could be a sentence boundary
  // Looking at: 'lovers do. The anchoress was so besieged by The attentions' - the second "The" should be "the" lowercase.
  // Wortley's prose: 'besieged by The attentions' is unidiomatic — it should be 'besieged by the attentions'.
  [/\bbesieged by The attentions\b/g, 'besieged by the attentions', 'by-The-attentions->by-the-attentions'],
  // 'sct foot' → 'set foot'
  [/\beven sct foot\b/g, 'even set foot', 'sct-foot->set-foot'],
  [/\bsct in motion\b/g, 'set in motion', 'sct-motion->set-motion'],
  // 'seat the disciple' / 'seat her maid' → 'sent ...'
  [/\bthe elder seat the disciple to perform\b/g, 'the elder sent the disciple to perform', 'seat-disciple->sent-disciple'],
  [/\bshe seat her maid to the youth\b/g, 'she sent her maid to the youth', 'seat-maid->sent-maid'],
  // 'Sit dowa' → 'Sit down'
  [/\b['‘]Sit dowa['’]/g, '‘Sit down’', 'Sit-dowa->Sit-down'],
  [/\bSit dowa/g, 'Sit down', 'Sit-dowa-2->Sit-down-2'],
  // 'afl on fire' → 'all on fire'
  [/\bI am afl on fire\b/g, 'I am all on fire', 'afl-fire->all-fire'],
  // 'yon' → 'you' — many remaining
  [/\bI have to say to yon\b/g, 'I have to say to you', 'yon-say-to->you-say-to'],
  [/\bappeals to yon so that\b/g, 'appeals to you so that', 'yon-appeals->you-appeals'],
  [/\bcome to see how yon die\b/g, 'come to see how you die', 'yon-die->you-die'],
  [/\bDo yon really want this\b/g, 'Do you really want this', 'yon-Do->you-Do'],
  [/\b['‘]Take whatever yon like, children['’]/g, '‘Take whatever you like, children’', 'yon-take-whatever->you-take-whatever'],
  [/\bI want yon to tell me\b/g, 'I want you to tell me', 'yon-tell-me->you-tell-me'],
  [/\bWhat has kept yon, child\b/g, 'What has kept you, child', 'yon-kept-child->you-kept-child'],
  // 'yon die' / 'yon like' final
  [/\bhow yon die\b/g, 'how you die', 'yon-die-how->you-die-how'],
  [/\bTake whatever yon like, children\b/g, 'Take whatever you like, children', 'yon-whatever->you-whatever'],
  // safety: any remaining "yon" before lowercase word likely "you"
  [/\byon (die|like|tell|kept|so|really|are|will|have|had|did|said|can|want|wish|wished|would|could|may|see|saw|came|went|gave|made|knew|love|loved|prefer|fear|long|need|wait|wait|hear|find|reach|believe|believed|think|thought|know|known|do|don|are|be|may|might|shall|stand|stay|going|coming|carried|came|too|just|yourself|will|wish|wished|come|went|going|going|tell|do|see)\b/g,
   'you $1', 'yon-verb->you-verb'],
  // 'satanic Just for her' → 'satanic lust for her' (J→l after capital)
  [/\bsatanic Just for her\b/g, 'satanic lust for her', 'satanic-Just->satanic-lust'],
  // 'Ob' → 'Oh' — three instances (use curly-quote literal, no \b before curly)
  [/['‘]Ob, how many/g, '‘Oh, how many', 'Ob-comma-how->Oh-comma-how'],
  [/['‘]Ob mistress/g, '‘Oh mistress', 'Ob-mistress->Oh-mistress'],
  [/say: ['‘]Ob brother/g, 'say: ‘Oh brother', 'Ob-brother->Oh-brother'],
  // 'persocute' → 'persecute'
  [/\bpersocute\b/g, 'persecute', 'persocute->persecute'],
  // 'hoaey' → 'honey'
  [/\bas sweet as hoaey\b/g, 'as sweet as honey', 'hoaey->honey'],
  // 'toasied' → 'toasted'
  [/\bintincted and then toasied\b/g, 'intincted and then toasted', 'toasied->toasted'],
  // 'documenl' → 'document'
  [/\bfor a documenl which\b/g, 'for a document which', 'documenl->document'],
  // 'Panl' → 'Paul'
  [/\bWhen Panl had served seven years\b/g, 'When Paul had served seven years', 'Panl->Paul'],
  // 'wenl' → 'went'
  [/\bwe wenl to the Great Oasis\b/g, 'we went to the Great Oasis', 'wenl->went'],
  // 'Soa' → 'Son'
  [/\b['‘]The Soa of Man\b/g, '‘The Son of Man', 'Soa->Son'],
  // 'aboul' → 'about' — 2 instances
  [/\bhow it came aboul that you embraced\b/g, 'how it came about that you embraced', 'aboul-came->about-came'],
  [/\bwhenever he was aboul to set out\b/g, 'whenever he was about to set out', 'aboul-set-out->about-set-out'],
  // 'souk' → 'soul:'
  [/\bsaying to the souk When will his/g, 'saying to the soul: When will his', 'souk-When->soul-When'],
  // 'evea' → 'even'
  [/\byet evea by saying this\b/g, 'yet even by saying this', 'evea-yet->even-yet'],
  // 'evea' = 'even' could occur elsewhere; safety:
  [/\bevea\b/g, 'even', 'evea->even'],
  // 'have bee intincted' → 'have been intincted' (the OCR added missing 'n')
  [/\bmight however have bee intincted\b/g, 'might however have been intincted', 'bee-intincted->been-intincted'],

  // ---- 'Aud' → 'And' (single instance check; should be caught by aud->and but capital) ----
  [/\bAud he said\b/g, 'And he said', 'Aud-he-said->And-he-said'],

  // ---- 'Anastasios' & similar already OK
  // ---- 'Lasc' or 'Lavra'? unchanged

  // ---- 'tour favras of Scété' already done; safety

  // ---- 'seat' → 'sent' for clear contexts ----
  [/\bseat him on his way\b/g, 'sent him on his way', 'seat-him-way->sent-him-way'],
  [/\bHe seat a message\b/g, 'He sent a message', 'seat-message->sent-message'],
  [/\bGod has seat us\b/g, 'God has sent us', 'seat-God->sent-God'],

  // ---- 'fived' → 'lived' (f for l) ----
  [/\bAs long as I fived\b/g, 'As long as I lived', 'fived-long->lived-long'],
  [/\bthere fived a monk\b/g, 'there lived a monk', 'fived-monk->lived-monk'],
  // ---- 'fisten' → 'listen' (f for l) ----
  [/\bBut first fisten to what\b/g, 'But first listen to what', 'fisten->listen'],
  // ---- 'litle' → 'little' ----
  [/\bgiving him a litle bread\b/g, 'giving him a little bread', 'litle-bread->little-bread'],
  // ---- 'shrinc' → 'shrine' ----
  [/\bfrom entering the shrinc\b/g, 'from entering the shrine', 'shrinc->shrine'],
  // ---- 'Pakstine' → 'Palestine' ----
  [/\bBishop of Caesarea in Pakstine\b/g, 'Bishop of Caesarea in Palestine', 'Pakstine->Palestine'],

  // ---- "to he said" → "to be said" — Church does not allow those things to be said ----
  [/\bChurch does not allow those things to he said\b/g, 'Church does not allow those things to be said', 'to-he-said-2->to-be-said-2'],

  // ---- More single-instance OCR errors found in fourth pass ----
  // 'wood -en sigaal' → 'wooden signal'
  [/\bwood -en sigaal\b/g, 'wooden signal', 'wood-en-sigaal->wooden-signal'],
  // 'forgive mel' → 'forgive me!'
  [/\bforgive mel\)/g, 'forgive me!)', 'mel-forgive->me-forgive'],
  // 'cggs' → 'eggs' (×2)
  [/\bcggs\b/g, 'eggs', 'cggs->eggs'],
  // 'sone comfort' → 'some comfort'
  [/\boffer you sone comfort\b/g, 'offer you some comfort', 'sone-comfort->some-comfort'],
  // 'patciarch' → 'patriarch'
  [/\bpatciarch\b/g, 'patriarch', 'patciarch->patriarch'],
  // 'Sexval' → 'Sexual' (already covered sexval but cap)
  [/\bSexval\b/g, 'Sexual', 'Sexval->Sexual'],
  // 'Barly' → 'Early' (in Princeton 1988 bibliography)
  [/\bin Barly Christianity\b/g, 'in Early Christianity', 'Barly-Christianity->Early-Christianity'],
  // 'commeat' → 'comment'
  [/\binteresting commeat\b/g, 'interesting comment', 'commeat->comment'],
  // 'Rouba ta visit' → 'Rouba to visit'
  [/\bRouba ta visit\b/g, 'Rouba to visit', 'Rouba-ta->Rouba-to'],
  // 'replacing hie' → 'replacing him'
  [/\breplacing hie in the prison\b/g, 'replacing him in the prison', 'hie-prison->him-prison'],
  // '] heard' → 'I heard' (bracket-I)
  [/\bdays ago, \] heard of the death\b/g, 'days ago, I heard of the death', 'bracket-heard->I-heard'],

  // ---- 'whitc bread' → 'white bread' ----
  [/\bwhitc bread\b/g, 'white bread', 'whitc->white'],

  // ---- 'pernesa' — looks like a Greek term, could be 'porneia' but unsure. Conservative: skip.

  // ---- More fifth-pass single-instance OCR errors ----
  // 'anchoritc' → 'anchorite'
  [/\banchoritc\b/g, 'anchorite', 'anchoritc->anchorite'],
  // 'werc' → 'were'
  [/\bWhen we werc in Alexandria\b/g, 'When we were in Alexandria', 'werc->were'],
  // 'wilh' → 'with' — 3 instances
  [/\bto associate wilh the impure demon\b/g, 'to associate with the impure demon', 'wilh-associate->with-associate'],
  [/\bwe stayed wilh an elder\b/g, 'we stayed with an elder', 'wilh-stayed->with-stayed'],
  [/\bhe spoke wilh him about what is beneficial\b/g, 'he spoke with him about what is beneficial', 'wilh-spoke->with-spoke'],
  // '(rom' → 'from' — 9 instances
  [/\btwenty-four miles \(rom each other\b/g, 'twenty-four miles from each other', 'paren-rom-miles->from-miles'],
  [/\bdraw their water \(rom the wadi\b/g, 'draw their water from the wadi', 'paren-rom-water->from-water'],
  [/\ban elder came \(rom the Lavra of Calamdn\b/g, 'an elder came from the Lavra of Calamdn', 'paren-rom-Calamdn->from-Calamdn'],
  [/\bsent a young monk \(rom there to the monastery\b/g, 'sent a young monk from there to the monastery', 'paren-rom-monastery->from-monastery'],
  [/\bIsrael hurried to escape \(rom slavery\b/g, 'Israel hurried to escape from slavery', 'paren-rom-slavery->from-slavery'],
  // Greedier safety net for any remaining '\b\(rom\b':
  [/\\?\(rom\b/g, 'from', 'paren-rom-generic->from-generic'],
  // 'bumble' → 'humble' (b/h)
  [/\bHe was a bumble man\b/g, 'He was a humble man', 'bumble-man->humble-man'],
  [/\byou lordship's bumble servants\b/g, "your lordship's humble servants", 'bumble-servants->humble-servants'],
  [/\byou lordship['‘]s bumble servants/g, 'your lordship’s humble servants', 'bumble-servants-curly->humble-servants-curly'],
  // 'il.' → 'it.' (only in 'chance to read il.')
  [/\bchance to read il\./g, 'chance to read it.', 'il-period->it-period'],
  // 'carly' → 'early'
  [/\bhe would rise carly\b/g, 'he would rise early', 'carly-rise->early-rise'],
  // 'lavnch' → 'launch'
  [/\bhe wanted to lavnch\b/g, 'he wanted to launch', 'lavnch->launch'],
  // 'he kd:' → 'he led:'
  [/\bthe kind of life he kd:/g, 'the kind of life he led:', 'kd-life->led-life'],

  // ---- 'bad' → 'had' — restrict to verb contexts (bad + verb-participle/-en) ----
  [/\bBarnabas the anchorite bad left\b/g, 'Barnabas the anchorite had left', 'bad-anchorite->had-anchorite'],
  [/\bHe bad, however, to strive\b/g, 'He had, however, to strive', 'bad-He-strive->had-He-strive'],
  [/\bthe clergy who bad celebrated\b/g, 'the clergy who bad celebrated'.replace('bad', 'had'), 'bad-celebrated->had-celebrated'],
  [/\bthe clergy who bad celebrated\b/g, 'the clergy who had celebrated', 'bad-celebrated-2->had-celebrated-2'],
  [/\bjudgement which bad been pronounced\b/g, 'judgement which had been pronounced', 'bad-pronounced->had-pronounced'],
  [/\bI saw that everyone bad gone\b/g, 'I saw that everyone had gone', 'bad-gone->had-gone'],
  [/\ban angel of God who bad done this deed\b/g, 'an angel of God who had done this deed', 'bad-done->had-done'],
  [/\bSo when she bad given birth\b/g, 'So when she had given birth', 'bad-given-birth->had-given-birth'],
  [/\bI knew her because she bad often given\b/g, 'I knew her because she had often given', 'bad-often-given->had-often-given'],
  [/\bThen, when I bad finished\b/g, 'Then, when I had finished', 'bad-finished->had-finished'],
  [/\bwhy he bad not been baptised\b/g, 'why he had not been baptised', 'bad-baptised->had-baptised'],
  [/\bnor bad anybody come in\b/g, 'nor had anybody come in', 'bad-anybody-come->had-anybody-come'],
  [/\bthat he bad departed this life\b/g, 'that he had departed this life', 'bad-departed->had-departed'],
  [/\bAbba ['‘]Theodore bad no possessions\b/g, 'Abba ‘Theodore had no possessions', 'bad-Theodore->had-Theodore'],
  [/\bIn the cave he bad an icon\b/g, 'In the cave he had an icon', 'bad-cave-icon->had-cave-icon'],
  [/\bWhen they bad finished eating\b/g, 'When they had finished eating', 'bad-finished-eating->had-finished-eating'],
  [/\bin a cell, passing his time in ascetic exercises and other labours\. He bad a totally guiless disposition\b/g,
   'in a cell, passing his time in ascetic exercises and other labours. He had a totally guileless disposition',
   'bad-guiless->had-guileless'],
  [/\bNow he bad been hearing\b/g, 'Now he had been hearing', 'bad-hearing->had-hearing'],
  [/\bshe realised that he bad not yet appeared\b/g, 'she realised that he had not yet appeared', 'bad-appeared->had-appeared'],

  // ---- 'guiless' → 'guileless' (within above same paragraph — fixed inline above) ----

  // 'Brightman, vol. 1 (Oxford, (896)' — fix the malformed paren date
  [/\(Oxford, \(896\)/g, '(Oxford, 1896)', 'Oxford-paren-896->Oxford-1896'],

  // 'kindlly'? typo check
  // 'aachorite' → 'anchorite'
  [/\baachorite\b/g, 'anchorite', 'aachorite->anchorite'],

  // ---- Sixth-pass: more OCR errors found ----
  // 'Javra' → 'lavra' (J for l) — multiple instances
  [/\bJavra\b/g, 'lavra', 'Javra->lavra'],
  // 'himseif' → 'himself' (i for l)
  [/\btake them \{rom there himseif/g, 'take them from there himself', 'himseif-rom->himself-from'],
  [/\btake them from there himseif/g, 'take them from there himself', 'himseif-from->himself-from-2'],
  [/\bquestion himseif on every matter/g, 'question himself on every matter', 'himseif-question->himself-question'],
  // 'bebest' → 'behest'
  [/\bat the bebest of persons\b/g, 'at the behest of persons', 'bebest->behest'],
  // 'Elpidic Mioni' → 'Elpidio Mioni'
  [/\bElpidic Mioni\b/g, 'Elpidio Mioni', 'Elpidic-Mioni->Elpidio-Mioni'],

  // ---- Seventh-pass OCR corrections ----
  // 'clTorts' → 'efforts' (OCR garble of 'efforts')
  [/\bunllagging i his clTorts\b/g, 'unflagging in his efforts', 'clTorts->efforts'],
  // 'difTerence' → 'difference' (T for f after f)
  [/\bdifTerence\b/g, 'difference', 'difTerence->difference'],
  // 'abAf' → 'above' (OCR garble of 'above')
  [/\ba long-descrted dwelling abAf where\b/g, 'a long-deserted dwelling above where', 'abAf-long-descrted->above-long-deserted'],
  // 'descrted' is just 'deserted' — included above
  // 'HoLy Crry' → 'HOLY CITY' (preserve all-caps in section title)
  // The original context is "HIS THRONE AND CAME TO THE HoLy Crry WHERE HE CHANGED HIS CLOTHES" —
  // an all-caps section title where OCR mixed case.
  [/\bHoLy Crry\b/g, 'HOLY CITY', 'HoLy-Crry->HOLY-CITY'],
  // Fix any prior 'Holy City' in that title context that escaped (idempotent fix)
  [/\bHIS THRONE AND CAME TO THE Holy City WHERE\b/g, 'HIS THRONE AND CAME TO THE HOLY CITY WHERE', 'Holy-City-title->HOLY-CITY-title'],
  // 'bcpan' → 'began' (c for e, p for g? Actually probably 'began' with letters mangled.)
  [/\bHe bcpan wanting to touch\b/g, 'He began wanting to touch', 'bcpan->began'],
  // 'Pharbn' → 'Pharan' — in the index this proper name appears multiple times as 'Pharan' (where Sinai monks lived)
  [/\bPharbn 30, 31, 32, 33, 36/g, 'Pharan 30, 31, 32, 33, 36', 'Pharbn-index->Pharan-index'],
  // 'slecp' → 'sleep' (c for e)
  [/\bwill you slecp with me\b/g, 'will you sleep with me', 'slecp->sleep'],
  // 'blackfaced' → 'black-faced' (Wortley elsewhere uses 'black-laced' — but here context indicates 'black-faced')
  // Conservative: leave 'blackfaced' as a compound; modern English accepts both forms.
  // 'Jobn' last instance → 'John'
  [/\bChadwick, Henry, ['‘]Jobn Moschos and his friend Sephronios\b/g, "Chadwick, Henry, 'John Moschos and his friend Sephronios", 'Jobn-Chadwick->John-Chadwick'],
  // 'kecper' → 'keeper' (in index 'tavern-keeper')
  [/\bravern-kecper\b/g, 'tavern-keeper', 'ravern-kecper->tavern-keeper'],
  // (Note: 'ravern' is itself OCR — should be 'tavern')
  // 'bumble servants' remaining → 'humble servants'
  [/\byou lordship['‘]s bumble servants/g, 'your lordship’s humble servants', 'bumble-servants-final->humble-servants-final'],

  // ---- 'we are you lordship' → 'we are your lordship' — 'you' should be 'your' before noun ----
  [/\bwe are you lordship['‘]s humble servants/g, 'we are your lordship’s humble servants', 'you-lordship->your-lordship'],

  // ---- 'descrted' (mid-paragraph) → 'deserted' — already handled in abAf rule but generic safety
  [/\blong-descrted\b/g, 'long-deserted', 'long-descrted->long-deserted'],

  // ---- 'unllagging' → 'unflagging'
  [/\bunllagging\b/g, 'unflagging', 'unllagging->unflagging'],

  // ---- REPAIR: undo broken 'to he VERB' → 'to be VERB' that earlier overzealous
  // be-verb rule created. These are infinitive 'to be' phrases that should
  // never have been converted (e.g. "to be made flesh", "to be sent", "to be put").
  // The be-verb rule has now been tightened with a negative lookbehind to
  // exclude these contexts, but we still need to undo the historic damage.
  [/\bto he made flesh\b/g, 'to be made flesh', 'undo-to-he-made-flesh'],
  [/\bto he put to shame\b/g, 'to be put to shame', 'undo-to-he-put-shame'],
  [/\bto he set free\b/g, 'to be set free', 'undo-to-he-set-free'],
  [/\bto he brought out\b/g, 'to be brought out', 'undo-to-he-brought-out'],
  [/\bto he brought up\b/g, 'to be brought up', 'undo-to-he-brought-up'],
  [/\bused to he sent\b/g, 'used to be sent', 'undo-used-to-he-sent'],
  [/\bfor her to he sent\b/g, 'for her to be sent', 'undo-her-to-he-sent'],
  [/\bchildren to he sent\b/g, 'children to be sent', 'undo-children-to-he-sent'],
  [/\bcommanded him to he put\b/g, 'commanded him to be put', 'undo-him-to-he-put'],
  [/\bstruggled to he made perfect\b/g, 'struggled to be made perfect', 'undo-struggled-to-he-made-perfect'],
];

// ---------------------------------------------------------------------------
// Apply rules
// ---------------------------------------------------------------------------
function applyFixes(text) {
  let out = text;
  const hits = [];
  for (const [pattern, replacement, name] of wordFixes) {
    const before = out;
    out = out.replace(pattern, replacement);
    if (out !== before) {
      // Count matches by re-running on `before`
      const m = before.match(pattern);
      hits.push([name, m ? m.length : 1]);
    }
  }
  for (const [pattern, replacement, name] of textFixes) {
    const before = out;
    out = out.replace(pattern, replacement);
    if (out !== before) {
      const m = before.match(pattern);
      hits.push([name, m ? m.length : 1]);
    }
  }
  return [out, hits];
}

let totalParagraphs = 0;
let modifiedParagraphs = 0;
const ruleHits = new Map();
const samples = [];

for (const chapter of bundle.chapters) {
  for (const section of chapter.sections || []) {
    for (const paragraph of section.paragraphs || []) {
      totalParagraphs++;
      const original = paragraph.text;
      const [fixed, hits] = applyFixes(original);
      if (fixed !== original) {
        modifiedParagraphs++;
        paragraph.text = fixed;
        for (const [name, n] of hits) {
          ruleHits.set(name, (ruleHits.get(name) || 0) + n);
        }
        if (samples.length < 10) {
          samples.push({
            chapter: chapter.id,
            title: chapter.title,
            before: original,
            after: fixed,
          });
        }
      }
    }
  }
}

fs.writeFileSync(INPUT, JSON.stringify(bundle, null, 2));

console.log('=== Moschos Spiritual Meadow OCR Fix Report ===');
console.log('Total paragraphs:    ', totalParagraphs);
console.log('Modified paragraphs: ', modifiedParagraphs);
console.log('Distinct rules fired:', ruleHits.size);
console.log('Total fix count:     ',
  [...ruleHits.values()].reduce((a, b) => a + b, 0));

console.log('\n--- Rule hits ---');
[...ruleHits.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, n]) => console.log(`  ${n.toString().padStart(4)}  ${name}`));

console.log('\n--- Sample diffs (first 10 modified paragraphs) ---');
samples.forEach((s, i) => {
  console.log(`\n### Sample ${i + 1}: ${s.chapter}`);
  console.log(`Title: ${s.title}`);
  // Show short diff snippet: find the first changed substring.
  const beforeFirstDiff = firstDiffSnippet(s.before, s.after);
  console.log('BEFORE: ' + beforeFirstDiff.before);
  console.log('AFTER:  ' + beforeFirstDiff.after);
});

function firstDiffSnippet(before, after) {
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const start = Math.max(0, i - 40);
  // Find rough end of diff by going forward through both strings to common tail
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > i && afterEnd > i && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd--;
    afterEnd--;
  }
  const trailLen = 30;
  return {
    before: before.substring(start, Math.min(before.length, beforeEnd + trailLen)),
    after: after.substring(start, Math.min(after.length, afterEnd + trailLen)),
  };
}
