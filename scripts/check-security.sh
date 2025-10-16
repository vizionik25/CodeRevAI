#!/bin/bash

# Security check script for CodeRevAI
# Verifies no sensitive data will be committed

set -e

echo "🔐 Running Security Checks for CodeRevAI..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git repository exists
if [ ! -d .git ]; then
    echo -e "${YELLOW}⚠️  Not a git repository yet. Run 'git init' to initialize.${NC}"
    echo ""
fi

# Function to check for patterns
check_pattern() {
    local pattern=$1
    local description=$2
    local files=$(grep -r "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "check-security.sh" | head -5)
    
    if [ -n "$files" ]; then
        echo -e "${RED}❌ FAIL: $description${NC}"
        echo "$files"
        echo ""
        return 1
    else
        echo -e "${GREEN}✅ PASS: $description${NC}"
        return 0
    fi
}

# Check 1: .env.local is gitignored
echo "Checking .gitignore configuration..."
if grep -q "\.env\.local" .gitignore; then
    echo -e "${GREEN}✅ PASS: .env.local is in .gitignore${NC}"
else
    echo -e "${RED}❌ FAIL: .env.local is NOT in .gitignore${NC}"
fi
echo ""

# Check 2: .env.local exists but is not tracked
if [ -f .env.local ]; then
    echo -e "${GREEN}✅ PASS: .env.local file exists${NC}"
    if [ -d .git ]; then
        if git ls-files --error-unmatch .env.local 2>/dev/null; then
            echo -e "${RED}❌ FAIL: .env.local is tracked by git!${NC}"
        else
            echo -e "${GREEN}✅ PASS: .env.local is not tracked by git${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: .env.local file does not exist${NC}"
    echo "   Copy .env.example to .env.local and add your keys"
fi
echo ""

# Check 3: .env.example exists
if [ -f .env.example ]; then
    echo -e "${GREEN}✅ PASS: .env.example template exists${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: .env.example template missing${NC}"
fi
echo ""

# Check 4: Search for hardcoded API keys
echo "Scanning for hardcoded secrets in source code..."
echo ""

check_pattern "AIzaSy[A-Za-z0-9_-]{33}" "No Gemini API keys in source code"
check_pattern "pk_live_[A-Za-z0-9]{24,}" "No live Stripe publishable keys in source code"
check_pattern "sk_live_[A-Za-z0-9]{24,}" "No live Stripe secret keys in source code"
check_pattern "whsec_[A-Za-z0-9]{32,}" "No Stripe webhook secrets in source code"

# Check 5: Verify no placeholder secrets in tracked files
if [ -d .git ]; then
    echo ""
    echo "Checking staged files for secrets..."
    if git diff --cached | grep -Ei "(api[_-]?key|secret[_-]?key|password|token|bearer)" > /dev/null; then
        echo -e "${YELLOW}⚠️  WARNING: Possible secrets found in staged changes${NC}"
        echo "   Review your staged changes carefully before committing"
    else
        echo -e "${GREEN}✅ PASS: No obvious secrets in staged changes${NC}"
    fi
fi

echo ""
echo "======================================"
echo "Security check complete!"
echo ""
echo "📚 For more information, see SECURITY.md"
echo ""
