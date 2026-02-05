#!/bin/bash
# Script to add .js extensions to all local ES module imports in TypeScript files

# Find all .ts files (excluding .d.ts type definition files)
find src -type f -name "*.ts" ! -name "*.d.ts" | while read -r file; do
    echo "Processing: $file"
    
    # Add .js to imports from local files (starting with ./ or ../)
    # Pattern 1: from './something' -> from './something.js'
    # Pattern 2: from '../something' -> from '../something.js'
    # Avoid adding .js if it already exists or if it's importing a .json file
    
    sed -i -E \
        -e "s|from '(\./[^']+)'|from '\1.js'|g" \
        -e "s|from \"(\./[^\"]+)\"|from \"\1.js\"|g" \
        -e "s|from '(\.\./[^']+)'|from '\1.js'|g" \
        -e "s|from \"(\.\./[^\"]+)\"|from \"\1.js\"|g" \
        -e "s|\.js\.js|.js|g" \
        -e "s|\.json\.js|.json|g" \
        "$file"
done

echo "✅ All imports fixed!"
