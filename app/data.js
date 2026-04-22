window.debatebook = {
  meta: {
    title: "Iran Nuclear Negotiations",
    refreshDate: "2026-04-22",
    question:
      "What are the actual facts around Iran's nuclear capability, uranium enrichment, inspections, and negotiations, and how should the claim 'Iran was close to a nuclear weapon' be understood?",
    factCards: [
      {
        value: "408.6 kg",
        label: "IAEA May 2025 estimate of uranium enriched up to 60% U-235 in UF6 form."
      },
      {
        value: "440.9 kg",
        label: "Later IAEA-reported pre-strike 60% stockpile figure cited in 2026 AP reporting."
      },
      {
        value: "3-5%",
        label: "Typical U-235 enrichment range for most commercial nuclear power reactor fuel."
      },
      {
        value: "90%",
        label: "Common shorthand for weapons-grade uranium. Reaching it is not the same as building a weapon."
      }
    ]
  },
  agents: [
    {
      id: "arbiter",
      name: "Investigative Journalist Arbiter",
      initials: "IJ",
      color: "#1f6f68",
      oneLine:
        "A document-sniffing moderator who treats every slogan like it just failed airport security.",
      personaName: "Mara Vale",
      roleTitle: "Investigative moderator",
      archetype: "The document hawk",
      coreBelief:
        "Democracy gets worse when people confuse a strong interpretation with a verified fact.",
      quirks: [
        "Keeps a mental spreadsheet of every number mentioned.",
        "Says 'slow down' right before making everyone uncomfortable.",
        "Loves boring primary documents more than dramatic speeches."
      ],
      debateStyle:
        "Calm, surgical, slightly dry. She lets people run, then pins the exact claim to the wall.",
      catchphrases: [
        "What would we have to verify for that to be true?",
        "That is an inference, not a fact yet."
      ],
      values: ["Verification", "Precision", "Institutional memory"],
      fullPrompt:
        "I am an investigative journalist and debate moderator. My identity is truth-seeking, skeptical, and evidence-first. I am not neutral between true and false claims, but I am fair to competing interpretations when the evidence is incomplete.",
      sourceDiet: [
        "IAEA and UN records",
        "Official intelligence and congressional documents",
        "AP, Reuters, BBC, AFP, and straight-news reporting",
        "Expert analysis only after primary evidence is located"
      ],
      instincts: [
        "Turn rhetoric into testable claims",
        "Separate enrichment, breakout, weaponization, and delivery",
        "Make both sides update after corrections"
      ],
      blindSpots: [
        "Can underweight political urgency when technical evidence is incomplete",
        "Can sound too severe when a claim is merely imprecise rather than false"
      ],
      correctionHistory: [
        "Forced the pro-pressure side to say 'fissile-material breakout' instead of 'had a bomb'.",
        "Forced the diplomacy side to concede 60% enrichment is a serious proliferation warning."
      ],
      biasLens:
        "Defaults to suspicion of neat narratives. Strong documents move this agent; vibes get politely dissected.",
      compass: { x: 46, y: 28 },
      topClaimIds: ["C05", "C10", "C35", "C48", "C49"]
    },
    {
      id: "republican",
      name: "Trump and Republican Coalition Advocate",
      initials: "RC",
      color: "#b74343",
      oneLine:
        "A maximum-pressure hawk: if Iran has near-bomb material, the clock is the argument.",
      personaName: "Cal Rourke",
      roleTitle: "Maximum-pressure advocate",
      archetype: "The red-team hawk",
      coreBelief:
        "Hostile regimes exploit hesitation, and deterrence only works when consequences feel real.",
      quirks: [
        "Talks in clocks, leverage, and red lines.",
        "Treats uncertainty as something adversaries weaponize.",
        "Reads official statements like box scores after a hard-fought game."
      ],
      debateStyle:
        "Fast, combative, and pressure-oriented. He is strongest on risk, weakest when he compresses capability into certainty.",
      catchphrases: [
        "The clock is the argument.",
        "You do not wait for the alarm after the house is already smoking."
      ],
      values: ["Deterrence", "Leverage", "National strength"],
      fullPrompt:
        "I am a synthesis agent representing the public arguments made by President Trump, the Trump administration, major Republican political figures, conservative policy voices, and conservative media sources. I paraphrase and cite public arguments from those sources, not private beliefs or impersonation.",
      sourceDiet: [
        "White House and administration statements",
        "Republican congressional and security-hawk arguments",
        "Conservative media and policy shops",
        "IAEA stockpile numbers used to support urgency"
      ],
      instincts: [
        "Treat short breakout timelines as strategic emergencies",
        "Prefer leverage, sanctions, and force-backed diplomacy",
        "Emphasize Iranian concealment and inspection gaps"
      ],
      blindSpots: [
        "Can slide from 'could produce weapons-grade uranium' into 'has a nuclear weapon'.",
        "Can overweight official damage claims before independent verification."
      ],
      correctionHistory: [
        "Narrowed 'Iran had a bomb' to 'Iran had enough 60% material for rapid further enrichment'.",
        "Marked White House strike-success claims as official claims pending independent verification."
      ],
      biasLens:
        "Reads uncertainty as danger. If inspectors cannot verify the material, this agent sees leverage and pressure as rational, not reckless.",
      compass: { x: 82, y: 72 },
      topClaimIds: ["C14", "C21", "C37", "C41", "C44"]
    },
    {
      id: "democratic",
      name: "Democratic Opposition Advocate",
      initials: "DO",
      color: "#3454d1",
      oneLine:
        "A diplomacy-and-legality critic: yes, enrichment is scary, but evidence still has to do the work.",
      personaName: "Nadia Cross",
      roleTitle: "Diplomacy and legality critic",
      archetype: "The process realist",
      coreBelief:
        "Bad process creates bad strategy, especially when war, inspections, and nuclear ambiguity collide.",
      quirks: [
        "Always asks who had authority to decide.",
        "Keeps separating capability, intent, and weaponization even when everyone wants a headline.",
        "Trusts expert caution, but gets impatient with lazy reassurance."
      ],
      debateStyle:
        "Measured, lawyerly, and quietly sharp. She concedes danger, then asks whether the proposed cure makes verification worse.",
      catchphrases: [
        "Capability is not intent.",
        "If the endgame is inspections, do not destroy your inspection trail."
      ],
      values: ["Legality", "Diplomacy", "Inspection access"],
      fullPrompt:
        "I am a synthesis agent representing public arguments made by Democratic officials, anti-Trump and anti-Republican commentators, major newspapers, liberal policy voices, and critical media figures. I paraphrase and cite public arguments from those sources, not private beliefs or impersonation.",
      sourceDiet: [
        "Democratic congressional statements and war-powers arguments",
        "Mainstream investigative and diplomatic reporting",
        "Arms-control experts and nonproliferation analysts",
        "Humanitarian, economic, and legal critiques"
      ],
      instincts: [
        "Separate capability from intent",
        "Ask whether diplomacy was still available",
        "Demand legal authority and post-strike verification"
      ],
      blindSpots: [
        "Can make 'not building a weapon' sound more reassuring than a 60% stockpile warrants.",
        "Can treat process failures as if they automatically answer the security question."
      ],
      correctionHistory: [
        "Conceded the 60% stockpile creates a real rapid-breakout problem.",
        "Narrowed 'civilian enrichment' claims after the arbiter noted 60% has no ordinary power-reactor rationale."
      ],
      biasLens:
        "Reads uncertainty as a reason to preserve inspections and diplomacy. It treats legal process as part of security, not decoration.",
      compass: { x: 22, y: 32 },
      topClaimIds: ["C35", "C38", "C40", "C42", "C48"]
    }
  ],
  sources: [
    {
      id: "S01",
      title: "Uranium Enrichment",
      outlet: "U.S. Nuclear Regulatory Commission",
      author: "NRC",
      date: "2020-12-02",
      accessed: "2026-04-22",
      tier: "Technical primary",
      posture: "U.S. nuclear regulator",
      url: "https://www.nrc.gov/materials/fuel-cycle-fac/ur-enrichment.html",
      summary:
        "Explains commercial reactor enrichment, including that U-235 is typically enriched to 3 to 5 percent for nuclear fuel."
    },
    {
      id: "S02",
      title: "What is High-Assay Low-Enriched Uranium?",
      outlet: "U.S. Department of Energy",
      author: "Office of Nuclear Energy",
      date: "2024-11-20",
      accessed: "2026-04-22",
      tier: "Technical primary",
      posture: "U.S. government nuclear-energy explainer",
      url: "https://www.energy.gov/ne/articles/what-high-assay-low-enriched-uranium-haleu",
      summary:
        "Defines HALEU as uranium enriched between 5 percent and less than 20 percent, used by many advanced reactor designs."
    },
    {
      id: "S03",
      title: "Verification and monitoring in Iran in light of UNSCR 2231",
      outlet: "International Atomic Energy Agency",
      author: "IAEA Director General",
      date: "2025-05-31",
      accessed: "2026-04-22",
      tier: "Primary technical report",
      posture: "UN nuclear watchdog",
      url: "https://www.iaea.org/sites/default/files/25/06/gov2025-24.pdf",
      summary:
        "IAEA report estimating Iran's enriched uranium stockpile as of May 17, 2025, including 408.6 kg enriched up to 60% U-235 in UF6 form."
    },
    {
      id: "S04",
      title: "Director General Grossi's statement to the UN Security Council",
      outlet: "International Atomic Energy Agency",
      author: "Rafael Mariano Grossi",
      date: "2025-06-20",
      accessed: "2026-04-22",
      tier: "Primary statement",
      posture: "UN nuclear watchdog",
      url: "https://www.iaea.org/newscenter/statements/iaea-director-general-grossis-statement-to-unsc-on-situation-in-iran-20-june-2025",
      summary:
        "Grossi said more than 400 kg of Iran's stockpile was enriched up to 60% and that resumed inspections were essential to verify non-diversion."
    },
    {
      id: "S05",
      title: "Iran accelerates production of near weapons-grade uranium",
      outlet: "AP News",
      author: "Jon Gambrell",
      date: "2025-02-26",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/0b11a99a7364f9a43e1c83b220114d45",
      summary:
        "AP reported IAEA figures of 274.8 kg of 60% enriched uranium as of February 8, 2025 and explained the 42 kg theoretical bomb benchmark if further enriched."
    },
    {
      id: "S06",
      title: "Iran has amassed even more near weapons-grade uranium",
      outlet: "AP News",
      author: "AP staff",
      date: "2025-05-31",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/7f6c9962c1e4199e951559096bcf5cc0",
      summary:
        "AP reported the May 2025 IAEA figure of 408.6 kg enriched up to 60%, nearly 50% higher than the February report."
    },
    {
      id: "S07",
      title: "Iran isn't actively enriching uranium, UN nuclear chief tells AP",
      outlet: "AP News",
      author: "Jon Gambrell",
      date: "2025-10-29",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/iran-nuclear-program-grossi-uranium-543ad3503ece5de766e08123f6e71f9c",
      summary:
        "Grossi told AP inspectors had not seen satellite evidence of resumed enrichment beyond pre-war levels, while the 60% material remained in Iran and required verification."
    },
    {
      id: "S08",
      title: "Iran's president orders suspension of cooperation with IAEA",
      outlet: "AP News",
      author: "Jon Gambrell",
      date: "2025-07-02",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/iran-nuclear-iaea-cooperation-8bbdc81b9199d8d179d0fb2e1b8dac2a",
      summary:
        "AP reported Iran's president ordered suspension of cooperation with the IAEA after U.S. and Israeli airstrikes."
    },
    {
      id: "S09",
      title: "IAEA unable to verify whether Iran has suspended enrichment",
      outlet: "AP News",
      author: "AP staff",
      date: "2026-02-27",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/ccf574a324504b985f4b158f9d3d6941",
      summary:
        "AP reported an IAEA assessment that it could not verify suspension of enrichment-related activities or stockpile size at affected facilities."
    },
    {
      id: "S10",
      title: "Securing Iran's enriched uranium by force would be risky and complex",
      outlet: "AP News",
      author: "AP staff",
      date: "2026-04-01",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news with expert comments",
      url: "https://apnews.com/article/1fd6de24bd1e6c3a4945d58d3f777462",
      summary:
        "Experts and former officials told AP that a U.S. force operation to secure Iran's uranium stockpile would be complex, risky, and lengthy."
    },
    {
      id: "S11",
      title: "U.S. considers $20 billion cash-for-uranium deal with Iran",
      outlet: "Axios",
      author: "Barak Ravid",
      date: "2026-04-17",
      accessed: "2026-04-22",
      tier: "Reported diplomacy scoop",
      posture: "Reported analysis",
      url: "https://www.axios.com/2026/04/17/iran-us-deal-20-billion-frozen-funds-uranium",
      summary:
        "Axios reported a possible MOU involving frozen funds, Iran's buried enriched uranium stockpile, and a voluntary enrichment moratorium."
    },
    {
      id: "S12",
      title: "Iranian official says U.S. 'maximalist' demands stall talks",
      outlet: "AP News",
      author: "AP staff",
      date: "2026-04-18",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/40d8e43e3c7b5a23cda6783b064b9dbf",
      summary:
        "AP reported an Iranian official's claim that U.S. maximalist demands were blocking face-to-face negotiations."
    },
    {
      id: "S13",
      title: "Iran's foreign minister says he will have indirect talks with U.S. envoy",
      outlet: "AP News",
      author: "Jon Gambrell",
      date: "2025-04-08",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/33a517aa8149925ae5beafe2b7e3e6d4",
      summary:
        "AP reported that Iranian Foreign Minister Abbas Araghchi would meet U.S. envoy Steve Witkoff in Oman for indirect nuclear talks."
    },
    {
      id: "S14",
      title: "Iran, U.S. conclude constructive nuclear talks in Oman",
      outlet: "Al Jazeera",
      author: "Al Jazeera staff",
      date: "2025-04-12",
      accessed: "2026-04-22",
      tier: "International reporting",
      posture: "Straight news",
      url: "https://www.aljazeera.com/news/2025/4/12/iranian-us-delegations-set-to-begin-high-stakes-nuclear-talks-in-oman",
      summary:
        "Reported that Iran and the U.S. described Oman talks as constructive and agreed to meet again."
    },
    {
      id: "S15",
      title: "Iran and U.S. talks upbeat despite disagreement over uranium enrichment",
      outlet: "The Guardian",
      author: "Patrick Wintour",
      date: "2025-05-11",
      accessed: "2026-04-22",
      tier: "Major newspaper reporting",
      posture: "Reported diplomacy analysis",
      url: "https://www.theguardian.com/world/2025/may/11/iran-and-us-talks-upbeat-despite-disagreement-over-uranium-enrichment",
      summary:
        "Reported the fourth Oman round and disagreement over whether Iran could retain enrichment technology."
    },
    {
      id: "S16",
      title: "U.S. gives Iran updated nuclear deal offer",
      outlet: "Axios",
      author: "Barak Ravid",
      date: "2025-05-31",
      accessed: "2026-04-22",
      tier: "Reported diplomacy scoop",
      posture: "Reported analysis",
      url: "https://www.axios.com/2025/05/31/iran-nuclear-deal-proposal-witkoff",
      summary:
        "Reported U.S. proposal details, including a regional enrichment consortium idea and the central dispute over domestic enrichment."
    },
    {
      id: "S17",
      title: "DNI Gabbard opening statement on 2025 Annual Threat Assessment",
      outlet: "Office of the Director of National Intelligence",
      author: "Director of National Intelligence",
      date: "2025-03-25",
      accessed: "2026-04-22",
      tier: "Primary U.S. intelligence statement",
      posture: "U.S. government assessment",
      url: "https://www.dni.gov/index.php/newsroom/congressional-testimonies/congressional-testimonies-2025/4059-ata-opening-statement-as-prepared",
      summary:
        "Stated that the U.S. intelligence community assessed Iran was not building a nuclear weapon and Khamenei had not reauthorized the suspended program."
    },
    {
      id: "S18",
      title: "U.S. spies said Iran wasn't building a nuclear weapon. Trump dismisses that assessment",
      outlet: "AP News",
      author: "AP staff",
      date: "2025-06-17",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/51c8d85d536f8628870c110ac05bb518",
      summary:
        "Reported Trump's 'very close' claim and his dismissal of DNI testimony that Iran was not building a nuclear weapon."
    },
    {
      id: "S19",
      title: "Meeks statement on U.S.-Iran ceasefire",
      outlet: "House Foreign Affairs Committee Democrats",
      author: "Rep. Gregory Meeks",
      date: "2026-04-07",
      accessed: "2026-04-22",
      tier: "Official opposition statement",
      posture: "Democratic congressional argument",
      url: "https://democrats-foreignaffairs.house.gov/2026/4/meeks-issues-statement-on-u-s-iran-ceasefire",
      summary:
        "Meeks welcomed a ceasefire but argued Congress needed answers on why Trump took the U.S. to war, including costs and casualties."
    },
    {
      id: "S20",
      title: "Meeks remarks on Iran War Powers Resolution",
      outlet: "House Foreign Affairs Committee Democrats",
      author: "Rep. Gregory Meeks",
      date: "2026-04-16",
      accessed: "2026-04-22",
      tier: "Official opposition statement",
      posture: "Democratic congressional argument",
      url: "https://democrats-foreignaffairs.house.gov/2026/4/meeks-delivers-remarks-during-floor-debate-on-iran-war-powers-resolution",
      summary:
        "Meeks argued Trump launched war without congressional authorization while diplomacy remained active."
    },
    {
      id: "S21",
      title: "Operation Epic Fury statement",
      outlet: "White House",
      author: "The White House",
      date: "2026-04-06",
      accessed: "2026-04-22",
      tier: "Official administration statement",
      posture: "Trump administration argument",
      url: "https://www.whitehouse.gov/releases/2026/04/peace-through-strength-operation-epic-fury-crushes-iranian-threat-as-ceasefire-takes-hold/",
      summary:
        "Official White House case that Operation Epic Fury met military objectives and degraded Iranian capabilities."
    },
    {
      id: "S22",
      title: "Zero Enrichment: An Unnecessary, Unrealistic Objective",
      outlet: "Arms Control Association",
      author: "Kelsey Davenport",
      date: "2025-06-01",
      accessed: "2026-04-22",
      tier: "Expert analysis",
      posture: "Arms-control advocacy and analysis",
      url: "https://www.armscontrol.org/issue-briefs/2025-06/zero-enrichment-unnecessary-unrealistic-objective-prevent-iranian-bomb",
      summary:
        "Argues zero enrichment is not necessary or realistic, while acknowledging very short breakout timelines from Iran's 60% stockpile."
    },
    {
      id: "S23",
      title: "Analysis of IAEA Iran Verification and Monitoring Report - May 2025",
      outlet: "Institute for Science and International Security",
      author: "David Albright and colleagues",
      date: "2025-06-01",
      accessed: "2026-04-22",
      tier: "Expert technical analysis",
      posture: "Nonproliferation analysis",
      url: "https://isis-online.org/isis-reports/analysis-of-iaea-iran-verification-and-monitoring-report-may-2025/",
      summary:
        "Assesses that Iran could convert its 60% stock into enough weapon-grade uranium for multiple weapons in weeks."
    },
    {
      id: "S24",
      title: "Iran likely transferred highly enriched uranium to Isfahan before the June strikes",
      outlet: "Bulletin of the Atomic Scientists",
      author: "Bulletin analysis",
      date: "2026-03-01",
      accessed: "2026-04-22",
      tier: "Expert analysis",
      posture: "Nuclear-risk analysis",
      url: "https://thebulletin.org/2026/03/analysis-iran-likely-transferred-highly-enriched-uranium-to-isfahan-before-the-june-strikes/",
      summary:
        "Uses IAEA reporting and imagery analysis to argue much of Iran's 60% stockpile was likely moved to or stored at Isfahan."
    },
    {
      id: "S25",
      title: "Iran's top leader rejects talks with the U.S. over missile range and regional influence",
      outlet: "AP News",
      author: "AP staff",
      date: "2025-03-08",
      accessed: "2026-04-22",
      tier: "Wire reporting",
      posture: "Straight news",
      url: "https://apnews.com/article/b86262ea0b1fed38df40855deaf79258",
      summary:
        "Reported Khamenei's rejection of U.S. pressure aimed at restricting missiles and regional influence."
    },
    {
      id: "S26",
      title: "Iran rejects IAEA report alleging increased enriched uranium stockpile",
      outlet: "Al Jazeera",
      author: "Al Jazeera staff",
      date: "2025-05-31",
      accessed: "2026-04-22",
      tier: "International reporting",
      posture: "Straight news with Iranian response",
      url: "https://www.aljazeera.com/news/2025/5/31/iran-increases-stockpile-of-enriched-uranium-by-50-percent-iaea-says",
      summary:
        "Reported IAEA 408.6 kg figure and Iranian statements that nuclear weapons were unacceptable while Iran rejected the report's framing."
    }
  ],
  claims: [
    {
      id: "C01",
      claim:
        "Most commercial power reactor fuel is enriched to roughly 3 to 5 percent U-235.",
      claimant_type: "institution",
      claimant_name: "U.S. Nuclear Regulatory Commission",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S01"],
      counter_source_ids: ["S02"],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "Your 'civilian use' intuition is directionally right for ordinary power reactors, but it needs nuance because some advanced reactor concepts use HALEU below 20%.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C02",
      claim:
        "HALEU is enriched between 5 percent and less than 20 percent, which means some civilian advanced-reactor uses exceed the usual 3 to 5 percent range.",
      claimant_type: "institution",
      claimant_name: "U.S. Department of Energy",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S02"],
      counter_source_ids: [],
      used_by_agents: ["arbiter"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "This prevents the debate from overstating the civilian line: above 5% is not automatically military, but 60% is far beyond HALEU.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C03",
      claim:
        "Uranium enriched to 60 percent U-235 is high-enriched uranium and far above normal commercial power-reactor fuel needs.",
      claimant_type: "expert",
      claimant_name: "Nuclear regulators and nonproliferation experts",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S01", "S02", "S05"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D02", "D05"],
      arbiter_summary:
        "The exact civilian-use debate does not make 60% ordinary. It is an alarming enrichment level for a non-nuclear-weapon state.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C04",
      claim:
        "Weapons-grade uranium is commonly described around 90 percent U-235, and AP described 60 percent as a short technical step away from that level.",
      claimant_type: "outlet",
      claimant_name: "AP News",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S05"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican"],
      debate_moment_ids: ["D02"],
      arbiter_summary:
        "This supports urgency about enrichment, but it still does not prove weaponization or delivery capability.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C05",
      claim:
        "As of May 17, 2025, IAEA estimated Iran had 408.6 kg of uranium enriched up to 60% U-235 in UF6 form.",
      claimant_type: "institution",
      claimant_name: "IAEA",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S03", "S06"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D01", "D02", "D06"],
      arbiter_summary:
        "This is the core number. It is not a vibe; it is the starting datum for the whole debate.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C06",
      claim:
        "IAEA estimated Iran's total enriched uranium stockpile at 9,247.6 kg as of May 17, 2025.",
      claimant_type: "institution",
      claimant_name: "IAEA",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S03"],
      counter_source_ids: [],
      used_by_agents: ["arbiter"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "The 60% figure sits inside a much larger stockpile, which matters for negotiation and safeguards context.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C07",
      claim:
        "IAEA's May 2025 UF6 breakdown listed 2,221.4 kg up to 2%, 5,508.8 kg up to 5%, 274.5 kg up to 20%, and 408.6 kg up to 60%.",
      claimant_type: "institution",
      claimant_name: "IAEA",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S03"],
      counter_source_ids: [],
      used_by_agents: ["arbiter"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "The ladder matters: a stockpile can be alarming by both amount and enrichment level.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C08",
      claim:
        "IAEA reported 2.0 kg of uranium enriched up to 60% in forms other than UF6 as of May 17, 2025.",
      claimant_type: "institution",
      claimant_name: "IAEA",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S03"],
      counter_source_ids: [],
      used_by_agents: ["arbiter"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "This keeps the form question honest: the big headline figure refers to UF6 in uranium mass, not every physical form of 60% material.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C09",
      claim:
        "IAEA said its JCPOA-related verification and monitoring were seriously affected by Iran's cessation of commitments and removal of monitoring equipment.",
      claimant_type: "institution",
      claimant_name: "IAEA",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S03"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D04"],
      arbiter_summary:
        "This is why confidence is not just about kilograms. Continuity of knowledge is part of the evidence.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C10",
      claim:
        "Grossi told the UN Security Council in June 2025 that more than 400 kg of Iran's stockpile was enriched up to 60% and inspections were essential to verify non-diversion.",
      claimant_type: "expert",
      claimant_name: "Rafael Mariano Grossi",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S04"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D04", "D08"],
      arbiter_summary:
        "This is the arbiter's favorite sentence: alarming material plus the need to verify it has not been diverted.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C11",
      claim:
        "Grossi warned that attacks on nuclear materials and facilities would make verification more difficult.",
      claimant_type: "expert",
      claimant_name: "Rafael Mariano Grossi",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S04"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D08"],
      arbiter_summary:
        "A strike can damage capabilities while also damaging the inspection record. Both can be true, which annoys tidy arguments.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C12",
      claim:
        "AP reported an IAEA figure of 274.8 kg of 60% enriched uranium as of February 8, 2025.",
      claimant_type: "outlet",
      claimant_name: "AP News",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S05"],
      counter_source_ids: [],
      used_by_agents: ["arbiter"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "This shows the May number was not static; the 60% stockpile was rising quickly.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C13",
      claim:
        "AP reported Iran's 60% stockpile was 182.3 kg in November 2024 and 164.7 kg in August 2024.",
      claimant_type: "outlet",
      claimant_name: "AP News",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S05"],
      counter_source_ids: [],
      used_by_agents: ["arbiter"],
      debate_moment_ids: ["D01"],
      arbiter_summary:
        "The growth trend is part of why hawkish arguments got traction.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C14",
      claim:
        "AP reported that roughly 42 kg of 60% enriched uranium is theoretically enough for one atomic bomb if further enriched to 90%.",
      claimant_type: "outlet",
      claimant_name: "AP News",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S05"],
      counter_source_ids: [],
      used_by_agents: ["republican", "arbiter"],
      debate_moment_ids: ["D02", "D06"],
      arbiter_summary:
        "This is a fissile-material yardstick, not a statement that Iran had built a deliverable bomb.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C15",
      claim:
        "IAEA language cited by AP described Iran as the only non-nuclear-weapon state producing such high-enriched uranium and called it a serious concern.",
      claimant_type: "institution",
      claimant_name: "IAEA via AP",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S05"],
      counter_source_ids: [],
      used_by_agents: ["republican", "arbiter"],
      debate_moment_ids: ["D02"],
      arbiter_summary:
        "This is a strong technical warning and a weak standalone proof of weaponization. Keep both clauses.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C16",
      claim:
        "Grossi told AP in October 2025 that the 60% enriched material was still in Iran and needed confirmation against diversion.",
      claimant_type: "expert",
      claimant_name: "Rafael Mariano Grossi",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S07"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D04", "D08"],
      arbiter_summary:
        "This is the post-strike uncertainty center: the material did not vanish from the problem.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C17",
      claim:
        "Grossi told AP inspectors had not seen satellite evidence that Iran accelerated enrichment beyond what existed before the June 2025 war.",
      claimant_type: "expert",
      claimant_name: "Rafael Mariano Grossi",
      category: "verified",
      status: "verified",
      confidence: "Medium-high",
      evidence_source_ids: ["S07"],
      counter_source_ids: ["S09"],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D04"],
      arbiter_summary:
        "Useful but limited: satellite imagery is not the same as full inspector access.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C18",
      claim:
        "AP reported that inspectors had been unable to fully access Iranian nuclear sites after the war.",
      claimant_type: "outlet",
      claimant_name: "AP News",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S07", "S09"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D04", "D08"],
      arbiter_summary:
        "Limited access makes both reassurance and worst-case certainty weaker.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C19",
      claim:
        "AP reported Iran's president ordered suspension of cooperation with the IAEA after U.S. and Israeli strikes.",
      claimant_type: "government",
      claimant_name: "Iranian presidency via AP",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S08"],
      counter_source_ids: [],
      used_by_agents: ["democratic", "arbiter"],
      debate_moment_ids: ["D08"],
      arbiter_summary:
        "The anti-war side uses this to argue strikes worsened verification. The hawkish side says Iran chose obstruction.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C20",
      claim:
        "AP reported in February 2026 that IAEA could not verify whether Iran had suspended all enrichment-related activities or the stockpile size at affected facilities.",
      claimant_type: "institution",
      claimant_name: "IAEA via AP",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S09"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D04", "D08"],
      arbiter_summary:
        "This is the current uncertainty anchor. It supports urgency and skepticism at the same time.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C21",
      claim:
        "AP reported that IAEA maintained Iran had 440.9 kg of uranium enriched up to 60% before the attacks.",
      claimant_type: "institution",
      claimant_name: "IAEA via AP",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S09", "S10"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican"],
      debate_moment_ids: ["D02", "D06"],
      arbiter_summary:
        "This is the later version of the user's 400 kg example. The order of magnitude is not disputed; the exact status after strikes is.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C22",
      claim:
        "Experts and former officials told AP that a force operation to secure Iran's enriched uranium would be complex, risky, lengthy, and involve chemical/radiological hazards.",
      claimant_type: "expert",
      claimant_name: "Experts cited by AP",
      category: "verified",
      status: "likely",
      confidence: "Medium-high",
      evidence_source_ids: ["S10"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D08"],
      arbiter_summary:
        "Important practical constraint: 'just go get it' is not a button on a dashboard.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C23",
      claim:
        "Axios reported the U.S. considered a cash-for-uranium arrangement involving roughly $20 billion in frozen Iranian funds.",
      claimant_type: "outlet",
      claimant_name: "Axios",
      category: "political",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S11"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "A diplomacy signal, not a confirmed final deal. Treat as reported negotiation state.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C24",
      claim:
        "Axios reported U.S. negotiators were focused on nearly 2,000 kg of enriched uranium, including around 450 kg enriched to 60%, believed buried in underground facilities.",
      claimant_type: "outlet",
      claimant_name: "Axios",
      category: "political",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S11"],
      counter_source_ids: ["S09"],
      used_by_agents: ["republican", "arbiter"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "This updates the negotiation stakes, but the exact location and access remain uncertain.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C25",
      claim:
        "AP reported an Iranian official said U.S. maximalist demands were stalling face-to-face talks.",
      claimant_type: "government",
      claimant_name: "Iranian official via AP",
      category: "political",
      status: "verified",
      confidence: "High as a reported claim",
      evidence_source_ids: ["S12"],
      counter_source_ids: ["S21"],
      used_by_agents: ["democratic"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "Verified as what an Iranian official claimed. Not independently verified as the only reason talks stalled.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C26",
      claim:
        "AP reported Araghchi would meet U.S. envoy Steve Witkoff in Oman for indirect nuclear talks in April 2025.",
      claimant_type: "outlet",
      claimant_name: "AP News",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S13"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D03"],
      arbiter_summary:
        "This establishes that diplomacy was active in 2025 before the later crisis hardened.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C27",
      claim:
        "Al Jazeera reported April 2025 Oman talks were described as constructive and that the sides agreed to meet again.",
      claimant_type: "outlet",
      claimant_name: "Al Jazeera",
      category: "verified",
      status: "verified",
      confidence: "Medium-high",
      evidence_source_ids: ["S14"],
      counter_source_ids: [],
      used_by_agents: ["democratic", "arbiter"],
      debate_moment_ids: ["D03"],
      arbiter_summary:
        "Constructive talks are not the same as near agreement, but they matter when judging alternatives.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C28",
      claim:
        "The fourth round of U.S.-Iran talks in Oman in May 2025 centered heavily on uranium enrichment disagreements.",
      claimant_type: "outlet",
      claimant_name: "The Guardian and Al Jazeera",
      category: "verified",
      status: "verified",
      confidence: "Medium-high",
      evidence_source_ids: ["S15"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic", "republican"],
      debate_moment_ids: ["D03", "D07"],
      arbiter_summary:
        "The negotiation fight was not whether enrichment mattered; it was whether Iran could keep any domestic enrichment path.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C29",
      claim:
        "Iranian negotiators publicly treated domestic enrichment as non-negotiable or tied to Iran's rights.",
      claimant_type: "government",
      claimant_name: "Iranian officials",
      category: "political",
      status: "verified",
      confidence: "High as a public stance",
      evidence_source_ids: ["S15", "S16", "S26"],
      counter_source_ids: ["S22"],
      used_by_agents: ["republican", "democratic"],
      debate_moment_ids: ["D03", "D07"],
      arbiter_summary:
        "This stance explains why zero-enrichment demands collide with Iranian red lines.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C30",
      claim:
        "U.S. officials and negotiators pushed toward denying Iran domestic enrichment or dismantling enrichment capabilities.",
      claimant_type: "government",
      claimant_name: "U.S. officials",
      category: "political",
      status: "likely",
      confidence: "Medium-high",
      evidence_source_ids: ["S15", "S16"],
      counter_source_ids: ["S22"],
      used_by_agents: ["republican", "democratic"],
      debate_moment_ids: ["D03", "D07"],
      arbiter_summary:
        "This is the crux: the U.S. sees domestic enrichment as the pathway risk; Iran sees surrendering it as humiliation.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C31",
      claim:
        "Axios reported a proposal idea for a regional consortium to enrich uranium for civilian purposes under IAEA and U.S. monitoring.",
      claimant_type: "outlet",
      claimant_name: "Axios",
      category: "political",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S16"],
      counter_source_ids: [],
      used_by_agents: ["democratic", "arbiter"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "This is a concrete middle-path idea: preserve civilian supply while moving enrichment outside Iran.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C32",
      claim:
        "Axios reported one idea would recognize Iran's right to enrich while requiring Iran to fully suspend enrichment.",
      claimant_type: "outlet",
      claimant_name: "Axios",
      category: "political",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S16"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "Diplomacy sometimes lives in semantic architecture: recognize a right, suspend the activity.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C33",
      claim:
        "Axios reported Iran consistently said it would not sign a deal barring enrichment, while U.S. officials publicly committed to denying Iran that option.",
      claimant_type: "outlet",
      claimant_name: "Axios",
      category: "contested",
      status: "verified",
      confidence: "Medium-high",
      evidence_source_ids: ["S16"],
      counter_source_ids: ["S22"],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "This is the negotiation deadlock in one sentence.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C34",
      claim:
        "AP reported Khamenei rejected U.S. pressure that would restrict Iran's missile range and regional influence.",
      claimant_type: "politician",
      claimant_name: "Ali Khamenei",
      category: "political",
      status: "verified",
      confidence: "High as public statement",
      evidence_source_ids: ["S25"],
      counter_source_ids: [],
      used_by_agents: ["republican"],
      debate_moment_ids: ["D03"],
      arbiter_summary:
        "The nuclear file does not exist in a clean lab. Missiles and regional power are part of the negotiation atmosphere.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C35",
      claim:
        "The U.S. intelligence community assessed in March 2025 that Iran was not building a nuclear weapon and Khamenei had not reauthorized the suspended weapons program.",
      claimant_type: "government",
      claimant_name: "Office of the Director of National Intelligence",
      category: "verified",
      status: "verified",
      confidence: "High as official assessment",
      evidence_source_ids: ["S17", "S18"],
      counter_source_ids: ["S14", "S23"],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D05", "D06", "D08"],
      arbiter_summary:
        "This is the key counterweight to 'close to a bomb': the material risk was high, but U.S. intelligence did not assess an active bomb build.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C36",
      claim:
        "AP reported Trump said Iran was very close to having a nuclear bomb and dismissed the DNI assessment.",
      claimant_type: "politician",
      claimant_name: "Donald Trump",
      category: "political",
      status: "verified",
      confidence: "High as reported statement",
      evidence_source_ids: ["S18"],
      counter_source_ids: ["S17"],
      used_by_agents: ["republican", "democratic"],
      debate_moment_ids: ["D02", "D06"],
      arbiter_summary:
        "Verified as a public claim. The factual question is what 'very close' means: fissile material, weapon design, or deliverable arsenal.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C37",
      claim:
        "The Republican maximum-pressure argument treats the 60% stockpile, short breakout timelines, and inspection gaps as enough to justify severe pressure or force-backed diplomacy.",
      claimant_type: "agent",
      claimant_name: "Trump and Republican Coalition Advocate",
      category: "contested",
      status: "contested",
      confidence: "Medium",
      evidence_source_ids: ["S03", "S05", "S09", "S21", "S23"],
      counter_source_ids: ["S17", "S22"],
      used_by_agents: ["republican"],
      debate_moment_ids: ["D02", "D06"],
      arbiter_summary:
        "Compelling on urgency, weaker when it morphs into certainty about a completed weapon program.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C38",
      claim:
        "The Democratic opposition argument treats nuclear capability as different from intent, weaponization, and legal justification for war.",
      claimant_type: "agent",
      claimant_name: "Democratic Opposition Advocate",
      category: "contested",
      status: "contested",
      confidence: "Medium",
      evidence_source_ids: ["S17", "S20", "S22"],
      counter_source_ids: ["S05", "S23"],
      used_by_agents: ["democratic"],
      debate_moment_ids: ["D05", "D06"],
      arbiter_summary:
        "Strong on epistemic discipline; vulnerable if it sounds complacent about 60% stockpiles.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C39",
      claim:
        "Rep. Gregory Meeks argued a ceasefire was insufficient without answers on why Trump took the U.S. to war, including costs and casualties.",
      claimant_type: "politician",
      claimant_name: "Rep. Gregory Meeks",
      category: "political",
      status: "verified",
      confidence: "High as public statement",
      evidence_source_ids: ["S19"],
      counter_source_ids: ["S21"],
      used_by_agents: ["democratic"],
      debate_moment_ids: ["D08"],
      arbiter_summary:
        "This is process and accountability, not a direct technical claim about enrichment.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C40",
      claim:
        "Meeks argued the war was launched without congressional authorization while diplomacy remained active.",
      claimant_type: "politician",
      claimant_name: "Rep. Gregory Meeks",
      category: "political",
      status: "verified",
      confidence: "High as public statement",
      evidence_source_ids: ["S20"],
      counter_source_ids: ["S21"],
      used_by_agents: ["democratic"],
      debate_moment_ids: ["D08"],
      arbiter_summary:
        "Verified as Meeks's claim. The legal merits and diplomatic timeline need their own evidence packet.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C41",
      claim:
        "The White House claimed Operation Epic Fury met its military objectives and degraded Iranian missile, drone, naval, and industrial capabilities.",
      claimant_type: "government",
      claimant_name: "White House",
      category: "political",
      status: "likely",
      confidence: "Medium as outcome claim",
      evidence_source_ids: ["S21"],
      counter_source_ids: ["S09", "S20"],
      used_by_agents: ["republican"],
      debate_moment_ids: ["D08"],
      arbiter_summary:
        "Official claim, not independently verified in this app's first pass. The arbiter labels it as administration case, not settled fact.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C42",
      claim:
        "Arms Control Association argued zero enrichment is an unnecessary and unrealistic objective for preventing an Iranian bomb.",
      claimant_type: "expert",
      claimant_name: "Arms Control Association",
      category: "contested",
      status: "contested",
      confidence: "Medium",
      evidence_source_ids: ["S22"],
      counter_source_ids: ["S16", "S21"],
      used_by_agents: ["democratic"],
      debate_moment_ids: ["D07"],
      arbiter_summary:
        "Expert argument, not a universal consensus. It gives the diplomacy side a serious alternative frame.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C43",
      claim:
        "Arms Control Association argued Iran's late-May 2025 stockpile could produce enough weapons-grade uranium for one bomb within days and enough for several more within weeks.",
      claimant_type: "expert",
      claimant_name: "Arms Control Association",
      category: "contested",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S22"],
      counter_source_ids: ["S17"],
      used_by_agents: ["arbiter", "republican"],
      debate_moment_ids: ["D06"],
      arbiter_summary:
        "This supports rapid fissile-material breakout, not automatic weapon assembly.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C44",
      claim:
        "ISIS assessed Iran could convert its 60% stock into enough weapon-grade uranium for about nine nuclear weapons in roughly three weeks.",
      claimant_type: "expert",
      claimant_name: "Institute for Science and International Security",
      category: "contested",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S23"],
      counter_source_ids: ["S17", "S22"],
      used_by_agents: ["republican", "arbiter"],
      debate_moment_ids: ["D06"],
      arbiter_summary:
        "Technically serious but model-dependent. The debate must not translate this into 'nine bombs exist'.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C45",
      claim:
        "Bulletin analysis argued Iran likely transferred or stored significant 60% material at Isfahan before the June 2025 strikes.",
      claimant_type: "expert",
      claimant_name: "Bulletin of the Atomic Scientists",
      category: "contested",
      status: "likely",
      confidence: "Medium",
      evidence_source_ids: ["S24"],
      counter_source_ids: ["S09"],
      used_by_agents: ["arbiter", "republican"],
      debate_moment_ids: ["D04", "D07"],
      arbiter_summary:
        "Plausible and important, but it depends on interpretation of reporting and imagery rather than direct public inspection confirmation.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C46",
      claim:
        "The absence of observed active enrichment after strikes does not by itself prove the stockpile is secure, accounted for, or undiverted.",
      claimant_type: "agent",
      claimant_name: "Investigative Journalist Arbiter",
      category: "contested",
      status: "verified",
      confidence: "High as inference from access limits",
      evidence_source_ids: ["S07", "S09", "S10"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "republican", "democratic"],
      debate_moment_ids: ["D04", "D08"],
      arbiter_summary:
        "This is the arbiter's bridge: no active enrichment signal is reassuring, but not a substitute for inventory verification.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C47",
      claim:
        "Iranian officials say nuclear weapons are unacceptable while defending Iran's right to enrichment.",
      claimant_type: "government",
      claimant_name: "Iranian officials",
      category: "political",
      status: "verified",
      confidence: "High as public stance",
      evidence_source_ids: ["S26", "S15", "S16"],
      counter_source_ids: ["S03", "S05"],
      used_by_agents: ["democratic"],
      debate_moment_ids: ["D03", "D05"],
      arbiter_summary:
        "Verified as Iran's stated position; not enough by itself to settle intent.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C48",
      claim:
        "The statement 'you do not need more than 5% enrichment for civilian applications' is too broad: ordinary power reactors use about 3 to 5%, but some advanced civilian fuels are 5% to below 20%; 60% remains outside that normal civilian frame.",
      claimant_type: "agent",
      claimant_name: "Investigative Journalist Arbiter",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S01", "S02", "S05"],
      counter_source_ids: [],
      used_by_agents: ["arbiter", "democratic", "republican"],
      debate_moment_ids: ["D01", "D05"],
      arbiter_summary:
        "This is the cleaned-up version of the user's example: broadly right, but sharpened to avoid an avoidable factual wobble.",
      last_refreshed: "2026-04-22"
    },
    {
      id: "C49",
      claim:
        "Having enough material to enrich toward weapons-grade does not mean Iran has a completed, tested, deliverable nuclear weapon.",
      claimant_type: "agent",
      claimant_name: "Investigative Journalist Arbiter",
      category: "verified",
      status: "verified",
      confidence: "High",
      evidence_source_ids: ["S17", "S18", "S22", "S23"],
      counter_source_ids: ["S05", "S23"],
      used_by_agents: ["arbiter", "democratic"],
      debate_moment_ids: ["D05", "D06", "D08"],
      arbiter_summary:
        "This is the sentence the whole app exists to make easy: close to material is a major danger, not the same as a finished bomb.",
      last_refreshed: "2026-04-22"
    }
  ],
  debateRounds: [
    {
      id: "D01",
      label: "Arbiter framing",
      speakerId: "arbiter",
      title: "First, clean up the uranium vocabulary.",
      body:
        "The debate starts with enrichment. Ordinary commercial reactor fuel is usually around 3 to 5 percent U-235. Some advanced civilian fuels can go above that but stay below 20 percent. Iran's 60 percent material is in a different category. The headline number is not just 'a lot of uranium'; it is a lot of uranium already pushed very far up the enrichment ladder.",
      claimIds: ["C01", "C02", "C05", "C06", "C07", "C08", "C48"]
    },
    {
      id: "D02",
      label: "Republican coalition opening",
      speakerId: "republican",
      title: "The clock is the argument.",
      body:
        "If a state hostile to the U.S. and Israel has more than 400 kg of 60 percent uranium, the debate cannot be casual. AP's IAEA-based benchmark says around 42 kg of 60 percent material could theoretically be enough for one bomb if further enriched. That does not mean the bomb is sitting on a shelf. It does mean the distance to weapons-grade fissile material is dangerously short.",
      claimIds: ["C03", "C04", "C05", "C14", "C15", "C21", "C36", "C37"]
    },
    {
      id: "D03",
      label: "Democratic opposition opening",
      speakerId: "democratic",
      title: "Scary material does not erase diplomacy or intent.",
      body:
        "The stockpile is serious. But the record also shows diplomacy was active: Oman talks, follow-up rounds, and specific ideas like monitored enrichment outside Iran. Iran's public position was that enrichment was a right; the U.S. position leaned toward zero domestic enrichment. That deadlock is real, but it is not the same thing as proof that Iran had decided to build a weapon.",
      claimIds: ["C26", "C27", "C28", "C29", "C30", "C34", "C47"]
    },
    {
      id: "D04",
      label: "Arbiter correction",
      speakerId: "arbiter",
      title: "Both sides are trying to smuggle certainty through the side door.",
      body:
        "Republican advocate: do not say 'Iran had a bomb' when the record supports 'Iran had a rapid fissile-material breakout problem.' Democratic advocate: do not make 'no active enrichment observed by satellite' sound like full reassurance, because inspectors lacked complete access and the IAEA said it could not verify everything it needed to verify.",
      claimIds: ["C09", "C10", "C16", "C17", "C18", "C20", "C45", "C46"]
    },
    {
      id: "D05",
      label: "Cross-exam",
      speakerId: "republican",
      title: "Question to the diplomacy side: what would you wait for?",
      body:
        "If the 60 percent stockpile is unprecedented for a non-nuclear-weapon state, and if Iran insists on enrichment rights while monitoring is degraded, what is the threshold for action? A signed weaponization order? A hidden cascade? The Republican case says waiting for perfect evidence may mean waiting until evidence is strategically useless.",
      claimIds: ["C03", "C15", "C29", "C35", "C37", "C48", "C49"]
    },
    {
      id: "D06",
      label: "Cross-exam",
      speakerId: "democratic",
      title: "Question to the pressure side: what exactly are you proving?",
      body:
        "A short path to weapons-grade uranium is not the same as a finished weapon. The U.S. intelligence community assessed Iran was not building a nuclear weapon in March 2025. If your claim is 'Iran could move fast toward fissile material,' the evidence is strong. If your claim is 'Iran had a deployable bomb,' the evidence is not there.",
      claimIds: ["C14", "C21", "C35", "C36", "C37", "C38", "C43", "C44", "C49"]
    },
    {
      id: "D07",
      label: "Negotiation round",
      speakerId: "arbiter",
      title: "The negotiation deadlock is not cartoonish.",
      body:
        "The real fight was not 'deal or no deal.' It was over the architecture of enrichment: no domestic enrichment, domestic right but suspended activity, a regional consortium, cash-for-uranium, and verification access. Each formula tries to solve the same hard problem: Iran wants dignity and capability; the U.S. wants distance between Iran and bomb fuel.",
      claimIds: ["C23", "C24", "C25", "C28", "C31", "C32", "C33", "C42", "C45"]
    },
    {
      id: "D08",
      label: "Provisional factual verdict",
      speakerId: "arbiter",
      title: "The cleanest answer: close to material, not proven close to a deployed weapon.",
      body:
        "The fact pattern supports a strong warning: Iran had a large 60 percent stockpile, short theoretical enrichment pathways, and degraded inspection confidence. It does not support the sloppy version that Iran already had a nuclear weapon. The honest sentence is more precise and more useful: Iran was alarmingly close to being able to produce weapons-grade uranium quickly, while weaponization, intent, delivery, legality, and post-strike verification remained contested.",
      claimIds: ["C10", "C11", "C16", "C18", "C19", "C20", "C22", "C35", "C39", "C40", "C41", "C46", "C49"]
    }
  ]
};

window.debatebook.sources.forEach((source) => {
  source.claims_supported = [];
  source.claims_challenged = [];
});

window.debatebook.claims.forEach((claim) => {
  claim.evidence_source_ids.forEach((sourceId) => {
    const source = window.debatebook.sources.find((candidate) => candidate.id === sourceId);
    if (source && !source.claims_supported.includes(claim.id)) {
      source.claims_supported.push(claim.id);
    }
  });
  claim.counter_source_ids.forEach((sourceId) => {
    const source = window.debatebook.sources.find((candidate) => candidate.id === sourceId);
    if (source && !source.claims_challenged.includes(claim.id)) {
      source.claims_challenged.push(claim.id);
    }
  });
});
