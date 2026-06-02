#!/usr/bin/env node
/**
 * One-off OCR cleanup for Fr. Alexander Schmemann, "For the Life of the World"
 * (SVS Press, modern English), scanned PDF → OCR text.
 *
 * Reads content/generated/commentary/schmemann-for-the-life-of-the-world.json,
 * applies targeted OCR corrections to paragraph[].text, and writes back.
 *
 * Each rule is conservative — applies only where the pattern is unambiguous.
 * Theological vocabulary, Greek/Latin terms (kairos, leitourgia, mysterion,
 * epiphany, eucharist, parousia, eschaton, charis, metabole, epiclesis, etc.),
 * Scripture references, archaic English (thou/thee/thy), and digits are
 * preserved.
 * Reports a summary + sample diffs to stdout.
 *
 * Idempotent: rules use word boundaries and exact matches so re-running is a
 * no-op once errors are fixed.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../../content/generated/commentary/schmemann-for-the-life-of-the-world.json');

const bundle = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// ---------------------------------------------------------------------------
// Word-level OCR corrections. Each entry is a verified misread observed in the
// scan. Format: [/regex/, 'replacement', 'rule-name'].
// All patterns are word-bounded or phrase-bounded so legitimate English never
// matches.
// ---------------------------------------------------------------------------
const wordFixes = [
  // -------------------------------------------------------------------------
  // (A) Justified-line split words (suffix broken off across line/column edge).
  // Schmemann's SVS Press edition was justified; the OCR introduced spaces
  // where the line broke a long word. Each pattern below was verified to have
  // only one merged English reading and no risk of matching a different
  // legitimate two-word phrase.
  // -------------------------------------------------------------------------

  // Common Schmemann vocabulary
  [/\bsacra ment\b/g, 'sacrament', 'sacra-ment->sacrament'],
  [/\bsacra ments\b/g, 'sacraments', 'sacra-ments->sacraments'],
  [/\bsacra mental\b/g, 'sacramental', 'sacra-mental->sacramental'],
  [/\bsacra mentality\b/g, 'sacramentality', 'sacra-mentality->sacramentality'],
  [/\bSacra ment\b/g, 'Sacrament', 'Sacra-ment->Sacrament'],
  [/\bDe Sacra mentis\b/g, 'De Sacramentis', 'De-Sacra-mentis->De-Sacramentis'],
  [/\breli gion\b/g, 'religion', 'reli-gion->religion'],
  [/\breli giously\b/g, 'religiously', 'reli-giously->religiously'],
  [/\bReli gion\b/g, 'Religion', 'Reli-gion->Religion'],
  [/\bChris tian\b/g, 'Christian', 'Chris-tian->Christian'],
  [/\bChris tianity\b/g, 'Christianity', 'Chris-tianity->Christianity'],
  [/\btradi tions\b/g, 'traditions', 'tradi-tions->traditions'],
  [/\btra ditional\b/g, 'traditional', 'tra-ditional->traditional'],
  [/\bdoc trine\b/g, 'doctrine', 'doc-trine->doctrine'],
  [/\bexisten tial\b/g, 'existential', 'existen-tial->existential'],
  [/\bsym bolic\b/g, 'symbolic', 'sym-bolic->symbolic'],
  [/\bsymbol ical\b/g, 'symbolical', 'symbol-ical->symbolical'],

  // -tion family
  [/\baffirma tion\b/g, 'affirmation', 'affirma-tion->affirmation'],
  [/\baffirma tions\b/g, 'affirmations', 'affirma-tions->affirmations'],
  [/\bannihila tion\b/g, 'annihilation', 'annihila-tion->annihilation'],
  [/\baspira tions\b/g, 'aspirations', 'aspira-tions->aspirations'],
  [/\bcelebra tion\b/g, 'celebration', 'celebra-tion->celebration'],
  [/\bcelebra tions\b/g, 'celebrations', 'celebra-tions->celebrations'],
  [/\bcommemora tion\b/g, 'commemoration', 'commemora-tion->commemoration'],
  [/\bcom memorations\b/g, 'commemorations', 'com-memorations->commemorations'],
  [/\bconfirma tion\b/g, 'confirmation', 'confirma-tion->confirmation'],
  [/\bcrea tion\b/g, 'creation', 'crea-tion->creation'],
  [/\bdesacramentaliza tion\b/g, 'desacramentalization', 'desacramentaliza-tion->desacramentalization'],
  [/\bexplana tions\b/g, 'explanations', 'explana-tions->explanations'],
  [/\bfounda tion\b/g, 'foundation', 'founda-tion->foundation'],
  [/\bfunc tions\b/g, 'functions', 'func-tions->functions'],
  [/\bglorifica tion\b/g, 'glorification', 'glorifica-tion->glorification'],
  [/\bidoliza tion\b/g, 'idolization', 'idoliza-tion->idolization'],
  [/\bimplica tions\b/g, 'implications', 'implica-tions->implications'],
  [/\binstitu tion\b/g, 'institution', 'institu-tion->institution'],
  [/\blibera tion\b/g, 'liberation', 'libera-tion->liberation'],
  [/\bmanifesta tion\b/g, 'manifestation', 'manifesta-tion->manifestation'],
  [/\bmutila tion\b/g, 'mutilation', 'mutila-tion->mutilation'],
  [/\bperfec tion\b/g, 'perfection', 'perfec-tion->perfection'],
  [/\bques tions\b/g, 'questions', 'ques-tions->questions'],
  [/\bredemp tion\b/g, 'redemption', 'redemp-tion->redemption'],
  [/\brelaxa tion\b/g, 'relaxation', 'relaxa-tion->relaxation'],
  [/\brestora tion\b/g, 'restoration', 'restora-tion->restoration'],
  [/\bresurrec tion\b/g, 'resurrection', 'resurrec-tion->resurrection'],
  [/\bsalva tion\b/g, 'salvation', 'salva-tion->salvation'],
  [/\bsanctifica tion\b/g, 'sanctification', 'sanctifica-tion->sanctification'],
  [/\bsatisfac tion\b/g, 'satisfaction', 'satisfac-tion->satisfaction'],
  [/\bsepara tion\b/g, 'separation', 'separa-tion->separation'],
  [/\bsitua tion\b/g, 'situation', 'situa-tion->situation'],
  [/\btransforma tion\b/g, 'transformation', 'transforma-tion->transformation'],
  [/\btrans formation\b/g, 'transformation', 'trans-formation->transformation'],
  [/\bvoca tion\b/g, 'vocation', 'voca-tion->vocation'],

  // -sion family
  [/\bascen sion\b/g, 'ascension', 'ascen-sion->ascension'],
  [/\bdimen sion\b/g, 'dimension', 'dimen-sion->dimension'],
  [/\bdimen sions\b/g, 'dimensions', 'dimen-sions->dimensions'],
  [/\bdiscus sion\b/g, 'discussion', 'discus-sion->discussion'],
  [/\bdiscus sions\b/g, 'discussions', 'discus-sions->discussions'],
  [/\bimpres sion\b/g, 'impression', 'impres-sion->impression'],
  [/\bproces sion\b/g, 'procession', 'proces-sion->procession'],
  [/\btransgres sion\b/g, 'transgression', 'transgres-sion->transgression'],

  // -ing, -ment, -ness, -less, -wise, -ence
  [/\bbe ing\b/g, 'being', 'be-ing->being'],
  [/\bbe ginning\b/g, 'beginning', 'be-ginning->beginning'],
  [/\benjoy ing\b/g, 'enjoying', 'enjoy-ing->enjoying'],
  [/\bfill ing\b/g, 'filling', 'fill-ing->filling'],
  [/\bforthcom ing\b/g, 'forthcoming', 'forthcom-ing->forthcoming'],
  [/\bmisunderstand ing\b/g, 'misunderstanding', 'misunderstand-ing->misunderstanding'],
  [/\bnoth ing\b/g, 'nothing', 'noth-ing->nothing'],
  [/\bovercom ing\b/g, 'overcoming', 'overcom-ing->overcoming'],
  [/\bsuffer ing\b/g, 'suffering', 'suffer-ing->suffering'],
  [/\bteach ing\b/g, 'teaching', 'teach-ing->teaching'],
  [/\bmani fested\b/g, 'manifested', 'mani-fested->manifested'],
  [/\bmo ment\b/g, 'moment', 'mo-ment->moment'],
  [/\bmove ment\b/g, 'movement', 'move-ment->movement'],
  [/\bfulfill ment\b/g, 'fulfillment', 'fulfill-ment->fulfillment'],
  [/\bcleanli ness\b/g, 'cleanliness', 'cleanli-ness->cleanliness'],
  [/\bfaithful ness\b/g, 'faithfulness', 'faithful-ness->faithfulness'],
  [/\bfoolish ness\b/g, 'foolishness', 'foolish-ness->foolishness'],
  [/\bother ness\b/g, 'otherness', 'other-ness->otherness'],
  [/\bwit ness\b/g, 'witness', 'wit-ness->witness'],
  [/\bmeaning less\b/g, 'meaningless', 'meaning-less->meaningless'],
  [/\bother wise\b/g, 'otherwise', 'other-wise->otherwise'],
  [/\bexperi ence\b/g, 'experience', 'experi-ence->experience'],
  [/\bobedi ence\b/g, 'obedience', 'obedi-ence->obedience'],
  [/\bpres ence\b/g, 'presence', 'pres-ence->presence'],

  // -ical / -ically / -ally
  [/\beschatolog ical\b/g, 'eschatological', 'eschatolog-ical->eschatological'],
  [/\beschato logical\b/g, 'eschatological', 'eschato-logical->eschatological'],
  [/\bsocio logical\b/g, 'sociological', 'socio-logical->sociological'],
  [/\btheolog ically\b/g, 'theologically', 'theolog-ically->theologically'],
  [/\bseri ously\b/g, 'seriously', 'seri-ously->seriously'],
  [/\binciden tally\b/g, 'incidentally', 'inciden-tally->incidentally'],

  // Misc
  [/\bcom munion\b/g, 'communion', 'com-munion->communion'],
  [/\bcom pletely\b/g, 'completely', 'com-pletely->completely'],
  [/\bcul tural\b/g, 'cultural', 'cul-tural->cultural'],
  [/\bperson ality\b/g, 'personality', 'person-ality->personality'],
  [/\brepresenta tives\b/g, 'representatives', 'representa-tives->representatives'],
  [/\bself-suffi ciency\b/g, 'self-sufficiency', 'self-suffi-ciency->self-sufficiency'],
  [/\bcon stantly\b/g, 'constantly', 'con-stantly->constantly'],
  [/\bbap tism\b/g, 'baptism', 'bap-tism->baptism'],
  [/\bac quired\b/g, 'acquired', 'ac-quired->acquired'],
  [/\bac cepted\b/g, 'accepted', 'ac-cepted->accepted'],
  [/\bcon version\b/g, 'conversion', 'con-version->conversion'],
  [/\bex pression\b/g, 'expression', 'ex-pression->expression'],
  [/\bex perience\b/g, 'experience', 'ex-perience->experience'],
  [/\bex plain\b/g, 'explain', 'ex-plain->explain'],
  [/\bex pressed\b/g, 'expressed', 'ex-pressed->expressed'],
  [/\bspir itual\b/g, 'spiritual', 'spir-itual->spiritual'],
  [/\bpre cisely\b/g, 'precisely', 'pre-cisely->precisely'],
  [/\batti tudes\b/g, 'attitudes', 'atti-tudes->attitudes'],
  [/\bthem selves\b/g, 'themselves', 'them-selves->themselves'],
  [/\bworl d\b/g, 'world', 'worl-d->world'],

  // -------------------------------------------------------------------------
  // (B) Letter-swap OCR errors — single-word misreads, each verified unique.
  // -------------------------------------------------------------------------
  // "wodd" → "world" (l↔d) — three occurrences, all in the running phrase
  // "in this wodd" / "into the whole wodd" / "for the wodd". The character d
  // got OCR'd for l consistently in this scan run.
  [/\bwodd\b/g, 'world', 'wodd->world'],
  // "Wodd" → "World" — same OCR, capitalized at line start of an Appendix page.
  [/\bWodd\b/g, 'World', 'Wodd->World'],
  // "Wor/d" → "World" — three occurrences in the running header "For the Life
  // of the Wor/d"; the l in "World" was OCR'd as forward slash.
  [/\bWor\/d\b/g, 'World', 'Wor-slash-d->World'],
  // "marveious" → "marvelous"  (#178 — "Great art Thou, 0 Lord, and marveious
  // are Thy works"; the l was OCR'd as i, only occurrence)
  [/\bmarveious\b/g, 'marvelous', 'marveious->marvelous'],
  // "witb" → "with"  (only occurrence — "'filled' witb Christ"; b↔h swap)
  [/\bwitb\b/g, 'with', 'witb->with'],
  // "peath" → "death"  (only occurrence — "Baptism is thus the peath of our
  // selfishness"; p↔d swap, the sentence is paraphrasing Rom 6.)
  [/\bpeath\b/g, 'death', 'peath->death'],
  // "frtllness" → "fullness"  (only occurrence — "to have the frtllness of
  // life"; u↔rt OCR garble.)
  [/\bfrtllness\b/g, 'fullness', 'frtllness->fullness'],
  // "begin mng" → "beginning"  (only occurrence — "time of the begin mng";
  // "mng" is OCR for "ning" (n↔m, in↔n, ing→ng) with the line-break split.)
  [/\bbegin mng\b/g, 'beginning', 'begin-mng->beginning'],
  // "comrnunion" → "communion"  (only occurrence — "again a liturgy1 a
  // comrnunion1 an ascensio12"; the m of "communion" OCR'd as "rn".)
  // The trailing "1" is a footnote marker stuck to the word.
  [/\bcomrnunion1\b/g, 'communion', 'comrnunion1->communion'],
  // "ascensio12" → "ascension"  (only occurrence, same sentence as comrnunion1
  // — "an ascensio12. To accept secularism"; the n of "ascension" OCR'd as "12".)
  [/\bascensio12\b/g, 'ascension', 'ascensio12->ascension'],
  // "liturgy1" → "liturgy"  (only occurrence — "in its totality has become
  // again a liturgy1 a comrnunion1"; trailing "1" is a stray footnote glyph.
  // Restricted to the exact phrase to avoid any risk.)
  [/\bliturgy1 a comrnunion1\b/g, 'liturgy, a communion', 'liturgy1-comrnunion1->liturgy-communion'],
  // "at1d" → "and"  (only occurrence — "and in it all sins become natural";
  // the n of "and" OCR'd as "1".)
  [/\bat1d\b/g, 'and', 'at1d->and'],
  // "g1" → "going"  (only occurrence — "Death remains the same mysterious
  // passage into a mysterious future. The g1" — this token sits at a paragraph
  // truncation point so the OCR captured only the first letter "g" + a stray
  // "1" + a quote. Restrict to that exact context.)
  // Skipped: context too uncertain to invent a target word.
  // "elsewhe1" → "elsewhere"  (only occurrence — "presence of that elsewhe1";
  // the "re" of "elsewhere" OCR'd as "1".)
  [/\belsewhe1\b/g, 'elsewhere', 'elsewhe1->elsewhere'],
  // "developmene4" → "developments."  (only occurrence — "subsequent
  // theological developmene4 7 There remained"; the final "ts." of
  // "developments." OCR'd as "e4" with a footnote-marker "7" injected after.
  // Restrict to exact phrase.)
  [/\bsubsequent theological developmene4 7\b/g, 'subsequent theological developments. 7', 'developmene4->developments'],
  // "SBtniJol1" → "Symbol"  (only occurrence — appendix header
  // "Sacrament and SBtniJol1 The initial difficulty"; the original section
  // heading is "Sacrament and Symbol". Restrict to exact context.)
  [/\bSacrament and SBtniJol1\b/g, 'Sacrament and Symbol', 'SBtniJol1->Symbol'],
  // "sacra8See" → "sacra. 8See"  (only occurrence — footnote-letter "8" got
  // glued onto the end of a paragraph stub ending in "sacra"; the next token
  // "See R. Bornert" is a bibliographic footnote. Restrict to exact context.)
  [/\bsacra8See R\. Bornert\b/g, 'sacra. 8See R. Bornert', 'sacra8See->sacra-8See'],

  // -------------------------------------------------------------------------
  // (C) Apostrophe-for-r OCR run. In one paragraph (Ch.3 p19) the OCR
  // converted several "r"s to single quotes, producing tokens that are
  // unambiguous when read in sequence: "the only t'eally tt'ansfot'ming
  // powet' in this wodd" → "the only really transforming power in this world".
  // Each token is restricted to its exact context to avoid any collateral
  // damage (no legitimate English word contains these letter sequences).
  // -------------------------------------------------------------------------
  [/\bt'eally\b/g, 'really', 't-quote-eally->really'],
  [/\btt'ansfot'ming\b/g, 'transforming', 'tt-quote-ansfot-quote-ming->transforming'],
  [/\bpowet'\b/g, 'power', 'powet-quote->power'],
  // "jot'" → "for"  (only occurrence — "But joy was given to the Church jot'
  // the wodd"; j is OCR for f, t' is OCR for r — matches the same run.)
  [/\bjot' the\b/g, 'for the', 'jot-quote-the->for-the'],
  // "seculari'st" → "secularist"  (only occurrence — "The seculari'st is very
  // fond today of terms…"; same r→' OCR run.)
  [/\bseculari'st\b/g, 'secularist', 'seculari-quote-st->secularist'],

  // -------------------------------------------------------------------------
  // (D) Replacement-character (U+FFFD) restorations. Each was checked in
  // full sentence context; the missing letter is unambiguous in each case.
  // -------------------------------------------------------------------------
  [/\bbu� first\b/g, 'but first', 'bu-FFFD->but'],
  [/\bbut �hat he made\b/g, 'but that he made', 'FFFD-hat->that'],
  [/\ball �atisfaction\b/g, 'all satisfaction', 'FFFD-atisfaction->satisfaction'],
  [/\bworld a t�e of the end\b/g, 'world a time of the end', 't-FFFD-e->time'],
  [/\bbeing a �aint\b/g, 'being a saint', 'FFFD-aint->saint'],
  [/\bof an �vent\b/g, 'of an event', 'FFFD-vent->event'],
  [/\bLife of the �orld\b/g, 'Life of the world', 'FFFD-orld->world'],
  [/\bChrist's presenc�, the growth\b/g, "Christ's presence, the growth", 'presenc-FFFD->presence'],
  [/\bdominion over him�"/g, 'dominion over him."', 'him-FFFD-quote->him-period-quote'],
  [/\bascension to heav�\./g, 'ascension to heaven.', 'heav-FFFD->heaven'],
  [/\bNeedles� to say\b/g, 'Needless to say', 'Needles-FFFD->Needless'],
  [/\bof lif� was gathered\b/g, 'of life was gathered', 'lif-FFFD->life'],
  [/\bsees him �s an utterly\b/g, 'sees him as an utterly', 'FFFD-s-an-utterly->as-an-utterly'],
  [/\blives, howev�r,/g, 'lives, however,', 'howev-FFFD-r->however'],
  [/"normalcy" i� abnormal/g, '"normalcy" is abnormal', 'i-FFFD->is'],
  [/\bof all faith� must\b/g, 'of all faiths must', 'faith-FFFD->faiths'],
  [/\bquestions �here exist\b/g, 'questions there exist', 'FFFD-here-exist->there-exist'],
  [/\bin r�membrance\b/g, 'in remembrance', 'r-FFFD-membrance->remembrance'],
  [/\bcausalite instr��mentale\b/g, 'causalite instrumentale', 'instr-FFFD-FFFD-mentale->instrumentale'],
  [/\bpsychology of t�eir own\b/g, 'psychology of their own', 't-FFFD-eir->their'],

  // -------------------------------------------------------------------------
  // (E) Word-internal middot (U+00B7) and corrupted glyph clusters.
  // The OCR inserted middots where the printed glyph was an ambiguous mark
  // (faint serif, broken bowl, etc.). Each restoration is unambiguous.
  // -------------------------------------------------------------------------
  // "tt·ansformation" → "transformation"  (only occurrence — "the
  // tt·ansformation ( metab ole ) of the eucharistic elements"; same family
  // of r-loss as the apostrophe run.)
  [/\btt·ansformation\b/g, 'transformation', 'tt-middot-ansformation->transformation'],
  // "natu·ral" → "natural"  (only occurrence — "sacrifice is the most
  // natu·ral act of man"; stray middot inside the word.)
  [/\bnatu·ral\b/g, 'natural', 'natu-middot-ral->natural'],
  // "and�·'w'isdom" → "and wisdom"  (only occurrence — joins the r→'-OCR run
  // with the FFFD damage; verified by full context "all faculties of our
  // human intelligence and wisdom".)
  [/\band�·'w'isdom\b/g, 'and wisdom', 'and-FFFD-middot-quote-w-quote-isdom->and-wisdom'],
  // "-an,Q, ··t{)" → "—and, to"  (only occurrence, immediately before the
  // and-wisdom fix above — "on thousands of factors -an,Q, ··t{) be sure";
  // verified original phrase is "—and, to be sure". Restrict to the exact
  // garbled run.)
  [/-an,Q, ··t\{\) be sure/g, '—and, to be sure', 'an-Q-tparen->and-to-be-sure'],

  // -------------------------------------------------------------------------
  // (F) Vocative "O" misread as digit "0". Schmemann's edition prints the
  // Greek/liturgical vocative "O" (as in "O Lord", "O Christ"). The OCR
  // rendered it as digit "0" in 7 places. Each rule is phrase-restricted to
  // a vocative usage to avoid any risk of changing a real numeric "0".
  // -------------------------------------------------------------------------
  [/\b0 Christ, the Passover\b/g, 'O Christ, the Passover', '0-Christ->O-Christ'],
  [/\b0 Wisdom, Word and Power\b/g, 'O Wisdom, Word and Power', '0-Wisdom->O-Wisdom'],
  [/Praise the Lord, 0 my soul\b/g, 'Praise the Lord, O my soul', '0-my-soul->O-my-soul'],
  [/Blessed art Thou 0 Lord\b/g, 'Blessed art Thou O Lord', '0-Lord-1->O-Lord-1'],
  [/0 · Lord, how manifold/g, 'O Lord, how manifold', '0-middot-Lord->O-Lord'],
  [/cried unto Thee, 0 Lord\b/g, 'cried unto Thee, O Lord', '0-Lord-2->O-Lord-2'],
  [/In Thy Name, 0 Lord God of Truth\b/g, 'In Thy Name, O Lord God of Truth', '0-Lord-Truth->O-Lord-Truth'],
  [/Great art Thou, 0 Lord\b/g, 'Great art Thou, O Lord', '0-Lord-3->O-Lord-3'],
  [/called upon Thy Name, 0 Lord\b/g, 'called upon Thy Name, O Lord', '0-Lord-4->O-Lord-4'],
  [/"0 Lord our God," says the priest\b/g, '"O Lord our God," says the priest', '0-Lord-5->O-Lord-5'],
  [/"0 Lord and God, crown them\b/g, '"O Lord and God, crown them', '0-Lord-6->O-Lord-6'],

  // -------------------------------------------------------------------------
  // (G) Stray "il." at start of running-header line (capital "A" misread).
  // Only occurrence is the heading "il.nd Ye il.re Witnesses of These Things"
  // → "And Ye Are Witnesses of These Things" (a section heading taken from
  // John 21:24/Luke 24:48). Restrict to the exact phrase.
  // -------------------------------------------------------------------------
  [/\bil\.nd Ye il\.re Witnesses\b/g, 'And Ye Are Witnesses', 'il.nd-il.re->And-Are'],
];

// ---------------------------------------------------------------------------
// Glyph/punctuation level fixes — only for unambiguous cases.
// ---------------------------------------------------------------------------
const glyphFixes = [
  // No additional glyph fixes beyond the wordFixes above for this corpus.
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
console.log('Sample before/after pairs (showing ' + Math.min(showCount, samples.length) + ' of ' + samples.length + '):');
for (const [chOrder, idx, before, after, rules] of samples.slice(0, showCount)) {
  // Show a window around the first differing character
  let diffStart = 0;
  while (diffStart < before.length && diffStart < after.length && before[diffStart] === after[diffStart]) diffStart++;
  const ctxStart = Math.max(0, diffStart - 40);
  const beforeSnippet = before.slice(ctxStart, diffStart + 100).replace(/\n/g, '\\n');
  const afterSnippet = after.slice(ctxStart, ctxStart + (diffStart - ctxStart) + 100).replace(/\n/g, '\\n');
  console.log(`Ch${chOrder} para${idx}: [${rules.join(', ')}]`);
  console.log('  BEFORE: ...' + beforeSnippet);
  console.log('  AFTER:  ...' + afterSnippet);
}

console.log('---');
console.log('Distinct rule firings (' + samples.reduce((n, s) => n + s[4].length, 0) + ' total):');
const ruleCounts = new Map();
for (const [, , , , rules] of samples) {
  for (const r of rules) ruleCounts.set(r, (ruleCounts.get(r) || 0) + 1);
}
for (const [r, c] of [...ruleCounts.entries()].sort()) {
  console.log('  ' + r + ': ' + c);
}
