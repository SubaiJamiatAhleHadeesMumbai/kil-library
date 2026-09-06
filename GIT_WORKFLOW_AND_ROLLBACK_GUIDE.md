# Git Production Deployment & Safe Rollback Guide

Yeh guide **kil-library** project ke liye banayi gayi hai taaki aap safely `tarique` branch me code push kar sakein, bina risk ke `main` (Production) me merge kar sakein, aur agar live server par koi bhi issue/bug aaye to turant purane working state par wapas (rollback) ja sakein.

---

## 1. Branch Structure & Strategy

| Branch | Purpose | Safety Rule |
| :--- | :--- | :--- |
| **`main`** | **Production (Live)** | Ispe **kabhi bhi direct commit ya force-push mat karein**. Hamesha PR (Pull Request) ke zariye code aayega. |
| **`tarique`** | **Developer / Feature Branch** | Aap apne saare naye changes, bugfixes aur testing isi branch par karenge aur push karenge. |

---

## 2. One-Time Setup: Remote URL Check

Aapke local system me sahi remote hona zaroori hai.

1. Terminal me check karein:
   ```bash
   git remote -v
   ```

2. Agar `SubaiJamiatAhleHadeesMumbai/kil-library.git` remote me nahi hai, to use add karein:
   ```bash
   git remote add upstream https://github.com/SubaiJamiatAhleHadeesMumbai/kil-library.git
   ```

3. Confirm karein:
   ```bash
   git remote -v
   ```
   > Ab aapke paas `upstream` ke naam se main repo configure ho chuka hai.

---

## 3. Daily Workflow: Development Se Push Tak (Step-by-Step)

### Step 3.1: Apne changes ko `tarique` branch par le aana
Agar aap galti se `main` branch par the aur changes uncommitted hain, to bina commit kiye direct switch karein:
```bash
# tarique branch par switch karein
git checkout tarique
```
*(Git aapke unsaved changes ko automatically `tarique` branch me le aayega)*

### Step 3.2: Latest changes pull karein (Conflict se bachne ke liye)
```bash
git pull upstream tarique
```

### Step 3.3: Code commit karein
```bash
# Modified files check karein
git status

# Files stage karein
git add .

# Clear message ke sath commit karein
git commit -m "feat: updated settings, navbar and home customizer"
```

### Step 3.4: `tarique` branch ko push karein
```bash
git push upstream tarique
```

---

## 4. Production Release: `tarique` ko `main` me Merge Karna

> [!IMPORTANT]
> Kabhi bhi terminal se `git push upstream main` direct mat karein. Hamesha GitHub Pull Request (PR) use karein kyunki PR ke zariye 1-click Rollback button milta hai.

### Step 4.1: (Safety First) Pre-deploy Backup Tag banayein
Live par merge karne se theek pehle current working live code ka ek tag bana lein:
```bash
git checkout main
git pull upstream main

# Current date-time ke sath backup tag:
git tag prod-backup-$(Get-Date -Format 'yyyyMMdd-HHmm')
git push upstream --tags
```
*Isse aapko hamesha pata rahega ki merge se pehle exact kaunsa commit live tha.*

