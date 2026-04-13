/**
 * Build data/study/intermediate-1.json — Intermediate L1 (controlled conversation).
 * Spec: 10–12 decks × 20–25 cards, 220–260 total. English-primary fronts (see `prompt-locale-policy.ts`).
 *
 *   yarn study:build-intermediate1-json
 */
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "@prisma/client";
import { inferReorderExerciseFromSlashLines } from "../src/lib/study/card-exercise";
import { intermediate1LevelFileSchema } from "../src/lib/study/schemas";

const OUT = path.join(__dirname, "../data/study/intermediate-1.json");

type Pair = [string, string];

type Int1Card = {
  id: string;
  frontJa: string;
  backEn: string;
  sortOrder: number;
  exercise?: unknown;
};

function rows(deck: string, xs: Pair[]): Pair[] {
  if (xs.length !== 21) throw new Error(`${deck}: expected 21 cards, got ${xs.length}`);
  return xs;
}

const DECKS: { titleJa: string; titleEn: string; cards: Pair[] }[] = [
  {
    titleJa: "現在・過去・未来",
    titleEn: "Present, Past & Future",
    cards: rows("Present/Past/Future", [
      [
        "Complete B (present habit). A: Do you walk to work?\nB: Yes, ___",
        "I walk to work every day.",
      ],
      [
        "Past: Last night I ___ (not finish) my homework.\nChoose the best sentence.",
        "I didn't finish my homework last night.",
      ],
      [
        "Future: Choose the best plan sentence.\nWe're ___ dinner at my place on Saturday.",
        "We're going to have dinner at my place on Saturday.",
      ],
      ["Translate: 毎朝シャワーを浴びます。", "I take a shower every morning."],
      [
        "Choose the best past sentence.\nShe ___ in London for two years. (live — past)",
        "She lived in London for two years.",
      ],
      [
        "Present vs future: I ___ my aunt tomorrow afternoon. (visit — plan with \"going to\")",
        "I'm going to visit my aunt tomorrow afternoon.",
      ],
      ["Translate: 昨日は忙しかった。", "I was busy yesterday."],
      [
        "Pick the natural present simple line.\nWater ___ at 100°C at sea level.",
        "Water boils at 100°C at sea level.",
      ],
      [
        "Complete: By 2030, many cities ___ more electric buses. (use — future with will)",
        "By 2030, many cities will use more electric buses.",
      ],
      ["Translate: 今週末、映画を見るつもりです。", "I'm going to watch a movie this weekend."],
      [
        "Past question: ___ you ___ the email yesterday? (send)\nAnswer as a full question.",
        "Did you send the email yesterday?",
      ],
      [
        "Present continuous for arrangement: I ___ my dentist on Tuesday at 3. (see)",
        "I'm seeing my dentist on Tuesday at 3.",
      ],
      ["Translate: 彼はもう昼ご飯を食べました。", "He has already eaten lunch."],
      [
        "Simple future (will) for instant decision: A: I'm cold.\nB: I ___ you my jacket.",
        "I'll lend you my jacket.",
      ],
      [
        "Past habit (used to): When I was a child, I ___ afraid of dogs.",
        "When I was a child, I was afraid of dogs.",
      ],
      ["Translate: 来月から新しい仕事を始めます。", "I'm starting a new job next month."],
      [
        "Choose the best sentence.\nThey ___ to Japan three times so far. (travel — present perfect)",
        "They have traveled to Japan three times so far.",
      ],
      [
        "Future with time clause: After I ___ dinner, I'll call you. (finish — present after \"After I\")",
        "After I finish dinner, I'll call you.",
      ],
      ["Translate: 彼女は昨夜遅くまで働いていました。", "She was working late last night."],
      [
        "Mixed: I ___ English since 2020, and I still practice every week. (study)",
        "I have studied English since 2020, and I still practice every week.",
      ],
      [
        "Pick the best line.\nBy the time you arrive, we ___ the slides. (finish — future perfect is optional; use simple future here)",
        "By the time you arrive, we will have finished the slides.",
      ],
    ]),
  },
  {
    titleJa: "経験（have done）",
    titleEn: "Experience (have / has done)",
    cards: rows("Experience", [
      [
        "Experience question about a place (Osaka).\n___ you ever been to Osaka?",
        "Have you ever been to Osaka?",
      ],
      ["Translate: 寿司を食べたことがありません。", "I have never tried sushi."],
      [
        "Experience with \"already\": She ___ her ticket. (buy — present perfect)",
        "She has already bought her ticket.",
      ],
      ["Translate: その映画をもう見ましたか？", "Have you seen that movie yet?"],
      [
        "Negative experience: I ___ that app before. (not use — present perfect)",
        "I haven't used that app before.",
      ],
      ["Translate: 彼は海外に行ったことがあります。", "He has been abroad before."],
      [
        "Question: How many countries ___ you ___? (visit — present perfect)",
        "How many countries have you visited?",
      ],
      ["Translate: 私は一度もスキーをしたことがありません。", "I have never been skiing."],
      [
        "Since + point in time: We ___ here since Monday. (wait — present perfect continuous acceptable; use present perfect)",
        "We have waited here since Monday.",
      ],
      ["Translate: 彼女はその本を読み終えています。", "She has finished reading that book."],
      [
        "Have you ever ___ Japanese curry at home? (make)",
        "Have you ever made Japanese curry at home?",
      ],
      ["Translate: まだ昼食を食べていません。", "I haven't eaten lunch yet."],
      [
        "Experience + superlative: This is the best ramen I ___ . (ever / taste)",
        "This is the best ramen I have ever tasted.",
      ],
      ["Translate: 彼らは富士山に登ったことがあります。", "They have climbed Mount Fuji before."],
      [
        "Short answer style: A: Have you tried matcha?\nB: Yes, ___ . (I / try / it)",
        "Yes, I have tried it.",
      ],
      ["Translate: そのニュースを聞いたことがありますか？", "Have you heard that news before?"],
      [
        "Present perfect result: I ___ my keys. I can't open the door. (lose)",
        "I have lost my keys. I can't open the door.",
      ],
      ["Translate: 私は東京に住んだことがあります。", "I have lived in Tokyo before."],
      [
        "Ever + present perfect: ___ you ever ___ a speech in public? (give)",
        "Have you ever given a speech in public?",
      ],
      ["Translate: 彼はまだ返事を書いていません。", "He hasn't written a reply yet."],
      [
        "Experience paragraph starter: I've ___ a lot of interesting people at work. (meet)",
        "I've met a lot of interesting people at work.",
      ],
    ]),
  },
  {
    titleJa: "つなぎ言葉（and / but / so / because）",
    titleEn: "Basic connectors (and, but, so, because)",
    cards: rows("Connectors", [
      [
        "Choose the connector.\nIt was raining, ___ we still went hiking.",
        "It was raining, but we still went hiking.",
      ],
      [
        "Choose the connector.\nI was tired, ___ I went to bed early.",
        "I was tired, so I went to bed early.",
      ],
      [
        "Choose the connector.\nShe stayed home ___ she felt sick.",
        "She stayed home because she felt sick.",
      ],
      ["Translate: コーヒーが欲しいです。とても眠いです。", "I want coffee because I'm very sleepy."],
      [
        "Choose the connector.\nI bought milk ___ eggs.",
        "I bought milk and eggs.",
      ],
      ["Translate: 安かったので、二つ買いました。", "It was cheap, so I bought two."],
      [
        "Choose the best sentence.\nHe likes sports, ___ he doesn't like running.",
        "He likes sports, but he doesn't like running.",
      ],
      ["Translate: 遅刻しました。バスが来なかったので。", "I was late because the bus didn't come."],
      [
        "Reason vs result: pick the right connector (not \"so\" here).\nI left early ___ there was heavy traffic.",
        "I left early because there was heavy traffic.",
      ],
      ["Translate: 彼は勉強しました。そして試験に合格しました。", "He studied, and he passed the exam."],
      [
        "Fix the logic: hunger is the reason, eating is the result.\nI was hungry, ___ I ate a sandwich.",
        "I was hungry, so I ate a sandwich.",
      ],
      ["Translate: 雨が降っていたが、試合は続いた。", "It was raining, but the game continued."],
      [
        "Choose the connector.\nShe speaks quietly, ___ everyone listens carefully.",
        "She speaks quietly, so everyone listens carefully.",
      ],
      ["Translate: 彼は忙しいので、今夜は来られません。", "He's busy, so he can't come tonight."],
      [
        "Add a reason with the right connector.\nI like this cafe ___ the staff are friendly.",
        "I like this cafe because the staff are friendly.",
      ],
      ["Translate: 私は泳げます。しかし、深い水は怖いです。", "I can swim, but I'm afraid of deep water."],
      [
        "Choose: I forgot my umbrella, ___ I bought a cheap one at the store.",
        "I forgot my umbrella, so I bought a cheap one at the store.",
      ],
      ["Translate: 彼女は疲れていたので、早く寝ました。", "She was tired, so she went to bed early."],
      [
        "Polite short reply: A: Want to grab lunch?\nB: I'd love to, ___ I'm in a meeting until 1.",
        "I'd love to, but I'm in a meeting until 1.",
      ],
      ["Translate: 彼は親切だ。そしてとても頼りになる。", "He is kind, and he is very reliable."],
      [
        "Because-clause first: ___ I left my charger at home, my phone died.",
        "Because I left my charger at home, my phone died.",
      ],
    ]),
  },
  {
    titleJa: "質問の形（How long… / How often…）",
    titleEn: "Expanded questions (How long…?, How often…?)",
    cards: rows("Questions", [
      [
        "They live in Sapporo. Ask how long:\n___ have you lived in Sapporo?",
        "How long have you lived in Sapporo?",
      ],
      [
        "They go to the gym on Mondays and Thursdays. Ask how often:\n___ do you go to the gym?",
        "How often do you go to the gym?",
      ],
      ["Translate: どのくらいの間、英語を勉強していますか？", "How long have you been studying English?"],
      [
        "Natural follow-up: A: I started yoga last month.\nB: ___ do you practice each week?",
        "How often do you practice each week?",
      ],
      ["Translate: ここに来てからどのくらいですか？", "How long have you been here?"],
      [
        "Choose the best question.\n___ does it take to get to the airport by train?",
        "How long does it take to get to the airport by train?",
      ],
      ["Translate: どのくらいの頻度でニュースを見ますか？", "How often do you watch the news?"],
      [
        "How long + present perfect continuous: ___ you ___ this book? (read — question)",
        "How long have you been reading this book?",
      ],
      ["Translate: その仕事を始めてからどれくらいですか？", "How long have you had that job?"],
      [
        "How often + simple present: ___ you ___ your grandparents? (visit)",
        "How often do you visit your grandparents?",
      ],
      ["Translate: 会議はどのくらい続きますか？", "How long will the meeting last?"],
      [
        "They look tired. Ask politely:\n___ did you sleep?",
        "How long did you sleep?",
      ],
      ["Translate: 週に何回走りますか？", "How many times a week do you run?"],
      [
        "How long for future wait: ___ will we have to wait?",
        "How long will we have to wait?",
      ],
      ["Translate: どのくらいの間、その痛みがありますか？", "How long have you had that pain?"],
      [
        "Ask about frequency of being late: ___ are you late to class?",
        "How often are you late to class?",
      ],
      ["Translate: どのくらいの間、彼を知っていますか？", "How long have you known him?"],
      [
        "Choose: ___ do you clean your room — every day or once a week?",
        "How often do you clean your room — every day or once a week?",
      ],
      ["Translate: その列に並んでからどれくらいですか？", "How long have you been standing in this line?"],
      [
        "Small talk: A: I commute by bike.\nB: ___ is your commute?",
        "How long is your commute?",
      ],
      ["Translate: 月に何回映画を見ますか？", "How many times a month do you watch movies?"],
    ]),
  },
  {
    titleJa: "人の描写",
    titleEn: "Describing people",
    cards: rows("People", [
      [
        "She always helps new coworkers. Complete the sentence.\nShe is very ___. (helpful)",
        "She is very helpful.",
      ],
      ["Translate: 彼はとても社交的で、すぐに友達を作ります。", "He is very outgoing and makes friends easily."],
      [
        "Describe his appearance in one sentence.\nHe ___ tall and has short dark hair and glasses.",
        "He is tall and has short dark hair and glasses.",
      ],
      ["Translate: 彼女は静かだけど、とても頭がいい。", "She is quiet, but very smart."],
      [
        "Polite description for a teacher: strict ___ fair",
        "Our teacher is strict but fair.",
      ],
      ["Translate: 彼はいつも笑顔で、ポジティブな人だ。", "He always smiles; he is a positive person."],
      [
        "Use \"looks\": She ___ tired today.",
        "She looks tired today.",
      ],
      ["Translate: 彼女は背が高くて、モデルのようだ。", "She is tall and looks like a model."],
      [
        "Describe a friend (loyal + funny).\nMy friend is ___ and funny.",
        "My friend is loyal and funny.",
      ],
      ["Translate: 彼は少し恥ずかしがり屋だが、優しい。", "He is a little shy, but kind."],
      [
        "Adjective order (simple): a ___ ___ coat (small / warm)",
        "a small warm coat",
      ],
      ["Translate: 彼女は声が大きくて、リーダー向きだ。", "She has a loud voice; she is good at leading."],
      [
        "Personality vs mood: He isn't rude; he ___ just stressed today.",
        "He isn't rude; he is just stressed today.",
      ],
      ["Translate: 彼は真剣な顔つきをしているが、冗談が好きだ。", "He looks serious, but he likes jokes."],
      [
        "A: Your sister is really creative.\nB: I agree — she ___ really creative.",
        "I agree — she is really creative.",
      ],
      ["Translate: 彼女はとても忍耐強い母親だ。", "She is a very patient mother."],
      [
        "Someone you admire is hard-working.\nMy boss is extremely ___.",
        "My boss is extremely hard-working.",
      ],
      ["Translate: 彼は細身で、走るのが速い。", "He is slim and runs fast."],
      [
        "Use \"seems\": He ___ a bit nervous before presentations.",
        "He seems a bit nervous before presentations.",
      ],
      ["Translate: その店員さんは丁寧で親切だった。", "The clerk was polite and kind."],
      [
        "Compare two friends (one calm, one energetic).\nOne friend is calm, ___ the other is energetic.",
        "One friend is calm, while the other is energetic.",
      ],
    ]),
  },
  {
    titleJa: "日常の場面",
    titleEn: "Daily situations",
    cards: rows("Daily", [
      [
        "At a café: you want a medium hot latte to go.\n___ get a medium hot latte to go, please?",
        "Can I get a medium hot latte to go, please?",
      ],
      [
        "A: What would you like to drink?\nB: ___ (water / please)",
        "Water, please.",
      ],
      ["Translate: お会計をお願いします。", "The check, please."],
      [
        "Suggest Saturday afternoon for a museum visit.\n___ you free Saturday afternoon to go to the museum?",
        "Are you free Saturday afternoon to go to the museum?",
      ],
      ["Translate: 今夜、一緒に夕食を食べませんか？", "Would you like to have dinner together tonight?"],
      [
        "Phone call: you answer and give your name (Ken).\nHello, ___ Ken speaking.",
        "Hello, this is Ken speaking.",
      ],
      ["Translate: すみません、メニューを見せてください。", "Excuse me, could I see the menu, please?"],
      [
        "At a store: ask about a larger size for this shirt.\n___ you have this shirt in a larger size?",
        "Do you have this shirt in a larger size?",
      ],
      ["Translate: 予約はできますか？", "Can I make a reservation?"],
      [
        "Train station: ask about the express to Osaka.\n___ platform is the express train to Osaka?",
        "Which platform is the express train to Osaka?",
      ],
      ["Translate: 荷物を預けられますか？", "Can I leave my luggage here?"],
      [
        "Apartment issue: tell the manager the AC is not working.\nThe ___ in my apartment isn't working.",
        "The air conditioner in my apartment isn't working.",
      ],
      ["Translate: すみません、道に迷いました。", "Excuse me, I'm lost."],
      [
        "Invite someone to a movie on Friday evening.\n___ you like to see a movie on Friday evening?",
        "Would you like to see a movie on Friday evening?",
      ],
      ["Translate: テーブルは二人です。", "A table for two, please."],
      [
        "Doctor visit: mild symptom + how long.\nI've had ___ for two days.",
        "I've had a sore throat for two days.",
      ],
      ["Translate: もう少し待っていただけますか？", "Could you wait a little longer, please?"],
      [
        "Hotel: request a wake-up call at 6:30 a.m.\n___ I have a wake-up call at 6:30 a.m., please?",
        "Could I have a wake-up call at 6:30 a.m., please?",
      ],
      ["Translate: この席、空いていますか？", "Is this seat taken?"],
      [
        "Friend is running late. Text them:\n___ will you be?",
        "How long will you be?",
      ],
      [
        "The shoes hurt your feet; you want a refund.\nI'd ___ to return these shoes for a refund, please.",
        "I'd like to return these shoes for a refund, please.",
      ],
    ]),
  },
  {
    titleJa: "助動詞（can / must / should）",
    titleEn: "Modal verbs (can, must, should)",
    cards: rows("Modals", [
      [
        "Your friend is stressed before an exam.\nYou ___ take a short break and breathe.",
        "You should take a short break and breathe.",
      ],
      ["Translate: ここでは写真を撮ってはいけません。", "You must not take photos here."],
      [
        "Ability: She ___ three languages fluently. (speak — can)",
        "She can speak three languages fluently.",
      ],
      ["Translate: もっと水を飲むべきです。", "You should drink more water."],
      [
        "Strong obligation: Visitors ___ their IDs at the gate.",
        "Visitors must show their IDs at the gate.",
      ],
      ["Translate: 明日までにこれを終えなければなりません。", "I must finish this by tomorrow."],
      [
        "Polite request: open the window (can/could).\n___ you open the window, please?",
        "Could you open the window, please?",
      ],
      ["Translate: 彼は泳げますが、深いプールは苦手です。", "He can swim, but he doesn't like deep pools."],
      [
        "Soft advice: you look sick.\nYou ___ see a doctor.",
        "You should see a doctor.",
      ],
      ["Translate: ここでタバコを吸ってはいけません。", "You can't smoke here."],
      [
        "Prohibition sign meaning: Employees ___ food in the lab.",
        "Employees must not eat food in the lab.",
      ],
      ["Translate: 早めに出発した方がいいですよ。", "You should leave earlier."],
      [
        "Ability question: ___ you ___ me tomorrow? (help)",
        "Can you help me tomorrow?",
      ],
      ["Translate: その書類に署名しなければなりません。", "You must sign that document."],
      [
        "Should vs must (nuance): For health, you ___ brush your teeth twice a day. (strong habit rule)",
        "You should brush your teeth twice a day.",
      ],
      ["Translate: そのドアは開かないかもしれません。", "That door might not open."],
      [
        "Permission: ___ I sit here?",
        "May I sit here?",
      ],
      ["Translate: 試験では電卓を使ってはいけません。", "You must not use a calculator on the exam."],
      [
        "It's raining hard.\nYou ___ take an umbrella.",
        "You should take an umbrella.",
      ],
      ["Translate: 彼女はピアノを弾けます。", "She can play the piano."],
      [
        "Obligation past: I ___ leave early yesterday. (have to)",
        "I had to leave early yesterday.",
      ],
    ]),
  },
  {
    titleJa: "理由を言う",
    titleEn: "Giving reasons",
    cards: rows("Reasons", [
      [
        "Opinion + reason: I like this neighborhood ___ it's quiet.",
        "I like this neighborhood because it's quiet.",
      ],
      ["Translate: 遅れたのは、電車が止まったからです。", "I'm late because the train stopped."],
      [
        "You can't go to a party (work is the reason).\nI can't come ___ I have to work late.",
        "I can't come because I have to work late.",
      ],
      ["Translate: 彼は疲れているので、家で休みたいと言った。", "He said he wants to rest at home because he's tired."],
      [
        "Reason with \"so\": It was noisy, ___ I closed the window.",
        "It was noisy, so I closed the window.",
      ],
      ["Translate: 私がその仕事を引き受けたのは、経験を積みたいからです。", "I took the job because I want to gain experience."],
      [
        "Because + noun phrase: I'm learning English ___ my career.",
        "I'm learning English for my career.",
      ],
      ["Translate: 彼女はお金を節約したいので、外食を減らした。", "She cut down on eating out because she wants to save money."],
      [
        "Answer why: A: Why did you choose this hotel?\nB: ___ (good reviews)",
        "Because it had good reviews.",
      ],
      ["Translate: 雨が降っていたので、試合は中止になった。", "The game was canceled because it was raining."],
      [
        "Two reasons: I'm tired ___ I didn't sleep well ___ I worked a double shift.",
        "I'm tired because I didn't sleep well and I worked a double shift.",
      ],
      ["Translate: そのレストランが好きなのは、料理が新鮮だからです。", "I like that restaurant because the food is fresh."],
      [
        "Explain preference: I prefer tea ___ it helps me relax.",
        "I prefer tea because it helps me relax.",
      ],
      ["Translate: 彼は忙しかったので、メールにすぐ返信できなかった。", "He couldn't reply to the email quickly because he was busy."],
      [
        "Because-clause first: ___ the traffic was bad, we missed the start.",
        "Because the traffic was bad, we missed the start.",
      ],
      ["Translate: 私が早退したのは、子供が病気だったからです。", "I left early because my child was sick."],
      [
        "You missed the bus. Give the reason in a short sentence.\nI'm late ___ I missed the bus.",
        "I'm late because I missed the bus.",
      ],
      ["Translate: 彼は練習したので、上手になった。", "He improved because he practiced."],
      [
        "Reason with \"since\": Since it's your first day, ___ . (be gentle — use \"we\" or \"I'll\")",
        "Since it's your first day, I'll show you around.",
      ],
      ["Translate: そのアプリが便利なのは、無料だからです。", "That app is convenient because it's free."],
      [
        "Polite: I can't eat nuts ___ I'm allergic.",
        "I can't eat nuts because I'm allergic.",
      ],
    ]),
  },
  {
    titleJa: "簡単な意見",
    titleEn: "Basic opinions (I think / I don't think)",
    cards: rows("Opinions", [
      [
        "Soft opinion: this movie is too long.\nI think ___ movie is too long.",
        "I think this movie is too long.",
      ],
      ["Translate: 私はそれが良いアイデアだとは思いません。", "I don't think that's a good idea."],
      [
        "Agree politely: A: The test was fair.\nB: ___",
        "I think so, too.",
      ],
      ["Translate: 彼はもっと休むべきだと思います。", "I think he should rest more."],
      [
        "Disagree gently: A: We should leave now.\nB: ___ (not ready)",
        "I don't think we're ready to leave yet.",
      ],
      ["Translate: その計画は現実的ではないと思います。", "I don't think that plan is realistic."],
      [
        "Opinion + reason: ___ online classes are convenient because you save commute time.",
        "I think online classes are convenient because you save commute time.",
      ],
      ["Translate: 私には難しすぎると思います。", "I think it's too difficult for me."],
      [
        "Hedging: ___ it might rain later, but I'm not sure.",
        "I think it might rain later, but I'm not sure.",
      ],
      ["Translate: 彼女の方が正しいと思います。", "I think she's right."],
      [
        "I don't think + positive verb (expect a negative meaning).\nI ___ he will come.",
        "I don't think he will come.",
      ],
      ["Translate: それは公平だと思います。", "I think that's fair."],
      [
        "Commuting by bike is healthy. Give your view.\n___ my opinion, commuting by bike is healthy.",
        "In my opinion, commuting by bike is healthy.",
      ],
      ["Translate: それは必要ないと思います。", "I don't think it's necessary."],
      [
        "Compare opinions: ___ Team A will win, but it's hard to predict.",
        "I think Team A will win, but it's hard to predict.",
      ],
      ["Translate: この本は面白いと思います。", "I think this book is interesting."],
      [
        "Politely disagree: A: This is the best ramen in town.\nB: ___ (good / not sure best)",
        "I think it's good, but I'm not sure it's the best.",
      ],
      ["Translate: 彼は来ないと思います。", "I don't think he'll come."],
      [
        "I feel like: ___ we should wait five more minutes.",
        "I feel like we should wait five more minutes.",
      ],
      ["Translate: その色の方が似合うと思います。", "I think that color suits you better."],
      [
        "Stronger (still polite): I'm not an expert, but ___ this answer is wrong.",
        "I'm not an expert, but I think this answer is wrong.",
      ],
    ]),
  },
  {
    titleJa: "頻度と習慣",
    titleEn: "Frequency & habits",
    cards: rows("Frequency", [
      [
        "Habit: I ___ eat breakfast at home on weekdays. (frequency adverb: usually / often / rarely)",
        "I usually eat breakfast at home on weekdays.",
      ],
      ["Translate: 私はたいてい自宅で仕事をします。", "I usually work from home."],
      [
        "Short answer to \"How often do you read?\"\nAbout ___ a week.",
        "About twice a week.",
      ],
      ["Translate: 彼はめったに遅刻しません。", "He is rarely late."],
      [
        "Sentence with \"often\": She ___ forgets her keys.",
        "She often forgets her keys.",
      ],
      ["Translate: 私は時々寿司を食べます。", "I sometimes eat sushi."],
      [
        "Never + present simple: I ___ sugar in my coffee.",
        "I never put sugar in my coffee.",
      ],
      ["Translate: 彼はいつも朝早く起きます。", "He always wakes up early in the morning."],
      [
        "Hardly ever: I ___ stay out past midnight.",
        "I hardly ever stay out past midnight.",
      ],
      ["Translate: 週末はよくハイキングに行きます。", "I often go hiking on weekends."],
      [
        "Usually vs used to (careful): I ___ drink soda every day, but now I don't.\nChoose the best opening.",
        "I used to drink soda every day, but now I don't.",
      ],
      ["Translate: 私はめったにテレビを見ません。", "I rarely watch TV."],
      [
        "Adverb placement: I have been to that museum ___ . (only once)",
        "I have been to that museum only once.",
      ],
      ["Translate: 彼女はたいてい徒歩で通勤します。", "She usually commutes on foot."],
      [
        "Short answer to \"How often…?\" (gym, swimming, etc.)\n___ or four times a month.",
        "Three or four times a month.",
      ],
      ["Translate: 私は朝はいつもコーヒーを飲みます。", "I always drink coffee in the morning."],
      [
        "Frequency with \"once\": We meet ___ a month for lunch.",
        "We meet once a month for lunch.",
      ],
      ["Translate: 彼は時々仕事で出張します。", "He sometimes travels for work."],
      [
        "Seldom: I ___ eat fast food nowadays.",
        "I seldom eat fast food nowadays.",
      ],
      ["Translate: 私は週に三回ジムに行きます。", "I go to the gym three times a week."],
      [
        "Often + position: My phone ___ dies before bedtime.",
        "My phone often dies before bedtime.",
      ],
    ]),
  },
  {
    titleJa: "語順（並べ替え）",
    titleEn: "Word order (reordering)",
    cards: rows("Reorder", [
      [
        "Reorder into one correct sentence:\nwant / I / to / go / to / the / store",
        "I want to go to the store.",
      ],
      [
        "Reorder:\ndid / you / where / last / summer / go",
        "Where did you go last summer?",
      ],
      ["Reorder:\nnever / I / have / tried / sushi", "I have never tried sushi."],
      ["Reorder:\nbecause / tired / I / was / I / early / left", "I left early because I was tired."],
      ["Reorder:\nshould / you / more / vegetables / eat", "You should eat more vegetables."],
      ["Reorder:\nme / can / you / help / with / this", "Can you help me with this?"],
      ["Reorder:\nthink / I / this / is / too / expensive", "I think this is too expensive."],
      ["Reorder:\noften / how / do / you / exercise", "How often do you exercise?"],
      ["Reorder:\nhas / she / lived / here / long / how", "How long has she lived here?"],
      ["Reorder:\ngoing / am / to / visit / I / my / friend", "I am going to visit my friend."],
      ["Reorder:\nthe / check / please / may / have / I", "May I have the check, please?"],
      ["Reorder:\nusually / breakfast / I / at / 7 / have", "I usually have breakfast at 7."],
      ["Reorder:\nbut / it / was / raining / we / still / went", "It was raining, but we still went."],
      ["Reorder:\nmust / you / your / seatbelt / fasten", "You must fasten your seatbelt."],
      ["Reorder:\nso / I / bought / one / umbrella / I / forgot / my", "I forgot my umbrella, so I bought one."],
      ["Reorder:\nthink / don't / I / that / is / safe", "I don't think that is safe."],
      ["Reorder:\nbeen / have / you / ever / to / Canada", "Have you ever been to Canada?"],
      ["Reorder:\nkind / very / she / is / and / patient", "She is very kind and patient."],
      ["Reorder:\nwill / we / meet / at / the / station / tomorrow", "We will meet at the station tomorrow."],
      ["Reorder:\nbecause / stayed / she / home / felt / she / sick", "She stayed home because she felt sick."],
      ["Reorder:\nshould / we / leave / now / I / think", "I think we should leave now."],
    ]),
  },
  {
    titleJa: "まとめ：短い会話",
    titleEn: "Putting it together (short conversations)",
    cards: rows("Integration", [
      [
        "A: What are you doing this weekend?\nB: ___ (visit a friend — natural)",
        "I'm going to visit my friend.",
      ],
      [
        "A: How was the interview?\nB: ___ (stressful / but okay — one sentence)",
        "It was stressful, but I think it went okay.",
      ],
      ["A: Why are you late?\nB: ___ (missed the bus)", "I'm late because I missed the bus."],
      [
        "A: Can you help me move on Saturday?\nB: ___ (sorry / work — polite decline + reason)",
        "I'm sorry, I can't because I have to work.",
      ],
      ["A: How often do you study English?\nB: ___", "I study English almost every day."],
      [
        "A: You look tired.\nB: ___ (didn't sleep well)",
        "I didn't sleep well last night.",
      ],
      ["A: Should we take a taxi?\nB: ___ (save money / take the train)", "We should take the train to save money."],
      [
        "A: Have you been to Kyoto?\nB: ___ (once / spring)",
        "I've been there once, in spring.",
      ],
      ["A: I think this café is too loud.\nB: ___ (agree / suggest leaving)", "I agree — maybe we should find another place."],
      [
        "A: May I sit here?\nB: ___ (yes / please)",
        "Yes, please do.",
      ],
      ["A: What do you think of the new teacher?\nB: ___ (strict / fair)", "She seems strict, but fair."],
      [
        "A: I'm nervous about the presentation.\nB: ___ (should / breathe — advice)",
        "You should take a deep breath and speak slowly.",
      ],
      ["A: How long have you lived here?\nB: ___ (two years)", "I've lived here for two years."],
      [
        "A: Do you want dessert?\nB: ___ (full / tea only)",
        "I'm full, so I'll just have tea.",
      ],
      ["A: Can I get the bill?\nB: ___ (sure / moment)", "Sure — I'll bring it in a moment."],
      [
        "A: Why do you like this neighborhood?\nB: ___ (quiet / close to park)",
        "Because it's quiet and close to a park.",
      ],
      ["A: I don't think he'll come.\nB: ___ (maybe / traffic)", "Maybe he's stuck in traffic."],
      [
        "A: We should leave soon.\nB: ___ (five more minutes — request)",
        "Can we wait five more minutes?",
      ],
      ["A: Is this seat taken?\nB: ___ (no / free)", "No, it's free."],
      [
        "A: What would you like to drink?\nB: ___ (hot green tea)",
        "Hot green tea, please.",
      ],
      ["A: I'm sorry I'm late.\nB: ___ (no problem / sit)", "No problem — please have a seat."],
    ]),
  },
];

