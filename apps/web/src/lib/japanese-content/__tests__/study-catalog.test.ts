import { describe, expect, it } from "vitest";
import { sourceLockDigest } from "../source-files";
import { buildJapaneseStudyCatalog } from "../study-catalog";
import { japaneseStudyFixture as fixture } from "../../../../test/japanese-study-fixture";


describe("Japanese canonical study groups and community level provenance", () => {
  it("groups only declared variants, covers every source identity once and keeps member-specific answers", () => {
    const { source, build } = fixture();
    const before = structuredClone(source);
    const result = build();
    expect(result.units).toHaveLength(2);
    expect(result.units.find(unit=>unit.id==="word-0")).toMatchObject({ kind: "vocabulary", recordIds: ["word-0", "word-1"], answerPolicy: "member-specific", level: { code: "N3" } });
    expect(result.recordToUnit).toEqual({ "word-0": "word-0", "word-1": "word-0", kanji: "kanji" });
    expect(source).toEqual(before);
    expect(result.status).toBe("draft");
  });

  it("requires a complete, unique partition of every overlapping entry without silent omissions", () => {
    for (const mode of ["missing", "unknown", "duplicate", "omitted-member"] as const) {
      const { policy, build } = fixture();
      if (mode==="missing") policy.overlaps=[];
      if (mode==="unknown") policy.overlaps[0].entryId="missing";
      if (mode==="duplicate") policy.overlaps.push(policy.overlaps[0]);
      if (mode==="omitted-member") policy.overlaps[0].groups[0].memberIds.pop();
      expect(build, mode).toThrow(/overlap|partition|duplicate/i);
    }
  });

  it("rejects source drift, unknown anchors and repeated membership before producing study identities", () => {
    const changed=fixture(); changed.source.cards[0].content.meanings=["different"];
    expect(changed.build).toThrow(/catalog.*drift/i);
    const anchor=fixture(); anchor.policy.overlaps[0].groups[0].anchorId="unknown";
    expect(anchor.build).toThrow(/anchor/i);
    const duplicate=fixture(); duplicate.policy.overlaps[0].groups.push(duplicate.policy.overlaps[0].groups[0]);
    expect(duplicate.build).toThrow(/duplicate|partition/i);
  });

  it("does not merge different primary readings or unsupported/restricted senses merely because entry IDs match", () => {
    for (const mode of ["reading", "sense", "restriction"] as const) {
      const { source, dictionary, policy, bind, build } = fixture();
      if (mode==="reading" && source.cards[1].kind==="vocabulary") source.cards[1].content.reading="べつ";
      if (mode==="sense") policy.overlaps[0].groups[0].senses=[2];
      if (mode==="restriction") dictionary[0].sense![0].appliesToKanji=["中身"];
      bind(); expect(build, mode).toThrow(/unsupported.*merge/i);
    }
  });

  it("keeps explicitly separated senses/spelling usage as distinct units even with identical glosses", () => {
    const { policy, build }=fixture();
    policy.overlaps[0].groups=[{ anchorId:"word-0",memberIds:["word-0"],senses:[] },{ anchorId:"word-1",memberIds:["word-1"],senses:[] }];
    expect(build().units).toHaveLength(3);
  });

  it.each(["declared-pair", "kana-reference"] as const)("uses earlier eligible %s evidence while retaining both source levels", (scope) => {
    const { source, bind, build }=fixture();
    source.reconciliation.push({ sourceRow:"N5:2",level:"N5",jmdict_seq:"1",kanji:scope==="declared-pair"?"中身":"",kana:"なかみ",waller_definition:"contents",status:"matched",method:"form-and-reading",candidateIds:["0"],sourceFileId:"reference",candidateCardIds:["word-0"] });
    source.issues.push({id:"N5:2",code:"LEVEL_DISAGREEMENT",message:"Synthetic source difference"}); bind();
    const result=build();
    expect(result.units.find(unit=>unit.id==="word-0")?.level).toMatchObject({ code:"N5",evidence:expect.arrayContaining([expect.objectContaining({source:"record",code:"N3"}),expect.objectContaining({source:"record",code:"N2"}),expect.objectContaining({source:"reference",code:"N5",used:true})]) });
    expect(result.levelDecisions).toContainEqual(expect.objectContaining({sourceRow:"N5:2",recordId:"word-0",sourceLevel:"N3",referenceLevel:"N5",unitLevel:"N5",used:true,scope}));
  });

  it.each(["different-reading", "unconfirmed-form"] as const)("does not use %s evidence or a vocabulary reference to lower a character level", (scope) => {
    const { source, bind, build }=fixture();
    source.reconciliation.push({ sourceRow:"N5:2",level:"N5",jmdict_seq:"1",kanji:scope==="different-reading"?"中身":"別表記",kana:scope==="different-reading"?"べつ":"なかみ",waller_definition:"fallback",status:"matched",method:"dictionary-id-and-reading",candidateIds:["0"],sourceFileId:"reference",candidateCardIds:["word-0"] });
    source.cards[2].content.level="N2";
    source.reconciliation.push({sourceRow:"N5:3",level:"N5",jmdict_seq:"",kanji:"中",kana:"ちゅう",waller_definition:"character",status:"unmatched",method:"none",candidateIds:[],sourceFileId:"reference",candidateCardIds:[],resolution:{kind:"character-reading",sourceRow:"N5:3",beforeSha256:"a".repeat(64),reason:"Synthetic on-reading coverage",readingType:"ja_on",cardIds:["kanji"]}});
    source.issues.push({id:"N5:2",code:"LEVEL_DISAGREEMENT",message:"Synthetic source difference"});bind();
    expect(build().units.find(unit=>unit.id==="word-0")?.level.code).toBe("N3");
    expect(build().units.find(unit=>unit.id==="kanji")?.level.code).toBe("N2");
    expect(build().levelDecisions[0]).toMatchObject({ used:false,scope });
  });

  it("keeps anchored identities through level/dictionary-release changes and rejects unknown policy fields", () => {
    const { source, policy, bind, build }=fixture();
    const ids=build().units.map(unit=>unit.id);
    source.cards[0].content.level="N4";
    const before=source.sourceLock.dictionaryRelease; source.sourceLock.dictionaryRelease+="-next";
    for(const file of source.sourceLock.files) if(["jmdict","kanjidic"].includes(file.role)) file.url=file.url.replace(encodeURIComponent(before),encodeURIComponent(source.sourceLock.dictionaryRelease));
    bind();
    policy.sourceLockSha256=sourceLockDigest(source.sourceLock);
    expect(build().units.map(unit=>unit.id)).toEqual(ids);
    expect(()=>buildJapaneseStudyCatalog(source,[],{...policy,approved:true})).toThrow();
  });
});