### Step 4.2: GitHub par Pull Request (PR) banayein
1. Browser me repo open karein: [SubaiJamiatAhleHadeesMumbai/kil-library](https://github.com/SubaiJamiatAhleHadeesMumbai/kil-library)
2. **Pull requests** tab par click karein -> **New pull request**.
3. Settings set karein:
   - **Base:** `main`
   - **Compare:** `tarique`
4. Code diff check karein aur **Create pull request** par click karein.
5. PR ka title aur description likhein (kya changes kiye hain).
6. **Merge pull request** par click karein aur **Confirm merge** kar dein.
7. Live server par deploy trigger ho jayega.

---

## 5. Rollback Guide: Agar Production me Issue / Bug Aa Jaye

Agar merge ke baad live website me koi error, crash ya UI issue aa jaye, to wapas (rollback) kaise jayein:

### Option A: GitHub 1-Click Revert (Sabse Aasan & Fast - Recommended) ⭐
1. GitHub par usi merged **Pull Request** ke page par jayein.
2. Niche scroll karein jaha *"Merged"* likha hota hai.
3. Waha ek **Revert** button dikhega:
   - **Revert** par click karein.
4. GitHub automatically ek naya PR bana dega (e.g., `revert-12-tarique`).
5. Is revert PR ko turant **Merge** kar dein.
6. **Result:** Production server turant naye changes ko hata kar purani working state par wapas chala jayega.

---

### Option B: Terminal se `git revert` (Manual Revert)
Agar GitHub UI ke bina command-line se rollback karna ho:

```bash
# 1. Local main branch par jayein aur latest fetch karein
git checkout main
git pull upstream main

# 2. Last merge commit ko undo (revert) karein
git revert -m 1 HEAD --no-edit

# 3. Is revert commit ko live main par push karein
git push upstream main
```

> **`-m 1` ka kya matlab hai?**
> Merge commit ke 2 parents hote hain. `-m 1` Git ko batata hai ki `main` branch ki purani state ko restore karna hai aur merged feature branch ke changes ko reverse karna hai.

---

### Option C: Emergency Instant Rollback (Jab Server turant start karna ho)
Agar server crash ho gaya ho aur turant purana build chalana ho:

Aapne **Step 4.1** me jo backup tag banaya tha, server par us tag ko checkout karke service restart kar sakte hain:
```bash
git fetch --tags upstream
git checkout prod-backup-YYYYMMDD-HHmm
# Server/App restart command (e.g. pm2 restart / docker restart / systemctl restart)
```

---

## 6. Rollback ke Baad Apne Code ko Fix Kaise Karein?

Rollback hone ke baad aapka code production se hat chuka hai, lekin `tarique` branch me aapke paas code safe rahega:

1. Apne local machine par `tarique` branch par jayein:
   ```bash
   git checkout tarique
   ```
2. Production `main` ke latest changes (jisme revert ho chuka hai) ko tarique me sync karein:
   ```bash
   git pull upstream main
   ```
3. Jo issue/bug live par aaya tha use locally debug aur fix karein.
4. Test karein ki sab theek se chal raha hai.
5. Fir se commit aur push karein:
   ```bash
   git add .
   git commit -m "fix: resolved production issue in settings"
   git push upstream tarique
   ```
6. Dobara naya PR banayein aur verify karke merge karein.

---

## 7. Common Git Issues & Quick Fixes

### Problem 1: `error: Your local changes to the following files would be overwritten by checkout`
**Solution:**
Aapke changes save nahi hain. Stash use karein:
```bash
git stash
git checkout tarique
git stash pop
```

### Problem 2: Merge Conflict aa raha hai
**Solution:**
Main branch ka latest code pehle apne branch me lekar conflict solve karein:
```bash
git checkout tarique
git fetch upstream
git merge upstream/main
```
VS Code ya IDE me aakar conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) ko resolve karein, save karein aur:
```bash
git add .
git commit -m "fix: resolve merge conflicts with main"
git push upstream tarique
```

### Problem 3: Galti se `main` par commit ho gaya lekin push nahi hua
**Solution:**
Commit ko `main` se hata kar `tarique` par move karein:
```bash
git branch tarique-temp
git reset --hard upstream/main
git checkout tarique
git merge tarique-temp
git branch -D tarique-temp
```

---

## 8. Quick Command Cheat-Sheet

```text
[Rozana Ka Kaam]
git checkout tarique
git pull upstream tarique
git add .
git commit -m "apna message"
git push upstream tarique

[Prod Merge]
-> GitHub par jao: tarique -> main PR create karo aur merge karo.

[Emergency Rollback]
-> GitHub PR me jao -> "Revert" button click karo -> Merge karo.
YA Terminal se:
git checkout main && git pull upstream main
git revert -m 1 HEAD --no-edit
git push upstream main
```

---
> **Production Status:** Successfully synchronized and deployed to `SubaiJamiatAhleHadeesMumbai/kil-library:main`.