function build() {
  const decks: Array<{
    id: string;
    titleJa: string;
    titleEn: string;
    sortOrder: number;
    cards: Int1Card[];
  }> = DECKS.map((d, di) => ({
    id: `study-i1-deck-${di}`,
    titleJa: d.titleJa,
    titleEn: d.titleEn,
    sortOrder: di,
    cards: d.cards.map(
      ([frontJa, backEn], ci): Int1Card => ({
        id: `study-i1-d${di}-c${ci}`,
        frontJa,
        backEn,
        sortOrder: ci,
      }),
    ),
  }));

  const reorderDeck = decks[10];
  if (!reorderDeck || reorderDeck.titleEn !== "Word order (reordering)") {
    throw new Error("Expected deck 10 to be Word order (reordering)");
  }
  reorderDeck.cards = reorderDeck.cards.map((c) => {
    const inferred = inferReorderExerciseFromSlashLines(c.frontJa, c.backEn, c.id);
    if (!inferred) {
      throw new Error(`Reorder exercise infer failed for ${c.id}`);
    }
    return { ...c, exercise: inferred };
  });

  const d0 = decks[0];
  if (!d0) throw new Error("Missing deck 0");
  const lastIdx = d0.cards.length - 1;
  d0.cards[lastIdx] = {
    ...d0.cards[lastIdx]!,
    id: "study-i1-d0-c20",
    sortOrder: lastIdx,
    frontJa:
      "Two-step practice (English only).\n\nComplete both steps — you will submit after step 2.",
    backEn: "I'm planning to see my mother next Friday evening.",
    exercise: {
      kind: "multi_step",
      steps: [
        {
          prompt: "Step 1 — translate into natural English:\n来週の金曜日、母に会う予定です。",
          canonical: "I'm going to see my mother next Friday.",
        },
        {
          prompt:
            'Step 2 — add a time of day ("evening") and keep the sentence natural.\nWrite your final English sentence.',
          canonical: "I'm planning to see my mother next Friday evening.",
        },
      ],
    },
  };

  const items = [
    {
      id: "study-i1-a0",
      promptJa: "「I have never tried sushi.」に最も近い文は？",
      promptEn: "Which sentence is closest to “I have never tried sushi.”?",
      options: [
        "I have tried sushi many times.",
        "I have never tried sushi.",
        "I will try sushi tomorrow.",
        "I don't like fish, so I never eat.",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a1",
      promptJa: "丁寧に断るのに自然なのは？",
      promptEn: "Which is a natural polite decline with a reason?",
      options: [
        "No.",
        "I'm sorry, I can't because I have to work late.",
        "Don't ask me.",
        "Maybe not never.",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a2",
      promptJa: "「How often do you exercise?」の意味に近いのは？",
      promptEn: "Which question asks about frequency of exercise?",
      options: [
        "How long do you exercise?",
        "How often do you exercise?",
        "How much do you exercise?",
        "How far do you exercise?",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a3",
      promptJa: "助言として自然なのは？",
      promptEn: "Which sentence gives natural advice before an exam?",
      options: [
        "You must be the boss.",
        "You should take a short break and breathe.",
        "You never should study.",
        "You can to sleep in class.",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a4",
      promptJa: "理由をつなぐのに最も適切なのは？",
      promptEn: "Which connector best expresses a reason?",
      options: ["but", "because", "so", "and"],
      correctIndex: 1,
    },
    {
      id: "study-i1-a5",
      promptJa: "「I don't think that's a good idea.」に近い意味は？",
      promptEn: "Which sentence is closest to “I don't think that's a good idea.”?",
      options: [
        "I think that's a great idea.",
        "I don't think that's a good idea.",
        "I know that's a good idea.",
        "I will think that's idea.",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a6",
      promptJa: "カフェで注文として自然なのは？",
      promptEn: "Which is a natural café order?",
      options: [
        "Give me coffee now.",
        "Can I get a medium hot latte to go, please?",
        "I want coffee medium hot go.",
        "Coffee! Medium! Go!",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a7",
      promptJa: "並べ替えの正しい文はどれ？\nwords: want / I / to / go / to / the / store",
      promptEn: "Which sentence correctly orders: want / I / to / go / to / the / store?",
      options: [
        "I go want to the store to.",
        "I want to go to the store.",
        "To store the I want go to.",
        "Want I to store go the to.",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a8",
      promptJa: "「How long have you lived here?」に対する自然な答えは？",
      promptEn: "Which is a natural answer to “How long have you lived here?”?",
      options: [
        "I live here always.",
        "I've lived here for two years.",
        "I live here tomorrow.",
        "I have lived here never.",
      ],
      correctIndex: 1,
    },
    {
      id: "study-i1-a9",
      promptJa: "会話の続きとして自然な B は？\nA: What are you doing this weekend?",
      promptEn: "Which is a natural B line?\nA: What are you doing this weekend?",
      options: [
        "I'm going to visit my friend.",
        "Yes, I am weekend.",
        "I doing this.",
        "Weekend is Saturday.",
      ],
      correctIndex: 0,
    },
  ];

  const doc = {
    version: 1 as const,
    levelCode: StudyLevelCode.INTERMEDIATE_1,
    decks,
    assessment: { passingScore: 72, items },
  };

  return intermediate1LevelFileSchema.parse(doc);
}

function main() {
  const validated = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  const total = validated.decks.reduce((s, d) => s + d.cards.length, 0);
  console.log(`Wrote ${OUT} (${validated.decks.length} decks, ${total} cards)`);
}

main();
