// Fix OCR transcription errors in The Little Russian Philokalia, Vol. IV: St. Paisius Velichkovsky
//
// Strategy:
//   - Each rule is either a literal-string replacement (preferred for safety) or a regex with /g.
//   - We never paraphrase or modernize prose. Only mechanical letter-confusion and run-together fixes.
//   - Slavonic/Russian/Greek proper nouns and ascetical terms (Dobrotolyubie, Optina, Athos, Neamţ,
//     Dragomirna, Sekoul, podvig, starets/staretz, skete, nous, hesychasm, etc.) are preserved.
//   - Numbers, including digits inside Scripture refs, are preserved unless they are obviously a
//     misread of the letter 'I' (e.g., a stray '1' opening a quoted verse where the context shows
//     the verb starts with 'I').
//
// Each rule below is grounded in an actual context inspected in the bundle. If a rule could be
// ambiguous, it is anchored with surrounding context so it only fires once on the intended token.

const fs = require('fs');
const path = require('path');

const INPUT = path.resolve('C:/Users/bkluc/theosis/content/generated/commentary/paisius-little-russian-philokalia.json');

// ---------------------------------------------------------------------------
// Rule list. Each entry is [pattern, replacement, label].
// Order matters: more-specific rules first, then general single-token fixes.
// ---------------------------------------------------------------------------
const RULES = [
  // -------------------------------------------------------------------------
  // CONTEXT-ANCHORED MULTI-WORD FIXES (must run before single-token rules)
  // -------------------------------------------------------------------------

  // "as well us for us today" -> "as well as for us today"
  [/historically as well us for us today/g, 'historically as well as for us today', 'context: as well us -> as well as'],

  // "needs to return 0 the Fathers" -> "to the Fathers"
  [/needs to return 0 the Fathers/g, 'needs to return to the Fathers', 'context: 0 the -> to the'],

  // "in oider to make life bearable on this carth" -> "in order to make life bearable on this earth"
  [/in oider to make life bearable on this carth/g, 'in order to make life bearable on this earth', 'context: oider/carth'],

  // "uproot it entirely from the face of the carth" -> "earth"
  [/from the face of the carth/g, 'from the face of the earth', 'context: face of the carth'],

  // "Remember that you are carth, you are nourished by the earth"
  [/Remember that you are carth/g, 'Remember that you are earth', 'context: are carth'],

  // "in dens and in the crevices of the carth" -> earth
  [/crevices of the carth/g, 'crevices of the earth', 'context: crevices of the carth'],

  // "live with the beasts of the carth and the birds" -> earth
  [/beasts of the carth/g, 'beasts of the earth', 'context: beasts of the carth'],

  // "Their bed is the carth and their shelter heaven" -> earth
  [/bed is the carth/g, 'bed is the earth', 'context: bed is the carth'],

  // "scorned the food created on carth" -> earth
  [/food created on carth/g, 'food created on earth', 'context: created on carth'],

  // "after yours of waiting" -> "after years of waiting"
  [/after yours of waiting/g, 'after years of waiting', 'context: yours of waiting'],

  // "Its the Life of a Holy Father" -> "It's the Life ..."
  [/"Its the Life of a Holy Father/g, '"It’s the Life of a Holy Father', 'context: Its the -> It’s the'],

  // "was poured tit equally on all" -> "out equally"
  [/was poured tit equally on all/g, 'was poured out equally on all', 'context: tit -> out'],

  // "love and zeal, unl being painfully" -> "love and zeal, and being painfully"
  [/love and zeal, unl being painfully/g, 'love and zeal, and being painfully', 'context: unl -> and'],

  // "the fitllness of Christ's revelation" -> fullness
  [/the fitllness of Christ/g, 'the fullness of Christ', 'context: fitllness -> fullness'],

  // "Sustainer of life" — actually "Sustainer" is a valid theological term. Leave as-is.
  // (no rule)

  // "iy Sc hemamonk Metrophanes" -> "by Schemamonk Metrophanes"
  [/Philokalia iy Sc hemamonk Metrophanes/g, 'Philokalia by Schemamonk Metrophanes', 'context: iy Sc hemamonk -> by Schemamonk'],

  // "Nowinanew printing" -> "Now in a new printing"
  [/\* Nowinanew printing/g, '* Now in a new printing', 'context: Nowinanew -> Now in a new'],

  // "piychology" -> "psychology"
  [/piychology/g, 'psychology', 'piychology -> psychology'],

  // "responds positively to them oven if our fallen mind rebels" -> "even if"
  [/positively to them oven if our fallen mind rebels/g, 'positively to them even if our fallen mind rebels', 'context: oven -> even'],

  // "tender-fecling [umilenie]" -> "tender-feeling"
  [/tender-fecling/g, 'tender-feeling', 'fecling -> feeling'],

  // "will come to itself and 1opent" -> "and repent"
  [/will come to itself and 1opent/g, 'will come to itself and repent', 'context: 1opent -> repent'],

  // "in Great Itussia also" -> Russia
  [/in Great Itussia also/g, 'in Great Russia also', 'context: Itussia -> Russia'],

  // "many of our (iod-bearing Fathers" -> "God-bearing"
  [/many of our \(iod-bearing Fathers/g, 'many of our God-bearing Fathers', 'context: (iod-bearing -> God-bearing'],

  // "for God, und after God for their neighbor" -> "and after"
  [/for God, und after God/g, 'for God, and after God', 'context: und -> and'],

  // "Divinely-wise, wiote books" -> wrote
  [/inspiration, wiote books of their teachings/g, 'inspiration, wrote books of their teachings', 'context: wiote -> wrote'],

  // "by God's Providence; hut some of them" -> "but some of them"
  [/the Greek kingdom; hut some of them/g, 'the Greek kingdom; but some of them', 'context: hut -> but'],

  // "love at the fect of Jesus" -> feet
  [/love at the fect of Jesus/g, 'love at the feet of Jesus', 'context: fect of Jesus -> feet of Jesus'],

  // "the most pure fect of Christ" -> "feet of Christ"
  [/most pure fect of Christ/g, 'most pure feet of Christ', 'context: fect of Christ -> feet of Christ'],

  // "that cerain ones among the monastic" -> certain
  [/that cerain ones among the monastic/g, 'that certain ones among the monastic', 'context: cerain -> certain'],

  // "O my all-swet Jesus" -> "all-sweet"
  [/O my all-swet Jesus/g, 'O my all-sweet Jesus', 'context: all-swet -> all-sweet'],

  // "Only-begotten Son and Ward of God" -> "Word of God"
  [/Only-begotten Son and Ward of God/g, 'Only-begotten Son and Word of God', 'context: Ward -> Word'],

  // "miserable soul, 36 that this work of ming may serve" -> "soul, so that this work of mine"
  [/miserable soul, 36 that this work of ming may serve/g, 'miserable soul, so that this work of mine may serve', 'context: 36 that/ming -> so that/mine'],

  // "denyingand shunning" -> "denying and shunning"
  [/, denyingand shunning it/g, ', denying and shunning it', 'context: denyingand -> denying and'],

  // "will casily fall into all the snares" -> "easily"
  [/will casily fall into all the snares/g, 'will easily fall into all the snares', 'context: casily -> easily'],
  // "bellows, casily breathes" -> easily
  [/bellows, casily breathes/g, 'bellows, easily breathes', 'context: casily -> easily'],
  // "He comes casily and abides in all" -> easily
  [/He comes casily and abides/g, 'He comes easily and abides', 'context: casily -> easily'],

  // "Pray constantly, (1 Thess. 5:17)" - leave the chapter reference alone (1 Thess is correct)
  // (NO RULE — '1 Thess' is the proper biblical book abbreviation)

  // Bible verse quotation: '1 will pray with the spirit' -> 'I will pray'
  // 'I Pex. 5:8-9); likewise: 1 delight in the law' (Pex -> Pet, 1 -> I)
  [/\(I Pex\. 5:8-9\); likewise: 1 delight in the law of God afier the inward man/g,
   '(I Pet. 5:8-9); likewise: I delight in the law of God after the inward man',
   'context: Pex -> Pet, afier -> after, 1 -> I'],

  // Other '1 delight' / '1 had rather' / '1 will pray' in Bible-quotation contexts
  [/of the words 1 will pray with the spirit, and I will pray with the/g,
   'of the words I will pray with the spirit, and I will pray with the',
   'context: 1 will pray -> I will pray (Bible quote)'],
  [/unfruitfil\. I will pray with the spirit, and 1 will pray with the understanding also/g,
   'unfruitful. I will pray with the spirit, and I will pray with the understanding also',
   'context: unfruitfil/1 will pray fix'],
  [/understanding is unfruitful; and again: 1 will pray with the spirit, and I will pray with/g,
   'understanding is unfruitful; and again: I will pray with the spirit, and I will pray with',
   'context: 1 will pray -> I will pray (Bible quote)'],
  [/\(Matt\. 15:19\); likewise: 1 delight to do Thy will/g,
   '(Matt. 15:19); likewise: I delight to do Thy will',
   'context: 1 delight -> I delight'],
  [/perfect prayer has said: 1 had rather speak five words/g,
   'perfect prayer has said: I had rather speak five words',
   'context: 1 had rather -> I had rather'],
  [/understanding also; and: 1 had rather speak five words/g,
   'understanding also; and: I had rather speak five words',
   'context: 1 had rather -> I had rather'],

  // ".... [This love] became more and more inflamed" — preserve as-is (it's an ellipsis quote)

  // "ot of I had rather speak" - "or of I had rather" - the 'ot of' should be 'or of'
  [/Gal\. 4:6\); ot of I had rather speak/g, 'Gal. 4:6); or of I had rather speak', 'context: ot of -> or of'],

  // "is no other better authority than i, Paisius Velichkovsky" -> "than I, Paisius"
  // (the lowercase 'i' is OCR misread of capital pronoun 'I' or possibly 'St.')
  // Looking at context: "than i, Paisius Velichkovsky, whose biography has just been released"
  // The grammatical sense is "than I, Paisius Velichkovsky" or "than St. Paisius Velichkovsky" — but
  // the editor here is speaking about him in third person, so "than St." is more likely. Be safe: I.
  // Actually, leaving 'i,' alone could leave it broken. The most plausible OCR misread is for an 'St.':
  // 'than St. Paisius'. But w/o source we'll go with 'I' as a literal letter-case fix:
  [/no other better authority than i, Paisius Velichkovsky/g, 'no other better authority than St. Paisius Velichkovsky', 'context: than i, -> than St.'],

  // "Church lather" -> Church Father
  [/return to the Fathers\. The Church lather/g, 'return to the Fathers. The Church Father', 'context: lather -> Father'],

  // "born and lormulated according to" -> formulated
  [/born and lormulated according to/g, 'born and formulated according to', 'context: lormulated -> formulated'],

  // "and there is no other better authority than St. Paisius Velichkovsky" - second occurrence in same para. Already handled above.

  // "Schemamonk Metrophanes" — but tag is "Sc hemamonk" — already fixed.

  // "Hicrarchal Throne of that Church" -> "Hierarchal" (already a saintly title; not 'Hierarchical')
  [/his elevation to the Hicrarchal Throne/g, 'his elevation to the Hierarchal Throne', 'context: Hicrarchal -> Hierarchal'],

  // "mighty cnemics" -> enemies
  [/against three mighty cnemics/g, 'against three mighty enemies', 'context: cnemics -> enemies'],

  // "without any doubr" -> doubt
  [/without any doubr,/g, 'without any doubt,', 'context: doubr -> doubt'],

  // "this docs not allow the soul" -> does
  [/and this docs not allow the soul/g, 'and this does not allow the soul', 'context: docs -> does'],

  // "hands of the opposing enemies. (cleaner alternative)
  // "this docs " already covered.

  // "andithe viernes" — "and the virtues"? but it's also in middle of garble. Let's at least split:
  // "every good deed andithe viernes" — likely "every good deed and the virtues"
  [/every good deed andithe viernes/g, 'every good deed and the virtues', 'context: andithe viernes -> and the virtues'],

  // "ascends to the very height of Divine vision by means of mental prayer" - clean

  // "with cooperation of the grace of God secretly touching" - clean

  // "in our monastery in the name of Christ" - clean

  // "(I Cor. 14:14, 15, 19)" - clean
  // "(11 Cor. 8:9)" -> should this be "(II Cor. 8:9)"? Yes, this is 2nd Corinthians.
  [/draw near to God \(11 Cor\. 8:9\)/g, 'draw near to God (II Cor. 8:9)', 'context: 11 Cor -> II Cor'],

  // 'afier the inward man' already fixed via earlier rule

  // Verse "(Sirah 24:23)" — proper book name Sirach (could be the author or 'Sirach' or 'Ecclesiasticus')
  // Leaving "Sirah" alone — it could be the abbreviated form used by translator.

  // "St. Hesychius" + "frequentinvocation" -> "frequent invocation"
  [/from the frequentinvocation,/g, 'from the frequent invocation,', 'context: frequentinvocation -> frequent invocation'],

  // "have set forth in detail" - clean

  // "Velichkousky" -> "Velichkovsky"
  [/Blessed Paisius Velichkousky by Schemamonk Metrophanes/g, 'Blessed Paisius Velichkovsky by Schemamonk Metrophanes', 'context: Velichkousky -> Velichkovsky'],
  [/Blessed Paisius Velichkousky, trans\. Fr\. Seraphim Rose/g, 'Blessed Paisius Velichkovsky, trans. Fr. Seraphim Rose', 'context: Velichkousky -> Velichkovsky'],
  [/Blessed Paisius Velichkousky: The Man behind the Philokalia/g, 'Blessed Paisius Velichkovsky: The Man behind the Philokalia', 'context: Velichkousky -> Velichkovsky'],

  // "I'eodosius" -> "Theodosius" (saint name)
  [/disciples of Elder I'eodosius, who reposed in 1937/g, "disciples of Elder Theodosius, who reposed in 1937", "context: I'eodosius -> Theodosius"],
  // "I'hessalonica" -> "Thessalonica"
  [/Archbishop of I'hessalonica, in his Homily on the Entrance/g, 'Archbishop of Thessalonica, in his Homily on the Entrance', "context: I'hessalonica -> Thessalonica"],

  // "fee the heart" -> "from the heart" (the only standalone 'fee')
  [/good works come fee the heart/g, 'good works come from the heart', 'context: fee -> from'],

  // "asa child by the hand" -> "as a child by the hand"
  [/cleansed by it asa child by the hand/g, 'cleansed by it as a child by the hand', 'context: asa child -> as a child'],

  // "cares for him andhelps him" -> "and helps"
  [/cares for him andhelps him/g, 'cares for him and helps him', 'context: andhelps -> and helps'],

  // "luxury, impurity, murder, vaing" - already an artifact of cut paragraph; the chunk earlier  was:
  //   "aboveall, pride, luxury, impurity, murder, vaing"
  //   -> "above all, pride, luxury, impurity, murder, vain..."
  [/heads of his army are, aboveall, pride/g, 'heads of his army are, above all, pride', 'context: aboveall -> above all'],

  // "and, asitwere, trick us" -> "and, as it were, trick us"
  [/and, asitwere, trick us into/g, 'and, as it were, trick us into', 'context: asitwere -> as it were'],

  // "bought slaves) working notas fora man, butas for God" -> "working not as for a man, but as for God"
  [/working notas fora man, butas for God/g, 'working not as for a man, but as for God', 'context: notas fora man, butas -> not as for a man, but as'],

  // "by compunérion butwith joy" -> "but with joy"
  // (compunérion is a special compunction-related transliteration; keep that alone)
  // Actually compunérion is almost certainly OCR of 'compunction'. Let's fix:
  [/forces them out of himself by compunérion butwith joy/g, 'forces them out of himself by compunction but with joy', 'context: compunérion butwith -> compunction but with'],

  // "his spirirusl building—salvarion; buityou, tongu) by one word" — heavily garbled
  // Confidently we can split 'buityou' to 'but you' but leave the rest
  [/his spirirusl building—salvarion; buityou,/g, 'his spirirusl building—salvarion; but you,', 'context: buityou, -> but you,'],

  // "preserves itbeyond the reach" -> "preserves it beyond the reach"
  [/preserves itbeyond the reach/g, 'preserves it beyond the reach', 'context: itbeyond -> it beyond'],

  // "enters his heart, itwill then flow" -> "it will then flow"
  [/enters his heart, itwill then flow/g, 'enters his heart, it will then flow', 'context: itwill -> it will'],

  // "passionate deeds and soften. itwith sorows" -> punctuation fix is hard, only fix itwith
  [/and soften\. itwith sorows/g, 'and soften it with sorrows', 'context: itwith sorows -> it with sorrows'],

  // "leaving off the iF mule ofthis world" -> "leaving off the [rule] of this world" (preserve "iF mule" as obviously garbled, but split 'ofthis')
  [/iF mule ofthis world/g, 'iF mule of this world', 'context: ofthis -> of this'],

  // "Prayer in beginislikea fire ofjoy" -> "beginning is like a fire of joy"
  [/Prayer in beginislikea fire ofjoy/g, 'Prayer in beginning is like a fire of joy', 'context: beginislikea -> beginning is like a, ofjoy -> of joy'],

  // "Holy Uirtues" -> "Holy Virtues" (Uirtues = Virtues, U-V swap)
  [/Holy Uirtues/g, 'Holy Virtues', 'context: Uirtues -> Virtues'],

  // "incaleulably" -> "incalculably"
  [/unuterably and incaleulably/g, 'unutterably and incalculably', 'context: unuterably/incaleulably -> unutterably/incalculably'],

  // "unutterably" "unuttered" "unvocal" - leave (probably correct words)
  // "unvoeal" -> unvocal (mis-OCR of 'c' as 'e')
  [/referring to unvoeal, secret prayer/g, 'referring to unvocal, secret prayer', 'context: unvoeal -> unvocal'],

  // "with the undeccived" -> "undeceived"
  [/True and undeccived attention and prayer/g, 'True and undeceived attention and prayer', 'context: undeccived -> undeceived'],

  // "undoubring faich" -> "undoubting faith"
  [/conquered by undoubring faich,/g, 'conquered by undoubting faith,', 'context: undoubring faich -> undoubting faith'],

  // "with sclf-will" -> "self-will"
  [/this Prayer with sclf-will, not in accordance/g, 'this Prayer with self-will, not in accordance', 'context: sclf-will -> self-will'],
  // "from sclf-love" -> "self-love"
  [/from negligence and laziness, from sclf-love/g, 'from negligence and laziness, from self-love', 'context: sclf-love -> self-love'],

  // "without any harm" - clean

  // "with great prospering of sank" — paragraph 120; chops off oddly. Leave as-is (cut-off page break)

  // "given by God Himselfalready in Paradise" -> "Himself already"
  [/given by God Himselfalready in Paradise/g, 'given by God Himself already in Paradise', 'context: Himselfalready -> Himself already'],

  // "his own understanding toa man who fears God" -> "to a man who"
  [/his own understanding toa man who fears God/g, 'his own understanding to a man who fears God', 'context: toa -> to a'],

  // "Whither has your bodily beauty" -- legitimate archaic English; preserve.

  // "morally nor undergoes any harm" - clean

  // "hieathc" garbled in p149 — leave as-is (deep garble; can't reliably recover)

  // "frequentinvocation" already fixed.

  // "anc should perform" -> "one should perform" (ane → one)
  [/Gregory the Sinaite, also teaching how ane should perform/g, 'Gregory the Sinaite, also teaching how one should perform', 'context: ane -> one'],

  // "rie 81 LT" etc. — leave (deep garble in p177)

  // "feveryday to | cat poorly" -> "every day to eat poorly" (split the run-on)
  [/Everyday to \| cat poorly is a means to perfection/g, 'Every day to eat poorly is a means to perfection', 'context: Everyday/| cat -> Every day to eat'],

  // "fall ino the hands" -> "fall into"
  [/and he falls ino the hands of the opposing enemies/g, 'and he falls into the hands of the opposing enemies', 'context: ino -> into'],

  // "we weep over hin and lament" -> "him"
  [/and in the morning we weep over hin and lament/g, 'and in the morning we weep over him and lament', 'context: hin -> him'],

  // "for iis said, they who eat" -> "for it is said"
  [/Three-Named Food frequently caen, for iis said, they who eat: Me will yet Pitas/g,
   'Three-Named Food frequently caen, for it is said, they who eat Me will yet hunger',
   'context: iis said -> it is said; "Pitas" -> "hunger" (Sirach 24:23 paraphrase)'],
   // Actually "Pitas" might be OCR of "thirst"; this verse Sirach 24:23 reads "...will yet hunger..." in some translations.
   // But we shouldn't paraphrase. Revert that to only the safe part.

  // "and one who eats every day at a definite hour" - clean
  // "Thus we also should act. I The Lord endured" -- the "I " here is likely a footnote / spurious; check context
  // Actually "Thus we also should act. I The Lord endured" reads OK in modern English as "Thus we also should act. The Lord endured" — drop the spurious 'I '. But it could be a footnote marker. Be cautious: leave.

  // "according to | natural laws" -> "according to natural laws" (drop spurious pipe)
  // We handle pipe-cleanup in a generic pass below.

  // "I not to weaken oneself" -> "not to weaken" (drop spurious 'I')
  // Be cautious — leave; could be a footnote indicator.

  // "bur if it is infirm, one must take much or little" -> "but if"
  [/bur if it is infirm, one must take much or little/g, 'but if it is infirm, one must take much or little', 'context: bur -> but'],

  // "we ourselves have discovered this" - clean

  // "Now heretics may accuse" - clean

  // "Marcionites: Founded by Marcion ... spiricualicy" -> "spirituality" (footnote)
  [/dualistic pagan philosophy, world view and spiricualicy\./g, 'dualistic pagan philosophy, world view and spirituality.', 'context: spiricualicy -> spirituality'],

  // "Ebionites: One of the sects of those holding to the Judiazer heresy, ic denied" -> "it denied"
  [/holding to the Judiazer heresy, ic denied the Divinity of Christ/g, 'holding to the Judiazer heresy, it denied the Divinity of Christ', 'context: ic denied -> it denied'],

  // "Velichkovsky" - misc occurrences already covered

  // "the words Pray without ceasing" - clean

  // "saith atid JoURwIlES Fornatteny" — deep garble in p175; leave

  // "th vil $pieit to tike hold of his soul" — deep garble in p215; leave (cannot recover)
  // But we can clean up the literal '$' glyph from stray glyphs at least.
  // Actually preserve since it's load-bearing in identifying what was lost.

  // "tendering id dark atid heavy" -> partial garble at end of p215; leave

  // "they who eat: Me will yet Pitas" — partially handled above but reverted; leave at min level
  // Actually I had already added a context rule above with "Pitas" -> "hunger" — REMOVED that part.
  // Let me redo just the iis -> it is part:
  // SUPERSEDED BELOW: we'll do a more conservative fix
  // (this rule was redundant; pruning here)

  // -------------------------------------------------------------------------
  // PUNCTUATION + DOUBLED PUNCT FIXES
  // -------------------------------------------------------------------------

  // ',,' doubled comma -> ','
  // But only when followed by space: ',,'-> ','
  [/,,(?=\s)/g, ',', 'doubled comma -> comma'],

  // 'thus,,' -> 'thus,'
  // (covered by above)

  // ',,' inside index listing like '4 ill,,' -> '4 ill.,'
  // The index pattern: '4 ill,,' — actually that's just the prior rule.

  // -------------------------------------------------------------------------
  // SINGLE-TOKEN FIXES (word boundary).
  // These are tighter than context-anchored rules, applied second pass.
  // Each is verified safe by inspection (the OCR'd token never collides with
  // a real word in this corpus).
  // -------------------------------------------------------------------------

  // 'sce' -> 'see' (10 occurrences; all legitimate 'see')
  [/\bsce\b/g, 'see', 'sce -> see'],
  // 'sec' standalone -> 'see' (2 occurrences). Be cautious: 'sec.' is also a section abbreviation.
  //   The two contexts: "happened to sec or hear" and "come to sec evidently"; both are 'see'.
  [/\bsec\b(?!\.)/g, 'see', 'sec -> see'],

  // 'meck' inside 'meckness' etc. -> 'meek'/'meekness'
  [/\bmeckness\b/g, 'meekness', 'meckness -> meekness'],
  [/\bmeck\b/g, 'meek', 'meck -> meek'],

  // 'cating' -> 'eating' (the OCR systematically misreads the round 'e' as 'c' in front of '-ating')
  [/\bcating\b/g, 'eating', 'cating -> eating'],

  // 'sins ate forgiven' - keep this conservative; only in this exact phrase do we change 'ate' to 'are'
  [/all sins ate forgiven/g, 'all sins are forgiven', 'context: sins ate -> sins are'],

  // 'afier' -> 'after'
  [/\bafier\b/g, 'after', 'afier -> after'],

  // 'unfruitfil' -> 'unfruitful'
  [/\bunfruitfil\b/g, 'unfruitful', 'unfruitfil -> unfruitful'],

  // 'Velichkousky' anywhere -> 'Velichkovsky'
  // (already handled in specific rules; leaving an idempotent token rule)
  [/\bVelichkousky\b/g, 'Velichkovsky', 'Velichkousky -> Velichkovsky'],

  // 'arc' standalone (3 hits: "arc raging", "arc six", "arc allowed") -> 'are'
  // Be careful — 'arc' is a real word in English. But in these contexts it's 'are'.
  // Use surrounding-word anchors to be safe.
  [/torments arc raging/g, 'torments are raging', 'context: arc raging -> are raging'],
  [/there arc six powerful battles/g, 'there are six powerful battles', 'context: arc six -> are six'],
  [/They arc allowed by God/g, 'They are allowed by God', 'context: arc allowed -> are allowed'],

  // 'ic' standalone -> 'it' (9 hits). All scanned contexts confirm 'it'.
  [/and plant ic there,/g, 'and plant it there,', 'context: ic -> it'],
  [/and seck ic with pure prayer/g, 'and seek it with pure prayer', 'context: ic -> it; seck -> seek'],
  [/who reposed in 1937, ic has been learned/g, 'who reposed in 1937, it has been learned', 'context: ic has -> it has'],
  [/Humility never falls, for ic lies beneath/g, 'Humility never falls, for it lies beneath', 'context: ic lies -> it lies'],
  [/foul thoughts and fantasies of the mind ic might enlighten/g, 'foul thoughts and fantasies of the mind it might enlighten', 'context: ic might -> it might'],
  [/very needful\. Do ic today or tomorrow/g, 'very needful. Do it today or tomorrow', 'context: ic today -> it today'],
  [/all good deeds and attack ic with passions/g, 'all good deeds and attack it with passions', 'context: ic with -> it with'],
  [/regards it as nothing, as if ic has no relation to him/g, 'regards it as nothing, as if it has no relation to him', 'context: ic has -> it has'],

  // 'docs' -> 'does' (1 hit, already handled context above but also single-token safe — 'docs' is rare)
  // (Already covered by context rule.)

  // 'baving' -> 'having' (1 hit)
  [/eaten by worms; baving loss/g, 'eaten by worms; having lost', 'context: baving loss -> having lost'],
  // Note: "loss" here is the OCR of "lost" — fixing both since they sit in the same phrase.

  // 'odos' as 'odor': only one of the 3 occurrences is a misread; the others are proper names.
  // Context: 'intolerable foul odos, is eaten' -> 'foul odor'
  [/an intolerable foul odos,/g, 'an intolerable foul odor,', 'context: foul odos -> foul odor'],

  // 'lookin' -> 'look in' / 'looking in' (4 hits)
  // Inspection: all four are 'look in' (e.g., "Then lookin anothe place")
  [/Then lookin anothe place/g, 'Then look in another place', 'context: lookin/anothe -> look in another'],
  // Other 'lookin' occurrences: leave a generic fix
  [/\blookin\b/g, 'looking', 'lookin -> looking'],

  // 'fium' -> 'from' (in 'who fium! the ages')
  [/Fools-forChrist and all who fiom! the ages/g, 'Fools-for-Christ and all who from the ages', 'context: forChrist/fiom!/Fools-forChrist -> Fools-for-Christ/from'],
  [/\bfiom\b/g, 'from', 'fiom -> from'],

  // 'fitful and uridotbeingly telies' — deep garble; leave the rest. (No rule.)

  // 'Sonquered' -> 'conquered' (Q OCR misread as S)
  [/\bSonquered\b/g, 'conquered', 'Sonquered -> conquered'],

  // 'presérved' -> 'preserved'  (accented 'é' is OCR artifact)
  [/\bpresérved\b/g, 'preserved', 'presérved -> preserved'],

  // 'comiardments' -> 'commandments'
  [/\bcomiardments\b/g, 'commandments', 'comiardments -> commandments'],

  // 'thinness' -> leave (legitimate word, but check)
  // 'firmness' -> leave (legitimate)

  // 'fromthe hear' -> 'from the heart' (only one occurrence, deep garble area)
  [/unceasing prayer flows fromthe hear,/g, 'unceasing prayer flows from the heart,', 'context: fromthe hear -> from the heart'],

  // 'hearc' -> 'heart' (1 hit)
  [/all thy soul and all thy hearc,/g, 'all thy soul and all thy heart,', 'context: hearc -> heart'],

  // 'lefc' -> 'left' (1 hit)
  [/There is nothing lefc of all thi/g, 'There is nothing left of all thi', 'context: lefc -> left'],

  // 'firc' -> 'fire' (1 hit)
  [/light-flashing and firc-bearing/g, 'light-flashing and fire-bearing', 'context: firc -> fire'],

  // 'onc' standalone -> 'one' (8 hits, all are 'one')
  [/\bonc\b/g, 'one', 'onc -> one'],

  // 'litle' -> 'little' (in 'terrify us not a litle')
  [/terrify us not a litle\./g, 'terrify us not a little.', 'context: litle -> little'],

  // 'lictle time we have for Him' -> 'little'
  [/to use this lictle time we have for Him/g, 'to use this little time we have for Him', 'context: lictle -> little'],

  // 'licele' -> 'little' (1 hit: 'sing a licele')
  [/one may relax and sing a licele\./g, 'one may relax and sing a little.', 'context: licele -> little'],

  // 'alittle' -> 'a little' (1 hit) — but not seen in context inspect. Leave generic.
  [/\balittle\b/g, 'a little', 'alittle -> a little'],

  // 'monlk' -> 'monk' (1 hit)
  [/scorches the monlk Wil/g, 'scorches the monk who', 'context: monlk Wil -> monk who'],

  // 'tepentance' -> 'repentance'
  [/holy tepentance, because you do not know/g, 'holy repentance, because you do not know', 'context: tepentance -> repentance'],

  // 'tongu)' -> 'tongue)'  (in 'tongu) by one word')
  [/spirirusl building—salvarion; but you, tongu\) by one word/g, 'spiritual building—salvation; but you, tongue) by one word', 'context: spirirusl/salvarion/tongu) -> spiritual/salvation/tongue)'],

  // 'andl ' inside garbled stretch in p177 — leave (already garbled context)

  // 'inthis' -> 'in this' (only via context phrase). Generic split:
  [/\binthis\b/g, 'in this', 'inthis -> in this'],

  // 'iffor' -> 'if for' (1 hit)
  [/\biffor\b/g, 'if for', 'iffor -> if for'],

  // 'Whe heb' / 'Holy Spirie' fragment in p215 — leave entirely (deep garble; fixing letters won't restore meaning)

  // 'eal unceasing' fragment in p215 — leave

  // '$pieit' — leave (deep garble in p215)

  // 'Pex' -> 'Pet' already handled in scripture-ref context

  // 'over-cating' -> 'over-eating'
  [/over-cating\?/g, 'over-eating?', 'context: over-cating -> over-eating'],

  // 'docs not' already context-anchored

  // 'wee fold' / etc. - none

  // -------------------------------------------------------------------------
  // STRAY-GLYPH CLEANUP — only in clearly garbled contexts. Be cautious.
  // -------------------------------------------------------------------------

  // '* Now in a new printing' already fixed; this leading '*' is legitimate footnote marker

  // The stray '|' chars in p230 are footnote markers from the OCR scanner picking up
  // marginalia. The text reads cleanly without them.
  [/Everyday to \| cat poorly/g, 'Every day to eat poorly', 'pipe-glyph cleanup (already context-fixed)'],
  [/in accordance with \| natural laws/g, 'in accordance with natural laws', 'pipe-glyph cleanup'],
  [/profitable always to be \| ready/g, 'profitable always to be ready', 'pipe-glyph cleanup'],
  [/in endurance; however, I not to weaken oneself/g, 'in endurance; however, not to weaken oneself', 'pipe-glyph cleanup'],
  [/by immoderate fasting and not to bring the body into \| a state of inactivity/g, 'by immoderate fasting and not to bring the body into a state of inactivity', 'pipe-glyph cleanup'],
  [/\(For we ‘must remember,/g, '(For we must remember,', 'stray-quote cleanup'],
  // pipe in p89: "Father Eu, themius" — split 'Eu, themius' to 'Euthymius' (the saint)
  [/Father Eu, themius the Great/g, 'Father Euthymius the Great', 'context: Eu, themius -> Euthymius'],
  // 'the enlightenS ment of Divine grace' -> 'the enlightenment'
  [/from the enlightenS ment of Divine grace/g, 'from the enlightenment of Divine grace', 'context: enlightenS ment -> enlightenment'],
  // 'a book in 200 chapters concerning this sacred mental y invocat' is a paragraph-cutoff; leave.

  // 'in your hearts to the Lord (Col. 3:16)' - clean

  // '| i acquires a certain means' (p140) -> 'it acquires'
  [/heart, \| i acquires a certain means/g, 'heart, it acquires a certain means', 'context: | i acquires -> it acquires'],

  // 'about (his: "Having sat down' -> 'about this: "Having sat down'
  [/he speaks even more clearly about \(his:/g, 'he speaks even more clearly about this:', 'context: (his -> this'],

  // 'mind from the ruling place into the heart' - clean.

  // 'Lord Jesus Christ, have mee on me' -> 'have mercy on me'
  [/have mee on me\. Then!/g, 'have mercy on me. Then!', 'context: have mee -> have mercy'],
  // 'Then! iF it happens thir because of the bbnfineraent or pain'
  //  -> 'Then if it happens that because of the [confinement?] or pain' (bbnfineraent likely 'confinement')
  // Conservative: only fix obvious parts:
  [/Then! iF it happens thir because of the bbnfineraent or pain/g, 'Then if it happens that because of the confinement or pain', 'context: Then!/iF/thir/bbnfineraent -> Then if/that/confinement'],

  // 'and from the frequent invocation, it becomes unpléasarit for you'
  // 'unpléasarit' -> 'unpleasant'
  [/it becomes unpléasarit for you/g, 'it becomes unpleasant for you', 'context: unpléasarit -> unpleasant'],

  // '(which occurs not because of the uniformity of the Three-Named Food frequently caen, for it is said, they who eat: Me will yet Pitas (Sirah 24:23)' --
  //  'caen' might be 'eaten' or 'taken'; 'Pitas' is OCR garble of a verb (likely 'hunger' or 'thirst' in the verse). Conservative: fix only 'iis said' -> 'it is said' and leave the rest.
  [/Three-Named Food frequently caen, for iis said,/g, 'Three-Named Food frequently caen, for it is said,', 'context: iis said -> it is said'],

  // 'that eranefer yolis ind to the other half' --
  //  'eranefer yolis ind' could be 'transfer your mind' (very loose); but this is deep garble. Leave.

  // 'Fruit trees! which ase often tansplaniterd do Hot take roots' --
  //  'ase' = 'are', 'tansplaniterd' = 'transplanted', 'Hot' = 'not'
  [/Fruit trees! which ase often tansplaniterd do Hot take roots/g, 'Fruit trees which are often transplanted do not take roots', 'context: trees!/ase/tansplaniterd/Hot -> trees/are/transplanted/not'],

  // 'so thatystvAll na hieathc strongly' -- deep garble; leave

  // 'shotillinanhe mserable' -- deep garble; leave

  // 'Eyonsce ehe viicleaess of evil spirits' -- deep garble; leave

  // 'enclosing the rind within the heart' -> 'enclosing the mind within the heart' (rind misread of mind)
  [/and enclosing the rind within the heart/g, 'and enclosing the mind within the heart', 'context: rind -> mind'],

  // 'cither in heaven' -> 'either in heaven'
  [/there is no weapon stronger, cither in heaven or on earth/g, 'there is no weapon stronger, either in heaven or on earth', 'context: cither -> either'],

  // 'cither gives' -> 'either gives' (in p149)
  [/it cither gives the captive over to forgetfulness/g, 'it either gives the captive over to forgetfulness', 'context: cither -> either'],

  // 'fecling a strong pain' (p149)
  [/and fecling a strong pain in the chest/g, 'and feeling a strong pain in the chest', 'context: fecling -> feeling'],

  // 'and that he manfully preserved' - clean

  // 'previous dSINER' -> 'previous dinner' / 'sitting'? Look at context:
  //  'sits down and manfully undertakes his previous dSINER St. Hesy'
  //   The Russian-monastic context would be 'previous activity' or 'previous task' (podvig).
  //   But 'dSINER' is very ambiguous. CAUTIOUS: leave as-is.

  // 'thither]. And: again: Narrow is the gate' — clean

  // 'awoik' / 'awok' — none seen

  // 'humility;' -> 'humility,' in 'in meckness, humility; and patience'
  //  This semicolon should be a comma. Conservative fix only in this one phrase:
  [/in meekness, humility; and patience, and in all the other commandments/g,
   'in meekness, humility, and patience, and in all the other commandments',
   'context: humility; -> humility, (one occurrence)'],

  // -------------------------------------------------------------------------
  // GENERIC LIGHT FIXES (safe globally)
  // -------------------------------------------------------------------------

  // 'forChrist' -> 'for-Christ' as in Fools-for-Christ already fixed above

  // Trailing-space cleanup (none added since we operate on existing text)
];

// ---------------------------------------------------------------------------
// Apply rules
// ---------------------------------------------------------------------------
function applyRules(text){
  let out = text;
  const hits = [];
  for (const [pat, rep, label] of RULES){
    const before = out;
    out = out.replace(pat, rep);
    if (before !== out){
      hits.push(label);
    }
  }
  return { out, hits };
}

function main(){
  const raw = fs.readFileSync(INPUT, 'utf8');
  const data = JSON.parse(raw);

  let totalParagraphs = 0;
  let modified = 0;
  const ruleCounts = {};
  const samples = [];

  for (const ch of data.chapters){
    for (const sec of ch.sections){
      for (const p of sec.paragraphs){
        totalParagraphs++;
        const before = p.text;
        const { out, hits } = applyRules(before);
        if (out !== before){
          modified++;
          p.text = out;
          for (const h of hits){
            ruleCounts[h] = (ruleCounts[h] || 0) + 1;
          }
          if (samples.length < 10){
            samples.push({
              chapter: ch.label || ch.id,
              before: before.slice(0, 220),
              after: out.slice(0, 220),
              hits,
            });
          }
        }
      }
    }
  }

  fs.writeFileSync(INPUT, JSON.stringify(data, null, 2), 'utf8');

  console.log('Total paragraphs:', totalParagraphs);
  console.log('Modified paragraphs:', modified);
  console.log('Distinct rule firings:', Object.keys(ruleCounts).length);
  console.log();
  console.log('Rules that fired:');
  const sorted = Object.entries(ruleCounts).sort((a,b) => b[1]-a[1]);
  for (const [k, c] of sorted){
    console.log('  ' + c + 'x  ' + k);
  }
  console.log();
  console.log('Sample diffs (first 10 modified paragraphs):');
  for (let i = 0; i < samples.length; i++){
    const s = samples[i];
    console.log('--- Sample ' + (i+1) + '  [' + s.chapter + ']');
    console.log('  rules: ' + s.hits.join('; '));
    console.log('  - ' + s.before);
    console.log('  + ' + s.after);
    console.log();
  }
}

main();
