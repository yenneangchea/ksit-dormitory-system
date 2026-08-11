# 🚀 Push Your Code to GitHub - Step by Step

Follow these exact steps to create a **private** GitHub repository and upload your code.

---

## ✅ Step 1: Configure Git (First Time Only)

Open terminal in this folder and run:

```bash
# Set your name
git config --global user.name "Your Name"

# Set your email (use your GitHub email)
git config --global user.email "your.email@example.com"
```

**Example:**
```bash
git config --global user.name "John Doe"
git config --global user.email "john.doe@example.com"
```

---

## ✅ Step 2: Create Commit

```bash
git commit -m "Initial commit: KSIT Dormitory Management System"
```

You should see a success message showing how many files were committed.

---

## ✅ Step 3: Create Repository on GitHub

### 3.1 Go to GitHub
Open: **https://github.com/new**

### 3.2 Fill in Details

| Field | Value |
|-------|-------|
| **Repository name** | `ksit-dormitory-system` |
| **Description** | `Dormitory Management System for KSIT - Academic Year 2025-2026` |
| **Visibility** | **🔒 Private** (⚠️ IMPORTANT!) |
| **Initialize repository** | ❌ Leave ALL unchecked |

### 3.3 Click "Create repository"

---

## ✅ Step 4: Connect and Push

After creating the repository, GitHub will show you commands. Use these:

### 4.1 Add Remote

```bash
git remote add origin https://github.com/YOUR_USERNAME/ksit-dormitory-system.git
```

**⚠️ Replace `YOUR_USERNAME` with your actual GitHub username!**

**Example:**
```bash
git remote add origin https://github.com/johndoe/ksit-dormitory-system.git
```

### 4.2 Rename Branch

```bash
git branch -M main
```

### 4.3 Push to GitHub

```bash
git push -u origin main
```

**You'll be prompted for credentials:**
- Username: Your GitHub username
- Password: Your GitHub password or [Personal Access Token](https://github.com/settings/tokens)

---

## ✅ Step 5: Verify

1. Go to: `https://github.com/YOUR_USERNAME/ksit-dormitory-system`
2. You should see all your files!
3. ⚠️ **VERIFY it says "🔒 Private" next to the repository name**

---

## 🎉 Success!

Your code is now on GitHub! Here's what's uploaded:

✅ Frontend (Next.js app)  
✅ Backend (Express API)  
✅ Documentation  
✅ Configuration examples

### ❌ What's NOT uploaded (protected by .gitignore):

- `.env` files (secret keys)
- `node_modules/` (dependencies)
- `.next/` (build files)

---

## 🔄 Future Updates

To push new changes:

```bash
# 1. Add changed files
git add .

# 2. Commit with message
git commit -m "Description of changes"

# 3. Push to GitHub
git push
```

---

## 🛠️ Troubleshooting

### Issue: "fatal: unable to auto-detect email address"

**Solution:** Configure Git (Step 1)

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Issue: "remote origin already exists"

**Solution:** Remove and re-add

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/ksit-dormitory-system.git
```

### Issue: "Permission denied (publickey)"

**Solution:** Use HTTPS (not SSH) or create Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name: "KSIT Dormitory"
4. Select scopes: `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

### Issue: "Repository not found"

**Solution:** Check repository name and username are correct

```bash
# View current remote
git remote -v

# If wrong, remove and re-add
git remote remove origin
git remote add origin https://github.com/CORRECT_USERNAME/ksit-dormitory-system.git
```

---

## 📋 Complete Command Sequence

For copy-paste convenience (replace YOUR_USERNAME):

```bash
# Configure Git (first time only)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Commit code
git commit -m "Initial commit: KSIT Dormitory Management System"

# Connect to GitHub (create repository first!)
git remote add origin https://github.com/YOUR_USERNAME/ksit-dormitory-system.git
git branch -M main
git push -u origin main
```

---

## 🎯 What to Do After Push

1. ✅ Add repository description on GitHub
2. ✅ Add topics: `dormitory`, `management-system`, `nextjs`, `express`, `supabase`
3. ✅ Invite collaborators (if working with a team)
4. ✅ Enable Issues (for bug tracking)
5. ✅ Add a LICENSE file (optional)

---

## 🔐 Security Reminder

### Files That Are Protected (NOT on GitHub):

```
✅ backend/.env          - Contains Supabase secret key
✅ frontend/.env.local   - Contains API keys  
✅ node_modules/         - Dependencies (huge)
✅ .next/               - Build output
```

### If You Accidentally Committed .env:

```bash
# Remove from Git (keeps local file)
git rm --cached backend/.env
git rm --cached frontend/.env.local

# Commit the removal
git commit -m "Remove sensitive files from Git"

# Push
git push
```

---

## 📚 Additional Resources

- **GitHub Guide:** https://docs.github.com/en/get-started
- **Git Basics:** https://git-scm.com/book/en/v2
- **Personal Access Tokens:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

## ✉️ Need Help?

- Check `GITHUB_SETUP.md` for detailed guide
- Read `README_GITHUB.md` for project overview
- Contact your team lead or instructor

---

**Your repository URL will be:**  
`https://github.com/YOUR_USERNAME/ksit-dormitory-system`

**Remember to keep it PRIVATE! 🔒**
