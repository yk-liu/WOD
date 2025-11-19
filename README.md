# Write-Or-Die (WOD)

![](build/icon.png)

A personal “vibe-coding” project: a ruthless, append-only **typewriter mode** writing app. Even this readme is vibe coded. No editing, no excuses — stop typing and everything dies.

This is **not** a polished product. It’s a weird tool I made for myself because I wanted it to help me write.

---

## ✨ Core Idea

Type continuously.  
Never edit even if you made a mistake.
If you hesitate too long → You **FAIL** and everything you have typed will be lost.

That’s the entire philosophy.

There are websites with the same feature but I found them lacking customizations.

---

## 🧨 Features

- **Append-only typing**  
  Backspace? Nope. Arrows? Nope. Paste? Absolutely not.

- **Typewriter viewport**  
  Text scrolls behind a vertically-centered active line.

- **Idle punishment**  
  - After *Warn* seconds → red pulse  
  - After *Wipe* seconds → everything is erased and replaced by a giant **FAILED**

- **Target time lock**  
  You can’t save until you’ve written for your chosen number of minutes.

- **Autosave**  
  Saves to localStorage every 10 seconds, only after reaching target time + idling.

- **Focus mode**  
  Hide the UI and just write.

- **Preferences**  
  Font, width, theme (system/light/dark), defaults stored locally.

This is basically “morning pages with a gun to your head.”
