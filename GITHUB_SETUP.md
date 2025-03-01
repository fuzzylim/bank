# GitHub Setup Guide

Follow these steps to initialize your git repository and push it to GitHub.

## Prerequisites

- Git installed on your local machine
- GitHub account
- GitHub CLI (optional, but helpful)

## Creating a Repository on GitHub

1. Go to [GitHub](https://github.com/) and sign in to your account
2. Click on the "+" icon in the top right corner and select "New repository"
3. Enter a name for your repository (e.g., "open-banking-dashboard")
4. Add a description (optional)
5. Choose "Public" for an open-source project
6. Do NOT initialize the repository with a README, .gitignore, or license (we already have these files)
7. Click "Create repository"

## Initializing Your Local Repository

Run the following commands in your project directory:

```bash
# Initialize git repository if not already done
git init

# Add all files to staging
git add .

# Make the initial commit
git commit -m "Initial commit"

# Add the GitHub repository as a remote
git remote add origin https://github.com/your-username/your-repository-name.git

# Force push to the main branch
# CAUTION: Force push should only be used for the initial push or when you're sure what you're doing
git push -f origin main
```

> **Note**: Replace `your-username` and `your-repository-name` with your actual GitHub username and repository name.

## Alternative: Using GitHub CLI

If you have GitHub CLI installed, you can create a repository and push in one go:

```bash
# Create a new repository on GitHub and push your local code
gh repo create your-repository-name --public --source=. --push
```

## After Pushing

Once your code is on GitHub, make sure to:

1. Review the repository settings
2. Set up branch protection rules (if working with a team)
3. Enable GitHub Pages if you want to showcase documentation
4. Add topics/tags to help people discover your project
5. Consider setting up additional GitHub Actions for automated testing and deployment

## Important Security Note

Double-check that no sensitive information like API keys, passwords, or tokens has been pushed to the public repository. While we've taken steps to prevent this by updating the `.gitignore` file and providing example files instead of real configuration files, it's always good to verify.
