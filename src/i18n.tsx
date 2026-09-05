import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocalState } from "./lib";

/* ================================================================== */
/* Dictionaries                                                        */
/* ================================================================== */
const en: Record<string, string> = {
  /* shell */
  "app.tag": "Judicial document portal",
  "nav.console": "Console",
  "nav.cases": "Case Files",
  "nav.mycases": "My Cases",
  "nav.search": "Search",
  "nav.audit": "Audit & Security",
  "nav.admin": "Administration",
  "hdr.searchPh": "Search the vault…",
  "hdr.notifications": "Notifications",
  "hdr.markRead": "Mark all read",
  "hdr.noNotices": "No notifications",
  "hdr.session": "Session",
  "hdr.renews": "renews on activity",
  "hdr.expires": "Session expires soon",
  "hdr.logout": "Sign out",
  "footer.line": "LexVault · immutable history, controlled modification · nothing is ever deleted",
  "footer.seal": "tamper-evident · hash-chained · append-only",
  "wm.copy": "CERTIFIED COPY",

  /* accessibility controls */
  "a11y.lang": "Language",
  "a11y.theme": "Colour theme",
  "a11y.light": "Light mode",
  "a11y.dark": "Dark mode",
  "a11y.size": "Text size",
  "a11y.smaller": "Smaller text",
  "a11y.larger": "Larger text",
  "a11y.toastTheme": "Theme changed",
  "a11y.toastSize": "Text size",
  "a11y.toastLang": "भाषा बदली गई · Language set to English",

  /* statuses */
  "st.FILED": "Filed",
  "st.INVESTIGATION": "Under Investigation",
  "st.TRIAL": "Under Trial",
  "st.JUDGMENT": "Judgment",
  "st.CLOSED": "Closed",
  "st.DISMISSED": "Dismissed",
  "dcls.PUBLIC": "Public",
  "dcls.COURT": "Court",
  "dcls.INVESTIGATION": "Investigation",
  "dcls.PRIVILEGED": "Privileged",
  "dcls.RESTRICTED": "Restricted",
  "dst.DRAFT": "Draft",
  "dst.REVIEW": "Review",
  "dst.APPROVED": "Approved",
  "dst.SIGNED": "Signed",
  "dst.RESTRICTED": "Restricted",
  "dst.ARCHIVED": "Archived",

  /* common actions */
  "act.open": "Open",
  "act.view": "View",
  "act.upload": "Upload",
  "act.download": "Download",
  "act.edit": "Edit",
  "act.approve": "Approve",
  "act.sign": "Sign",
  "act.cancel": "Cancel",
  "act.save": "Save",
  "act.search": "Search",
  "act.close": "Close",
  "act.transfer": "Transfer Case",
  "act.closeCase": "Close Case",
  "act.dismissCase": "Dismiss Case",
  "act.verify": "Verify integrity",
  "act.history": "Version History",
  "act.auditHistory": "Audit History",
  "act.back": "Back",
  "act.confirm": "Confirm",

  /* login */
  "login.title": "Sign in to the registry",
  "login.step": "Secure gateway",
  "login.id": "Principal ID or email",
  "login.password": "Password",
  "login.continue": "Continue to MFA",
  "login.principals": "Registered principals",
  "login.lockNote": "Failed attempts are ledgered · 3 failures trigger lockout",
  "login.mfaStep": "Step 2 of 2 · multi-factor",
  "login.mfaTitle": "Verification code",
  "login.mfaSub": "Enter the 6-digit code from your registered authenticator.",
  "login.demoCode": "Demo channel · your code",
  "login.verify": "Verify & enter",
  "login.tls": "TLS 1.3 · short-lived token · session ledgered",
  "login.h1a": "Who · What · When",
  "login.h1b": "Where · Why",
  "login.lede": "Role-based access, case-level authorization, per-version SHA-256 digests and a hash-chained audit ledger. Nothing is silently altered; nothing is ever deleted.",
  "login.k1": "Authorization", "login.k1v": "role → court → case → classification",
  "login.k2": "Integrity", "login.k2v": "SHA-256 per version, chained",
  "login.k3": "Sessions", "login.k3v": "15-min tokens · rotation",
  "login.k4": "Disclosure", "login.k4v": "403 never reveals existence",
  "firstrun.kicker": "First run · registry is empty",
  "firstrun.title": "Provision the founding registrar",
  "firstrun.lede": "No accounts exist yet. Create the Court Administrator who will register courts, principals and cases. This action is written to the audit ledger as the registry's first entry — it can never be erased.",
  "firstrun.name": "Full name",
  "firstrun.unit": "Registry / unit",
  "firstrun.email": "Official email",
  "firstrun.pw": "Password · min 8 chars",
  "firstrun.pw2": "Confirm password",
  "firstrun.argon": "Stored as an Argon2id digest · MFA enforced at every sign-in",
  "firstrun.submit": "Provision registry & open gateway",
  "firstrun.after": "After provisioning, sign in with these credentials — the founding account can never be deleted",
  "firstrun.secQ": "Security question (factor 3)",
  "firstrun.secA": "Secret answer",

  /* 3-factor gateway */
  "login.tab.signin": "Sign in",
  "login.tab.signup": "Create account",
  "login.3fa": "3-factor authentication",
  "login.f1": "Password",
  "login.f2": "One-time code",
  "login.f3": "Security answer",
  "login.stepN": "Step",
  "login.ofN": "of",
  "login.secTitle": "Security question",
  "login.secSub": "Answer the secret question you set when the account was created. This is the third factor.",
  "login.secPh": "Your answer",
  "login.secWrong": "Incorrect security answer. The attempt is ledgered.",
  "login.secLock": "3 wrong answers — locked for 30 seconds and escalated to security.",

  /* public signup */
  "signup.kicker": "Public signup · parties & citizens",
  "signup.title": "Create your account",
  "signup.lede": "Citizens registering as a complainant or defendant receive a secure portal identity. Case files appear only after the court registry links you to a case as a party — until then nothing is disclosed.",
  "signup.role": "Registering as",
  "signup.secCustom": "Custom question…",
  "signup.secCustomPh": "Write your own question",
  "signup.submit": "Create account",
  "signup.dupe": "This email is already registered — please use Sign in.",
  "signup.ok": "Account created — sign in with your password",
  "signup.3faNote": "Every sign-in checks 3 factors: password → one-time code → security answer",
  "signup.namePh": "e.g. Meena Kumari",
  "signup.emailPh": "name@mail.example",
  "signup.ansHint": "Answers are stored only as digests · case-insensitive",

  /* dashboard */
  "dash.policy": "Access policy",
  "dash.ledgered": "Every action below is ledgered",
  "dash.emptyKicker": "Fresh registry · nothing here is test data",
  "dash.emptyAdmin": "Build your registry from real records",
  "dash.emptyOther": "The registry is awaiting its first records",
  "dash.emptyAdminBody": "Register your courts, provision judges, counsel, officers and parties with real credentials, then mint immutable case numbers. Every entry is ledgered from this point.",
  "dash.emptyOtherBody": "Once the court administrator registers cases and your role is attached to them — as judge, counsel, IO or party — they will appear here under your authorization. Until then, nothing is disclosed.",
  "dash.openAdmin": "Open administration",
  "dash.flow": "courts → principals → cases → documents",
  "dash.active": "Active cases",
  "dash.hearingsToday": "Hearings today",
  "dash.reviewQueue": "Awaiting review",
  "dash.closed": "Closed / dismissed",
  "dash.transfers": "Transfers pending",
  "dash.recent": "Recent activity",
  "dash.docket": "My court cases",
  "dash.security": "Security alerts",
  "dash.docs": "Documents",
  "dash.upcoming": "Upcoming hearings",

  /* cases */
  "cases.docket": "Authorized docket",
  "cases.parties": "Cases where you are a registered party",
  "cases.full": "Full register · all courts",
  "cases.title": "Case Files",
  "cases.myTitle": "My Cases",
  "cases.openById": "Open by case ID…",
  "cases.searchPh": "Search ID, title, FIR, tag…",
  "cases.emptyReg": "The case register is empty",
  "cases.emptyRegAdmin": "Use Administration → Register case to mint your first immutable case number, then attach documents, evidence and hearings.",
  "cases.emptyRegOther": "Case files will appear here once the registry contains cases you are authorized to see.",
  "cases.nomatch": "No case files match",
  "cases.onRecord": "on record",
  "cases.docsVisible": "docs visible",
  "cases.noHearing": "no hearing",
  "cases.readOnly": "read-only",
  "tab.documents": "Documents",
  "tab.evidence": "Evidence",
  "tab.hearings": "Hearings & Orders",
  "tab.timeline": "Timeline",
  "tab.transfers": "Transfers",
  "tab.caseaudit": "Case Ledger",

  /* admin */
  "admin.kicker": "Registry administration · every change ledgered",
  "admin.title": "Administration",
  "admin.registerCase": "Register case",
  "admin.transferQueue": "Transfer approval queue",
  "admin.pending": "pending",
  "admin.noTransfers": "No transfers awaiting registry decision",
  "admin.courts": "Court registry",
  "admin.addCourt": "Register court",
  "admin.principals": "Principals & assignments",
  "admin.addUser": "Provision principal",
  "admin.matrix": "Role-based access control matrix",
  "admin.config": "Security architecture · system configuration",
  "admin.danger": "Danger zone",
  "admin.reset": "Factory reset — empty the workspace",
  "admin.courtName": "Court name",
  "admin.courtLevel": "Level",
  "admin.courtLoc": "Location",

  /* audit */
  "audit.kicker": "Append-only · hash-chained · nothing is ever deleted",
  "audit.title": "Audit & Security",
  "audit.chain": "Tamper-evident chain",
  "audit.verifyChain": "Verify full chain",
  "audit.logins": "Login & session history",
  "audit.security": "Security events",
  "audit.genesis": "The ledger stands at genesis",
  "audit.genesisBody": "No activity has been recorded yet. The first action taken in this registry will anchor link #1 to the genesis hash, and every event after will chain to it immutably.",

  /* search */
  "search.kicker": "Authorization-aware retrieval · OCR index enabled",
  "search.title": "Search the Vault",
  "search.ph": "Try “forensic reports related to vehicle examination”…",
  "search.ocr": "Include OCR-extracted text of scanned exhibits",
  "search.semantic": "Semantic expansion active — related terms are matched automatically",
  "search.cases": "Case files",
  "search.docs": "Documents",
  "search.found": "found",
  "search.suppressed": "Additional matches were suppressed by the authorization gateway. Whether those records exist, and what they contain, is not disclosed to your role.",
};

