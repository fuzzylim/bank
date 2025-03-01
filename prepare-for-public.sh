#!/bin/bash
# prepare-for-public.sh - Script to help prepare the repository for public release

echo "=========================================================="
echo "         Prepare Repository for Public Release            "
echo "=========================================================="
echo ""

# Ensure .env.local is not tracked
if git ls-files --error-unmatch .env.local > /dev/null 2>&1; then
    echo "[WARNING] .env.local is currently tracked in git and contains sensitive data."
    echo "Running the following command to stop tracking it:"
    git rm --cached .env.local
    echo ""
fi

# Check if there are any other potential secrets in tracked files
echo "Scanning for potential API keys, passwords, or secrets in tracked files..."
git grep -i -e "key" -e "secret" -e "password" -e "token" --name-only | grep -v "package.json" | grep -v "SECURITY.md" | grep -v "GITHUB_SETUP.md" | grep -v ".gitignore" | grep -v "README.md" | grep -v "prepare-for-public.sh"

echo ""
echo "If any files are listed above, please review them for actual secrets and remove if needed."
echo ""

# Verify .gitignore includes common exclusions
echo "Verifying .gitignore contains necessary exclusions..."
if ! grep -q ".env" .gitignore; then
    echo "[WARNING] .env files may not be properly excluded in .gitignore."
    echo "Please check .gitignore to make sure sensitive environment files are excluded."
fi

# Verify README doesn't contain sensitive info
echo "Checking README for potential sensitive info..."
if grep -q -i -e "key" -e "secret" -e "password" -e "token" README.md; then
    echo "[WARNING] README may contain sensitive information."
    echo "Please review README.md for any sensitive data."
fi

echo ""
echo "Repository preparation checks complete. Next steps:"
echo "1. Review any warnings above and fix issues"
echo "2. Create a new repository on GitHub (without README, license, etc.)"
echo "3. Push to the new repository with the command:"
echo "   git push -f origin main"
echo ""
echo "For force push to new repository (replace with your own URL):"
echo "git remote set-url origin https://github.com/yourusername/your-repository-name.git"
echo "git push -f origin main"
echo ""
echo "=========================================================="