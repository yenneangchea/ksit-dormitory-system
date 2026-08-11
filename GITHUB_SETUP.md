# 🐙 GitHub Setup Guide

Follow these steps to create a **private** GitHub repository and push your code.

---

## 📋 Prerequisites

✅ Git is installed (you have version 2.53.0)  
✅ GitHub account (create one at https://github.com/signup if needed)  
✅ Your project is ready to push

---

## 🚀 Step-by-Step Guide

### Step 1: Create Repository on GitHub

1. **Go to GitHub:** https://github.com/new

2. **Fill in Repository Details:**
   - **Repository name:** `ksit-dormitory-system`
   - **Description:** `Dormitory Management System for KSIT - Academic Year 2025-2026`
   - **Visibility:** ✅ Select **Private** (very important!)
   - **❌ DO NOT** initialize with README, .gitignore, or license (we already have these)

3. **Click "Create repository"**

### Step 2: Configure Git (First Time Only)

Open terminal and run:

```bash
# Set your name (visible in commits)
git config --global user.name "Your Name"

# Set your email (use your GitHub email)
git config --global user.email "your.email@example.com"
```

### Step 3: Add Files to Git

Run these commands in your project directory:

```bash
# Navigate to project
cd c:\ksit-dormitory-system

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: KSIT Dormitory Management System"
```

### Step 4: Connect to GitHub

After creating the repository on GitHub, it will show you commands. Use these:

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ksit-dormitory-system.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 5: Verify

1. Go to: `https://github.com/YOUR_USERNAME/ksit-dormitory-system`
2. You should see your code!
3. Check that it says **🔒 Private** next to the repository name

---

## 🔐 Security: What's Protected

The `.gitignore` file ensures these sensitive files are **NOT uploaded:**

```
✅ .env files (contain secret keys)
✅ node_modules/ (dependencies)
✅ .next/ (build files)
✅ Personal configuration files
```

### ⚠️ IMPORTANT: Never Commit

- `backend/.env` - Contains Supabase secret key
- `frontend/.env.local` - Contains API keys
- Any file with passwords or secrets

---

## 📝 Quick Commands Reference

```bash
# Check status
git status

# Add specific files
git add backend/server.js

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# View commit history
git log --oneline

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main
```

---

## 🌿 Recommended Git Workflow

### For New Features

```bash
# 1. Create feature branch
git checkout -b feature/room-management

# 2. Make your changes
# ... edit files ...

# 3. Add and commit
git add .
git commit -m "Add room management interface"

# 4. Push to GitHub
git push -u origin feature/room-management

# 5. Create Pull Request on GitHub
# Then merge into main
```

### For Bug Fixes

```bash
# 1. Create fix branch
git checkout -b fix/login-error

# 2. Fix the bug
# ... edit files ...

# 3. Commit with descriptive message
git commit -m "Fix: Resolve login authentication error"

# 4. Push and merge
git push -u origin fix/login-error
```

---

## 📚 Commit Message Best Practices

### Format

```
Type: Short description (50 chars or less)

Longer explanation if needed (wrap at 72 chars)

- Bullet points for multiple changes
- Reference issues: Fixes #123
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting changes
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Examples

```bash
git commit -m "feat: Add student application form with file upload"
git commit -m "fix: Resolve CORS error in backend API"
git commit -m "docs: Update README with installation instructions"
git commit -m "refactor: Improve room assignment algorithm"
```

---

## 🔄 Syncing with Team Members

If working with others:

```bash
# Before starting work
git pull origin main

# After finishing work
git add .
git commit -m "Your changes"
git push origin main
```

---

## 🛠️ Troubleshooting

### Problem: "Permission denied (publickey)"

**Solution:** Set up SSH keys or use HTTPS with Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Use token as password when pushing

### Problem: "Repository not found"

**Solution:** Check repository name and your username

```bash
# Remove wrong remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/CORRECT_USERNAME/ksit-dormitory-system.git
```

### Problem: "Failed to push some refs"

**Solution:** Pull first, then push

```bash
git pull origin main --rebase
git push origin main
```

### Problem: Accidentally committed .env file

**Solution:** Remove from Git (keep local copy)

```bash
# Remove from Git but keep local file
git rm --cached backend/.env

# Commit the removal
git commit -m "Remove .env from version control"

# Push
git push
```

---

## 📦 Repository Settings (Recommended)

After creating repository, go to Settings:

### General
- ✅ Disable wiki (if not needed)
- ✅ Disable projects (if not needed)
- ✅ Allow issues

### Branches
- ✅ Set `main` as default branch
- ✅ Enable branch protection (optional)
  - Require pull request reviews
  - Require status checks

### Collaborators
- Add team members (if working in a team)
- Set appropriate permissions

---

## 🎯 Next Steps After Push

1. **✅ Verify repository is Private**
2. **✅ Add repository description**
3. **✅ Add topics/tags:** `dormitory`, `management-system`, `nextjs`, `express`, `supabase`, `typescript`
4. **✅ Star your own repository** (to bookmark it)
5. **✅ Enable GitHub Issues** (for bug tracking)

---

## 📖 Additional Resources

- **GitHub Docs:** https://docs.github.com
- **Git Guide:** https://git-scm.com/book/en/v2
- **GitHub CLI:** https://cli.github.com (optional tool)

---

## ✅ Checklist

Before pushing:

- [ ] `.gitignore` file exists
- [ ] `.env` files are gitignored
- [ ] All sensitive data removed
- [ ] README.md is updated
- [ ] Code is tested and working
- [ ] Commit message is clear
- [ ] Repository is set to **Private**

---

**Remember:** Once you push to GitHub, your code is backed up in the cloud! 🎉

**Need help?** Open an issue or contact your team lead.