const hi: Record<string, string> = {
  /* shell */
  "app.tag": "न्यायिक दस्तावेज़ पोर्टल",
  "nav.console": "डैशबोर्ड",
  "nav.cases": "केस फ़ाइलें",
  "nav.mycases": "मेरे केस",
  "nav.search": "खोज",
  "nav.audit": "ऑडिट व सुरक्षा",
  "nav.admin": "प्रशासन",
  "hdr.searchPh": "वॉल्ट में खोजें…",
  "hdr.notifications": "सूचनाएँ",
  "hdr.markRead": "सभी पढ़ी हुई चिह्नित करें",
  "hdr.noNotices": "कोई सूचना नहीं",
  "hdr.session": "सत्र",
  "hdr.renews": "गतिविधि पर नवीनीकरण",
  "hdr.expires": "सत्र जल्द समाप्त होगा",
  "hdr.logout": "साइन आउट",
  "footer.line": "लेक्सवॉल्ट · अपरिवर्तनीय इतिहास, नियंत्रित संशोधन · कुछ भी कभी हटाया नहीं जाता",
  "footer.seal": "छेड़छाड़-स्पष्ट · हैश-श्रृंखलित · केवल-जोड़ें",
  "wm.copy": "प्रमाणित प्रतिलिपि",

  /* accessibility controls */
  "a11y.lang": "भाषा",
  "a11y.theme": "रंग थीम",
  "a11y.light": "लाइट मोड",
  "a11y.dark": "डार्क मोड",
  "a11y.size": "अक्षर आकार",
  "a11y.smaller": "छोटे अक्षर",
  "a11y.larger": "बड़े अक्षर",
  "a11y.toastTheme": "थीम बदली गई",
  "a11y.toastSize": "अक्षर आकार",
  "a11y.toastLang": "Language changed · भाषा हिन्दी में सेट की गई",

  /* statuses */
  "st.FILED": "दायर",
  "st.INVESTIGATION": "जाँच जारी",
  "st.TRIAL": "विचाराधीन",
  "st.JUDGMENT": "निर्णय सुरक्षित",
  "st.CLOSED": "बंद",
  "st.DISMISSED": "खारिज",
  "dcls.PUBLIC": "सार्वजनिक",
  "dcls.COURT": "न्यायालय",
  "dcls.INVESTIGATION": "जाँच",
  "dcls.PRIVILEGED": "विशेषाधिकृत",
  "dcls.RESTRICTED": "प्रतिबंधित",
  "dst.DRAFT": "प्रारूप",
  "dst.REVIEW": "समीक्षा",
  "dst.APPROVED": "स्वीकृत",
  "dst.SIGNED": "हस्ताक्षरित",
  "dst.RESTRICTED": "प्रतिबंधित",
  "dst.ARCHIVED": "संग्रहीत",

  /* common actions */
  "act.open": "खोलें",
  "act.view": "देखें",
  "act.upload": "अपलोड करें",
  "act.download": "डाउनलोड करें",
  "act.edit": "संपादित करें",
  "act.approve": "स्वीकृत करें",
  "act.sign": "हस्ताक्षर करें",
  "act.cancel": "रद्द करें",
  "act.save": "सहेजें",
  "act.search": "खोजें",
  "act.close": "बंद करें",
  "act.transfer": "केस स्थानांतरित करें",
  "act.closeCase": "केस बंद करें",
  "act.dismissCase": "केस खारिज करें",
  "act.verify": "प्रामाणिकता जाँचें",
  "act.history": "संस्करण इतिहास",
  "act.auditHistory": "ऑडिट इतिहास",
  "act.back": "वापस",
  "act.confirm": "पुष्टि करें",

  /* login */
  "login.title": "रजिस्ट्री में साइन इन करें",
  "login.step": "सुरक्षित गेटवे",
  "login.id": "यूज़र आईडी या ईमेल",
  "login.password": "पासवर्ड",
  "login.continue": "एमएफ़ए पर जारी रखें",
  "login.principals": "पंजीकृत उपयोगकर्ता",
  "login.lockNote": "असफल प्रयास दर्ज होते हैं · 3 असफलताओं पर लॉकआउट",
  "login.mfaStep": "चरण 2 / 2 · बहु-कारक",
  "login.mfaTitle": "सत्यापन कोड",
  "login.mfaSub": "अपने पंजीकृत ऑथेंटिकेटर से 6 अंकों का कोड दर्ज करें।",
  "login.demoCode": "डेमो चैनल · आपका कोड",
  "login.verify": "सत्यापित कर प्रवेश करें",
  "login.tls": "TLS 1.3 · अल्पकालिक टोकन · सत्र दर्ज",
  "login.h1a": "कौन · क्या · कब",
  "login.h1b": "कहाँ · क्यों",
  "login.lede": "भूमिका-आधारित पहुँच, केस-स्तरीय प्राधिकरण, प्रत्येक संस्करण का SHA-256 सारांश और हैश-श्रृंखलित ऑडिट लेजर। कुछ भी चुपके से नहीं बदलता; कुछ भी कभी हटाया नहीं जाता।",
  "login.k1": "प्राधिकरण", "login.k1v": "भूमिका → न्यायालय → केस → वर्गीकरण",
  "login.k2": "अखंडता", "login.k2v": "प्रत्येक संस्करण का SHA-256, श्रृंखलित",
  "login.k3": "सत्र", "login.k3v": "15-मिनट टोकन · रोटेशन",
  "login.k4": "गोपनीयता", "login.k4v": "403 कभी अस्तित्व प्रकट नहीं करता",
  "firstrun.kicker": "प्रथम प्रवेश · रजिस्ट्री खाली है",
  "firstrun.title": "संस्थापक रजिस्ट्रार बनाएं",
  "firstrun.lede": "अभी कोई खाता नहीं है। न्यायालय प्रशासक बनाएं जो न्यायालय, उपयोगकर्ता और केस पंजीकृत करेगा। यह क्रिया रजिस्ट्री की पहली लेजर प्रविष्टि के रूप में दर्ज होगी — इसे कभी मिटाया नहीं जा सकता।",
  "firstrun.name": "पूरा नाम",
  "firstrun.unit": "रजिस्ट्री / इकाई",
  "firstrun.email": "आधिकारिक ईमेल",
  "firstrun.pw": "पासवर्ड · कम से कम 8 अक्षर",
  "firstrun.pw2": "पासवर्ड की पुष्टि करें",
  "firstrun.argon": "Argon2id सारांश के रूप में सुरक्षित · हर साइन-इन पर MFA अनिवार्य",
  "firstrun.submit": "रजिस्ट्री बनाएं और गेटवे खोलें",
  "firstrun.after": "बनाने के बाद इन्हीं क्रेडेंशियल से साइन इन करें — संस्थापक खाता कभी हटाया नहीं जा सकता",
  "firstrun.secQ": "सुरक्षा प्रश्न (कारक 3)",
  "firstrun.secA": "गुप्त उत्तर",

  /* 3-factor gateway */
  "login.tab.signin": "साइन इन",
  "login.tab.signup": "खाता बनाएं",
  "login.3fa": "3-कारक प्रमाणीकरण",
  "login.f1": "पासवर्ड",
  "login.f2": "वन-टाइम कोड",
  "login.f3": "सुरक्षा उत्तर",
  "login.stepN": "चरण",
  "login.ofN": "/",
  "login.secTitle": "सुरक्षा प्रश्न",
  "login.secSub": "खाता बनाते समय तय किया गया गुप्त उत्तर दर्ज करें। यह तीसरा कारक है।",
  "login.secPh": "आपका उत्तर",
  "login.secWrong": "गलत सुरक्षा उत्तर। प्रयास दर्ज किया गया है।",
  "login.secLock": "3 गलत उत्तर — 30 सेकंड के लिए लॉक, सुरक्षा को सूचित।",

  /* public signup */
  "signup.kicker": "सार्वजनिक पंजीकरण · पक्षकार व नागरिक",
  "signup.title": "अपना खाता बनाएं",
  "signup.lede": "शिकायतकर्ता या प्रतिवादी के रूप में पंजीकरण करने वाले नागरिकों को सुरक्षित पोर्टल पहचान मिलती है। केस फ़ाइलें तभी दिखेंगी जब न्यायालय रजिस्ट्री आपको किसी केस में पक्षकार के रूप में जोड़ेगी — तब तक कुछ भी प्रकट नहीं होता।",
  "signup.role": "पंजीकरण प्रकार",
  "signup.secCustom": "अपना प्रश्न…",
  "signup.secCustomPh": "अपना प्रश्न लिखें",
  "signup.submit": "खाता बनाएं",
  "signup.dupe": "यह ईमेल पहले से पंजीकृत है — कृपया साइन इन करें।",
  "signup.ok": "खाता बन गया — अपने पासवर्ड से साइन इन करें",
  "signup.3faNote": "हर साइन-इन 3 कारक जाँचता है: पासवर्ड → वन-टाइम कोड → सुरक्षा उत्तर",
  "signup.namePh": "जैसे मीना कुमारी",
  "signup.emailPh": "naam@mail.example",
  "signup.ansHint": "उत्तर केवल डिजेस्ट के रूप में सुरक्षित · बड़े-छोटे अक्षर मायने नहीं रखते",

  /* dashboard */
  "dash.policy": "पहुँच नीति",
  "dash.ledgered": "नीचे की हर क्रिया दर्ज होती है",
  "dash.emptyKicker": "नई रजिस्ट्री · यहाँ कुछ भी परीक्षण डेटा नहीं है",
  "dash.emptyAdmin": "अपनी रजिस्ट्री वास्तविक अभिलेखों से बनाएं",
  "dash.emptyOther": "रजिस्ट्री पहले अभिलेखों की प्रतीक्षा में है",
  "dash.emptyAdminBody": "अपने न्यायालय पंजीकृत करें, न्यायाधीश, वकील, अधिकारी और पक्षकार वास्तविक क्रेडेंशियल के साथ जोड़ें, फिर अपरिवर्तनीय केस क्रमांक बनाएं। हर प्रविष्टि यहीं से दर्ज होगी।",
  "dash.emptyOtherBody": "जब न्यायालय प्रशासक केस पंजीकृत करेगा और आपकी भूमिका (न्यायाधीश, वकील, जाँच अधिकारी या पक्षकार) उनसे जुड़ेगी, तभी वे यहाँ दिखेंगे। तब तक कुछ भी प्रकट नहीं किया जाता।",
  "dash.openAdmin": "प्रशासन खोलें",
  "dash.flow": "न्यायालय → उपयोगकर्ता → केस → दस्तावेज़",
  "dash.active": "सक्रिय केस",
  "dash.hearingsToday": "आज की सुनवाई",
  "dash.reviewQueue": "समीक्षा प्रतीक्षित",
  "dash.closed": "बंद / खारिज",
  "dash.transfers": "स्थानांतरण प्रतीक्षित",
  "dash.recent": "हाल की गतिविधि",
  "dash.docket": "मेरे न्यायालय के केस",
  "dash.security": "सुरक्षा अलर्ट",
  "dash.docs": "दस्तावेज़",
  "dash.upcoming": "आगामी सुनवाई",

  /* cases */
  "cases.docket": "प्राधिकृत डॉकेट",
  "cases.parties": "वे केस जिनमें आप पंजीकृत पक्षकार हैं",
  "cases.full": "पूर्ण रजिस्टर · सभी न्यायालय",
  "cases.title": "केस फ़ाइलें",
  "cases.myTitle": "मेरे केस",
  "cases.openById": "केस आईडी से खोलें…",
  "cases.searchPh": "आईडी, शीर्षक, एफ़आईआर, टैग खोजें…",
  "cases.emptyReg": "केस रजिस्टर खाली है",
  "cases.emptyRegAdmin": "प्रशासन → केस पंजीकृत करें से पहला अपरिवर्तनीय केस क्रमांक बनाएं, फिर दस्तावेज़, साक्ष्य और सुनवाई जोड़ें।",
  "cases.emptyRegOther": "जब रजिस्ट्री में आपके देखने हेतु प्राधिकृत केस होंगे, तब केस फ़ाइलें यहाँ दिखेंगी।",
  "cases.nomatch": "कोई केस फ़ाइल मेल नहीं खाती",
  "cases.onRecord": "रिकॉर्ड पर",
  "cases.docsVisible": "दस्तावेज़ दृश्य",
  "cases.noHearing": "कोई सुनवाई नहीं",
  "cases.readOnly": "केवल-पठन",
  "tab.documents": "दस्तावेज़",
  "tab.evidence": "साक्ष्य",
  "tab.hearings": "सुनवाई व आदेश",
  "tab.timeline": "समयरेखा",
  "tab.transfers": "स्थानांतरण",
  "tab.caseaudit": "केस लेजर",

  /* admin */
  "admin.kicker": "रजिस्ट्री प्रशासन · हर बदलाव दर्ज",
  "admin.title": "प्रशासन",
  "admin.registerCase": "केस पंजीकृत करें",
  "admin.transferQueue": "स्थानांतरण स्वीकृति कतार",
  "admin.pending": "प्रतीक्षित",
  "admin.noTransfers": "कोई स्थानांतरण निर्णय प्रतीक्षित नहीं",
  "admin.courts": "न्यायालय रजिस्टर",
  "admin.addCourt": "न्यायालय पंजीकृत करें",
  "admin.principals": "उपयोगकर्ता व आवंटन",
  "admin.addUser": "उपयोगकर्ता बनाएं",
  "admin.matrix": "भूमिका-आधारित पहुँच नियंत्रण मैट्रिक्स",
  "admin.config": "सुरक्षा संरचना · सिस्टम कॉन्फ़िगरेशन",
  "admin.danger": "खतरा क्षेत्र",
  "admin.reset": "फ़ैक्टरी रीसेट — कार्यस्थान खाली करें",
  "admin.courtName": "न्यायालय का नाम",
  "admin.courtLevel": "स्तर",
  "admin.courtLoc": "स्थान",

  /* audit */
  "audit.kicker": "केवल-जोड़ें · हैश-श्रृंखलित · कुछ भी कभी नहीं हटता",
  "audit.title": "ऑडिट व सुरक्षा",
  "audit.chain": "छेड़छाड़-स्पष्ट श्रृंखला",
  "audit.verifyChain": "पूरी श्रृंखला जाँचें",
  "audit.logins": "लॉगिन व सत्र इतिहास",
  "audit.security": "सुरक्षा घटनाएँ",
  "audit.genesis": "लेजर जेनेसिस पर है",
  "audit.genesisBody": "अभी कोई गतिविधि दर्ज नहीं हुई है। इस रजिस्ट्री में पहली क्रिया कड़ी #1 को जेनेसिस हैश से जोड़ेगी, और उसके बाद की हर घटना उससे अपरिवर्तनीय रूप से जुड़ेगी।",

  /* search */
  "search.kicker": "प्राधिकरण-सचेत खोज · OCR इंडेक्स सक्रिय",
  "search.title": "वॉल्ट में खोजें",
  "search.ph": "“वाहन परीक्षण से संबंधित फॉरेंसिक रिपोर्ट” आज़माएं…",
  "search.ocr": "स्कैन की गई प्रदर्शियों का OCR-निकाला पाठ शामिल करें",
  "search.semantic": "अर्थ-विस्तार सक्रिय — संबंधित शब्द स्वतः मिलान होते हैं",
  "search.cases": "केस फ़ाइलें",
  "search.docs": "दस्तावेज़",
  "search.found": "प्राप्त",
  "search.suppressed": "अतिरिक्त मिलान प्राधिकरण गेटवे द्वारा रोके गए। वे अभिलेख हैं या नहीं, और उनमें क्या है — यह आपकी भूमिका को प्रकट नहीं किया जाता।",
};

