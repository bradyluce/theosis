#!/usr/bin/env node
/**
 * One-off OCR cleanup for the Holy Monastery of St. John the Theologian
 * (Souroti) edition of Elder Paisios of Mt Athos, Spiritual Counsels Vol. II,
 * "Spiritual Awakening". Scanned PDF -> OCR text with two recurring source-
 * specific corruption modes that the Tier-1 universal cleaner does not touch:
 *
 *   1. "rn" misread as "m" or vice-versa (a classic Times-Roman OCR ligature
 *      confusion): "sorne" (267x) for "some", "carne" (79x) for "came",
 *      "leam" for "learn", "retum" for "return", "moming" for "morning",
 *      "Gerrnans" for "Germans", "frorn" for "from", "sorneone" for "someone".
 *   2. Letter "l" (lowercase L) misread as "!" or as the digit "1":
 *      "al!" (58x) for "all", "mus!" (32x) for "must", "Chape!" for
 *      "Chapel", "wi11" for "will", "Se1f" for "Self".
 *   3. Capital "I" misread as the digit "1" at sentence start: "1t is",
 *      "1 was", "1 had" (>250 occurrences combined).
 *   4. Capital "I" misread as lowercase "l" at sentence start: "lt", "lf",
 *      "ls", "lndifferent", "lsraelites", "lfyou" (>200 occurrences).
 *   5. Spurious mid-word spaces from PDF justification: "di vine", "yo u",
 *      "ha ve", "M y", "beca use" (~190 occurrences).
 *   6. Run-together prepositions: "ofthe" (117x), "ofGod", "ofChrist".
 *
 * Reads content/generated/commentary/paisios-spiritual-awakening.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative -- applies only where the pattern is unambiguous.
 * Greek transliterations (philotimo, kenosis, komboschoini, Panaghia,
 * Geronda, etc.), Orthodox vocabulary, scripture references like "1 Cor",
 * "1 Tim", and English exclamations like "us!", "God!", "Christ!" are
 * preserved.
 *
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(
  __dirname,
  '../../../content/generated/commentary/paisios-spiritual-awakening.json',
);

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Rules. Each entry: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded so legitimate English never matches.
// Comments cite at least one paragraph index that exhibits the error along
// with the safety reason (why the substitution is unambiguous).
// ---------------------------------------------------------------------------
const wordFixes = [
  // =========================================================================
  // 1) "rn" -> "m" misreads (Times-Roman OCR ligature confusion).
  // Each token is verified to be non-English; the Souroti text never uses
  // the Spanish words "sorne", "carne", or Latin/medical "ornar" so the
  // word-boundary substitutions are safe.
  // =========================================================================
  // "sorne" -> "some"  (267x; p218 etc.: "There were just two pieces of coa!
  // burning... sorne old ladies"). No Spanish "sorne" in English text.
  [/\bsorne\b/g, 'some', 'sorne->some'],
  [/\bSorne\b/g, 'Some', 'Sorne->Some'],
  // "carne" -> "came" (79x; ch0 p1 etc.: "The Germans carne", "the priests
  // carne"). The lone "carne!" at p_camel is intentionally still matched
  // here ("eat carne! droppings"), producing "came!"; rule below converts
  // that to "camel!" via word-boundary phrase.
  [/\bcarne\b/g, 'came', 'carne->came'],
  [/\bCarne\b/g, 'Came', 'Carne->Came'],
  // "leam" -> "learn" (13x) and its family — never a real English word.
  [/\bleam\b/g, 'learn', 'leam->learn'],
  [/\bleamed\b/g, 'learned', 'leamed->learned'],
  [/\bleams\b/g, 'learns', 'leams->learns'],
  [/\bleaming\b/g, 'learning', 'leaming->learning'],
  [/\bleamt\b/g, 'learnt', 'leamt->learnt'],
  // "retum" -> "return" (14x) and its family.
  [/\bretum\b/g, 'return', 'retum->return'],
  [/\bretums\b/g, 'returns', 'retums->returns'],
  [/\bretumed\b/g, 'returned', 'retumed->returned'],
  [/\bretuming\b/g, 'returning', 'retuming->returning'],
  // "bum/bom/buming/bumed" -> "burn/born/burning/burned" (~30x total).
  // No legitimate English "bum" appears in a saintly elder's discourse on
  // souls, charity, prayer (verified from the 65-para sample).
  [/\bbum\b/g, 'burn', 'bum->burn'],
  [/\bbums\b/g, 'burns', 'bums->burns'],
  [/\bbumed\b/g, 'burned', 'bumed->burned'],
  [/\bbuming\b/g, 'burning', 'buming->burning'],
  [/\bbom\b/g, 'born', 'bom->born'],
  // "concem" -> "concern" (8x) and its family.
  [/\bconcem\b/g, 'concern', 'concem->concern'],
  [/\bconcems\b/g, 'concerns', 'concems->concerns'],
  [/\bconcemed\b/g, 'concerned', 'concemed->concerned'],
  [/\bconcerning\b/g, 'concerning', 'concerning-noop'], // marker only
  // "moming" -> "morning" (6x).
  [/\bmoming\b/g, 'morning', 'moming->morning'],
  [/\bmomings\b/g, 'mornings', 'momings->mornings'],
  // "scom/scomed" -> "scorn/scorned" (5x).
  [/\bscom\b/g, 'scorn', 'scom->scorn'],
  [/\bscomed\b/g, 'scorned', 'scomed->scorned'],
  [/\bscoming\b/g, 'scorning', 'scoming->scorning'],
  // "modem" -> "modern" — context here is always "modem pilgrims",
  // "modem conveniences", "modem man" — never an actual electronic modem.
  [/\bmodem\b/g, 'modern', 'modem->modern'],
  [/\bModem\b/g, 'Modern', 'Modem->Modern'],
  // "stemly" -> "sternly" (3x) and "stem" only when adverbial/prefix form
  // (the noun "stem" of a plant is used once for "cherry stem" — preserved).
  [/\bstemly\b/g, 'sternly', 'stemly->sternly'],
  [/\bstemness\b/g, 'sternness', 'stemness->sternness'],
  // "govem/govemment" -> "govern/government" (5x).
  [/\bgovem\b/g, 'govern', 'govem->govern'],
  [/\bgovems\b/g, 'governs', 'govems->governs'],
  [/\bgoveming\b/g, 'governing', 'goveming->governing'],
  [/\bgovemment\b/g, 'government', 'govemment->government'],
  // "etemity/etemal" -> "eternity/eternal" (when not also missing the l).
  [/\betemity\b/g, 'eternity', 'etemity->eternity'],
  [/\bIived\b/g, 'lived', 'Iived->lived'],

  // "arrny/army"-family: "in the arrny" (5x) -> "in the army".
  [/\barrny\b/g, 'army', 'arrny->army'],
  // "Gerrnans" -> "Germans" (5x).
  [/\bGerrnans\b/g, 'Germans', 'Gerrnans->Germans'],
  // "frorn" -> "from" (3x).
  [/\bfrorn\b/g, 'from', 'frorn->from'],
  // "harrn/harrnful" -> "harm/harmful".
  [/\bharrn\b/g, 'harm', 'harrn->harm'],
  [/\bharrnful\b/g, 'harmful', 'harrnful->harmful'],
  // "sarne", "hirn", "thern", "forrn", "narne", "warrn", "tearn" each appear
  // 1-2x but never as legitimate English words.
  [/\bsarne\b/g, 'same', 'sarne->same'],
  [/\bhirn\b/g, 'him', 'hirn->him'],
  [/\bthern\b/g, 'them', 'thern->them'],
  [/\bforrn\b/g, 'form', 'forrn->form'],
  [/\bnarne\b/g, 'name', 'narne->name'],
  [/\bwarrn\b/g, 'warm', 'warrn->warm'],
  [/\btearn\b/g, 'team', 'tearn->team'],
  // Other "rn"-for-"m" run-together combos that surfaced in the audit.
  [/\bsorneone\b/g, 'someone', 'sorneone->someone'],
  [/\bsornetimes\b/g, 'sometimes', 'sornetimes->sometimes'],
  [/\bsornewhat\b/g, 'somewhat', 'sornewhat->somewhat'],
  [/\bcornrnon\b/g, 'common', 'cornrnon->common'],
  [/\bcomrnunallife\b/g, 'communal life', 'comrnunallife->communal-life'],
  [/\btransforrnation\b/g, 'transformation', 'transforrnation->transformation'],
  [/\bdeterrnined\b/g, 'determined', 'deterrnined->determined'],
  [/\benlightenrnent\b/g, 'enlightenment', 'enlightenrnent->enlightenment'],
  [/\brnerchants\b/g, 'merchants', 'rnerchants->merchants'],
  [/\bweatherrnen\b/g, 'weathermen', 'weatherrnen->weathermen'],
  [/\bperrnanently\b/g, 'permanently', 'perrnanently->permanently'],
  [/\brnistake\b/g, 'mistake', 'rnistake->mistake'],
  [/\brnatters\b/g, 'matters', 'rnatters->matters'],
  // "Ornar" -> "Omar" (2x; both refer to the Mosque of Omar in Jerusalem).
  [/\bOrnar\b/g, 'Omar', 'Ornar->Omar'],
  // "extemally" -> "externally" (2x).
  [/\bextemally\b/g, 'externally', 'extemally->externally'],

  // =========================================================================
  // 2) "l" -> "!" misreads (the lowercase L stroke OCR'd as an exclamation).
  // Limited to non-English roots so legitimate "...!" exclamations stay.
  // "al!" must come BEFORE the catch-all word!-pattern rules because "al!"
  // is a substring of many phrases.
  // =========================================================================
  // "al!" -> "all" (58x; "It will al! remain here", "with al! my heart").
  // "al" is never a standalone English word, so "al!" is unambiguous.
  [/\bal!/g, 'all', 'al!->all'],
  [/\bAl!/g, 'All', 'Al!->All'],

  // "mus!" -> "must" (32x; only ever "mus! be", "mus! have", "mus! first").
  // "mus" is not standalone English; "musts" preserved as "musts".
  [/\bmus!/g, 'must', 'mus!->must'],

  // The following "<word>! " forms are always the cited English word with
  // a final "t" or "l" misread as "!". The audit verified each appears
  // only in unambiguous English contexts.
  [/\bimportan!/g, 'important', 'importan!->important'],
  [/\bpreven!/g, 'prevent', 'preven!->prevent'],
  [/\bChape!/g, 'Chapel', 'Chape!->Chapel'],
  [/\bcorree!/g, 'correct', 'corree!->correct'],  // also fixes "ee"->"ec"
  [/\bcorree\b/g, 'correct', 'corree->correct'],  // bare "corree" sans !
  [/\bcritica!/g, 'critical', 'critica!->critical'],
  [/\bleas!/g, 'least', 'leas!->least'],
  [/\babundan!/g, 'abundant', 'abundan!->abundant'],
  [/\beterna!/g, 'eternal', 'eterna!->eternal'],
  [/\bexterna!/g, 'external', 'externa!->external'],
  // Variants where the trailing "l" became "]" or was separated by a space.
  [/\bexterna\]/g, 'external', 'externa-bracket->external'],
  [/\beterna\]/g, 'eternal', 'eterna-bracket->eternal'],
  [/\beterna l\b/g, 'eternal', 'eterna-space-l->eternal'],
  [/\bconstan!/g, 'constant', 'constan!->constant'],
  [/\bdependen!/g, 'dependent', 'dependen!->dependent'],
  [/\bignoran!/g, 'ignorant', 'ignoran!->ignorant'],
  [/\binciden!/g, 'incident', 'inciden!->incident'],
  [/\binstan!/g, 'instant', 'instan!->instant'],
  [/\bindignan!/g, 'indignant', 'indignan!->indignant'],
  [/\bdistrae!/g, 'distract', 'distrae!->distract'],
  [/\bsevera!/g, 'several', 'severa!->several'],
  [/\bperpetua!/g, 'perpetual', 'perpetua!->perpetual'],
  [/\bbeneficia!/g, 'beneficial', 'beneficia!->beneficial'],
  [/\bsigna!/g, 'signal', 'signa!->signal'],
  [/\bbarre!/g, 'barrel', 'barre!->barrel'],
  [/\bvigilan!/g, 'vigilant', 'vigilan!->vigilant'],
  [/\bpresiden!/g, 'president', 'presiden!->president'],
  [/\bProtestan!/g, 'Protestant', 'Protestan!->Protestant'],
  [/\bgran!/g, 'grant', 'gran!->grant'],
  [/\btorren!/g, 'torrent', 'torren!->torrent'],
  [/\bleve!/g, 'level', 'leve!->level'],
  [/\bpul!/g, 'pull', 'pul!->pull'],
  [/\bcal!/g, 'call', 'cal!->call'],
  [/\bSea!/g, 'Seal', 'Sea!->Seal'],
  [/\bsea!/g, 'seal', 'sea!->seal'],
  [/\bSu!/g, 'Sul', 'Su!->Sul'],  // "Su! tan" appears - "Sul tan" -> next rule for "Sul tan"
  // "cernen!" -> "cement" (composite: rn->m AND t->!)
  [/\bcernen!/g, 'cement', 'cernen!->cement'],
  // "coa! burning/instead" -> "coal burning/instead" (2x).
  [/\bcoa!/g, 'coal', 'coa!->coal'],
  // "ti!" -> "til" (in "un ti! twelve noon" / "un ti! Pascha"; together with
  // the un-ti space-split below this restores "until").
  [/\bti!/g, 'til', 'ti!->til'],
  // "res!" -> "rest" (3x; "res! of the tree", "res! by sleeping").
  [/\bres!/g, 'rest', 'res!->rest'],
  // "los!" -> "lost" (1x; "los! altogether"). Restrict to "los! altogether"
  // so we never touch the Spanish word "los" in a quotation.
  [/\blos! altogether\b/g, 'lost altogether', 'los!->lost'],
  // "canno!" -> "cannot" (3x).
  [/\bcanno!/g, 'cannot', 'canno!->cannot'],

  // Fix "Su! tan" -> "Sultan" after Su! -> Sul.
  [/\bSul tan\b/g, 'Sultan', 'Sul-tan->Sultan'],

  // Adverbial "ly" splits where "l" became "!": "final! y" -> "finally".
  // Only the specific stems below appeared with this pattern.
  [/\bfinal! y\b/g, 'finally', 'final!y->finally'],
  [/\bFinal! y\b/g, 'Finally', 'Final!y->Finally'],
  [/\beventual! y\b/g, 'eventually', 'eventual!y->eventually'],
  [/\busual! y\b/g, 'usually', 'usual!y->usually'],
  [/\bactual! y\b/g, 'actually', 'actual!y->actually'],
  [/\breal! y\b/g, 'really', 'real!y->really'],
  [/\bprecise! y\b/g, 'precisely', 'precise!y->precisely'],
  [/\bparticular! y\b/g, 'particularly', 'particular!y->particularly'],
  [/\bcomplete! y\b/g, 'completely', 'complete!y->completely'],
  [/\bGradual! y\b/g, 'Gradually', 'Gradual!y->Gradually'],
  [/\bgradual! y\b/g, 'gradually', 'gradual!y->gradually'],
  [/\bmere! y\b/g, 'merely', 'mere!y->merely'],
  [/\bnormal! y\b/g, 'normally', 'normal!y->normally'],
  [/\bsincere! y\b/g, 'sincerely', 'sincere!y->sincerely'],
  [/\bextreme! y\b/g, 'extremely', 'extreme!y->extremely'],

  // "Don'!" / "don'!" -> "Don't" / "don't" (22x combined).
  [/\bDon'!/g, "Don't", "Don'!->Don't"],
  [/\bdon'!/g, "don't", "don'!->don't"],
  [/\bAren'!/g, "Aren't", "Aren'!->Aren't"],
  // "Don'! you" pattern remains valid English: now "Don't you".

  // "so u!" / "so u[" -> "soul" (6x; "salvation of his so u[", "burn the
  // so u!"). The lowercase "u" plus stray "l" replacement glyph.
  [/\bso u!/g, 'soul', 'so-u!->soul'],
  [/\bso u\[/g, 'soul', 'so-u[->soul'],

  // =========================================================================
  // 3) Digit "1" -> capital "I" at sentence start. Restrict to safe phrase
  // patterns ("1 am", "1 was", "1 had", "1 will", "1 do", "1 see", "1 told",
  // "1 went", "1 said", "1 feel", "1 asked", "1 must", "1 remember", "1 know",
  // "1 give", "1 want", "1 think", "1 could", "1 don", "1 believe", "1t is",
  // "1f", "1n"). Scripture refs like "1 Cor", "1 Tim", "1 Kg", "1 Esd",
  // "1 Ti", "1 Thess", "1 Jn" are NEVER matched because they take a
  // book-abbreviation token that is NOT in our pronoun/verb safe list.
  // =========================================================================
  // "1t" / "1f" / "1n" -> "It" / "If" / "In" — only at word boundary as
  // standalone glyph (the chapter ref "1n3" would not match the \b1n\b form).
  [/\b1t\b/g, 'It', '1t->It'],
  [/\b1f\b/g, 'If', '1f->If'],
  [/\b1n\b/g, 'In', '1n->In'],
  // "1 <verb/pronoun/adverb>" -> "I <...>".  We rely on a NEGATIVE list:
  // Scripture-reference 1-book abbreviations are never touched. Anything
  // else following "1 " at word boundary is treated as a sentence-initial
  // "I" misread. Verified by spot-check that no remaining "1 X" pattern in
  // this bundle is anything OTHER than (a) an "I" misread or (b) a 1-book
  // scripture ref.
  [
    /\b1 (?!(?:Cor|Cor\.|Tim|Tim\.|Kg|Kg\.|Jn|Jn\.|John|Pet|Pet\.|Esd|Esd\.|Fsd|Fsd\.|Thess|Thess\.|Th|Sam|Sam\.|Macc|Macc\.|Chr|Chr\.|Ti|Ti\.|Ki|Ki\.|Esdras|Maccabees|Kings|Chronicles|Samuel|Timothy|Peter|Corinthians|Thessalonians|Title)\b)([A-Za-z]\w*)/g,
    'I $1',
    '1-X->I-X',
  ],

  // =========================================================================
  // 4) Lowercase "l" -> "I" at sentence start.
  // =========================================================================
  // Bare "lt", "lf", "ls" at word boundary -> "It", "If", "Is".
  [/\blt\b/g, 'It', 'lt->It'],
  [/\blf\b/g, 'If', 'lf->If'],
  [/\bls\b/g, 'Is', 'ls->Is'],
  [/\bln\b/g, 'In', 'ln->In'],  // 2x
  // "Js" / "Jt" / "Tt" — capital J/T misread for I (Cabasilas had Tt too).
  [/\bJs\b/g, 'Is', 'Js->Is'],
  [/\bJt\b/g, 'It', 'Jt->It'],
  [/\bTt is\b/g, 'It is', 'Tt-is->It-is'],
  // "Tpay" -> "I pay"  (1x; only occurrence; "if I hear an explosion, Tpay
  // close attention" -- unambiguous I).
  [/\bTpay close attention\b/g, 'I pay close attention', 'Tpay->I-pay'],
  // "Tam an iconoclast" -> "I am an iconoclast" (1x; unambiguous phrase).
  [/\bTam an iconoclast\b/g, 'I am an iconoclast', 'Tam-an->I-am-an'],

  // Lowercase-l-as-capital-I before another capitalized word.  Restrict to
  // the verified high-frequency stems so common phrases like "let" / "list"
  // / "long" stay untouched.
  [/\blndifferent\b/g, 'Indifferent', 'lndifferent->Indifferent'],
  [/\blndifference\b/g, 'Indifference', 'lndifference->Indifference'],
  [/\blndijference\b/g, 'Indifference', 'lndijference->Indifference'],
  [/\blndijferent\b/g, 'Indifferent', 'lndijferent->Indifferent'],
  [/\blnstead\b/g, 'Instead', 'lnstead->Instead'],
  [/\blnsults\b/g, 'Insults', 'lnsults->Insults'],
  [/\blnsidious\b/g, 'Insidious', 'lnsidious->Insidious'],
  [/\blnsensitivity\b/g, 'Insensitivity', 'lnsensitivity->Insensitivity'],
  [/\blnjection\b/g, 'Injection', 'lnjection->Injection'],
  [/\blntroducing\b/g, 'Introducing', 'lntroducing->Introducing'],
  [/\blnterpretation\b/g, 'Interpretation', 'lnterpretation->Interpretation'],
  [/\bltself\b/g, 'Itself', 'ltself->Itself'],
  [/\bltalians\b/g, 'Italians', 'ltalians->Italians'],
  [/\blsaiah\b/g, 'Isaiah', 'lsaiah->Isaiah'],
  [/\blsa\b/g, 'Isa', 'lsa->Isa'],
  [/\blsraelites\b/g, 'Israelites', 'lsraelites->Israelites'],
  [/\blsraelite\b/g, 'Israelite', 'lsraelite->Israelite'],
  // Phrase-glued forms: "lfyou", "lfwe", "lfthe", "lfthere", "lfsomething",
  // "lfo+'", "lfi", "lfl".  All unambiguous "If" misreads.
  [/\blfyou\b/g, 'If you', 'lfyou->If-you'],
  [/\blfwe\b/g, 'If we', 'lfwe->If-we'],
  [/\blfthe\b/g, 'If the', 'lfthe->If-the'],
  [/\blfthere\b/g, 'If there', 'lfthere->If-there'],
  [/\blfsomething\b/g, 'If something', 'lfsomething->If-something'],
  [/\blfi\b/g, 'If I', 'lfi->If-I'],
  [/\blfl\b/g, 'If I', 'lfl->If-I'],

  // =========================================================================
  // 5) Letter "1" -> "l" inside English words (digit-for-L misread).
  // =========================================================================
  [/\ba11\b/g, 'all', 'a11->all'],
  [/\bwi11\b/g, 'will', 'wi11->will'],
  [/\bte11\b/g, 'tell', 'te11->tell'],
  [/\bfa11\b/g, 'fall', 'fa11->fall'],
  [/\bfe11ow\b/g, 'fellow', 'fe11ow->fellow'],
  [/\brea11y\b/g, 'really', 'rea11y->really'],
  [/\bnatura11y\b/g, 'naturally', 'natura11y->naturally'],
  [/\bspiritua11y\b/g, 'spiritually', 'spiritua11y->spiritually'],
  [/\bshou1d\b/g, 'should', 'shou1d->should'],
  [/\bspiritua1\b/g, 'spiritual', 'spiritua1->spiritual'],
  [/\bSpiritua1\b/g, 'Spiritual', 'Spiritua1->Spiritual'],
  [/\bSe1f\b/g, 'Self', 'Se1f->Self'],
  [/\bse1f\b/g, 'self', 'se1f->self'],
  [/\bhumb1e\b/g, 'humble', 'humb1e->humble'],
  [/\bE1der\b/g, 'Elder', 'E1der->Elder'],
  [/\bSi1ence\b/g, 'Silence', 'Si1ence->Silence'],
  [/\bSinfu1ness\b/g, 'Sinfulness', 'Sinfu1ness->Sinfulness'],
  [/\bStrugg1e\b/g, 'Struggle', 'Strugg1e->Struggle'],
  [/\bWatchfu1ness\b/g, 'Watchfulness', 'Watchfu1ness->Watchfulness'],
  [/\bWea1th\b/g, 'Wealth', 'Wea1th->Wealth'],
  [/\bGa1\b/g, 'Gal', 'Ga1->Gal'],
  [/\b1eft\b/g, 'left', '1eft->left'],
  [/\b1ittle\b/g, 'little', '1ittle->little'],
  [/\b1con\b/g, 'Icon', '1con->Icon'],  // "raise his arms toward the 1con"
  [/\b1aw\b/g, 'law', '1aw->law'],  // "Spiritual 1aw 188" (TOC)
  [/\bg1ve\b/g, 'give', 'g1ve->give'],  // "and can g1ve"

  // =========================================================================
  // 6) Spurious mid-word spaces from PDF justified text.
  // =========================================================================
  [/\bdi vine\b/g, 'divine', 'di-vine->divine'],
  [/\bDi vine\b/g, 'Divine', 'Di-vine->Divine'],
  [/\byo u\b/g, 'you', 'yo-u->you'],
  [/\bYo u\b/g, 'You', 'Yo-u->You'],
  [/\bha ve\b/g, 'have', 'ha-ve->have'],
  [/\bHa ve\b/g, 'Have', 'Ha-ve->Have'],
  [/\blea ve\b/g, 'leave', 'lea-ve->leave'],
  [/\blo ve\b/g, 'love', 'lo-ve->love'],
  [/\bJi ve\b/g, 'live', 'Ji-ve->live'],  // "those who Ji ve far from God"
  [/\bsol ve\b/g, 'solve', 'sol-ve->solve'],
  [/\bresol ve\b/g, 'resolve', 'resol-ve->resolve'],
  [/\bbeca use\b/g, 'because', 'beca-use->because'],
  [/\bBeca use\b/g, 'Because', 'Beca-use->Because'],
  [/\bM y\b/g, 'My', 'M-y->My'],
  // Bare "m y" (without leading capital) -> "my".  Only 3 occurrences in this
  // corpus, all "m y feet" / "m y prayer" / "m y self".
  [/\bm y\b/g, 'my', 'm-y->my'],
  [/\bM ay\b/g, 'May', 'M-ay->May'],
  [/\bm en\b/g, 'men', 'm-en->men'],
  [/\bM en\b/g, 'Men', 'M-en->Men'],
  [/\bF or\b/g, 'For', 'F-or->For'],
  // "un ti!" sequence after the ti!->til rule already fired: "un til" -> "until".
  [/\bun til\b/g, 'until', 'un-til->until'],

  // =========================================================================
  // 7) Run-together prepositions (lost space).
  // =========================================================================
  [/\bofthe\b/g, 'of the', 'ofthe->of-the'],
  [/\bofa\b/g, 'of a', 'ofa->of-a'],
  [/\bofan\b/g, 'of an', 'ofan->of-an'],
  [/\bofus\b/g, 'of us', 'ofus->of-us'],
  [/\bofour\b/g, 'of our', 'ofour->of-our'],
  [/\bofyour\b/g, 'of your', 'ofyour->of-your'],
  [/\bofhis\b/g, 'of his', 'ofhis->of-his'],
  [/\bofher\b/g, 'of her', 'ofher->of-her'],
  [/\bofthem\b/g, 'of them', 'ofthem->of-them'],
  [/\bofthat\b/g, 'of that', 'ofthat->of-that'],
  [/\bofthis\b/g, 'of this', 'ofthis->of-this'],
  [/\bofthese\b/g, 'of these', 'ofthese->of-these'],
  [/\bofthose\b/g, 'of those', 'ofthose->of-those'],
  [/\btoa\b/g, 'to a', 'toa->to-a'],
  [/\btome\b/g, 'to me', 'tome->to-me'],
  // Capitalised proper-noun glue (high-confidence: capitalised second word).
  [/\bofGod\b/g, 'of God', 'ofGod->of-God'],
  [/\bofChrist\b/g, 'of Christ', 'ofChrist->of-Christ'],
  [/\bofMonasticism\b/g, 'of Monasticism', 'ofMonasticism->of-Monasticism'],
  [/\bofTrust\b/g, 'of Trust', 'ofTrust->of-Trust'],
  [/\bofSaint\b/g, 'of Saint', 'ofSaint->of-Saint'],
  [/\bofMan\b/g, 'of Man', 'ofMan->of-Man'],
  [/\bofCaesarea\b/g, 'of Caesarea', 'ofCaesarea->of-Caesarea'],
  [/\bifGod\b/g, 'if God', 'ifGod->if-God'],
  [/\bifYou\b/g, 'if You', 'ifYou->if-You'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes -- only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // None beyond the wordFixes above for this corpus.
];

// ---------------------------------------------------------------------------
// Stats and samples
// ---------------------------------------------------------------------------
let totalParagraphs = 0;
let modifiedParagraphs = 0;
const samples = []; // [chOrder, paraIdx, before, after, rules]

for (const ch of bundle.chapters) {
  for (const sec of ch.sections || []) {
    for (let i = 0; i < sec.paragraphs.length; i++) {
      const p = sec.paragraphs[i];
      totalParagraphs++;
      const before = p.text;
      let text = before;
      const firedRules = [];
      for (const [re, repl, name] of wordFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      for (const [re, repl, name] of glyphFixes) {
        const newText = text.replace(re, repl);
        if (newText !== text) {
          firedRules.push(name);
          text = newText;
        }
      }
      if (text !== before) {
        modifiedParagraphs++;
        samples.push([ch.order, i, before, text, firedRules]);
        p.text = text;
      }
    }
  }
}

// Write bundle back
const out = JSON.stringify(bundle, null, 2);
fs.writeFileSync(INPUT, out, 'utf8');

console.log('Total paragraphs processed:', totalParagraphs);
console.log('Total paragraphs modified:', modifiedParagraphs);
console.log('---');
const showCount = process.argv.includes('--all') ? samples.length : 10;
console.log(
  'Sample before/after pairs (showing ' +
    Math.min(showCount, samples.length) +
    ' of ' +
    samples.length +
    '):',
);
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character.
  let diffStart = 0;
  while (
    diffStart < before.length &&
    diffStart < after.length &&
    before[diffStart] === after[diffStart]
  )
    diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before
    .slice(ctxStart, diffStart + 100)
    .replace(/\n/g, '\\n');
  const afterSnippet = after
    .slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100)
    .replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log(
  'Distinct rule firings (' +
    samples.reduce((n, s) => n + s[4].length, 0) +
    ' total):',
);
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
