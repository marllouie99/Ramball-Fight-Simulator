# This script fixes incorrect relative import paths in the fighter files.

# Get all fighter files
FIGHTER_FILES=$(find js/entities/fighters -name "*.js")

for FILE in $FIGHTER_FILES
do
  echo "Processing $FILE"
  # Fix paths that should go up two directories instead of one
  sed -i "s|from '../core/|from '../../core/|g" "$FILE"
  sed -i "s|from '../systems/|from '../../systems/|g" "$FILE"
  sed -i "s|from '../entities/|from '../../entities/|g" "$FILE"
  sed -i "s|from '../soundEffects/|from '../../soundEffects/|g" "$FILE"
  sed -i "s|from '../graphics/|from '../../graphics/|g" "$FILE"

  # Fix path to fighter.js which is one level up
  sed -i "s|from './fighter.js'|from '../fighter.js'|g" "$FILE"
done

echo "Import path fixing complete."