const DICTS: Record<string, Record<string, string>> = { en, hi };

/* ================================================================== */
/* Provider: language + theme + text size                              */
/* ================================================================== */
export type Lang = "en" | "hi";
export type Theme = "light" | "dark";

const ZOOM_STEPS = [1, 1.15, 1.3, 1.5];

interface Prefs {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  zoom: number;
  zoomIdx: number;
  zoomIn: () => void;
  zoomOut: () => void;
  t: (key: string) => string;
}

const PrefsCtx = createContext<Prefs>({
  lang: "en",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
  zoom: 1,
  zoomIdx: 0,
  zoomIn: () => {},
  zoomOut: () => {},
  t: (k) => en[k] ?? k,
});

export const usePrefs = () => useContext(PrefsCtx);
export const useT = () => useContext(PrefsCtx).t;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useLocalState<Lang>("lv4:lang", "en");
  const [theme, setThemeState] = useLocalState<Theme>("lv4:theme", "light");
  const [zoomIdx, setZoomIdx] = useLocalState<number>("lv4:zoom", 0);

  const zoom = ZOOM_STEPS[Math.min(Math.max(zoomIdx, 0), ZOOM_STEPS.length - 1)];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const el = document.getElementById("root");
    if (el) el.style.zoom = String(zoom);
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
    document.documentElement.style.setProperty("--wm-text", lang === "hi" ? '"प्रमाणित प्रतिलिपि · लेक्सवॉल्ट"' : '"CERTIFIED COPY · LEXVAULT"');
  }, [zoom, lang]);

  const value = useMemo<Prefs>(
    () => ({
      lang,
      setLang: (l) => setLangState(l),
      theme,
      setTheme: (t) => setThemeState(t),
      zoom,
      zoomIdx,
      zoomIn: () => setZoomIdx((i) => Math.min(i + 1, ZOOM_STEPS.length - 1)),
      zoomOut: () => setZoomIdx((i) => Math.max(i - 1, 0)),
      t: (key: string) => DICTS[lang]?.[key] ?? en[key] ?? key,
    }),
    [lang, theme, zoom, zoomIdx, setLangState, setThemeState, setZoomIdx]
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}
