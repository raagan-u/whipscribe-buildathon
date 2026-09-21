**Track:** 0 — my current work and repos

**What this does**

Introduces my work and the tracks I plan to pursue. I maintain TwelveStrings, a live guitar-playing web app, and have worked on Rust, TypeScript, Solana, Bitcoin, and NFC projects.

I plan to complete the required **Track 1** mobile and desktop UI/UX review. For **Track 4**, I want to build a musician-practice workflow that combines TwelveStrings' musical-note detection with WhipScribe's timestamped speech transcription. These are plans, not completed submissions.

**Bigger product opportunity: a pitch-detection mode in the WhipScribe API could open an entirely new audience—musicians, music students, teachers, and creators whose recordings contain playing rather than only speech.** A useful first version would return timestamped single-note events with pitch, frequency, and confidence alongside the existing speech transcript. That is a proposal, not a capability the current API offers; chords and polyphonic music would need further work.

**How to try it**

- [TwelveStrings live web app](https://twelvestrings.xyz)
- [AVAX atomic-swap bridge — public portfolio copy with original commit authorship](https://github.com/raagan-u/avax-atomic-swap-bridge)
- [seri_protocol](https://github.com/raagan-u/seri_protocol)
- [JavaCard playground](https://github.com/raagan-u/javacardplayground)
- [zAppIt NFC project](https://github.com/raagan-u/zAppIt)

**What works, what does not yet**

This entry links my existing work. TwelveStrings is deployed at twelvestrings.xyz. Its backend and web repositories are currently private, so reviewers cannot yet inspect those commit histories. I have not filed Track 1 findings or built the Track 4 prototype yet.

**What I learned or had to look up**

WhipScribe's [API documentation](https://whipscribe.com/docs) says music-only audio is treated as no transcribable speech. That shapes the proposed Track 4 boundary: TwelveStrings would analyze playing, while WhipScribe would transcribe spoken practice notes. The prototype could demonstrate the demand and inform a future pitch-detection API, but I will not claim that WhipScribe currently transcribes musical notes.

**About me**

I'm Raagan U. I build music and crypto products, from audio-driven guitar interactions to blockchain infrastructure. I am looking for better learning opportunities with a lead to channelize my work. Not just simply expanding knowledge base with LLMS and resources. I also want to learn from human experiences :-) Contact: raaganuthayaargn@gmail.com.

## Track record

- LinkedIn: https://www.linkedin.com/in/raagan-u/
- Shipped apps: No App Store or Play Store release claimed. TwelveStrings is a [live web app](https://twelvestrings.xyz), not a store app.
- Hackathon wins: Second place in the Hyderabad region of an Avalanche hackathon. Our four-person team built an atomic-swap bridge; I handled the Bitcoin components. [Winner announcement](https://x.com/AvaxTeam1/status/1973980984606691516) · [public project copy with original commits](https://github.com/raagan-u/avax-atomic-swap-bridge).
- Team lead: Technical lead for abstracted wallet infrastructure at my company. I built the initial core supporting roughly 10 chains, with policies and TEE integration. The project later involved about eight contributors while I continued to own the core infrastructure.
- Team projects: [AVAX atomic-swap bridge](https://github.com/raagan-u/avax-atomic-swap-bridge) — Bitcoin integration in a four-person team; [Merry](https://github.com/hashiraio/merry) — merged CLI and chain-support contributions.
- Proudest work: [TwelveStrings](https://twelvestrings.xyz) — a guitar-playing app I maintain across its backend and web frontend.
- Contributions elsewhere: **Product opportunity (proposed, not currently supported): pitch detection in the WhipScribe API could turn musical recordings into timestamped note events and open a new audience of musicians, students, and teachers.** Merged PRs in [Merry #25](https://github.com/hashiraio/merry/pull/25), [Merry #13](https://github.com/hashiraio/merry/pull/13), [blockchain #63](https://github.com/hashiraio/blockchain/pull/63), and [blockchain #27](https://github.com/hashiraio/blockchain/pull/27).

## Checklist

Tick only what is true of this PR at submission time.

### UI and UX

- [ ] Every screen has designed empty, loading, error and done states
- [ ] Works on a phone-sized screen, or has a clear reason not to
- [ ] Keyboard reachable, readable contrast, labelled controls
- [ ] Copy is in the user's words, not the system's
- [ ] The first run is designed: what a new user sees before any data
- [ ] Before/after screenshots or a short recording attached

### Shipped apps

- [ ] At least one app of mine is live in the App Store or Play Store today
- [ ] It has real users and reviews, and I have answered some
- [ ] I shipped an update that fixed a crash or a review complaint
- [ ] I handled store review, signing and release myself
- [ ] I can say what I would do differently next time

Store links: None claimed.

### Building with AI

- [ ] The README explains the decisions, not just the features
- [ ] Commits are small and named for the change
- [ ] I removed or rewrote something the tool produced, and say what and why
- [ ] No invented API behaviour: every call matches the docs or a real response

### Finishing

- [ ] One full flow works end to end from a clean install
- [ ] Someone other than me used it and I changed something because of it
- [ ] The README says exactly what does not work yet
- [ ] Install and run instructions work on a machine that is not mine

### Ownership and teamwork

- [x] I linked repos where the commit history is mine, not a fork's
- [ ] One of them is a complex project I owned from start to finish
- [ ] I have reviewed others' pull requests or answered their issues, and can point to it
- [x] I have shipped work alongside a team, and can say what I did and what they did
- [x] I have won a hackathon (link the entry and the result)
- [x] I have led a team, and can say what I decided and what I delegated

### Self-drive

- [x] I opened a pull request with my current work and repos before being asked
- [ ] I kept moving between reviews instead of waiting to be told the next step
- [x] I chose my own scope and said why

### Learning

- [ ] I name something that was new to me and how I learned it
- [ ] I describe a thing that went wrong and how I found and fixed it
- [ ] I asked a question in an issue early instead of guessing late
