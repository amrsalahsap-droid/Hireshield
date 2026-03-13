#!/usr/bin/env node

/**
 * AI Architecture Compliance Checker
 * 
 * Lightweight script to detect potential AI architecture violations
 * Usage: node scripts/check-ai-architecture.js
 * 
 * This is a simple safeguard to make violations obvious during development.
 * It's not a replacement for proper code review and testing.
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate architecture violations
const VIOLATION_PATTERNS = [
  // Direct imports from old AI system
  /from\s+['"]@\/lib\/server\/ai\/call['"]/,
  /from\s+['"]\.\/lib\/server\/ai\/call['"]/,
  
  // Direct usage of old AI function
  /callLLMAndParseJSON\s*\(/,
  
  // Direct provider imports (should only be in lib/ai/providers/)
  /import.*OpenAI.*from\s+['"]openai['"]/,
  /import.*OpenRouter.*from\s+['"]openrouter['"]/,
  /import.*Groq.*from\s+['"]groq['"]/,
  
  // Direct provider usage (should be abstracted)
  /new\s+OpenAI\s*\(/,
  /new\s+OpenRouter\s*\(/,
  /new\s+Groq\s*\(/,
];

// Directories to check
const DIRECTORIES_TO_CHECK = [
  'app/api',
  'app',
  'lib',
  'components',
  'pages',
];

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.next/,
  /lib\/ai\/providers/, // Provider imports are allowed here
  /lib\/server\/ai/, // Legacy files - ignore for now
  /scripts/, // Ignore this script
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];
    
    VIOLATION_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        violations.push({
          pattern: pattern.toString(),
          matches: matches,
          lineNumbers: getLineNumbers(content, pattern)
        });
      }
    });
    
    return violations;
  } catch (error) {
    // Skip files that can't be read
    return [];
  }
}

function getLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const lineNumbers = [];
  
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      lineNumbers.push(index + 1);
    }
  });
  
  return lineNumbers;
}

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (shouldIgnoreFile(filePath)) {
      // Skip ignored files
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function main() {
  console.log('🔍 Checking AI Architecture Compliance...\n');
  
  let totalViolations = 0;
  const filesWithViolations = [];
  let totalFilesChecked = 0;
  
  DIRECTORIES_TO_CHECK.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir);
      totalFilesChecked += files.length;
      
      files.forEach(filePath => {
        const violations = checkFile(filePath);
        
        if (violations.length > 0) {
          totalViolations += violations.length;
          filesWithViolations.push({
            file: filePath,
            violations: violations
          });
        }
      });
    }
  });
  
  // Report results
  if (filesWithViolations.length === 0) {
    console.log('✅ No AI architecture violations found!');
    console.log('\n🏗️ Architecture is compliant:');
    console.log('   Route Handlers / Server Actions');
    console.log('     ↓');
    console.log('   aiService (ONLY)');
    console.log('     ↓');
    console.log('   Provider Adapter');
    console.log('     ↓');
    console.log('   External AI APIs');
  } else {
    console.log(`❌ Found ${totalViolations} potential AI architecture violations:\n`);
    
    filesWithViolations.forEach(({ file, violations }) => {
      console.log(`📁 ${file}`);
      violations.forEach(({ pattern, matches, lineNumbers }) => {
        console.log(`   ⚠️  Line ${lineNumbers.join(', ')}: ${pattern}`);
        console.log(`      Found: ${matches.slice(0, 2).join(', ')}${matches.length > 2 ? '...' : ''}`);
      });
      console.log('');
    });
    
    console.log('🏗️ Required Architecture:');
    console.log('   Route Handlers / Server Actions');
    console.log('     ↓');
    console.log('   aiService (ONLY)');
    console.log('     ↓');
    console.log('   Provider Adapter');
    console.log('     ↓');
    console.log('   External AI APIs');
    
    console.log('\n💡 To fix violations:');
    console.log('   1. Use aiService from @/lib/ai');
    console.log('   2. Remove direct provider imports');
    console.log('   3. Remove callLLMAndParseJSON usage');
    console.log('   4. See lib/ai/index.ts for guidance');
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Files checked: ${totalFilesChecked}`);
  console.log(`   Files with violations: ${filesWithViolations.length}`);
  console.log(`   Total violations: ${totalViolations}`);
  
  // Exit with error code if violations found
  if (totalViolations > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the check
if (require.main === module) {
  main();
}
